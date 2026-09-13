/*
  SOS / Volunteer entry gate — the first thing shown on top of the map and
  dashboard every time the citizen app loads. "SOS" requires a confirm step
  before it broadcasts (guards against accidental taps); "Volunteering /
  I'm Safe" just dismisses the gate without changing any dashboard state.
  Depends on window.toggleSOS / window.isSOSActive from citizen-app.js.
*/
(function () {
    window.showSosGate = function () {
        const gate = document.getElementById('sosGate');
        gate.classList.remove('confirming');
        gate.classList.remove('hidden');
    };

    window.hideSosGate = function () {
        document.getElementById('sosGate').classList.add('hidden');
    };

    window.gateTapSOS = function () {
        document.getElementById('sosGate').classList.add('confirming');
    };

    window.gateCancelSOS = function () {
        document.getElementById('sosGate').classList.remove('confirming');
    };

    window.gateConfirmSOS = function () {
        if (!window.isSOSActive()) window.toggleSOS();
        window.hideSosGate();
    };

    window.gateContinueAsVolunteer = function () {
        window.hideSosGate();
    };
})();
