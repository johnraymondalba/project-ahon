/*
  Simulates a "live" mesh network for the demo: every few seconds it nudges
  one or two nodes' statuses and last-signal timestamps, then fires a
  `mesh:update` event on window so any page listening (citizen map, LGU
  dashboard) can re-render without polling.

  This is a stand-in for real BLE/LoRa gossip traffic — there is no
  networking here, just a JS interval mutating the shared MESH_NODES array
  from mock-data.js.
*/
(function () {
    const STATUS_CYCLE = ['SAFE', 'TRAPPED', 'INJURED', 'SOS'];

    function nudgeRandomNode() {
        if (!window.MESH_NODES || window.MESH_NODES.length === 0) return;

        // Advance every node's "time since last signal" a little.
        window.MESH_NODES.forEach(n => { n.lastSignalMin += Math.random() * 1.5; });

        // Pick 1-2 non-offline nodes to jostle, so the map/table feel alive.
        const live = window.MESH_NODES.filter(n => n.type !== 'offline' && n.type !== 'rescuer' && n.type !== 'volunteer');
        const hops = Math.min(2, live.length);
        for (let i = 0; i < hops; i++) {
            const node = live[Math.floor(Math.random() * live.length)];
            if (!node) continue;

            // Small chance to escalate/de-escalate status, otherwise just refresh signal.
            if (Math.random() < 0.35) {
                const next = STATUS_CYCLE[Math.floor(Math.random() * STATUS_CYCLE.length)];
                node.status = next;
                node.type = next === 'SOS' ? 'sos' : node.type;
            }
            node.lastSignalMin = Math.random() * 3;
        }

        // Small chance a node goes dark and becomes a ghost/"last signal" node.
        if (Math.random() < 0.08) {
            const candidate = live[Math.floor(Math.random() * live.length)];
            if (candidate) {
                candidate.type = 'offline';
                candidate.status = 'OFFLINE';
            }
        }

        // Offline nodes drift back into range too — otherwise, over a long
        // enough session, every node eventually goes dark and stays there.
        const goneDark = window.MESH_NODES.filter(n => n.type === 'offline');
        if (goneDark.length && Math.random() < 0.15) {
            const revived = goneDark[Math.floor(Math.random() * goneDark.length)];
            revived.type = 'civilian';
            revived.status = STATUS_CYCLE[Math.floor(Math.random() * STATUS_CYCLE.length)];
            revived.lastSignalMin = 0;
        }

        window.dispatchEvent(new CustomEvent('mesh:update', { detail: { nodes: window.MESH_NODES } }));
    }

    window.startMeshSimulator = function (intervalMs) {
        nudgeRandomNode();
        return setInterval(nudgeRandomNode, intervalMs || 5000);
    };
})();
