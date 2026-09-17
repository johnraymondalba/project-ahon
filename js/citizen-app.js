/*
  Citizen app UI logic: status chips, supply needs, vulnerability flags, SOS
  broadcast, volunteer mode, the mesh connection indicator, Home/Volunteer
  summaries, and the local-only Profile / Emergency Contacts / Settings /
  Activity pages (localStorage — personal to this device, not broadcast
  except where noted). Map rendering lives in citizen-map.js; shared mesh
  data lives in mock-data.js.
*/
(function () {
    const LS = {
        profile: 'ahon.profile',
        contacts: 'ahon.contacts',
        activity: 'ahon.activity',
        settings: 'ahon.settings',
        // Rescuer is a role you are, not a mode you happen to be in, so unlike
        // volunteer it survives a reload.
        rescuer: 'ahon.rescuer',
    };

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable — degrade silently */ }
    }

    const appState = {
        self: { lat: window.SELF_NODE_START.lat, lng: window.SELF_NODE_START.lng },
        sos: false,
        volunteer: false,
        rescuer: false,
        statusLabel: 'SAFE',
        needs: { water: false, food: false, meds: false, pets: false, family: false },
        flags: { pwd: false, elder: false, infant: false },
    };

    function render() {
        window.citizenMap.render(appState);
        renderHomeSummary();
    }

    // --- ACTIVITY LOG ---
    function logActivity(text, icon, colorVar) {
        const list = readJSON(LS.activity, []);
        list.unshift({ time: Date.now(), text, icon: icon || 'fa-solid fa-circle-info', color: colorVar || '--ink-secondary' });
        writeJSON(LS.activity, list.slice(0, 50));
    }
    window.logActivity = logActivity;

    function relativeTime(ts) {
        const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.round(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.round(hrs / 24)}d ago`;
    }

    function renderActivity() {
        const list = readJSON(LS.activity, []);
        const el = document.getElementById('activityList');
        if (!el) return;
        if (!list.length) {
            el.innerHTML = '<div class="activity-empty">Nothing reported yet. Actions like SOS, status changes, and supply requests show up here.</div>';
            return;
        }
        el.innerHTML = list.map(item => `
            <div class="activity-row">
                <div class="activity-icon" style="background:color-mix(in srgb, var(${item.color}) 20%, var(--surface)); color:var(${item.color})"><i class="${item.icon}"></i></div>
                <div class="activity-body">
                    <div class="activity-text">${item.text}</div>
                    <div class="activity-time">${relativeTime(item.time)}</div>
                </div>
            </div>`).join('');
    }

    // --- MY SITUATION ---
    window.setStatus = function (status) {
        if ((appState.volunteer || appState.rescuer) && !appState.sos) return;
        const changed = appState.statusLabel !== status;
        appState.statusLabel = status;

        document.querySelectorAll('.chip').forEach(c => c.className = 'chip');
        const idMap = { SAFE: 'chip-safe', TRAPPED: 'chip-trapped', INJURED: 'chip-injured', RESCUE: 'chip-rescue' };
        const classMap = { SAFE: 'active-safe', TRAPPED: 'active-trapped', INJURED: 'active-injured', RESCUE: 'active-rescue' };
        const chipId = idMap[status];
        if (chipId) document.getElementById(chipId).classList.add(classMap[status]);
        if (window.realtime) window.realtime.sendStatus(status);
        if (changed) logActivity(`Marked yourself ${status}`, statusIcon(status), statusColorVar(status));
        render();
    };

    function statusIcon(status) {
        return { SAFE: 'fa-solid fa-circle-check', TRAPPED: 'fa-solid fa-house-chimney-crack', INJURED: 'fa-solid fa-hand-holding-medical' }[status] || 'fa-solid fa-circle-info';
    }
    function statusColorVar(status) {
        return { SAFE: '--success', TRAPPED: '--warning', INJURED: '--accent' }[status] || '--ink-secondary';
    }

    // --- SUPPLIES NEEDED ---
    window.toggleNeed = function (type) {
        appState.needs[type] = !appState.needs[type];
        const btn = document.getElementById(`btn-${type}`);
        btn.classList.toggle(`active-${type}`, appState.needs[type]);
        if (window.realtime) window.realtime.sendNeed(type, appState.needs[type]);
        const label = { water: 'Water', food: 'Food', meds: 'Meds', pets: 'Has Pets', family: 'Family' }[type];
        logActivity(`${appState.needs[type] ? 'Requested' : 'Cleared request for'} ${label}`, 'fa-solid fa-box-open', '--info');
        render();
    };

    // --- VULNERABILITY FLAGS ---
    window.toggleFlag = function (key) {
        appState.flags[key] = !appState.flags[key];
        const chip = document.getElementById(`flag-${key}`);
        if (chip) chip.classList.toggle('active', appState.flags[key]);
        if (window.realtime) window.realtime.sendFlag(key, appState.flags[key]);
    };

    // --- BROADCAST SOS ---
    window.isSOSActive = function () { return appState.sos; };

    function applySOS(on) {
        appState.sos = on;
        [document.getElementById('sosBtn'), document.getElementById('sosFab'), document.getElementById('sosBtnMap')].forEach(btn => btn && btn.classList.toggle('active', on));
        const label = document.getElementById('sosLabel');
        if (label) label.innerText = on ? 'SOS ACTIVE' : 'SOS';
        const labelMap = document.getElementById('sosLabelMap');
        if (labelMap) labelMap.innerText = on ? 'SOS ACTIVE' : 'Broadcast SOS';
        const banner = document.getElementById('sosBanner');
        if (banner) banner.classList.toggle('visible', on);
        if (window.realtime) window.realtime.sendSOS(on);
    }

    window.toggleSOS = function () {
        const on = !appState.sos;
        // Needing help and being able to give it are mutually exclusive. A
        // responder who broadcasts SOS is no longer responding, and leaving
        // both flags set would tell the mesh two contradictory things.
        if (on && appState.volunteer) {
            applyVolunteer(false);
            logActivity('Volunteer mode ended — you broadcast SOS', 'fa-solid fa-hand-holding-heart', '--volunteer');
        }
        if (on && appState.rescuer) {
            applyRescuer(false);
            logActivity('Rescuer mode ended — you broadcast SOS', 'fa-solid fa-helmet-safety', '--success-dark');
        }
        applySOS(on);
        logActivity(on ? 'Broadcast SOS' : 'Cancelled SOS broadcast', 'fa-solid fa-tower-broadcast', '--accent');
        render();
    };

    // Reporting your own situation is for people who need help. Neither a
    // volunteer nor a rescuer on duty is one, so the chips lock for both.
    function syncSituationLock() {
        const situation = document.getElementById('mapSheetSituation');
        if (situation) situation.classList.toggle('is-disabled', appState.volunteer || appState.rescuer);
    }

    // --- VOLUNTEER MODE ---
    function applyVolunteer(on) {
        appState.volunteer = on;
        const checkbox = document.getElementById('volunteerCheck');
        if (checkbox) checkbox.checked = on;
        if (window.realtime) window.realtime.sendVolunteer(on);
        syncSituationLock();
    }

    window.toggleVolunteer = function () {
        const checkbox = document.getElementById('volunteerCheck');
        if (!checkbox.checked) {
            applyVolunteer(false);
            logActivity('Turned off Volunteer mode', 'fa-solid fa-hand-holding-heart', '--volunteer');
            render();
            return;
        }
        // Going on duty is confirmed, because it can cancel an active SOS.
        // Snap the switch back until the answer comes — a control that reads
        // "on" while the sheet is still asking has already lied.
        checkbox.checked = false;
        window.openVolunteerSheet();
    };

    window.confirmVolunteer = function () {
        if (appState.sos) {
            applySOS(false);
            logActivity('Cancelled SOS — you switched to Volunteer mode', 'fa-solid fa-tower-broadcast', '--accent');
        }
        if (appState.rescuer) {
            applyRescuer(false);
            logActivity('Rescuer mode ended — you switched to Volunteer mode', 'fa-solid fa-helmet-safety', '--success-dark');
        }
        applyVolunteer(true);
        logActivity('Turned on Volunteer mode', 'fa-solid fa-hand-holding-heart', '--volunteer');
        render();
    };

    // --- RESCUER MODE ---
    // Declared in Profile rather than on the map, because it says what you are
    // to the mesh rather than what you are doing this minute.
    window.isRescuerActive = function () { return appState.rescuer; };

    function applyRescuer(on) {
        appState.rescuer = on;
        const checkbox = document.getElementById('rescuerCheck');
        if (checkbox) checkbox.checked = on;
        writeJSON(LS.rescuer, on);
        if (window.realtime) window.realtime.sendRescuer(on);
        syncSituationLock();
        // Going off duty must not leave a case locked to you — nobody else can
        // take it while it still reads as taken.
        if (!on && window.rescuerCases) window.rescuerCases.releaseAll();
    }

    window.toggleRescuer = function () {
        const on = document.getElementById('rescuerCheck').checked;
        if (on && appState.sos) {
            applySOS(false);
            logActivity('Cancelled SOS — you went on duty as a rescuer', 'fa-solid fa-tower-broadcast', '--accent');
        }
        if (on && appState.volunteer) {
            applyVolunteer(false);
            logActivity('Volunteer mode ended — you went on duty as a rescuer', 'fa-solid fa-hand-holding-heart', '--volunteer');
        }
        applyRescuer(on);
        logActivity(on ? 'Went on duty as a rescuer' : 'Went off duty as a rescuer', 'fa-solid fa-helmet-safety', '--success-dark');
        render();
    };

    window.toggleLegend = function () {
        document.getElementById('legendBox').classList.toggle('minimized');
    };

    window.toggleMapSheet = function () {
        document.getElementById('mapSheet').classList.toggle('collapsed');
    };

    // --- HOME: status summary + quick-action highlight ---
    function renderHomeSummary() {
        const icon = document.getElementById('statusSummaryIcon');
        const value = document.getElementById('statusSummaryValue');
        if (!icon || !value) return;

        let label = appState.statusLabel.charAt(0) + appState.statusLabel.slice(1).toLowerCase();
        let colorVar = statusColorVar(appState.statusLabel);
        let iconClass = statusIcon(appState.statusLabel);
        if (appState.sos) { label = 'SOS active'; colorVar = '--accent'; iconClass = 'fa-solid fa-tower-broadcast'; }
        else if (appState.rescuer) { label = 'On duty'; colorVar = '--success-dark'; iconClass = 'fa-solid fa-helmet-safety'; }
        else if (appState.volunteer) { label = 'Volunteering'; colorVar = '--volunteer'; iconClass = 'fa-solid fa-hand-holding-heart'; }

        value.textContent = label;
        icon.innerHTML = `<i class="${iconClass}"></i>`;
        icon.style.background = `color-mix(in srgb, var(${colorVar}) 20%, var(--surface))`;
        icon.style.color = `var(${colorVar})`;

        ['trapped', 'injured'].forEach(key => {
            const card = document.getElementById(`qa-${key}`);
            if (card) card.classList.toggle('is-active', appState.statusLabel === key.toUpperCase());
        });
    }

    // --- PROFILE (local only, this device) ---
    function loadProfile() {
        const p = readJSON(LS.profile, {});
        ['name', 'age', 'blood', 'height', 'weight', 'allergies', 'conditions'].forEach(key => {
            const input = document.getElementById(`profile${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (input) input.value = p[key] || '';
        });
        document.getElementById('profileCardName').textContent = p.name || 'Citizen';
        document.querySelectorAll('.greeting-text h1')[0].textContent = p.name ? `Hello, ${p.name.split(' ')[0]}` : 'Hello, Citizen';
        ['pwd', 'elder', 'infant'].forEach(key => {
            const chip = document.getElementById(`flag-${key}`);
            if (chip) chip.classList.toggle('active', !!appState.flags[key]);
        });
    }
    window.saveProfileField = function (key, value) {
        const p = readJSON(LS.profile, {});
        p[key] = value;
        writeJSON(LS.profile, p);
        if (key === 'name') {
            document.getElementById('profileCardName').textContent = value || 'Citizen';
            document.querySelectorAll('.greeting-text h1')[0].textContent = value ? `Hello, ${value.split(' ')[0]}` : 'Hello, Citizen';
        }
    };

    // --- EMERGENCY CONTACTS (local only, this device) ---
    function renderContacts() {
        const list = readJSON(LS.contacts, []);
        const el = document.getElementById('personalContactsList');
        if (!el) return;
        if (!list.length) { el.innerHTML = ''; return; }
        el.innerHTML = list.map((c, i) => `
            <div class="contact-row">
                <div class="contact-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="contact-body"><div class="contact-name">${c.name}</div><div class="contact-sub">Personal contact</div></div>
                <a class="contact-call" href="tel:${encodeURIComponent(c.phone)}" aria-label="Call ${c.name}"><i class="fa-solid fa-phone"></i></a>
                <button class="contact-call" style="background:var(--accent-tint);color:var(--accent-dark);border:none;margin-left:4px;cursor:pointer;" onclick="removePersonalContact(${i})" aria-label="Remove ${c.name}"><i class="fa-solid fa-xmark"></i></button>
            </div>`).join('');
    }
    window.addPersonalContact = function () {
        const name = window.prompt('Contact name (e.g. Mom, Neighbor Dan):');
        if (!name) return;
        const phone = window.prompt('Phone number:');
        if (!phone) return;
        const list = readJSON(LS.contacts, []);
        list.push({ name, phone });
        writeJSON(LS.contacts, list);
        renderContacts();
    };
    window.removePersonalContact = function (index) {
        const list = readJSON(LS.contacts, []);
        list.splice(index, 1);
        writeJSON(LS.contacts, list);
        renderContacts();
    };

    // --- SETTINGS (local only, this device) ---
    function loadSettings() {
        const s = readJSON(LS.settings, { safetyAlerts: true, nearbyAlerts: true });
        const a = document.getElementById('settingSafetyAlerts');
        const b = document.getElementById('settingNearbyAlerts');
        if (a) a.checked = s.safetyAlerts !== false;
        if (b) b.checked = s.nearbyAlerts !== false;
    }
    window.saveSetting = function (key, value) {
        const s = readJSON(LS.settings, {});
        s[key] = value;
        writeJSON(LS.settings, s);
    };

    // Called by citizen-tabs.js right before a sub-page becomes visible, so
    // its content is always fresh without polling.
    window.populateSubpage = function (name) {
        if (name === 'info') loadProfile();
        else if (name === 'contacts') renderContacts();
        else if (name === 'settings') loadSettings();
        else if (name === 'activity') renderActivity();
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
            sub.textContent = 'Store & forward';
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
        // Restore the rescuer role before the first paint, so an on-duty
        // responder reopening the app is still on duty.
        if (readJSON(LS.rescuer, false) === true) applyRescuer(true);
        // The socket is not open yet at this point, so the role has to be
        // re-sent once it is or the mesh never hears about it.
        window.addEventListener('realtime:connected', () => {
            if (appState.rescuer && window.realtime) window.realtime.sendRescuer(true);
        });

        render();
        renderMeshStatus();
        setInterval(jitterMeshStatus, 6000);
        window.addEventListener('mesh:update', render);

        // With the live-sync server (js/realtime-client.js) reachable, the
        // mesh comes from there instead — only fall back to the old
        // client-only random simulator if there's no server to talk to.
        if (window.realtime) {
            window.addEventListener('realtime:unavailable', () => window.startMeshSimulator(5000));
        } else {
            window.startMeshSimulator(5000);
        }
    });
})();
