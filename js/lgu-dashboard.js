/*
  LGU / Command Center dashboard logic: summary cards, priority table,
  AI Triage panel (backed by js/gemini-triage.js), detail panel, and the
  mesh/network health strip. Map rendering lives in js/lgu-map.js.
*/
(function () {
    const triageCache = new Map(); // node.id -> { priorityTier, reasoning, recommendedAction, source, fingerprint }
    let selectedNodeId = null;
    let sortKey = 'tier';
    let filterStatus = 'ALL';
    let searchText = '';

    // "Reports" = anything a person/ghost node filed. Rescuers, volunteers and
    // the command centre are mesh assets, not incoming reports, so they're
    // excluded from the list.
    const ASSET_TYPES = ['rescuer', 'volunteer', 'lgu'];
    function getReports() {
        return window.MESH_NODES.filter(n => !ASSET_TYPES.includes(n.type));
    }

    // --- MESH DISTANCE TO THE GATEWAY ---
    // How many relays a report's data crossed to reach the command centre.
    // A report five hops out is the one whose information is oldest and most
    // likely to have gone stale in transit, which is dispatch-relevant and was
    // previously invisible. Recomputed per render because the mesh moves.
    let hopByNodeId = new Map();
    function recomputeHops() {
        hopByNodeId = new Map();
        // HQ is a fixed constant rather than a mesh node, so it is joined to
        // the graph here — it is the root the hop count is measured from.
        const live = window.MESH_NODES.filter(n => n.type !== 'offline').concat([window.LGU_HQ]);
        const hqIndex = live.length - 1;
        const { depth } = window.meshGraph.hops(live, window.meshGraph.build(live), hqIndex);
        live.forEach((n, i) => { if (depth[i] > 0) hopByNodeId.set(n.id, depth[i]); });
    }
    function hopBadge(n) {
        const h = hopByNodeId.get(n.id);
        if (!h) return '';
        return `<span class="hop-badge" title="${h} mesh hop${h === 1 ? '' : 's'} from the Command Center">${h}<i class="fa-solid fa-tower-broadcast"></i></span>`;
    }

    function haversineKm(a, b) {
        const R = 6371;
        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLng = (b.lng - a.lng) * Math.PI / 180;
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    // A team already on a case is not available for another one. The claim
    // data has always been here; the suggestion just never consulted it, so a
    // committed team could be recommended for a second call-out.
    function isCommitted(rescuer) {
        return window.MESH_NODES.some(n => n.claimedBy === rescuer.id && !n.resolved);
    }

    // One calculation, used by both the Details panel and the route drawn on
    // the map. They used to disagree: the panel named the nearest team while
    // drawRouteTo drew from whichever rescuer sat first in the array.
    function suggestResponder(node) {
        const rescuers = window.MESH_NODES.filter(n => n.type === 'rescuer');
        if (!rescuers.length) return null;
        const ranked = rescuers
            .map(r => ({ rescuer: r, d: haversineKm(node, r), committed: isCommitted(r) }))
            .sort((a, b) => (a.committed - b.committed) || (a.d - b.d));
        return ranked[0];
    }

    // ~18 km/h: a rescue vehicle through flooded barangay roads, well under
    // any open-road figure. Straight-line distance, so it is a floor, not a
    // promise — the label says "est".
    function etaMinutes(km) {
        return Math.max(1, Math.round((km / 18) * 60));
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
            if (av < bv) return -1;
            if (av > bv) return 1;
            return 0;
        });
        return reports;
    }

    function needIconsHtml(needs) {
        if (!needs) return '<span style="color:var(--ink-muted)">—</span>';
        let html = '';
        if (needs.water) html += '<i class="fa-solid fa-droplet" title="Water"></i>';
        if (needs.food) html += '<i class="fa-solid fa-utensils" title="Food"></i>';
        if (needs.meds) html += '<i class="fa-solid fa-briefcase-medical" title="Meds"></i>';
        return html || '<span style="color:var(--ink-muted)">—</span>';
    }

    // Dispatch state a rescuer set from the field. Worth a badge on the list
    // itself rather than only in the detail panel: the question "is anyone on
    // this yet" is the one the board is scanned for.
    function claimBadge(n) {
        if (n.resolved) return `<span class="claim-badge is-resolved" title="Reached and cleared">Cleared</span>`;
        if (n.claimedByName) return `<span class="claim-badge" title="Claimed by ${n.claimedByName}">${n.claimedByName}</span>`;
        return '';
    }

    // Two lines per report rather than six columns. At 460px the table wanted
    // 523px, so "Updated" — how stale a report is — was the column that fell
    // off the edge, and 60 cells wrapped into uneven 51/66px rows. Rows cannot
    // clip, and a list that has to be scanned under pressure needs one height.
    //
    // Location is gone: across the whole dataset it held two values, and the
    // Details panel already gives exact coordinates.
    function renderTable() {
        const list = document.getElementById('priorityTableBody');
        const reports = sortedFilteredReports();

        if (!reports.length) {
            list.innerHTML = '<div class="report-empty">No reports match this filter.</div>';
            return;
        }

        list.innerHTML = reports.map(n => {
            const t = triageCache.get(n.id);
            const tierHtml = t
                ? `<span class="tier-badge ${t.priorityTier}">${t.priorityTier}</span>`
                : `<span class="tier-badge pending">…</span>`;
            return `
                <button class="report-row${n.id === selectedNodeId ? ' selected' : ''}" data-id="${n.id}">
                    <span class="report-row-head">
                        <span class="report-name">${n.name}</span>
                        <span class="report-id">${n.id}</span>
                        ${tierHtml}
                    </span>
                    <span class="report-row-meta">
                        <span class="report-status status-${String(n.status).toLowerCase()}">${n.status}</span>
                        <span class="need-icons">${needIconsHtml(n.needs)}</span>
                        <span class="report-age">${Math.round(n.lastSignalMin)}m ago</span>
                        ${hopBadge(n)}
                        ${claimBadge(n)}
                    </span>
                </button>`;
        }).join('');

        list.querySelectorAll('.report-row').forEach(row => {
            row.addEventListener('click', () => selectNode(row.getAttribute('data-id')));
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

    function medicalSummary(med) {
        const parts = [med.blood, med.allergies && `Allergies: ${med.allergies}`, med.conditions]
            .filter(Boolean);
        // An unfilled record is an unknown, not a clean bill of health.
        return parts.length ? parts.join(' · ') : '<span style="color:var(--ink-muted)">Not provided</span>';
    }

    // The suggestion and the Dispatch button that acts on it. Dispatching
    // writes the same claim a rescuer sets from the field — one piece of state
    // whether the assignment was taken or given — so the team sees it as their
    // active case in the citizen app.
    function responderBlock(node, suggested) {
        if (node.resolved) {
            return `<div class="responder-block is-done">
                <div class="responder-label">Resolved</div>
                <div class="responder-name">Reached and cleared${node.resolvedByName ? ` by ${node.resolvedByName}` : ''}</div>
            </div>`;
        }
        if (node.claimedByName) {
            return `<div class="responder-block is-assigned">
                <div class="responder-label">Responding</div>
                <div class="responder-name">${node.claimedByName}</div>
                <div class="responder-meta">${node.dispatchedByLgu ? 'Dispatched from the Command Center' : 'Self-assigned from the field'}${enRouteLabel(node)}</div>
            </div>`;
        }
        if (!suggested) {
            return `<div class="responder-block"><div class="responder-label">Suggested responder</div>
                <div class="responder-meta">No rescue teams on the mesh.</div></div>`;
        }
        const { rescuer, d, committed } = suggested;
        return `<div class="responder-block">
            <div class="responder-label">Suggested responder</div>
            <div class="responder-name">${rescuer.name}</div>
            <div class="responder-meta">${d.toFixed(2)} km · ~${etaMinutes(d)} min est · ${committed ? 'already on another case' : 'available'}</div>
            <button class="btn primary responder-dispatch" id="dispatchBtn" data-rescuer="${rescuer.id}"${committed ? ' disabled' : ''}>
                <i class="fa-solid fa-paper-plane"></i> Dispatch ${rescuer.name}
            </button>
        </div>`;
    }

    function enRouteLabel(node) {
        if (!node.claimedAt) return '';
        const mins = Math.max(0, Math.round((Date.now() - node.claimedAt) / 60000));
        return ` · en route ${mins} min`;
    }

    function dispatchTo(targetId, rescuerId) {
        if (!rescuerId || !window.realtime) return;
        window.realtime.sendDispatch(targetId, rescuerId);
    }

    // --- IN PROGRESS TAB ---
    // The question "what is happening right now" had nowhere to be answered:
    // a claim only showed as a badge on whichever row you happened to be
    // looking at. This is every case a team is currently on, in one place.
    function renderInProgress() {
        const el = document.getElementById('inProgressList');
        if (!el) return;
        const active = getReports().filter(n => n.claimedBy && !n.resolved);

        if (!active.length) {
            el.innerHTML = '<div class="report-empty">No rescues in progress. Dispatch a team from a report’s Details tab.</div>';
            return;
        }

        el.innerHTML = active.map(n => {
            const med = n.medical || {};
            const flags = Object.keys(n.flags || {}).filter(k => n.flags[k]);
            return `
                <button class="report-row progress-row" data-id="${n.id}">
                    <span class="report-row-head">
                        <span class="report-name">${n.name}</span>
                        <span class="report-id">${n.id}</span>
                        <span class="claim-badge">${n.claimedByName || 'Assigned'}</span>
                    </span>
                    <span class="report-row-meta">
                        <span class="report-status status-${String(n.status).toLowerCase()}">${n.status}</span>
                        <span class="need-icons">${needIconsHtml(n.needs)}</span>
                        <span class="report-age">${n.claimedAt ? `en route ${Math.max(0, Math.round((Date.now() - n.claimedAt) / 60000))} min` : 'just assigned'}</span>
                    </span>
                    <span class="progress-detail">${medicalSummary(med)}${flags.length ? ` · ${flags.join(', ')}` : ''}</span>
                </button>`;
        }).join('');

        el.querySelectorAll('.report-row').forEach(row => {
            row.addEventListener('click', () => selectNode(row.getAttribute('data-id')));
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
        const suggested = suggestResponder(node);
        const flags = Object.keys(node.flags || {}).filter(k => node.flags[k]);
        const med = node.medical || {};
        const hops = hopByNodeId.get(node.id);

        panel.innerHTML = `
            <div class="detail-body">
                <div><div class="detail-field-label">Reporter</div><div class="detail-field-value">${node.name}</div></div>
                <div><div class="detail-field-label">Status</div><div class="detail-field-value">${node.status}</div></div>
                <div><div class="detail-field-label">Priority (AI)</div><div class="detail-field-value">${t ? `<span class="tier-badge ${t.priorityTier}">${t.priorityTier}</span>` : 'Analyzing…'}</div></div>

                <div><div class="detail-field-label">Location</div><div class="detail-field-value" style="font-size:12px;">${node.lat.toFixed(4)}, ${node.lng.toFixed(4)} (${node.town})</div></div>
                <div><div class="detail-field-label">Supplies needed</div><div class="detail-field-value" style="font-size:14px;">${needIconsHtml(node.needs)}</div></div>
                <div><div class="detail-field-label">Vulnerability flags</div><div class="detail-field-value" style="font-size:13px;">${flags.length ? flags.join(', ') : 'None'}</div></div>

                <div><div class="detail-field-label">Last signal</div><div class="detail-field-value">${Math.round(node.lastSignalMin)} min ago</div></div>
                <div><div class="detail-field-label">Mesh distance</div><div class="detail-field-value" style="font-size:13px;">${hops ? `${hops} hop${hops === 1 ? '' : 's'} from the Command Center` : 'Direct / unknown'}</div></div>
                <div><div class="detail-field-label">Medical</div><div class="detail-field-value" style="font-size:13px;">${medicalSummary(med)}</div></div>
                <div><div class="detail-field-label">Recommended action</div><div class="detail-field-value" style="font-size:13px;">${t ? t.recommendedAction : 'Analyzing…'}</div></div>
            </div>
            ${responderBlock(node, suggested)}`;

        const btn = document.getElementById('dispatchBtn');
        if (btn) btn.addEventListener('click', () => dispatchTo(node.id, btn.dataset.rescuer));
    }

    function selectNode(id) {
        selectedNodeId = id;
        const node = getReports().find(n => n.id === id);
        renderTable();
        renderDetail();
        // The route is drawn from the team the panel is recommending, so the
        // line and the text can never name different teams.
        const suggested = node && (node.claimedBy
            ? { rescuer: window.MESH_NODES.find(r => r.id === node.claimedBy) }
            : suggestResponder(node));
        window.lguMap.drawRouteTo(node, suggested && suggested.rescuer);
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
    const NAV_FOR_TAB = { tabList: 'navReports', tabAi: 'navAi', tabProgress: 'navReports', tabDetail: 'navDashboard' };

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
        // Each key has one sensible direction — worst first, freshest first,
        // A-Z — so the reverse toggle went with the column headers that used
        // to carry it. There is nothing left to click twice.
        document.getElementById('sortSelect').addEventListener('change', e => {
            sortKey = e.target.value;
            renderTable();
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
        // Hops first: the list, the detail panel and the map all read the map
        // it builds, so it has to be current before any of them render.
        recomputeHops();
        renderSummary();
        renderMeshHealth();
        renderTable();
        renderInProgress();
        renderAiTab();
        renderDetail();
        // Everything plots, assets included — the command centre and the teams
        // are as much a part of the picture as the reports.
        window.lguMap.renderMarkers(window.MESH_NODES, n => selectNode(n.id));
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
