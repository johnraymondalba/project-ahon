---
name: Project AHON
description: Offline-first BLE-mesh disaster response network — the interface is a live-plotting typhoon track chart, not a dashboard.
colors:
  chart-ground: "#0A1628"
  chart-ground-raised: "#101F36"
  chart-graticule: "#24334A"
  chart-graticule-soft: "#1A2740"
  chart-ink: "#F2EFE6"
  chart-ink-dim: "#9BA9C2"
  chart-paper: "#F2EFE6"
  chart-paper-raised: "#FBFAF4"
  chart-paper-line: "#C9C0AA"
  chart-paper-ink: "#0A1628"
  chart-paper-ink-dim: "#5B6478"
  signal-amber: "#F5B942"
  signal-amber-dim: "#8A6A26"
  signal-critical: "#E8452C"
  signal-critical-fill: "#B8341F"
  signal-critical-text: "#FF6A52"
  signal-cleared: "#4A9B6E"
  signal-info: "#6FA8D8"
  status-volunteer: "#8B7FD1"
  status-offline: "#6B7688"
  tier-high-ink: "#8A6015"
  tier-high-bg: "#FBE9C6"
  tier-low-ink: "#2E6B4C"
  tier-low-bg: "#DCEBE2"
  tier-critical-bg: "#F5DCD6"
typography:
  display:
    fontFamily: "Overpass, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(15px, 2vw, 22px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.05em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Overpass Mono', ui-monospace, 'SFMono-Regular', monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.02em"
    fontFeature: "tabular-nums"
rounded:
  sm: "3px"
  md: "4px"
  full: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  grid-unit-dark: "40px"
  grid-unit-light: "56px"
components:
  button-sos:
    backgroundColor: "{colors.chart-ground-raised}"
    textColor: "{colors.signal-critical-text}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-sos-active:
    backgroundColor: "{colors.signal-critical-fill}"
    textColor: "{colors.chart-ink}"
    rounded: "{rounded.md}"
  chip-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.chart-ink-dim}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  chip-active-safe:
    backgroundColor: "{colors.signal-info}"
    textColor: "{colors.chart-ground}"
    rounded: "{rounded.md}"
  tab-spine-active:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.chart-ground}"
    rounded: "3px"
  tier-badge-critical:
    backgroundColor: "{colors.tier-critical-bg}"
    textColor: "{colors.signal-critical-fill}"
    rounded: "{rounded.md}"
  drawer-toggle:
    backgroundColor: "{colors.chart-paper-ink}"
    textColor: "{colors.chart-paper-raised}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
---

# Design System: Project AHON

## Overview

**Creative North Star: "The Typhoon Track Chart"**

AHON's interface is a live-plotting storm-track chart — the PAGASA plotting sheet and the ham-radio hurricane net — not a civic-safety SaaS dashboard. Every surface is drawn on a visible graticule grid; reports plot as dots, relays draw as dashed traced lines, and role choices read as legend entries rather than feature cards. The world ships in two registers of the same instrument: a near-black night-instrument register for the landing page and the citizen app (used outdoors, low-light, one-handed), and a cream paper-chart register for the LGU command center (sustained desk work in daylight). Both registers share one palette, one type system, and one 4px-radius instrument vocabulary; only ground and ink invert between them.

State reads by shape, line weight, and dash pattern before it reads by color — ghost (offline) nodes are dashed rings at reduced opacity, not just a grey dot; severity is a fixed size ramp, not only a hue. Red is spent on exactly one meaning across the whole system: SOS/critical. The confirmed anti-reference is the prior "iFlood" navy/cyan UI look and the generic hero-banner/feature-card/CTA arrangement every civic-safety site ships; neither survives in the build.

**Key Characteristics:**
- Full-bleed live chart as the ground truth on every surface — panels and lists are drawers/pages over it, never boxes beside it.
- One shared palette expressed in two registers (dark night-instrument / light paper-chart), not two different systems.
- Overpass display + system-ui body + Overpass Mono for every coordinate, timestamp, hop-count, and count readout, always tabular.
- Near-universal 4px corner radius; full circles reserved for plotted nodes, dots, and toggle controls.
- Red is single-purpose (critical/SOS only); a seventh accent (muted violet) is authorized solely for the citizen Volunteer status, nowhere else.

