/*
  Connects this page to the local live-sync server (server/index.js) over
  WebSockets, so a citizen's SOS/Volunteer/status/need changes actually
  reach the LGU dashboard, and vice versa the LGU page sees the mesh update
  live instead of each page simulating its own disconnected copy.

  Set window.AHON_ROLE = 'citizen' | 'lgu' before this script runs (see
  citizen.html / lgu.html) — only 'citizen' pages register a live self node.

  If no server is reachable (e.g. the HTML was opened directly via file://,
  or the server isn't running), this falls back gracefully: it fires
  'realtime:unavailable' so the page can fall back to the old client-only
  js/mesh-simulator.js and just work locally, single-page, like before.
*/
(function () {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let ws = null;
    let fallbackTimer = null;
    let settled = false;

    function applyState(incomingNodes) {
        if (!window.MESH_NODES) return;
        window.MESH_NODES.length = 0;
        incomingNodes.forEach(n => window.MESH_NODES.push(n));
        window.dispatchEvent(new CustomEvent('mesh:update', { detail: { nodes: window.MESH_NODES } }));
    }

    function send(obj) {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    }

    function markUnavailable() {
        if (settled) return;
        settled = true;
        window.dispatchEvent(new CustomEvent('realtime:unavailable'));
    }

    function markConnected() {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        window.dispatchEvent(new CustomEvent('realtime:connected', { detail: { selfId: window.realtime.selfId } }));
    }

    function connect() {
        if (typeof WebSocket === 'undefined') { markUnavailable(); return; }

        try {
            ws = new WebSocket(`${proto}://${location.host}`);
        } catch (err) {
            markUnavailable();
            return;
        }

        // No server (or it's unreachable) — don't hang the page waiting for it.
        fallbackTimer = setTimeout(markUnavailable, 2000);

        ws.addEventListener('open', () => {
            if (window.AHON_ROLE === 'citizen') {
                const start = window.SELF_NODE_START || {};
                send({ type: 'register', lat: start.lat, lng: start.lng });
            } else {
                markConnected();
            }
        });

        ws.addEventListener('message', (evt) => {
            let msg;
            try { msg = JSON.parse(evt.data); } catch { return; }

            if (msg.type === 'registered') {
                window.realtime.selfId = msg.id;
                markConnected();
            } else if (msg.type === 'state') {
                applyState(msg.nodes);
            }
        });

        ws.addEventListener('close', markUnavailable);
        ws.addEventListener('error', markUnavailable);
    }

    window.realtime = {
        selfId: null,
        sendSOS: (active) => send({ type: 'sos', active }),
        sendVolunteer: (active) => send({ type: 'volunteer', active }),
        sendRescuer: (active) => send({ type: 'rescuer', active }),
        sendClaim: (targetId, active) => send({ type: 'claim', targetId, active }),
        sendResolve: (targetId) => send({ type: 'resolve', targetId }),
        sendStatus: (value) => send({ type: 'status', value }),
        sendNeed: (key, value) => send({ type: 'need', key, value }),
        sendFlag: (key, value) => send({ type: 'flag', key, value }),
    };

    connect();
})();
