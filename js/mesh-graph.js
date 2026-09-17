/*
  Shared mesh topology: who can hear whom, and how far a message has to travel
  to get anywhere.

  Both maps draw the same network, so both build it here rather than each
  keeping its own copy — a link graph that disagrees between the citizen app
  and the command centre would be worse than none, the same reason the LGU
  legend is generated from its marker colours instead of written out twice.

  Loaded by citizen.html and lgu.html via <script src> (no bundler), so it
  just defines a global.
*/
(function () {
    // Radio reach of one node. The dataset spreads ~1.5km across Nabua, so at
    // the 150m of a personal ring nothing would link to anything; 500m is the
    // order of a LoRa relay hop and gives the web its actual shape — dense
    // where phones cluster, thin where they don't.
    const RANGE_M = 500;
    const M_PER_DEG_LAT = 111320;

    function metersBetween(a, b) {
        const latMid = ((a.lat + b.lat) / 2) * Math.PI / 180;
        const dx = (a.lng - b.lng) * M_PER_DEG_LAT * Math.cos(latMid);
        const dy = (a.lat - b.lat) * M_PER_DEG_LAT;
        return Math.hypot(dx, dy);
    }

    // Every pair inside radio range, then the shortest extra hops needed to
    // pull stranded clusters in. A real mesh would simply be partitioned here;
    // the demo keeps it whole so a broadcast has somewhere to go, and marks
    // those hops as bridges so they can be drawn as the weak links they are.
    function build(points) {
        const edges = [];
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                if (metersBetween(points[i], points[j]) <= RANGE_M) edges.push({ a: i, b: j, bridge: false });
            }
        }

        const parent = points.map((_, i) => i);
        const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
        const union = (i, j) => { const ra = find(i), rb = find(j); if (ra === rb) return false; parent[ra] = rb; return true; };
        edges.forEach(e => union(e.a, e.b));

        for (;;) {
            if (new Set(points.map((_, i) => find(i))).size <= 1) break;
            let best = null;
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    if (find(i) === find(j)) continue;
                    const d = metersBetween(points[i], points[j]);
                    if (!best || d < best.d) best = { a: i, b: j, d };
                }
            }
            if (!best) break;
            union(best.a, best.b);
            edges.push({ a: best.a, b: best.b, bridge: true });
        }
        return edges;
    }

    // Breadth-first from one node gives every other its hop count and the edge
    // it first heard over — the spanning tree a flood actually travels, rather
    // than every link firing at once. Unreachable nodes keep a depth of -1.
    function hops(points, edges, root) {
        const adj = points.map(() => []);
        edges.forEach(e => { adj[e.a].push(e.b); adj[e.b].push(e.a); });

        const depth = points.map(() => -1);
        depth[root] = 0;
        const queue = [root];
        const treeEdges = [];
        while (queue.length) {
            const cur = queue.shift();
            adj[cur].forEach(next => {
                if (depth[next] !== -1) return;
                depth[next] = depth[cur] + 1;
                treeEdges.push({ from: cur, to: next, depth: depth[cur] });
                queue.push(next);
            });
        }
        return { depth, treeEdges };
    }

    window.meshGraph = { RANGE_M, metersBetween, build, hops };
})();