## Colors

The palette is a chart-instrument palette: a near-black/cream ground pair, a cool grey-blue graticule line, warm bone/navy ink, and a small set of reserved signal colors that carry meaning by role, not decoration.

### Primary
- **Relay Amber** (`#F5B942`): the chart's live-trace color — hop lines, active spine tab, plotted "lit" nodes, primary readout values. The signature color of the system; used for motion and active state, not backgrounds.

### Secondary
- **Critical Red** (`#E8452C`, fill `#B8341F`, text-on-dark `#FF6A52`): reserved for exactly one meaning everywhere in the system — SOS and critical/danger. Never used decoratively.
- **Cleared Green** (`#4A9B6E`): the "resolved/gateway/rescuer" signal — LGU gateway marker ring, cleared-count stat, rescuer node.
- **Civilian Info Blue** (`#6FA8D8`): default civilian/self node marker and the water-supply icon color.
- **Volunteer Violet** (`#8B7FD1`): a seventh named accent, authorized only for the citizen app's Volunteer status (switch, gate button, marker). It exists because the mesh legend has seven mutually-exclusive node states that predate this redesign and must stay distinguishable at a glance; no other new hue is authorized beyond this one named exception.

### Neutral
- **Chart Ground** (`#0A1628`) / **Ground Raised** (`#101F36`): dark-register background and raised-panel fill (landing, citizen).
- **Chart Paper** (`#F2EFE6`) / **Paper Raised** (`#FBFAF4`): light-register background and raised-panel fill (LGU). Note: Chart Paper and dark-register Bone Ink share the same hex (`#F2EFE6`) by design — one bone/cream value plays ink on dark and ground on light.
- **Graticule** (`#24334A`, soft `#1A2740`) / **Paper Line** (`#C9C0AA`): the grid-ruling and divider color in each register.
- **Ink Dim** (`#9BA9C2`) / **Paper Ink Dim** (`#5B6478`): secondary/muted text in each register.
- **Offline Grey** (`#6B7688`): last-known/offline node state — always paired with a dashed stroke, never color alone.

### Named Rules
**The One Meaning Rule.** Critical red never appears for anything but SOS/critical severity, on any surface. If a control needs a red-adjacent warm accent for a non-critical purpose, it does not exist yet and should not be invented.

**The Line-Before-Hue Rule.** Node and state distinctions are carried by shape, stroke weight, and dash pattern first; color is the second signal, never the only one. A ghost/offline node is a dashed, lower-opacity ring regardless of which hue distinguishes it.

## Typography

**Display Font:** Overpass (with system-ui fallback)
**Body Font:** system-ui stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
**Label/Mono Font:** Overpass Mono

**Character:** Overpass carries the civic highway-signage lineage the brief calls for — the same type family used on official road and infrastructure signage — set bold and letter-spaced for titles and legend entries. Overpass Mono carries every number that must never visually reflow: coordinates, hop counts, timestamps, stat counts, table figures, always with `font-variant-numeric: tabular-nums`.

### Hierarchy
- **Display** (700, 18–22px, tight line-height 1.1, 0.05em tracking): page/app title blocks, gate headline, legend entry titles.
- **Title** (700, 14–15px): panel headers, SOS instrument label, AI-triage card names.
- **Body** (400, 12–15px, line-height 1.5): thesis copy, hints, descriptions; landing thesis caps at ~62ch.
- **Label/Mono** (500–600, 9–12px, 0.02–0.04em tracking, often uppercase): every coordinate/timestamp/hop-count readout, section labels, stat labels, table headers, chip and tab text.

### Named Rules
**The Tabular Readout Rule.** Any numeral that updates live (hop count, coordinate, stat count, mesh health figure) is set in Overpass Mono with tabular numerals so digits never shift the surrounding layout as they tick.

