/*
  Confirm bottom sheet — one sheet guarding the two actions that change what
  the mesh believes about you: broadcasting SOS, and going on duty as a
  volunteer. Both are easy to hit by accident and both are visible to every
  responder in range, so neither fires straight off a tap.

  Openers fill the sheet and hand it the action to run on confirm; the sheet
  itself knows nothing about either mode. Depends on window.toggleSOS /
  window.isSOSActive / window.confirmVolunteer from citizen-app.js.
*/
(function () {
    // What "confirm" currently means — set by whichever opener ran last.
    let pendingAction = null;

    function open({ icon, tone, title, body, confirmLabel, action }) {
        const sheet = document.getElementById('confirmSheet');
        document.getElementById('sheetIcon').innerHTML = `<i class="${icon}"></i>`;
        document.getElementById('sheetTitle').textContent = title;
        document.getElementById('sheetBody').textContent = body;
        document.getElementById('sheetConfirmBtn').textContent = confirmLabel;
        sheet.classList.remove('tone-sos', 'tone-volunteer');
        sheet.classList.add(tone, 'open');
        pendingAction = action;
    }

    window.openSosSheet = function () {
        const active = window.isSOSActive();
        open({
            icon: 'fa-solid fa-triangle-exclamation',
            tone: 'tone-sos',
            title: active ? 'Cancel SOS broadcast?' : 'Send SOS broadcast?',
            body: active
                ? 'You will stop broadcasting an emergency signal to nearby mesh nodes and LGU responders.'
                : 'This will alert nearby mesh nodes and LGU responders that you need help. The map will show only rescuers and volunteers while it is active.',
            confirmLabel: active ? 'Yes, cancel SOS' : 'Yes, send SOS',
            action: window.toggleSOS,
        });
    };

    // Only turning volunteer mode on is guarded. Turning it off takes nobody
    // by surprise and cancels nothing, so it applies immediately.
    window.openVolunteerSheet = function () {
        const sosActive = window.isSOSActive();
        open({
            icon: 'fa-solid fa-hand-holding-heart',
            tone: 'tone-volunteer',
            title: sosActive ? 'Switch to Volunteer mode?' : 'Go on duty as a volunteer?',
            body: sosActive
                ? 'This cancels your active SOS broadcast — responders will stop being told you need help. The map will switch to showing people who do.'
                : 'Nearby responders will see you as available to help, and the map will show the people asking for it instead of everyone.',
            confirmLabel: sosActive ? 'Cancel SOS and volunteer' : 'Yes, I can help',
            action: window.confirmVolunteer,
        });
    };

    window.closeConfirmSheet = function () {
        pendingAction = null;
        document.getElementById('confirmSheet').classList.remove('open');
    };

    window.runConfirmAction = function () {
        const action = pendingAction;
        window.closeConfirmSheet();
        if (action) action();
    };
})();
