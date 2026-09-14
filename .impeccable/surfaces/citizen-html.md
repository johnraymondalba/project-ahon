---
version: 1
slug: "citizen-html"
primary_target: "citizen.html"
related_targets: ["index.html"]
---

## Direction contract

THESIS: AHON's citizen app becomes a standard, trustworthy mobile safety app — card-based, soft-shadowed, single-red-accent — refusing the prior nautical-instrument/chart metaphor in favor of a UI a stressed citizen already knows how to use on sight.

OWN-WORLD: Ground #F4F6F9 (light cool grey), white #FFFFFF cards with soft shadow (`0 2px 8px rgba(20,33,61,.06)`, `0 10px 28px rgba(20,33,61,.10)` for floating/primary elements). Ink navy #14213D (headings/primary text), muted grey #6B7280 (secondary), #9CA3AF (placeholder/disabled). One accent carried over from the existing brand for continuity: AHON critical-red #E8452C, spent only on SOS/emergency/destructive meaning — never decorative. Existing status hues kept for the 7-state mesh legend: cleared-green #4A9B6E, info-blue #6FA8D8 (civilian/water), amber #F5A623 (trapped/high), volunteer-violet #8B7FD1. Type: Inter (self-hosted/Google Fonts), 700–800 for headings, 400–500 body, tabular-nums on any live-updating figure (no monospace face — that identity is retired with the chart world). Corners: 16–20px on cards, 24px+ on primary containers, full circle for the SOS button/avatars/icon-buttons, pill/999px for chips, segmented controls, and toggles. Shadows are now load-bearing (reverses the old "flat instrument" rule) — every card floats. Bottom tab bar replaces the left spine-tab book. Components: big circular pulsing SOS button; horizontal quick-action cards (icon + label + chevron); 2-up stat tiles; list rows (leading icon/avatar, title+subtitle, trailing chevron/toggle/call button); pill status badges; iOS-style toggle switches; segmented pill control.

STORY: A citizen opens the app to a Home screen that greets them by name and puts one unmistakable action first — the SOS button — with quick-report shortcuts beneath it, exactly like opening a familiar consumer safety app. They move between Home, Map, Report (status + supply needs), Volunteer, and a Profile hub via a bottom tab bar; Profile pushes into sub-pages (their vulnerability/medical info, emergency contacts with one-tap call, settings incl. theme, and their own report history) via standard back-arrow push navigation. SOS itself keeps its existing confirm-before-broadcast step — now a centered confirmation sheet instead of a full-screen gate — because accidental-broadcast protection is product truth, not a chart-world affordance.

FIRST VIEWPORT: Phone-frame mockup, light ground. Top: greeting header (avatar, name/"Complete profile" prompt, location pin). Below: headline ("Need help?") over the large circular red SOS button with a pulsing ring, one-line hint beneath. Below that: a horizontal row of quick-report cards (Trapped / Injured / Request supplies). Bottom: 5-icon tab bar (Home / Map / Report / Volunteer / Profile), active tab in red.

FORM: User-pinned direction from two supplied reference app screenshots (a panic-button SOS/emergency app; "SafeDrive," a driving-safety dashboard app) — the canon/standing-exit path, taken because the request explicitly asked for "clean... universal... follows the standards," not a bespoke world. This overrides the direction-roll dealt for this session (seed key 5f764a8a, assigned index 7, challengers an arcade-CRT/oscilloscope/console-menu/botanical-folio/sneaker-archive/gravity-rain-garden set with no honest fit for a disaster-response safety app) per "a user- or brief-pinned decision beats the roll, always." Executed at full fidelity against the two named references' craft level, not a softened gesture toward them. Replaces this surface's prior Tab-Paged Instrument Book direction (seed key 874f9b43) in full.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