## Layout

Both registers are drawn on a visible graticule grid — repeating 1px lines at a fixed pitch (64px on the landing chart, 40px inside the citizen phone chassis, 56px on the LGU chart-paper), rendered behind all content via `repeating-linear-gradient`, low-opacity, never fully hidden. It is the chart's own ruling, not a decorative background.

- **Landing** is a single full-bleed column: title block, chart-plot area, thesis copy, and a legend-style two-entry role picker stacked vertically, collapsing padding and hiding entry descriptions under 640px.
- **Citizen app** is presented in a fixed phone-chassis mockup (375:812 aspect, rounded 40px case / 28px screen) with a persistent SOS instrument rail above a book-frame: a 64px-wide fixed spine of tab buttons on the left, one active "page" filling the remainder at full bleed. The map page is transparent/click-through so the live chart underneath stays interactive.
- **LGU dashboard** is a full-height flex column: a fixed instrument-strip header (stats + mesh health + role switch), then a full-bleed map filling all remaining space, with a 460px-wide drawer panel that slides in from the right over the map (never beside it) via `translateX`. Minimum viewport width 1024px — a desktop-only surface.

## Elevation & Depth

The system is nearly flat: panels sit as solid or near-solid fills separated by 1px graticule/border lines, not shadow-lifted cards. The two exceptions are functional, not decorative: the LGU drawer panel casts a soft directional shadow (`-8px 0 24px rgba(10,22,40,0.08)`) to read as sliding over the chart, and the citizen phone chassis casts an ambient drop shadow (`0 20px 50px rgba(0,0,0,0.6)`) to read as a physical device mockup. Selection/priority state is conveyed by row background + dimming neighbors, not elevation.

### Named Rules
**The Flat Instrument Rule.** Chart surfaces, panels, chips, and buttons are flat at rest, separated by hairline borders. Shadow is reserved for the two cases where something is physically sliding or sitting over the chart (the LGU drawer, the phone chassis) — never for ordinary buttons or cards.

## Shapes

Corners are drawn at one near-universal radius: **4px** for every panel, button, chip, badge, input, and tier badge across all three surfaces (a handful of nested inner elements use 3px). Full circles (`border-radius: 50%`) are reserved for plotted nodes/markers, status dots, and the toggle-switch knob — the chart's own vocabulary of a "plotted point." Dividers are 1px hairlines in the register's graticule/border color, never a shadow-drawn separator.

## Components

### Buttons
- **Shape:** 4px radius, 1–1.5px border in the relevant signal color.
- **Primary (SOS instrument bar):** raised-ground fill, critical-red text and border at rest; on activation, fills solid critical-red-fill with a pulsing ring animation (`box-shadow` ping, 1.6s loop) — the only pulsing button in the system, reserved for the SOS broadcast state.
- **Gate SOS button:** a large 190px circular button (the one deliberate exception to the 4px-radius rule, justified by the elderly/PWD one-handed tap-target constraint), also ring-pulsing.
- **Secondary/Ghost (LGU `.btn.secondary`, drawer close, cancel):** transparent or paper-ground fill, 1px border, no pulse.

### Chips
- **Style:** transparent fill, 1.5px graticule-color border, mono label, at rest.
- **State:** each status chip (Safe/Trapped/Injured, water/food/meds) takes a distinct active fill+border in its own signal color at ~14% tint for grid items, full-color fill for status chips — never a shared "selected" blue.

### Cards / Containers (AI-triage cards, panels, drawer)
- **Corner Style:** 4px.
- **Background:** raised-ground/raised-paper fill in the register.
- **Shadow Strategy:** none (see Elevation & Depth); separation is a 1px border.
- **Internal Padding:** 12–16px.

### Inputs / Fields (LGU toolbar search/sort)
- **Style:** 1px border in the register's line color, 4px radius, paper/ground fill, no inset shadow.
- **Focus:** browser-default outline is preserved; no custom glow is defined.

