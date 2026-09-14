---
version: 1
slug: "lgu-html"
primary_target: "lgu.html"
related_targets: ["index.html"]
---

## Direction contract

THESIS: The LGU Command Center becomes a clean admin dashboard — sidebar nav, stat cards, a soft-bordered data table — refusing the prior full-bleed chart-with-sliding-drawer in favor of the same standard app language, translated to desktop density and sustained desk work.

OWN-WORLD: Same tokens as citizen.html's new world, desktop-scaled — ground #F4F6F9, white cards/panels with soft shadow and 12–16px radius (slightly tighter than the phone surface's radius, appropriate to a denser desktop grid), navy ink #14213D, muted grey #6B7280, AHON critical-red #E8452C reserved for Critical/SOS meaning only, amber for High tier, green for Cleared/Low. Inter type throughout, tabular-nums on every count/timestamp. A left sidebar replaces the citizen app's bottom tab bar as this surface's primary nav (desktop convention, same visual materials).

STORY: LGU staff land on a dashboard: a left sidebar (logo, nav: Dashboard / Map / Reports / AI Triage), a top strip of summary stat cards (Critical/High/Cleared counts, mesh health), a live map card, and a sortable/filterable report table below or beside it. Selecting a report opens its detail in a right-side panel or modal-free inline expansion — never navigating away from the table. Every report keeps its existing deep-linkable case reference (`lgu.html#N04`).

FIRST VIEWPORT: Fixed-width left sidebar (logo, nav items, role-switch links). Main content: a header row of stat cards, then a two-column area — live map card (Leaflet, same OSM tiles, markers restyled to filled circles keyed to status color, no more dashed-instrument treatment) alongside or above the priority report table with search/filter/sort, AI Triage tab, and a detail panel for the selected report.

FORM: Same user-pinned canon direction as citizen.html/index.html (two supplied reference app screenshots), translated to a desktop admin-dashboard structure — not a literal copy of a phone screen. Replaces this surface's prior Chart-Table Full-Bleed, List-as-Drawer direction (seed key 69c9c27d) in full.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
