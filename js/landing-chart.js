/*
  Landing hero signature interaction: a report plots itself on the chart and
  hops, node to node, to the LGU gateway — dramatizing "Only takes one hop to
  help" as a demonstrated mechanism instead of a slogan. Loops continuously
  so the page keeps demoing itself (BETT Show Asia booth use).
*/
(function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Loosely scattered "barangay" nodes across the chart, styled after the
    // real MESH_NODES layout so the plot reads as this product's own data,
    // not decoration.
    const NODES = [
        { id: 'self', x: 110, y: 350, label: 'YOU' },
        { id: 'n05', x: 235, y: 300, label: 'N05' },
        { id: 'n09', x: 375, y: 235, label: 'N09' },
        { id: 'n12', x: 520, y: 165, label: 'N12' },
        { id: 'gateway', x: 670, y: 95, label: 'LGU GATEWAY' },
        { id: 'n06', x: 165, y: 150, label: 'N06' },
        { id: 'n13', x: 430, y: 400, label: 'N13' },
        { id: 'n03', x: 590, y: 330, label: 'N03' },
        { id: 'n07', x: 290, y: 415, label: 'N07' },
    ];
    const PATH = ['self', 'n05', 'n09', 'n12', 'gateway'];
    const DECORATIVE_LINKS = [['self', 'n06'], ['n05', 'n07'], ['n09', 'n13'], ['n12', 'n03'], ['n03', 'gateway']];
    const COORDS = {
        self: '13.4045N 123.2968E', n05: '13.4055N 123.3005E', n09: '13.4102N 123.3011E',
        n12: '13.4120N 123.2940E', gateway: '13.4140N 123.2905E',
    };

    const byId = Object.fromEntries(NODES.map(n => [n.id, n]));

    function el(tag, attrs) {
        const node = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
        return node;
    }

    function buildStatic() {
        const linksLayer = document.getElementById('plotLinks');
        const nodesLayer = document.getElementById('plotNodes');

        DECORATIVE_LINKS.forEach(([a, b]) => {
            linksLayer.appendChild(el('line', {
                class: 'plot-link-line', x1: byId[a].x, y1: byId[a].y, x2: byId[b].x, y2: byId[b].y,
            }));
        });

        NODES.forEach(n => {
            const isGateway = n.id === 'gateway';
            nodesLayer.appendChild(el('circle', {
                id: `dot-${n.id}`, class: `plot-node-dot${n.id === 'self' ? ' is-self' : ''}${isGateway ? ' is-gateway' : ''}`,
                cx: n.x, cy: n.y, r: isGateway ? 9 : 6,
            }));
            nodesLayer.appendChild(el('text', {
                id: `label-${n.id}`, class: `plot-node-label${isGateway ? ' is-gateway' : ''}`,
                x: n.x + (isGateway ? 14 : 10), y: n.y + 4,
            })).textContent = n.label;
        });
    }

    function buildTraceLines() {
        const traceLayer = document.getElementById('plotTrace');
        const lines = [];
        for (let i = 0; i < PATH.length - 1; i++) {
            const a = byId[PATH[i]], b = byId[PATH[i + 1]];
            const line = el('line', { class: 'plot-trace-line', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
            traceLayer.appendChild(line);
            lines.push(line);
        }
        return lines;
    }

    function resetVisualState(traceLines) {
        traceLines.forEach(l => l.classList.remove('is-drawn'));
        NODES.forEach(n => document.getElementById(`dot-${n.id}`).classList.remove('is-lit'));
    }

    async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function runSequence(traceLines) {
        const statusEl = document.getElementById('readoutStatus');
        const hopsEl = document.getElementById('readoutHops');
        const posEl = document.getElementById('readoutPos');

        resetVisualState(traceLines);
        statusEl.textContent = 'AWAITING REPORT';
        hopsEl.textContent = '0';
        posEl.textContent = COORDS.self;
        await wait(1400);

        document.getElementById('dot-self').classList.add('is-lit');
        statusEl.textContent = 'REPORT PLOTTED';
        await wait(900);

        for (let i = 0; i < traceLines.length; i++) {
            const toId = PATH[i + 1];
            traceLines[i].classList.add('is-drawn');
            await wait(650);
            document.getElementById(`dot-${toId}`).classList.add('is-lit');
            hopsEl.textContent = String(i + 1);
            posEl.textContent = COORDS[toId];
            statusEl.textContent = toId === 'gateway' ? 'DELIVERED — LGU GATEWAY' : `HOP ${i + 1} — RELAYED`;
            await wait(750);
        }

        await wait(3200);
        runSequence(traceLines);
    }

    document.addEventListener('DOMContentLoaded', () => {
        buildStatic();
        const traceLines = buildTraceLines();
        runSequence(traceLines);
    });
})();
