/*
  Citizen app UI logic: status chips, supply needs, SOS broadcast, volunteer
  mode, the mesh connection indicator, and the collapsible legend/sheet.
  Map rendering lives in citizen-map.js; shared data lives in mock-data.js.
*/
(function () {
    const appState = {
        self: { lat: window.SELF_NODE_START.lat, lng: window.SELF_NODE_START.lng },
        sos: false,
        volunteer: false,
        statusLabel: 'SAFE',
        needs: { water: false, food: false, meds: false },
    };

    function render() { window.citizenMap.render(appState); }

    // --- MY SITUATION ---
    window.setStatus = function (status) {
        if (appState.volunteer && !appState.sos) return;
        appState.statusLabel = status;

        document.querySelectorAll('.chip').forEach(c => c.className = 'chip');
        const idMap = { SAFE: 'chip-safe', TRAPPED: 'chip-trapped', INJURED: 'chip-injured', RESCUE: 'chip-rescue' };
        const classMap = { SAFE: 'active-safe', TRAPPED: 'active-trapped', INJURED: 'active-injured', RESCUE: 'active-rescue' };
        const chipId = idMap[status];
        if (chipId) document.getElementById(chipId).classList.add(classMap[status]);
        render();
    };

    // --- SUPPLIES NEEDED ---
    window.toggleNeed = function (type) {
        appState.needs[type] = !appState.needs[type];
        const btn = document.getElementById(`btn-${type}`);
        btn.classList.toggle(`active-${type}`, appState.needs[type]);
        render();
    };

    // --- BROADCAST SOS ---
    window.toggleSOS = function () {
        appState.sos = !appState.sos;
        const btn = document.getElementById('sosBtn');
        const label = document.getElementById('sosLabel');
        const banner = document.getElementById('sosBanner');
        btn.classList.toggle('active', appState.sos);
        label.innerText = appState.sos ? 'SOS ACTIVE!' : 'BROADCAST SOS';
        banner.classList.toggle('visible', appState.sos);
        render();
    };

    // --- VOLUNTEER MODE ---
    window.toggleVolunteer = function () {
        const checkbox = document.getElementById('volunteerCheck');
        appState.volunteer = checkbox.checked;
        const chipsRow = document.querySelector('.status-chips-row');
        chipsRow.style.opacity = appState.volunteer ? '0.4' : '1';
        chipsRow.style.pointerEvents = appState.volunteer ? 'none' : 'auto';
        render();
    };

    window.toggleLegend = function () {
        document.getElementById('legendBox').classList.toggle('minimized');
    };

    window.toggleSheet = function () {
        document.getElementById('bottomSheet').classList.toggle('sheet-minimized');
    };

    // --- MESH STATUS INDICATOR ---
    // Simulates BLE-mesh connectivity: mostly online with N hops to reach an
    // LGU gateway node; occasionally drops to fully offline (store-and-forward).
    const meshState = { online: true, hops: 2 };

    function renderMeshStatus() {
        const pill = document.getElementById('meshStatusPill');
        const dot = document.getElementById('meshStatusDot');
        const text = document.getElementById('meshStatusText');
        const sub = document.getElementById('meshStatusSub');

        pill.classList.toggle('offline', !meshState.online);
        dot.classList.toggle('pulsing', meshState.online);

        if (meshState.online) {
            text.textContent = 'MESH ONLINE';
            sub.textContent = `${meshState.hops} hop${meshState.hops === 1 ? '' : 's'} to LGU`;
        } else {
            text.textContent = 'MESH OFFLINE';
            sub.textContent = 'Store & forward — will relay when in range';
        }
    }

    function jitterMeshStatus() {
        // 12% chance to flip connectivity; otherwise hop count drifts a little.
        if (Math.random() < 0.12) {
            meshState.online = !meshState.online;
        }
        if (meshState.online) {
            meshState.hops = Math.max(1, Math.min(5, meshState.hops + (Math.random() < 0.5 ? -1 : 1)));
        }
        renderMeshStatus();
    }

    // --- INIT ---
    document.addEventListener('DOMContentLoaded', () => {
        render();
        renderMeshStatus();
        window.startMeshSimulator(5000);
        setInterval(jitterMeshStatus, 6000);
        window.addEventListener('mesh:update', render);
    });
})();
