/*
  Citizen app map layer (Leaflet — no API key needed, used purely for local
  tile rendering of the phone-mockup "live mesh map"; the LGU dashboard uses
  Google Maps instead, see js/lgu-map.js).

  Reads the shared MESH_NODES / NABUA_CENTER from mock-data.js and the
  appState object owned by citizen-app.js.
*/
(function () {
    const CENTER = [window.NABUA_CENTER.lat, window.NABUA_CENTER.lng];

    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(CENTER, 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

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
        if (!needs || !(needs.water || needs.food || needs.meds)) return '';
        let html = `<div class="marker-badge">`;
        if (needs.water) html += `<i class="fa-solid fa-droplet" style="color:var(--icon-water)"></i>`;
        if (needs.food) html += `<i class="fa-solid fa-utensils" style="color:var(--icon-food)"></i>`;
        if (needs.meds) html += `<i class="fa-solid fa-briefcase-medical" style="color:var(--icon-meds)"></i>`;
        html += `</div>`;
        return html;
    }

    function neighborIcon(node) {
        const { cls, color } = typeToColorClass(node.type);
        const badge = needsBadgeHtml(node.needs);

        if (node.type === 'offline') {
            // Ghost node: dashed, dimmed marker + "last seen" timestamp label.
            const mins = Math.round(node.lastSignalMin);
            const html = `
                <div class="marker-wrap">
                    ${badge}
                    <div class="marker-core is-ghost ${cls}"></div>
                    <div class="ghost-label-group">
                        <div class="marker-label" style="color:${color}">${node.name}</div>
                        <div class="ghost-timestamp"><i class="fa-solid fa-ghost"></i> LAST SEEN ${mins}m AGO</div>
                    </div>
                </div>`;
            return L.divIcon({ className: 'custom-div-icon', html, iconSize: [40, 40], iconAnchor: [20, 20] });
        }

        const html = `
            <div class="marker-wrap">
                ${badge}
                <div class="marker-core ${cls}"></div>
                <div class="marker-label" style="color:${color}">${node.status}</div>
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
        sosParticles = window.MESH_NODES.filter(n => n.type !== 'offline').map(n => ({
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

        // Mesh links: normal traffic is thin dashed green; while SOS is active,
        // links visually reroute (thicker, red) to show priority flooding.
        window.MESH_NODES.forEach(n => {
            if (n.type === 'offline') return;
            L.polyline([selfPos, [n.lat, n.lng]], {
                color: appState.sos ? '#FF4D4D' : 'rgba(46, 204, 113, 0.6)',
                weight: appState.sos ? 2.5 : 1,
                dashArray: appState.sos ? '2, 6' : '4, 8',
                opacity: appState.sos ? 0.85 : 0.5,
            }).addTo(networkLayer);
        });

        window.MESH_NODES.forEach(n => {
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

    window.citizenMap = { render, map };
    animateRangePulse();
    animateSosParticles();
})();
