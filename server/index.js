/*
  Local live-sync server for the AHON demo.

  citizen.html and lgu.html are otherwise two independent page loads with
  no shared state — this is what actually connects them: it serves the
  static site and holds the one real copy of the mesh (seeded from
  js/mock-data.js), pushed to every connected browser over WebSockets.

  - Citizen tabs register a live "self" node on connect and report SOS /
    Volunteer / status / supply-need changes to it.
  - LGU tabs just subscribe and re-render whenever the state changes.
  - Everyone else (the mock nodes) keeps drifting on a timer, same as the
    old client-only js/mesh-simulator.js did, just centralized here so
    every connected browser sees the same thing.
*/
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { MESH_NODES: SEED_NODES, SELF_NODE_START } = require('../js/mock-data.js');

const PORT = process.env.PORT || 3000;
const STATUS_CYCLE = ['SAFE', 'TRAPPED', 'INJURED', 'SOS'];

const app = express();
app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let nodes = JSON.parse(JSON.stringify(SEED_NODES));
const citizens = new Map(); // ws -> node id

// The three roles are mutually exclusive on the client, but the order here is
// the tiebreak if a stale message ever lands out of sequence: needing help
// outranks being able to give it.
function computeDisplay(node) {
    if (node.sos) { node.type = 'sos'; node.status = 'SOS'; }
    else if (node.rescuer) { node.type = 'rescuer'; node.status = 'RESCUER'; }
    else if (node.volunteer) { node.type = 'volunteer'; node.status = 'VOLUNTEER'; }
    else { node.type = 'civilian'; node.status = node.statusLabel || 'SAFE'; }
}

function releaseClaimsBy(rescuerId) {
    nodes.forEach(n => {
        if (n.claimedBy === rescuerId) { n.claimedBy = null; n.claimedByName = null; }
    });
}

function broadcast() {
    const payload = JSON.stringify({ type: 'state', nodes });
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) client.send(payload);
    });
}

// Ambient drift for the seeded mock nodes only — real ("live") nodes are
// only ever moved by their own citizen client's messages, below.
function ambientTick() {
    nodes.forEach(n => { if (!n.live) n.lastSignalMin += Math.random() * 1.5; });

    // Resolved cases stop drifting — a node a rescuer has just cleared must not
    // flip itself back to TRAPPED on the next ambient tick.
    const drifting = nodes.filter(n => !n.live && !n.resolved && n.type !== 'offline' && n.type !== 'rescuer' && n.type !== 'volunteer');
    const hops = Math.min(2, drifting.length);
    for (let i = 0; i < hops; i++) {
        const node = drifting[Math.floor(Math.random() * drifting.length)];
        if (!node) continue;
        if (Math.random() < 0.35) {
            const next = STATUS_CYCLE[Math.floor(Math.random() * STATUS_CYCLE.length)];
            node.status = next;
            node.type = next === 'SOS' ? 'sos' : node.type;
        }
        node.lastSignalMin = Math.random() * 3;
    }
    if (Math.random() < 0.08) {
        const candidate = drifting[Math.floor(Math.random() * drifting.length)];
        if (candidate) { candidate.type = 'offline'; candidate.status = 'OFFLINE'; }
    }

    // Offline nodes drift back into range too — otherwise, over a
    // long-running server, every node eventually goes dark and stays there.
    const goneDark = nodes.filter(n => !n.live && n.type === 'offline');
    if (goneDark.length && Math.random() < 0.15) {
        const revived = goneDark[Math.floor(Math.random() * goneDark.length)];
        revived.type = 'civilian';
        revived.status = STATUS_CYCLE[Math.floor(Math.random() * STATUS_CYCLE.length)];
        revived.lastSignalMin = 0;
    }

    broadcast();
}
setInterval(ambientTick, 5000);

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state', nodes }));

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'register') {
            const id = 'C-' + crypto.randomBytes(3).toString('hex');
            const jitter = () => (Math.random() - 0.5) * 0.002; // ~±100m so multiple live tabs don't stack exactly
            const node = {
                id,
                name: `Live Citizen ${id.slice(2)}`,
                type: 'civilian',
                status: 'SAFE',
                lat: (typeof msg.lat === 'number' ? msg.lat : SELF_NODE_START.lat) + jitter(),
                lng: (typeof msg.lng === 'number' ? msg.lng : SELF_NODE_START.lng) + jitter(),
                needs: {},
                flags: {},
                lastSignalMin: 0,
                town: 'Nabua',
                live: true,
                sos: false,
                volunteer: false,
                statusLabel: 'SAFE',
            };
            nodes.push(node);
            citizens.set(ws, id);
            ws.send(JSON.stringify({ type: 'registered', id }));
            broadcast();
            return;
        }

        const nodeId = citizens.get(ws);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        node.lastSignalMin = 0;

        if (msg.type === 'sos') {
            node.sos = !!msg.active;
            computeDisplay(node);
        } else if (msg.type === 'volunteer') {
            node.volunteer = !!msg.active;
            computeDisplay(node);
        } else if (msg.type === 'status') {
            if (!(node.volunteer && !node.sos)) {
                node.statusLabel = msg.value;
                computeDisplay(node);
            }
        } else if (msg.type === 'rescuer') {
            node.rescuer = !!msg.active;
            // Dropping out of rescuer mode must not strand the case you had
            // claimed — nobody else can take it while it still reads as taken.
            if (!node.rescuer) releaseClaimsBy(node.id);
            computeDisplay(node);
        } else if (msg.type === 'claim') {
            const target = nodes.find(n => n.id === msg.targetId);
            if (!target) return;
            // First claim wins. A second rescuer tapping the same case is told
            // no rather than silently stealing it out from under the first.
            if (msg.active) {
                if (target.claimedBy && target.claimedBy !== node.id) return;
                target.claimedBy = node.id;
                target.claimedByName = node.name;
            } else if (target.claimedBy === node.id) {
                target.claimedBy = null;
                target.claimedByName = null;
            }
        } else if (msg.type === 'resolve') {
            const target = nodes.find(n => n.id === msg.targetId);
            if (!target || target.claimedBy !== node.id) return;
            target.resolved = true;
            target.resolvedByName = node.name;
            target.claimedBy = null;
            target.claimedByName = null;
            target.needs = {};
            target.statusLabel = 'SAFE';
            target.sos = false;
            computeDisplay(target);
        } else if (msg.type === 'need') {
            node.needs[msg.key] = !!msg.value;
        } else if (msg.type === 'flag') {
            node.flags[msg.key] = !!msg.value;
        } else {
            return; // unrecognized message — nothing changed, skip the broadcast
        }

        broadcast();
    });

    ws.on('close', () => {
        const id = citizens.get(ws);
        if (id) {
            // A rescuer who closes the tab has stopped responding, so their
            // cases go back on the board rather than staying locked to a node
            // that no longer exists.
            releaseClaimsBy(id);
            nodes = nodes.filter(n => n.id !== id);
            citizens.delete(ws);
            broadcast();
        }
    });
});

server.listen(PORT, () => {
    console.log(`AHON live-sync server running at http://localhost:${PORT}`);
    console.log(`  Citizen: http://localhost:${PORT}/citizen.html`);
    console.log(`  LGU:     http://localhost:${PORT}/lgu.html`);
});
