/*
  Slide-in drawer over the full-bleed chart map, holding the Priority List /
  AI Triage / Details tabs. Purely a display toggle — lgu-dashboard.js owns
  everything inside the drawer.
*/
window.toggleDrawer = function () {
    const panel = document.getElementById('drawerPanel');
    const shell = document.querySelector('.chart-shell');
    panel.classList.toggle('open');
    shell.classList.toggle('drawer-open', panel.classList.contains('open'));
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('drawerPanel').classList.add('open');
    document.querySelector('.chart-shell').classList.add('drawer-open');
});
