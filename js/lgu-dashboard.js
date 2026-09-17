/*
  LGU / Command Center dashboard logic: summary cards, priority table,
  AI Triage panel (backed by js/gemini-triage.js), detail panel, and the
  mesh/network health strip. Map rendering lives in js/lgu-map.js.
*/
(function () {
    const triageCache = new Map(); // node.id -> { priorityTier, reasoning, recommendedAction, source, fingerprint }
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
        let critical = 0, high = 0, low = 0;
        reports.forEach(n => {
            const t = triageCache.get(n.id);
            if (!t) return;
            if (t.priorityTier === 'Critical') critical++;
            else if (t.priorityTier === 'High') high++;
            else low++;
        });
        document.getElementById('countCritical').textContent = critical;
        document.getElementById('countHigh').textContent = high;
        document.getElementById('countLow').textContent = low;
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

    // Dispatch state a rescuer set from the field. Worth a badge on the list
    // itself rather than only in the detail panel: the question "is anyone on
    // this yet" is the one the board is scanned for.
    function claimBadge(n) {
        if (n.resolved) return `<span class="claim-badge is-resolved" title="Reached and cleared">Cleared</span>`;
        if (n.claimedByName) return `<span class="claim-badge" title="Claimed by ${n.claimedByName}">${n.claimedByName}</span>`;
        return '';
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
                    <td>${n.status}${claimBadge(n)}</td>
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
                <div><div class="detail-field-label">Responding</div><div class="detail-field-value" style="font-size:13px;">${node.resolved ? `Reached and cleared${node.resolvedByName ? ` by ${node.resolvedByName}` : ''}` : (node.claimedByName || 'Nobody yet')}</div></div>
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

    // A cached score is only valid while the report it was scored from is
    // unchanged. Triage reads status, unmet needs, vulnerability flags, and
    // whether the signal has gone stale — but NOT the exact minute count,
    // which drifts on every mesh tick and would otherwise invalidate every
    // score constantly. Comparing this fingerprint is what makes a citizen
    // who taps SOS stop showing the tier they were scored at on connect.
    function triageFingerprint(node) {
        const setKeys = obj => Object.keys(obj || {}).filter(k => obj[k]).sort().join(',');
        // 30 min is the staleness threshold ruleBasedTriage itself uses.
        const freshness = node.lastSignalMin > 30 ? 'stale' : 'fresh';
        return [node.status, setKeys(node.needs), setKeys(node.flags), freshness].join('|');
    }

    function cacheTriage(node, result, fingerprint) {
        triageCache.set(node.id, { ...result, fingerprint: fingerprint || triageFingerprint(node) });
    }

    // Rescore every report whose inputs no longer match its cached score, using
    // the instant rule-based pass so a badge is never stale or empty. Returns
    // the reports that changed, for the Gemini pass to upgrade.
    function rescoreChangedReports() {
        const changed = [];
        getReports().forEach(n => {
            const fingerprint = triageFingerprint(n);
            if (triageCache.get(n.id)?.fingerprint === fingerprint) return;
            cacheTriage(n, window.ruleBasedTriage(n), fingerprint);
            changed.push(n);
        });
        return changed;
    }

    // Gemini upgrades are debounced and batched: ambient mesh traffic can change
    // several reports a second, and each upgrade is a network call.
    const pendingUpgrade = new Map(); // node.id -> fingerprint when queued
    let upgradeTimer = null;

    function queueGeminiUpgrade(nodes) {
        nodes.forEach(n => pendingUpgrade.set(n.id, triageFingerprint(n)));
        clearTimeout(upgradeTimer);
        upgradeTimer = setTimeout(flushGeminiUpgrade, 1500);
    }

    async function flushGeminiUpgrade() {
        const batch = [...pendingUpgrade.entries()];
        pendingUpgrade.clear();

        await Promise.all(batch.map(async ([id, queuedAt]) => {
            const node = getReports().find(n => n.id === id);
            if (!node) return; // report left the mesh while we were queued
            const result = await window.getAiTriage(node);
            // The report may have changed again mid-flight — in that case the
            // rule-based score already reflects the newer state, so keep it
            // rather than overwriting it with an answer to the old question.
            const current = triageFingerprint(node);
            if (current !== queuedAt) return;
            cacheTriage(node, result, current);
        }));

        renderSummary(); renderTable(); renderAiTab(); renderDetail();
    }

    async function runTriage() {
        const reports = getReports();
        const btn = document.getElementById('runTriageBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Analyzing…'; }

        // Instant rule-based pass so the UI is never empty, then upgrade to
        // Gemini results (or keep fallback) as each call resolves.
        reports.forEach(n => cacheTriage(n, window.ruleBasedTriage(n)));
        renderSummary(); renderTable(); renderAiTab(); renderDetail();

        await Promise.all(reports.map(async n => {
            const fingerprint = triageFingerprint(n);
            const result = await window.getAiTriage(n);
            if (triageFingerprint(n) !== fingerprint) return; // changed mid-flight
            cacheTriage(n, result, fingerprint);
            renderSummary(); renderTable(); renderAiTab(); renderDetail();
        }));

        if (btn) { btn.disabled = false; btn.textContent = 'Re-run AI Triage'; }
    }

    // --- TABS ---
    // Sidebar nav (Dashboard / Reports / AI Triage) and the panel's own tab
    // strip drive the same tab state, kept in sync both ways. The map card
    // is always visible beside the panel (not a separate view to navigate
    // to), so "Dashboard" is the resting/overview state rather than a tab of
    // its own; opening a report's Details (via a row/marker click, not a nav
    // click) also reads as "Dashboard" since it isn't a top-level destination.
    const NAV_FOR_TAB = { tabList: 'navReports', tabAi: 'navAi', tabDetail: 'navDashboard' };

    function setActiveNav(navId) {
        document.querySelectorAll('.lgu-nav-item').forEach(n => n.classList.toggle('active', n.id === navId));
    }

    function activateTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tabId));
        setActiveNav(NAV_FOR_TAB[tabId] || 'navDashboard');
    }
    window.lguGoToPanelTab = function (tabId) {
        if (tabId) activateTab(tabId); else setActiveNav('navDashboard');
    };

    window.lguToggleSettings = function () {
        const toggle = document.getElementById('lguSettingsToggle');
        const panel = document.getElementById('lguSettingsPanel');
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
    };

    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => activateTab(btn.dataset.tab));
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
            // Rescore BEFORE rendering, so a report that just changed — a citizen
            // tapping SOS, a node going dark — is drawn at its new priority in the
            // same frame, instead of showing its previous tier until someone hits
            // "Re-run AI Triage".
            const changed = rescoreChangedReports();
            refreshAll();
            if (changed.length) queueGeminiUpgrade(changed);
        });

        // With the live-sync server (js/realtime-client.js) reachable, mesh
        // updates come from there (shared with the citizen app) instead —
        // only fall back to the old client-only random simulator if there's
        // no server to talk to.
        if (window.realtime) {
            window.addEventListener('realtime:unavailable', () => window.startMeshSimulator(5000));
        } else {
            window.startMeshSimulator(5000);
        }

        renderSummary();
        renderMeshHealth();
        runTriage();
    });
})();
