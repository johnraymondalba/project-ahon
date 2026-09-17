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

    // Real OpenStreetMap street tiles (no API key) so responders can see the
    // actual streets/terrain each plotted node sits on, not just an abstract
    // grid — tinted dark via CSS (see .leaflet-tile-pane filter in
    // css/citizen.css) to fit the night-instrument chart world.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

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

    function neighborIcon(node) {
        const { cls, color } = typeToColorClass(node.type);
        const badge = needsBadgeHtml(node.needs);

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
                <div class="marker-core ${cls}"></div>
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
            pulseRadius += 1.5;
            const maxRange = 150;
            if (pulseRadius > maxRange) pulseRadius = 0;
            pulseCircle.setRadius(pulseRadius);
            const ratio = pulseRadius / maxRange;
            pulseCircle.setStyle({ opacity: 1 - ratio, fillOpacity: (1 - ratio) * 0.2 });
        }
        requestAnimationFrame(animateRangePulse);
    }

    // --- SOS "priority packet" traveling dots: visualizes a high-priority
    // broadcast flooding through the mesh, cutting ahead of normal traffic ---
    let sosParticles = [];
    function buildSosParticles(selfPos) {
        const selfId = window.realtime && window.realtime.selfId;
        sosParticles = window.MESH_NODES.filter(n => n.type !== 'offline' && n.id !== selfId).map(n => ({
            from: selfPos,
            to: [n.lat, n.lng],
            t: Math.random(),
            marker: L.circleMarker(selfPos, { radius: 5, color: '#fff', weight: 1, fillColor: '#FF4D4D', fillOpacity: 1 }).addTo(sosPulseLayer),
        }));
    }
    function clearSosParticles() {
        sosParticles.forEach(p => sosPulseLayer.removeLayer(p.marker));
        sosParticles = [];
    }
    function animateSosParticles() {
        sosParticles.forEach(p => {
            p.t += 0.012;
            if (p.t > 1) p.t = 0;
            const lat = p.from[0] + (p.to[0] - p.from[0]) * p.t;
            const lng = p.from[1] + (p.to[1] - p.from[1]) * p.t;
            p.marker.setLatLng([lat, lng]);
        });
        requestAnimationFrame(animateSosParticles);
    }

    function render(appState) {
        networkLayer.clearLayers();
        const selfPos = [appState.self.lat, appState.self.lng];
        lastSelfPos = selfPos;

        // The live-sync server also pushes this page's own node back down
        // as part of MESH_NODES (so the LGU dashboard can see it) — skip it
        // here so "you" isn't drawn twice, once as a neighbor and once as
        // the dedicated self marker below.
        const selfId = window.realtime && window.realtime.selfId;
        const neighbors = window.MESH_NODES.filter(n => n.id !== selfId);

        // Mesh links: normal traffic is thin dashed green; while SOS is active,
        // links visually reroute (thicker, red) to show priority flooding.
        neighbors.forEach(n => {
            if (n.type === 'offline') return;
            L.polyline([selfPos, [n.lat, n.lng]], {
                color: appState.sos ? '#FF4D4D' : 'rgba(46, 204, 113, 0.6)',
                weight: appState.sos ? 2.5 : 1,
                dashArray: appState.sos ? '2, 6' : '4, 8',
                opacity: appState.sos ? 0.85 : 0.5,
            }).addTo(networkLayer);
        });

        neighbors.forEach(n => {
            L.marker([n.lat, n.lng], { icon: neighborIcon(n) }).addTo(networkLayer);
        });

        // Fixed comms range ring
        L.circle(selfPos, { radius: 150, color: '#4D94FF', weight: 1, fill: false, dashArray: '6, 6', opacity: 0.6 }).addTo(networkLayer);

        pulseCircle = L.circle(selfPos, { radius: 0, color: '#4D94FF', weight: 2, fillColor: '#4D94FF', fillOpacity: 0.2 }).addTo(networkLayer);

        L.marker(selfPos, { icon: selfIcon(appState), zIndexOffset: 1000 }).addTo(networkLayer);

        // Toggle the SOS particle-flood effect
        clearSosParticles();
        if (appState.sos) buildSosParticles(selfPos);
    }

    window.citizenMap = {
        render,
        map,
        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
        // Keep whatever zoom the user chose unless they had zoomed further out
        // than the default — recentring shouldn't silently reframe their view.
        recenter: () => map.setView(lastSelfPos, Math.max(map.getZoom(), 15)),
    };
    animateRangePulse();
    animateSosParticles();
})();
