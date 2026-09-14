/*
  SOS confirm bottom sheet — guards against an accidental SOS broadcast.
  Both the Home hero button and the persistent SOS FAB (visible on every
  other tab) open the same sheet; confirming actually toggles the broadcast.
  Depends on window.toggleSOS / window.isSOSActive from citizen-app.js.
*/
(function () {
    window.openSosSheet = function () {
        const sheet = document.getElementById('sosSheet');
        const title = document.getElementById('sheetTitle');
        const body = document.getElementById('sheetBody');
        const confirmBtn = document.getElementById('sheetConfirmBtn');

        if (window.isSOSActive()) {
            title.textContent = 'Cancel SOS broadcast?';
            body.textContent = 'You will stop broadcasting an emergency signal to nearby mesh nodes and LGU responders.';
            confirmBtn.textContent = 'Yes, cancel SOS';
        } else {
            title.textContent = 'Send SOS broadcast?';
            body.textContent = 'This will alert nearby mesh nodes and LGU responders that you need help.';
            confirmBtn.textContent = 'Yes, send SOS';
        }
        sheet.classList.add('open');
    };

    window.closeSosSheet = function () {
        document.getElementById('sosSheet').classList.remove('open');
    };

    window.confirmSosSheet = function () {
        window.toggleSOS();
        window.closeSosSheet();
    };
})();
