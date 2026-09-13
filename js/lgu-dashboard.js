/*
  LGU / Command Center dashboard logic: summary cards, priority table,
  AI Triage panel (backed by js/gemini-triage.js), detail panel, and the
  mesh/network health strip. Map rendering lives in js/lgu-map.js.
*/
(function () {
    const triageCache = new Map(); // node.id -> { priorityTier, reasoning, recommendedAction, source }
    let selectedNodeId = null;
    let sortKey = 'tier';
    let sortDir = 1;
    let filterStatus = 'ALL';
    let searchText = '';

    // "Reports" = anything a person/ghost node filed. Rescuers/volunteers are
    // mesh assets, not incoming reports, so they're excluded from the table.
    function getReports() {
        return window.MESH_NODES.filter(n => n.type !== 'rescuer' && n.type !== 'volunteer');
    }

    function haversineKm(a, b) {
        const R = 6371;
        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLng = (b.lng - a.lng) * Math.PI / 180;
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    function nearestRescuer(node) {
        const rescuers = window.MESH_NODES.filter(n => n.type === 'rescuer');
        if (!rescuers.length) return null;
        return rescuers.reduce((best, r) => {
            const d = haversineKm(node, r);
            return !best || d < best.d ? { rescuer: r, d } : best;
        }, null);
    }

    // --- SUMMARY CARDS ---
    function renderSummary() {
        const reports = getReports();
        let critical = 0, high = 0, cleared = 0;
        reports.forEach(n => {
            const t = triageCache.get(n.id);
            if (!t) return;
            if (t.priorityTier === 'Critical') critical++;
            else if (t.priorityTier === 'High') high++;
            else cleared++;
        });
        document.getElementById('countCritical').textContent = critical;
        document.getElementById('countHigh').textContent = high;
        document.getElementById('countCleared').textContent = cleared;
    }

    // --- MESH HEALTH STRIP ---
    function renderMeshHealth() {
        const phoneNodes = window.MESH_NODES.filter(n => n.type !== 'offline').length;
        const totalNodes = window.MESH_NODES.length;
        const loraRelays = 4; // fixed mock count of LoRa gateway relays for this demo area
        const healthy = phoneNodes / totalNodes > 0.7;

        document.getElementById('meshPhoneCount').textContent = phoneNodes;
        document.getElementById('meshLoraCount').textContent = loraRelays;
        const dot = document.getElementById('meshHealthDot');
        const label = document.getElementById('meshHealthLabel');
        dot.classList.toggle('degraded', !healthy);
        label.textContent = healthy ? 'Network healthy' : 'Degraded — signal gaps detected';
    }

    // --- TABLE ---
    const TIER_ORDER = { Critical: 0, High: 1, Low: 2, pending: 3 };

    function sortedFilteredReports() {
        let reports = getReports().filter(n => {
            if (filterStatus !== 'ALL' && n.status !== filterStatus) return false;
            if (searchText && !n.name.toLowerCase().includes(searchText.toLowerCase()) && !n.id.toLowerCase().includes(searchText.toLowerCase())) return false;
            return true;
        });
        reports.sort((a, b) => {
            let av, bv;
            if (sortKey === 'tier') {
                av = TIER_ORDER[triageCache.get(a.id)?.priorityTier || 'pending'];
                bv = TIER_ORDER[triageCache.get(b.id)?.priorityTier || 'pending'];
            } else if (sortKey === 'name') { av = a.name; bv = b.name; }
            else if (sortKey === 'status') { av = a.status; bv = b.status; }
            else { av = a.lastSignalMin; bv = b.lastSignalMin; }
            if (av < bv) return -1 * sortDir;
            if (av > bv) return 1 * sortDir;
            return 0;
        });
        return reports;
    }

    function needIconsHtml(needs) {
        if (!needs) return '<span style="color:#c1c7d4">—</span>';
        let html = '';
        if (needs.water) html += '<i class="fa-solid fa-droplet" title="Water"></i>';
        if (needs.food) html += '<i class="fa-solid fa-utensils" title="Food"></i>';
        if (needs.meds) html += '<i class="fa-solid fa-briefcase-medical" title="Meds"></i>';
        return html || '<span style="color:#c1c7d4">—</span>';
    }

    function renderTable() {
        const tbody = document.getElementById('priorityTableBody');
        const reports = sortedFilteredReports();
        tbody.innerHTML = reports.map(n => {
            const t = triageCache.get(n.id);
            const tierHtml = t
                ? `<span class="tier-badge ${t.priorityTier}">${t.priorityTier}</span>`
                : `<span class="tier-badge pending">…</span>`;
            return `
                <tr data-id="${n.id}" class="${n.id === selectedNodeId ? 'selected' : ''}">
                    <td><strong>${n.name}</strong><br><span style="color:var(--lgu-text-muted); font-size:10.5px;">${n.id}</span></td>
                    <td>${n.status}</td>
                    <td>${n.town}</td>
                    <td class="need-icons">${needIconsHtml(n.needs)}</td>
                    <td>${tierHtml}</td>
                    <td>${Math.round(n.lastSignalMin)}m ago</td>
                </tr>`;
        }).join('');

        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => selectNode(tr.getAttribute('data-id')));
        });
    }

    // --- AI TRIAGE TAB ---
    function renderAiTab() {
        const list = document.getElementById('aiTriageList');
        const reports = getReports();
        list.innerHTML = reports.map(n => {
            const t = triageCache.get(n.id);
            if (!t) {
                return `<div class="ai-card" data-id="${n.id}"><div class="ai-card-head"><span class="ai-card-name">${n.name}</span><span class="tier-badge pending">Analyzing…</span></div></div>`;
            }
            return `
                <div class="ai-card" data-id="${n.id}">
                    <div class="ai-card-head">
                        <span class="ai-card-name">${n.name}</span>
                        <span class="tier-badge ${t.priorityTier}">${t.priorityTier}</span>
                    </div>
                    <div class="ai-card-reasoning">${t.reasoning}</div>
                    <div class="ai-card-action"><i class="fa-solid fa-kit-medical"></i> ${t.recommendedAction}</div>
                    <div class="ai-card-source">${t.source === 'gemini' ? 'Gemini AI' : 'Rule-based fallback'}</div>
                </div>`;
        }).join('');

        list.querySelectorAll('.ai-card').forEach(card => {
            card.addEventListener('click', () => selectNode(card.getAttribute('data-id')));
        });
    }

    // --- DETAIL PANEL ---
    function renderDetail() {
        const panel = document.getElementById('detailPanelBody');
        const node = getReports().find(n => n.id === selectedNodeId);
        if (!node) {
            panel.innerHTML = '<div class="detail-empty">Tap a marker or a row in the list to see victim details and route.</div>';
            return;
        }

        const t = triageCache.get(node.id);
        const nearest = nearestRescuer(node);
        const flags = Object.keys(node.flags || {}).filter(k => node.flags[k]);

        panel.innerHTML = `
            <div class="detail-body">
                <div><div class="detail-field-label">Reporter</div><div class="detail-field-value">${node.name}</div></div>
                <div><div class="detail-field-label">Status</div><div class="detail-field-value">${node.status}</div></div>
                <div><div class="detail-field-label">Priority (AI)</div><div class="detail-field-value">${t ? `<span class="tier-badge ${t.priorityTier}">${t.priorityTier}</span>` : 'Analyzing…'}</div></div>

                <div><div class="detail-field-label">Location</div><div class="detail-field-value" style="font-size:12px;">${node.lat.toFixed(4)}, ${node.lng.toFixed(4)} (${node.town})</div></div>
                <div><div class="detail-field-label">Supplies needed</div><div class="detail-field-value" style="font-size:14px;">${needIconsHtml(node.needs)}</div></div>
                <div><div class="detail-field-label">Vulnerability flags</div><div class="detail-field-value" style="font-size:13px;">${flags.length ? flags.join(', ') : 'None'}</div></div>

                <div><div class="detail-field-label">Last signal</div><div class="detail-field-value">${Math.round(node.lastSignalMin)} min ago</div></div>
                <div><div class="detail-field-label">Nearest rescue team</div><div class="detail-field-value" style="font-size:13px;">${nearest ? `${nearest.rescuer.name} — ${nearest.d.toFixed(2)} km` : 'None available'}</div></div>
                <div><div class="detail-field-label">Recommended action</div><div class="detail-field-value" style="font-size:13px;">${t ? t.recommendedAction : 'Analyzing…'}</div></div>
            </div>`;
    }

    function selectNode(id) {
        selectedNodeId = id;
        const node = getReports().find(n => n.id === id);
        renderTable();
        renderDetail();
        if (node) window.lguMap.drawRouteTo(node);
        // Deep-linkable case reference: reflect the selection in the URL
        // (no new history entry, no re-triggering hashchange) so a report
        // can be bookmarked or shared and reopened directly. See lgu-deeplink.js.
        if (id) history.replaceState(null, '', `#${id}`);
    }
    window.lguSelectNode = selectNode;

    // --- AI TRIAGE ORCHESTRATION ---
    async function runTriage() {
        const reports = getReports();
        const btn = document.getElementById('runTriageBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Analyzing…'; }

        // Instant rule-based pass so the UI is never empty, then upgrade to
        // Gemini results (or keep fallback) as each call resolves.
        reports.forEach(n => triageCache.set(n.id, window.ruleBasedTriage(n)));
        renderSummary(); renderTable(); renderAiTab(); renderDetail();

        await Promise.all(reports.map(async n => {
            const result = await window.getAiTriage(n);
            triageCache.set(n.id, result);
            renderSummary(); renderTable(); renderAiTab(); renderDetail();
        }));

        if (btn) { btn.disabled = false; btn.textContent = 'Re-run AI Triage'; }
    }

    // --- TABS ---
    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });
    }

    function initTableControls() {
        document.querySelectorAll('.priority-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.getAttribute('data-sort');
                sortDir = sortKey === key ? -sortDir : 1;
                sortKey = key;
                renderTable();
            });
        });
        document.getElementById('statusFilter').addEventListener('change', e => {
            filterStatus = e.target.value;
            renderTable();
        });
        document.getElementById('searchInput').addEventListener('input', e => {
            searchText = e.target.value;
            renderTable();
        });
        document.getElementById('runTriageBtn').addEventListener('click', runTriage);
    }

    function refreshAll() {
        renderSummary();
        renderMeshHealth();
        renderTable();
        renderAiTab();
        renderDetail();
        window.lguMap.renderMarkers(getReports().concat(window.MESH_NODES.filter(n => n.type === 'rescuer' || n.type === 'volunteer')), n => selectNode(n.id));
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.lguMap.load();
        initTabs();
        initTableControls();
        renderDetail();

        // Map-dependent bits (markers) render once Google Maps is ready; everything
        // else (cards, table, health strip) must not wait on that — there may be no
        // API key configured at all, in which case "ready" never fires.
        window.lguMap.onReady(() => refreshAll());

        window.addEventListener('mesh:update', () => {
            refreshAll();
            // Re-triage nodes we haven't scored yet (e.g. newly-gone-offline ghosts).
            getReports().forEach(n => { if (!triageCache.has(n.id)) triageCache.set(n.id, window.ruleBasedTriage(n)); });
        });
        window.startMeshSimulator(5000);

        renderSummary();
        renderMeshHealth();
        runTriage();
    });
})();
