/*
  Instrument-book spine tabs (Map / Status / Supplies / Volunteer). Purely a
  display switcher — every control inside each page keeps its existing
  id/handler from citizen-app.js untouched. The Map page is transparent by
  design (see citizen.css) so the live mesh map underneath shows through
  only when that tab is active.
*/
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const tabs = document.querySelectorAll('.spine-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                document.querySelectorAll('.book-page').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                document.getElementById(tab.dataset.page).classList.add('active');
            });
        });
    });
})();
