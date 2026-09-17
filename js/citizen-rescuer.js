/*
  Rescuer case handling: the sheet that opens when an on-duty rescuer taps a
  node on the map, and the claim/resolve calls behind it.

  A rescuer gets three things a citizen and a volunteer do not:

  - Claim, so the LGU board and every other rescuer can see a case is taken
    and nobody drives to the same house twice. The server arbitrates — first
    claim wins — because two rescuers can tap at the same moment.
  - The person's medical detail: blood type, allergies, conditions. This is
    the whole reason the role is separate. Right now the toggle that unlocks
    it is ungated, which is fine for a demo but means anyone who installs the
    app can read strangers' medical data; a real deployment needs an
    LGU-issued credential on the Profile toggle before this ships.
  - Distance to the case, and a route line drawn on the map once claimed.

  Depends on window.isRescuerActive from citizen-app.js and window.citizenMap.
*/
(function () {
    let openNode = null;

    function selfId() { return window.realtime && window.realtime.selfId; }

    // Straight-line, not a driving route — there is no routing engine here and
    // pretending otherwise would give a rescuer a number they could plan on.
    // The label says so.
    function distanceTo(node) {
        const self = window.citizenMap && window.citizenMap.selfPosition();
        if (!self) return null;
        const M_PER_DEG_LAT = 111320;
        const latMid = ((self.lat + node.lat) / 2) * Math.PI / 180;
        const dx = (self.lng - node.lng) * M_PER_DEG_LAT * Math.cos(latMid);
        const dy = (self.lat - node.lat) * M_PER_DEG_LAT;
        return Math.hypot(dx, dy);
    }

    // ~1.1 m/s: walking pace through floodwater, well under the 1.4 m/s a dry
    // pavement figure would give. Rounded up to the minute, never to zero.
    function etaMinutes(meters) {
        return Math.max(1, Math.round(meters / 1.1 / 60));
    }

    function claimedByMe(node) {
        return !!node.claimedBy && node.claimedBy === selfId();
    }

    function fieldRow(label, value) {
        const provided = value !== undefined && value !== null && value !== '';
        return `
            <div class="case-field">
                <div class="case-field-label">${label}</div>
                <div class="case-field-value${provided ? '' : ' is-empty'}">${provided ? value : 'Not provided'}</div>
            </div>`;
    }

    const NEED_LABELS = { water: 'Water', food: 'Food', meds: 'Meds', pets: 'Pets', family: 'Family' };
    const FLAG_LABELS = { pwd: 'PWD', elder: 'Elderly', infant: 'Infant' };

    function chipList(source, labels, className) {
        const keys = Object.keys(labels).filter(k => source && source[k]);
        if (!keys.length) return '<span class="case-chip is-none">None reported</span>';
        return keys.map(k => `<span class="case-chip ${className}">${labels[k]}</span>`).join('');
    }

    function render() {
        const node = openNode;
        if (!node) return;

        const meters = distanceTo(node);
        const mine = claimedByMe(node);
        const takenByOther = !!node.claimedBy && !mine;

        document.getElementById('caseName').textContent = node.name;
        document.getElementById('caseStatus').textContent = node.status;
        document.getElementById('caseStatus').className = `case-status status-${String(node.status).toLowerCase()}`;

        document.getElementById('caseMeta').innerHTML = [
            meters === null ? '' : `<span><i class="fa-solid fa-ruler"></i> ${meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`} away</span>`,
            meters === null ? '' : `<span><i class="fa-regular fa-clock"></i> ~${etaMinutes(meters)} min on foot</span>`,
            `<span><i class="fa-solid fa-tower-cell"></i> ${Math.round(node.lastSignalMin)}m since signal</span>`,
        ].filter(Boolean).join('');

        const med = node.medical || {};
        document.getElementById('caseBody').innerHTML = `
            <div class="case-section-label">Asking for</div>
            <div class="case-chips">${chipList(node.needs, NEED_LABELS, 'is-need')}</div>

            <div class="case-section-label">Vulnerability</div>
            <div class="case-chips">${chipList(node.flags, FLAG_LABELS, 'is-flag')}</div>

            <div class="case-section-label">Medical</div>
            ${fieldRow('Blood type', med.blood)}
            ${fieldRow('Allergies', med.allergies)}
            ${fieldRow('Conditions', med.conditions)}
            ${fieldRow('Barangay', node.town)}`;

        const claimBtn = document.getElementById('caseClaimBtn');
        const resolveBtn = document.getElementById('caseResolveBtn');
        const notice = document.getElementById('caseNotice');

        claimBtn.disabled = takenByOther;
        claimBtn.textContent = mine ? 'Release case' : 'Respond to this';
        claimBtn.className = `case-btn ${mine ? 'is-release' : 'is-claim'}`;
        // Resolving is only offered to whoever actually went, so a case cannot
        // be closed from across the barangay by someone who did nothing.
        resolveBtn.hidden = !mine;

        notice.hidden = !takenByOther;
        if (takenByOther) notice.textContent = `Already being handled by ${node.claimedByName || 'another rescuer'}.`;
    }

    window.openCaseSheet = function (node) {
        openNode = node;
        render();
        document.getElementById('caseSheet').classList.add('open');
    };

    window.closeCaseSheet = function () {
        openNode = null;
        document.getElementById('caseSheet').classList.remove('open');
    };

    window.toggleCaseClaim = function () {
        if (!openNode) return;
        const mine = claimedByMe(openNode);
        if (window.realtime) window.realtime.sendClaim(openNode.id, !mine);
        window.logActivity(
            mine ? `Released ${openNode.name}` : `Responding to ${openNode.name}`,
            'fa-solid fa-helmet-safety', '--success-dark'
        );
        window.closeCaseSheet();
    };

    window.resolveCase = function () {
        if (!openNode) return;
        if (window.realtime) window.realtime.sendResolve(openNode.id);
        window.logActivity(`Marked ${openNode.name} as reached and safe`, 'fa-solid fa-circle-check', '--success');
        window.closeCaseSheet();
    };

    window.rescuerCases = {
        // The case a rescuer is currently on, if any — the map draws its route.
        active() {
            const id = selfId();
            if (!id || !window.isRescuerActive()) return null;
            return window.MESH_NODES.find(n => n.claimedBy === id) || null;
        },
        releaseAll() {
            const id = selfId();
            if (!id || !window.realtime) return;
            window.MESH_NODES.filter(n => n.claimedBy === id)
                .forEach(n => window.realtime.sendClaim(n.id, false));
        },
        // Re-rendered on every mesh tick so a claim taken by someone else
        // while the sheet is open updates in place instead of going stale.
        refresh() {
            if (!openNode) return;
            const fresh = window.MESH_NODES.find(n => n.id === openNode.id);
            if (!fresh) { window.closeCaseSheet(); return; }
            openNode = fresh;
            render();
        },
    };

    window.addEventListener('mesh:update', () => window.rescuerCases.refresh());
})();
