/*
  Citizen app map layer (Leaflet — no API key needed, used purely for local
  tile rendering of the phone-mockup "live mesh map"; the LGU dashboard uses
  Google Maps when a key is configured, and the same OSM-based fallback
  otherwise, see js/lgu-map.js).

  Reads the shared MESH_NODES / NABUA_CENTER from mock-data.js and the
  appState object owned by citizen-app.js.
*/
(function () {
    const CENTER = [window.NABUA_CENTER.lat, window.NABUA_CENTER.lng];

    // Leaflet's own zoom buttons are off because the map is a full-bleed
    // background layer here — the +/- and recenter controls live in the app's
    // own overlay stack (see .map-overlay-top in citizen.html) so they match
    // the rest of the phone UI and clear the docked sheet.
    const map = L.map('map', { zoomControl: false, attributionControl: true }).setView(CENTER, 15);

    // Where "you" were last drawn, so the recenter control can return there
    // after the user has panned away across the barangay.
    let lastSelfPos = CENTER;

    // Two basemaps behind the Map/Satellite control in the overlay stack,
    // neither needing an API key:
    //
    // - Street: real OpenStreetMap tiles, so responders see the actual streets
    //   each plotted node sits on rather than an abstract grid — tinted dark
    //   via CSS (see .leaflet-tile-pane in css/citizen.css) to fit the
    //   night-instrument chart world.
    // - Satellite: Esri aerial imagery, with Esri's place/boundary reference
    //   tiles laid over it. The labels are what make imagery usable during a
    //   rescue — bare photography shows the rooftop but not the street name to
    //   radio in, which is why Google's own satellite view ships labels on.
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    const satelliteLayer = L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
        }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
        }),
    ]);
    streetLayer.addTo(map);

    let basemap = 'street';
    function setBasemap(mode) {
        if (mode === basemap) return;
        basemap = mode;

        if (mode === 'satellite') {
            map.removeLayer(streetLayer);
            satelliteLayer.addTo(map);
        } else {
            map.removeLayer(satelliteLayer);
            streetLayer.addTo(map);
        }

        // The street basemap is inverted into the dark register by CSS; aerial
        // photography must not be, so the tile filter keys off this class.
        map.getContainer().classList.toggle('is-satellite', mode === 'satellite');

        const btn = document.getElementById('basemapBtn');
        if (!btn) return;
        const toSatellite = mode !== 'satellite';
        // The control names where it takes you, not where you are — a lone
        // icon that reports the current mode reads as the opposite to about
        // half of people.
        btn.innerHTML = `<i class="fa-solid ${toSatellite ? 'fa-satellite' : 'fa-map'}"></i>`;
        btn.setAttribute('aria-label', toSatellite ? 'Switch to satellite view' : 'Switch to street map');
    }

    const networkLayer = L.layerGroup().addTo(map);
    const sosPulseLayer = L.layerGroup().addTo(map);

    function typeToColorClass(type) {
        switch (type) {
            case 'sos': return { cls: 'bg-sos', color: 'var(--color-sos)' };
            case 'rescuer': return { cls: 'bg-rescuer', color: 'var(--color-rescuer)' };
            case 'senior': return { cls: 'bg-senior', color: 'var(--color-senior)' };
            case 'volunteer': return { cls: 'bg-volunteer', color: 'var(--color-volunteer)' };
            case 'offline': return { cls: 'bg-last-seen', color: 'var(--color-offline)' };
            default: return { cls: 'bg-user', color: 'var(--color-user)' };
        }
    }

    function needsBadgeHtml(needs) {
        if (!needs || !(needs.water || needs.food || needs.meds || needs.pets || needs.family)) return '';
        let html = `<div class="marker-badge">`;
        if (needs.water) html += `<i class="fa-solid fa-droplet" style="color:var(--icon-water)"></i>`;
        if (needs.food) html += `<i class="fa-solid fa-utensils" style="color:var(--icon-food)"></i>`;
        if (needs.meds) html += `<i class="fa-solid fa-briefcase-medical" style="color:var(--icon-meds)"></i>`;
        if (needs.pets) html += `<i class="fa-solid fa-paw" style="color:var(--icon-pets)"></i>`;
        if (needs.family) html += `<i class="fa-solid fa-people-roof" style="color:var(--icon-family)"></i>`;
        html += `</div>`;
        return html;
    }

    // Deterministic per-node label offset so ghost nodes plotted close
    // together (a dense demo dataset, or a real disaster with many reports
    // in one barangay) don't stack their "LAST SEEN" labels illegibly.
    // Four fixed positions cycle by a hash of the node id — stable across
    // re-renders, no layout/clustering library needed.
    function labelHash(id) {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        return h;
    }
    const LABEL_OFFSETS = [
        { x: 0, y: 0 }, { x: 34, y: 8 }, { x: -34, y: 8 }, { x: 0, y: 26 },
    ];

    function neighborIcon(node, isMyCase) {
        const { cls, color } = typeToColorClass(node.type);
        const badge = needsBadgeHtml(node.needs);
        const claimed = isMyCase ? ' is-my-case' : '';

        if (node.type === 'offline') {
            // Ghost node: dashed, dimmed marker + "last seen" timestamp label.
            const mins = Math.round(node.lastSignalMin);
            const offset = LABEL_OFFSETS[labelHash(node.id) % LABEL_OFFSETS.length];
            const html = `
                <div class="marker-wrap">
                    ${badge}
                    <div class="marker-core is-ghost ${cls}"></div>
                    <div class="ghost-label-group" style="transform:translate(${offset.x}px, ${offset.y}px)">
                        <div class="marker-label" style="color:${color}">${node.name}</div>
                        <div class="ghost-timestamp"><i class="fa-solid fa-ghost"></i> ${mins}m ago</div>
                    </div>
                </div>`;
            return L.divIcon({ className: 'custom-div-icon', html, iconSize: [40, 40], iconAnchor: [20, 20] });
        }

        // SAFE is the resting state and the most common one on the map, so
        // labelling it buries the handful of nodes that actually need
        // attention under a wall of text. Colour and the legend still say
        // "safe"; the label is spent on the exceptions.
        const label = node.status === 'SAFE'
            ? ''
            : `<div class="marker-label" style="color:${color}">${node.status}</div>`;

        const html = `
            <div class="marker-wrap">
                ${badge}
                <div class="marker-core ${cls}${claimed}"></div>
                ${label}
            </div>`;
        return L.divIcon({ className: 'custom-div-icon', html, iconSize: [40, 40], iconAnchor: [20, 20] });
    }

    function selfIcon(appState) {
        let cls = 'bg-user', color = 'var(--color-user)', label = appState.statusLabel;
        if (appState.sos) { cls = 'bg-sos'; color = 'var(--color-sos)'; label = 'SOS'; }
        else if (appState.volunteer) { cls = 'bg-volunteer'; color = 'var(--color-volunteer)'; label = 'VOLUNTEER'; }

        const badge = needsBadgeHtml(appState.needs);
        const html = `
            <div class="marker-wrap">
                ${badge}
                <div class="marker-core is-self ${cls}"></div>
                <div class="user-label-group">
                    <span class="lbl-you">(You)</span>
                    <span class="lbl-status" style="color:${color}">${label}</span>
                </div>
            </div>`;
        return L.divIcon({ className: 'custom-div-icon', html, iconSize: [40, 40], iconAnchor: [20, 20] });
    }

    // --- Pulsating personal range circle ---
    let pulseRadius = 0;
    let pulseCircle = null;
    function animateRangePulse() {
        if (pulseCircle) {
            // Sweeps out to the same radius the links are built from, so the
            // pulse reads as your radio reaching the peers it actually carries.
            pulseRadius += MESH_RANGE_M / 100;
            if (pulseRadius > MESH_RANGE_M) pulseRadius = 0;
            pulseCircle.setRadius(pulseRadius);
            const ratio = pulseRadius / MESH_RANGE_M;
            pulseCircle.setStyle({ opacity: 1 - ratio, fillOpacity: (1 - ratio) * 0.2 });
        }
        requestAnimationFrame(animateRangePulse);
    }

    // --- MESH TOPOLOGY ---
    // Radio reach of one node. The dataset spreads ~1.5km across Nabua, so at
    // the old 150m personal ring nothing would link to anything; 500m is the
    // order of a LoRa relay hop and gives the web its actual shape — dense
    // where phones cluster, thin where they don't.
    const MESH_RANGE_M = 500;
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
    function buildMeshGraph(points) {
        const edges = [];
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                if (metersBetween(points[i], points[j]) <= MESH_RANGE_M) edges.push({ a: i, b: j, bridge: false });
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

    // Breadth-first from the sender gives each node its hop count and the edge
    // it first heard the message over — the spanning tree a flood actually
    // travels, rather than every link firing at once.
    function floodTree(points, edges, root) {
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
        return treeEdges;
    }

    // --- SOS "priority packet" flood: one dot per tree edge, released only
    // once the hop before it has delivered, so the broadcast visibly spreads
    // outward through the network instead of teleporting to every node. ---
    let floodEdges = [];
    let floodClock = 0;
    let floodDepth = 0;

    function buildSosFlood(points, treeEdges) {
        floodEdges = treeEdges.map(e => {
            floodDepth = Math.max(floodDepth, e.depth);
            return {
                from: [points[e.from].lat, points[e.from].lng],
                to: [points[e.to].lat, points[e.to].lng],
                depth: e.depth,
                marker: L.circleMarker([points[e.from].lat, points[e.from].lng], {
                    radius: 5, color: '#fff', weight: 1, fillColor: '#FF4D4D', fillOpacity: 0, opacity: 0,
                }).addTo(sosPulseLayer),
            };
        });
        floodClock = 0;
    }

    function clearSosParticles() {
        floodEdges.forEach(e => sosPulseLayer.removeLayer(e.marker));
        floodEdges = [];
        floodDepth = 0;
    }

    function animateSosParticles() {
        if (floodEdges.length) {
            // One unit of the clock is one hop. The extra beat past the last
            // hop is the pause before the next broadcast goes out.
            floodClock += 0.02;
            if (floodClock > floodDepth + 2) floodClock = 0;

            floodEdges.forEach(e => {
                const p = floodClock - e.depth;
                if (p <= 0 || p >= 1) {
                    e.marker.setStyle({ opacity: 0, fillOpacity: 0 });
                    return;
                }
                e.marker.setStyle({ opacity: 1, fillOpacity: 1 });
                e.marker.setLatLng([
                    e.from[0] + (e.to[0] - e.from[0]) * p,
                    e.from[1] + (e.to[1] - e.from[1]) * p,
                ]);
            });
        }
        requestAnimationFrame(animateSosParticles);
    }

    // Who can come for you: the two node types that represent help on its way.
    function isResponder(n) {
        return n.type === 'rescuer' || n.type === 'volunteer';
    }

    // Who needs help: anyone in distress, anyone still asking for supplies
    // even though they called themselves safe, and every ghost node — an
    // unanswered "last seen" is exactly the address a volunteer should check.
    const DISTRESS = ['SOS', 'INJURED', 'TRAPPED'];
    function needsHelp(n) {
        if (n.type === 'offline') return true;
        if (DISTRESS.includes(n.status)) return true;
        return !!(n.needs && (n.needs.water || n.needs.food || n.needs.meds));
    }

    // Widens either filtered mode to the whole live picture — responders and
    // everyone asking — so the mesh is visible as a network rather than as
    // your own slice of it. A view preference, not mesh state: it changes what
    // is drawn, never what is broadcast. Sticky across modes on purpose.
    let showWholeMesh = false;

    // A map showing every node at once is the right default, but not while the
    // user is doing something specific. Broadcasting SOS, the only dots that
    // matter are the ones who can reach you. On duty as a volunteer, it
    // inverts: the people asking, and the ones nobody has heard from. Either
    // way the filter note can widen it back out.
    function visibleNeighbors(neighbors, appState) {
        if (!appState.sos && !appState.volunteer && !appState.rescuer) return neighbors;
        if (showWholeMesh) return neighbors.filter(n => isResponder(n) || needsHelp(n));
        if (appState.sos) return neighbors.filter(isResponder);
        return neighbors.filter(needsHelp);
    }

    // The key is built from the nodes actually on screen, in a fixed order, so
    // it can never advertise a colour the current filter has hidden. Keys are
    // node.type, the same thing typeToColorClass switches on.
    const LEGEND_ROWS = [
        { key: 'sos', label: 'SOS', color: 'var(--color-sos)' },
        { key: 'senior', label: 'Senior/PWD', color: 'var(--color-senior)' },
        { key: 'rescuer', label: 'Rescuer', color: 'var(--color-rescuer)' },
        { key: 'volunteer', label: 'Volunteer', color: 'var(--color-volunteer)' },
        { key: 'civilian', label: 'Safe', color: 'var(--color-user)' },
        { key: 'offline', label: 'Last seen', color: 'var(--color-offline)' },
    ];

    function renderLegend(nodes) {
        const el = document.getElementById('legendBox');
        if (!el) return;
        const present = new Set(nodes.map(n => n.type));
        el.innerHTML = LEGEND_ROWS.filter(row => present.has(row.key)).map(row =>
            `<div class="legend-item"><div class="l-dot" style="background:${row.color}"></div><span class="l-text">${row.label}</span></div>`
        ).join('');
    }

    // Hiding half the map without saying so reads as a bug, so the filter
    // always names itself — and says when it has nothing to show, which is
    // itself the news when you are waiting on a rescuer. The note is also the
    // control: tapping it widens the view to the rest of the mesh and back,
    // which costs no vertical space in a map window that has none to give.
    function renderFilterNote(appState, shown) {
        const el = document.getElementById('mapFilterNote');
        if (!el) return;

        el.hidden = !(appState.sos || appState.volunteer || appState.rescuer);
        if (el.hidden) return;

        let label;
        if (showWholeMesh) label = shown ? `Responders + people asking · ${shown}` : 'Nothing reported nearby';
        else if (appState.sos) label = shown ? `Responders only · ${shown}` : 'No responders in range yet';
        else if (appState.rescuer) label = shown ? `Tap a case to respond · ${shown}` : 'No open cases nearby';
        else label = shown ? `People asking for help · ${shown}` : 'Nobody nearby needs help';

        const modeIcon = appState.sos ? 'fa-tower-broadcast'
            : appState.rescuer ? 'fa-helmet-safety' : 'fa-hand-holding-heart';
        el.innerHTML = `
            <i class="fa-solid ${modeIcon}"></i>
            <span>${label}</span>
            <i class="fa-solid ${showWholeMesh ? 'fa-compress' : 'fa-expand'} note-affordance"></i>`;
        el.setAttribute('aria-pressed', String(showWholeMesh));
        el.setAttribute('aria-label', showWholeMesh
            ? 'Showing the wider mesh. Narrow the map back to this mode only'
            : 'Widen the map to show the rest of the mesh');
    }

    // How far the map's own centre sits below the centre of the strip left
    // visible above the docked sheet. Measured rather than hardcoded, because
    // the sheet is content-sized and collapses.
    function sheetAwareOffset() {
        const sheet = document.getElementById('mapSheet');
        if (!sheet) return 0;
        const box = map.getContainer().getBoundingClientRect();
        const visibleBottom = Math.max(box.top, Math.min(sheet.getBoundingClientRect().top, box.bottom));
        return (box.top + box.bottom) / 2 - (box.top + visibleBottom) / 2;
    }

    // Held so the filter note can redraw the map on its own — it changes only
    // how the mesh is framed, so it has no business routing through the app.
    let lastAppState = null;

    function render(appState) {
        lastAppState = appState;
        networkLayer.clearLayers();
        const selfPos = [appState.self.lat, appState.self.lng];
        lastSelfPos = selfPos;

        // The live-sync server also pushes this page's own node back down
        // as part of MESH_NODES (so the LGU dashboard can see it) — skip it
        // here so "you" isn't drawn twice, once as a neighbor and once as
        // the dedicated self marker below.
        const selfId = window.realtime && window.realtime.selfId;
        const all = window.MESH_NODES.filter(n => n.id !== selfId);
        const neighbors = visibleNeighbors(all, appState);
        renderFilterNote(appState, neighbors.length);
        renderLegend(neighbors);

        // The mesh is peer-to-peer, so the links are too: every pair of live
        // nodes within radio range of each other, not a star of spokes from
        // you. Ghosts carry nothing — no live signal means no working radio —
        // so they are plotted but left out of the graph.
        const live = neighbors.filter(n => n.type !== 'offline');
        const points = [{ lat: selfPos[0], lng: selfPos[1] }, ...live];
        const edges = buildMeshGraph(points);

        // Normal traffic is thin dashed green; while SOS is active the whole
        // web reroutes (thicker, red) to show priority flooding. Bridges stay
        // fainter either way — they are the hops the mesh is straining to make.
        edges.forEach(e => {
            L.polyline([[points[e.a].lat, points[e.a].lng], [points[e.b].lat, points[e.b].lng]], {
                color: appState.sos ? '#FF4D4D' : '#2ECC71',
                weight: appState.sos ? 2.5 : 1.4,
                dashArray: e.bridge ? '2, 7' : (appState.sos ? '2, 6' : '5, 7'),
                opacity: (appState.sos ? 0.9 : 0.6) * (e.bridge ? 0.5 : 1),
            }).addTo(networkLayer);
        });

        // On duty, every plotted node is a case file — tapping one opens its
        // detail, claim and resolve. Off duty the markers stay inert, because
        // a citizen has no business opening a stranger's medical record.
        const onDuty = !!appState.rescuer;
        const activeCase = onDuty && window.rescuerCases ? window.rescuerCases.active() : null;

        neighbors.forEach(n => {
            const marker = L.marker([n.lat, n.lng], {
                icon: neighborIcon(n, onDuty && activeCase && activeCase.id === n.id),
                interactive: onDuty,
                keyboard: onDuty,
            }).addTo(networkLayer);
            if (onDuty) marker.on('click', () => window.openCaseSheet(n));
        });

        // The case you took, drawn as the line you are travelling. Solid and
        // bright against the dashed mesh, so it reads as your job rather than
        // as one more link.
        if (activeCase) {
            L.polyline([selfPos, [activeCase.lat, activeCase.lng]], {
                color: '#4D94FF', weight: 3, opacity: 0.95, dashArray: '10, 6',
            }).addTo(networkLayer);
        }

        // Your own radio reach — the same range the links are built from, so
        // the ring explains why the nodes inside it are the ones you carry.
        L.circle(selfPos, { radius: MESH_RANGE_M, color: '#4D94FF', weight: 1, fill: false, dashArray: '6, 6', opacity: 0.6 }).addTo(networkLayer);

        pulseCircle = L.circle(selfPos, { radius: 0, color: '#4D94FF', weight: 2, fillColor: '#4D94FF', fillOpacity: 0.2 }).addTo(networkLayer);

        L.marker(selfPos, { icon: selfIcon(appState), zIndexOffset: 1000 }).addTo(networkLayer);

        // Toggle the SOS particle-flood effect
        clearSosParticles();
        if (appState.sos) buildSosFlood(points, floodTree(points, edges, 0));
    }

    window.citizenMap = {
        render,
        map,
        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
        setBasemap,
        toggleBasemap: () => setBasemap(basemap === 'satellite' ? 'street' : 'satellite'),
        recenterOffset: sheetAwareOffset,
        selfPosition: () => ({ lat: lastSelfPos[0], lng: lastSelfPos[1] }),
        toggleMeshScope: () => {
            showWholeMesh = !showWholeMesh;
            if (lastAppState) render(lastAppState);
        },
        // Keep whatever zoom the user chose unless they had zoomed further out
        // than the default — recentring shouldn't silently reframe their view.
        recenter: () => {
            map.setView(lastSelfPos, Math.max(map.getZoom(), 15), { animate: false });
            // Leaflet centres on the container, but the docked sheet covers its
            // bottom two thirds, so that put "you" — and the densest part of the
            // mesh around you — underneath the sheet. Lift it into the strip
            // that is actually visible.
            const dy = sheetAwareOffset();
            if (dy > 1) map.panBy([0, dy], { animate: false });
        },
    };
    animateRangePulse();
    animateSosParticles();
})();
