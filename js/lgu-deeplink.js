/*
  Deep-linkable case reference: opening lgu.html#N04 selects that report and
  switches the panel to the Details tab — so a report can be bookmarked or
  shared between staff and reopened directly on the same case.
*/
(function () {
    function openFromHash() {
        const id = location.hash.replace('#', '').trim();
        if (!id || !window.MESH_NODES.some(n => n.id === id)) return;

        window.lguSelectNode(id);

        const detailTab = document.querySelector('.tab-btn[data-tab="tabDetail"]');
        if (detailTab) detailTab.click();
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (location.hash) openFromHash();
        window.addEventListener('hashchange', openFromHash);
    });
})();
