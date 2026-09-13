---
version: 1
slug: "citizen-html"
primary_target: "citizen.html"
related_targets: ["index.html"]
---

## Direction contract

THESIS: The citizen app is a bound instrument logbook you flip through, never a floating overlay stack piled on top of a map.

OWN-WORLD: Inherits the Typhoon Track Chart world set on index.html — near-black chart ground (#0A1628), grey-blue graticule (#2A3B52), bone plot-ink (#F2EFE6), amber relay-trace (#F5B942), red reserved only for SOS/critical (#E8452C), green for cleared (#4A9B6E); Overpass display, system-ui body, Overpass Mono for every coordinate/hop-count/timestamp readout. A seventh named accent, muted violet (#8B7FD1), is cited here for the Volunteer status only — the mesh legend has seven mutually-exclusive semantic node states (SOS, trapped, safe, rescuer, senior/PWD, volunteer, offline) that predate this redesign and must stay visually distinguishable at a glance; collapsing volunteer onto an existing hue would make it indistinguishable from civilian/safe on the map. No other new hue is authorized beyond this one named exception. Adds four surface-level raises: one dominant type size governs every critical control, rank by weight not size; live plotting motion degrades to a static before/after pose on low-power devices; a state-changing action (SOS confirm, Volunteer Mode) visibly ripples across the connected UI rather than flipping an isolated switch; one consistent grid unit persists across every state change.

STORY: A citizen opens the existing SOS/Volunteer entry gate first (kept as-is, it already fits this world), then flips through four logbook pages via spine tabs — Map, Status, Supplies, Volunteer. SOS stays reachable on every page, never buried inside one. Adaptation cited during build: SOS renders as a full-width top instrument bar rather than a small corner control — a safety-critical broadcast action earns the largest, easiest one-handed target the rail can give it, which the elderly/PWD core constraint favors over literal corner placement.

FIRST VIEWPORT: The SOS/Volunteer gate renders as the logbook's cover page in the chart world's palette. Past the gate, a full-width SOS instrument bar sits fixed below the top bar on every page; spine tabs run down the left edge beneath it (Map / Status / Supplies / Volunteer), and the current page fills the remaining space at full bleed, active tab marked in amber. Adaptation cited during build: the mono mesh-connectivity readout stays in the existing top-bar brand cluster (top-left, beside the wordmark) rather than top-right, because top-right is already the home/legend icon pair the top bar owned before this redesign and preserving that existing affordance placement outranked literal contract wording.

FORM: Tab-Paged Instrument Book, assigned index 6 of 7 grounded structures, seed key 874f9b43. World inherited from index.html's Typhoon Track Chart direction, seed key 3653e7ec.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