### Navigation — Spine Tabs (citizen, signature)
A fixed left-edge column of tab buttons standing in for a book's spine: inactive tabs sit transparent with dim ink; the active tab fills solid amber with dark ground text. This is the citizen app's primary navigation and doubles as the direction contract's "Tab-Paged Instrument Book" signature — never converted to a top tab bar or bottom nav.

### Legend Entries (landing, signature)
Full-width rows (title + description + arrow) separated by hairline borders, each anchored by a small circular "plot glyph" dot rather than an icon, with a Font Awesome Solid arrow as the trailing affordance — the role picker reads as two chart-legend rows, not SaaS cards. Hover/focus shifts background, indents 10px, and turns the trailing arrow amber.

### Drawer Panel (LGU, signature)
A 460px panel that slides over the full-bleed map from the right (`translateX(100%)` → `0`, 0.3s cubic-bezier ease) rather than living beside the map as a fixed sidebar. Holds the priority-list table and AI-triage tabs. Selecting a priority-row lifts it (bold, full color) while dimming (not fading) the rest of the list to a muted ink color, keeping unselected rows legible.

### Case Reference Deep Links (LGU, signature)
Every plotted report carries a stable, deep-linkable case reference in the URL hash (e.g. `lgu.html#N04`). Opening that URL selects the node, opens the drawer, and switches straight to its Details tab — a report can be bookmarked or handed to another staff member and reopened on the exact same case.

### Icons
Font Awesome Solid is the system's icon library, used consistently at one weight throughout (spine-tab icons, SOS tower-broadcast glyph, legend arrow, drawer-toggle and close icons, supply/status icons). No unicode symbol or emoji stands in for an icon anywhere in the build.

### Map Markers (citizen + LGU, signature)
Plotted nodes render as bordered circles keyed to status color, never as pin/glyph icons: solid ring = active, dashed ring at reduced opacity = "ghost" (last-known position of an offline node, paired with a mono timestamp label), thicker ring = self. Both surfaces sit real OpenStreetMap street tiles underneath these markers (no API key needed) so responders can read actual streets, rivers, and barangay names, not just an abstract grid — tinted into each register via a CSS filter on `.leaflet-tile-pane` (inverted/hue-rotated dark for the citizen app's night-instrument register, muted sepia/grayscale for the LGU dashboard's cream register) rather than shown in raw daylight color. The LGU map has two implementations sharing one marker vocabulary, palette, and tile treatment — Google Maps when an API key is configured, and this OSM-tiled Leaflet fallback when it isn't — so the chart-native look and real geography both hold with zero keys set.

## Do's and Don'ts

### Do:
- **Do** keep the graticule grid visible behind every panel — it is the chart's own ruling, not a removable decoration.
- **Do** spend critical red on SOS/critical meaning only, in both registers.
- **Do** set every live-updating number (coordinates, hop count, timestamps, stat counts) in Overpass Mono with tabular numerals.
- **Do** distinguish node/state pairs by shape and dash pattern in addition to color (ghost = dashed + dim, not just grey).
- **Do** keep the LGU map's Leaflet fallback and Google Maps mode visually identical in marker vocabulary and palette; a missing API key must never read as a broken or unfinished surface.
- **Do** give every LGU report a deep-linkable URL hash reference (`#N04`) that reopens straight to that case's Details tab; this is a shipped, verified pattern, not an aspiration.
- **Do** draw icons from Font Awesome Solid at one consistent weight; never substitute a unicode symbol or emoji for an icon.

### Don't:
- **Don't** introduce an eighth accent hue. Volunteer violet (`#8B7FD1`) is the one named exception, scoped to the citizen Volunteer status; no future surface should add another new color without the same justification.
- **Don't** put the priority list or AI Triage panel beside the LGU map as a permanent sidebar — they are drawers that slide over the chart, which stays the ground truth.
- **Don't** give ordinary buttons or cards a drop shadow; shadow is reserved for the drawer-over-map and phone-chassis cases only.
- **Don't** treat the citizen spine tabs or landing legend entries as generic nav/card components in future work — they are this system's named signature patterns, not interchangeable with a standard tab bar or feature card.
