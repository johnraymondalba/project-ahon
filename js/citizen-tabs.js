/*
  Bottom tab bar (Home / Map / Report / Volunteer / Profile) and the
  Profile hub's sub-page push navigation (My Info / Contacts / Settings /
  Activity), standard back-arrow style. Purely a display switcher — every
  control inside each page keeps its existing id/handler from
  citizen-app.js untouched.
*/
(function () {
    window.switchTab = function (tab) {
        const shell = document.getElementById('appShell');
        shell.setAttribute('data-active-tab', tab);

        document.querySelectorAll('.tab-item').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const target = document.getElementById(`page-${tab}`);
        if (target) target.classList.add('active');
    };

    window.openSubpage = function (name) {
        if (window.populateSubpage) window.populateSubpage(name);
        const el = document.getElementById(`subpage-${name}`);
        if (el) el.classList.add('active');
    };

    window.closeSubpage = function () {
        document.querySelectorAll('.subpage.active').forEach(el => el.classList.remove('active'));
    };

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', () => window.switchTab(btn.dataset.tab));
        });
    });
})();
