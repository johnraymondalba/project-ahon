---
name: Project AHON
description: Offline-first BLE-mesh disaster response network — a standard, trustworthy mobile-safety-app and admin-dashboard interface, not a chart instrument.
colors:
  bg: "#F4F6FA"
  surface: "#FFFFFF"
  surface-alt: "#EEF1F6"
  border: "#E6E9F1"
  ink: "#16203D"
  ink-secondary: "#545F70"
  ink-muted: "#8891A0"
  accent: "#E8452C"
  accent-dark: "#C23A22"
  accent-tint: "#FDEAE6"
  success: "#22A06B"
  success-dark: "#146B49"
  success-tint: "#E3F5EC"
  warning: "#F5A623"
  warning-dark: "#A85F00"
  warning-tint: "#FDF1DD"
  info: "#4C8DD9"
  info-tint: "#E9F1FC"
  volunteer: "#8B7FD1"
  volunteer-tint: "#EFEDFA"
  offline: "#98A2B3"
  offline-tint: "#F1F2F4"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px–30px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12.5px–14.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px–12px"
    fontWeight: 700
    letterSpacing: "0.02em–0.04em"
    fontFeature: "tabular-nums"
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-dark}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "13px"
  button-secondary:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px"
  sos-button:
    backgroundColor: "{colors.accent-dark}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    width: "148px"
    height: "148px"
  chip-active-critical:
    backgroundColor: "{colors.accent-dark}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  tier-badge-critical:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-dark}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  role-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  stat-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
---

# Design System: Project AHON

## Overview

**Creative North Star: "Clean Care"**

AHON's interface is a standard, trustworthy mobile-safety-app and admin-dashboard look — white soft-shadowed cards on a light grey ground, a single red accent, Inter throughout — not a chart-instrument metaphor. This replaces the prior "Typhoon Track Chart" world (near-black/cream chart-paper registers, graticule grids, dashed-instrument markers, Overpass/Overpass Mono type, near-universal 4px radius) in full, across all three surfaces: the landing page, the citizen app, and the LGU command center. The direction was user-pinned from two reference screenshots (a panic-button SOS app and a driving-safety dashboard app) — a "canon/standing-exit" choice explicitly favoring a UI a stressed citizen already knows how to use on sight, overriding that session's dice-rolled world set.

The system carries forward two pieces of prior-brand continuity deliberately, not as drift: the AHON critical-red accent, and the color roles of the 7-state mesh legend (SOS, civilian, rescuer, senior/PWD, volunteer, offline, self). Both are re-rendered in the new visual language — solid filled circles with white borders instead of dashed-ring instrument markers — but the meanings are unchanged from the system this replaces.

**Key Characteristics:**
- Soft-shadowed white cards on a light cool-grey ground (`#F4F6FA`) — elevation is now load-bearing, a full reversal of the prior "flat instrument, no shadow" rule.
- One accent, one meaning: AHON red (`#E8452C`, solid fill `#C23A22`) spent only on SOS/critical/primary-emergency, never decoration — carried over from the prior brand for continuity, not reinvented.
- Inter for everything, including tabular-nums on every live-updating figure — the prior system's monospace (Overpass Mono) identity is fully retired.
- A generous, soft corner scale (10–24px, full circles/pills for buttons, avatars, badges, markers) replacing the prior near-universal 4px radius.
- Bottom tab bar (citizen app) / left sidebar (LGU dashboard) as primary navigation, replacing the prior left spine-tab book and sliding drawer.

## Colors

The palette is a light, neutral ground with a single warm-red accent and a small set of reserved status hues carried over from the prior mesh-node legend.

### Primary
- **AHON Red** (`#E8452C` icon/border/tint, solid fill `#C23A22`): the system's one accent. Reserved for SOS, critical severity, and primary emergency actions only — never decorative. Carried over from the pre-redesign brand for continuity; the "one meaning" rule that governed it in the prior chart world is preserved unchanged.

### Secondary
- **Success Green** (`#22A06B`, solid fill `#146B49`): cleared/rescuer/Safe status, Low-tier badges.
- **Warning Amber** (`#F5A623`, solid fill `#A85F00`): Trapped status, senior/PWD node, High-tier badges.
- **Info Blue** (`#4C8DD9`): civilian/self node marker, water-supply icon.
- **Volunteer Violet** (`#8B7FD1`): the citizen app's Volunteer status only — the seventh mesh-legend color, kept distinguishable from the other six by design, not a new invention.
- **Offline Grey** (`#98A2B3`): last-known/offline node state.

### Neutral
- **Ground** (`#F4F6FA`): page background across all three surfaces.
- **Surface** (`#FFFFFF`) / **Surface Alt** (`#EEF1F6`): card fill and secondary/inset fill (chips, grid tiles, table toolbar inputs).
- **Border** (`#E6E9F1`): hairline dividers and card/input borders.
- **Ink** (`#16203D`): primary text and headings. **Ink Secondary** (`#545F70`): body/secondary text, tuned to clear 4.5:1 on both Surface and Surface Alt. **Ink Muted** (`#8891A0`): placeholder/disabled text and decorative glyphs only, never primary readable content.

### Named Rules
**The One Meaning Rule.** AHON red is spent only on SOS/critical/primary-emergency meaning, on every surface. It is not available for decorative accents, non-critical highlights, or "because it's the brand color" uses — a rule preserved unchanged from the prior chart-instrument system into Clean Care.

**The Legend Continuity Rule.** The 7-state mesh node legend (SOS, civilian, rescuer, senior/PWD, volunteer, offline, self) keeps the exact color role it had before the redesign. Only the rendering changed — solid filled circles with white borders replacing dashed-ring chart markers — never the color-to-meaning mapping.

## Typography

**Display Font:** Inter (700–800 weight)
**Body Font:** Inter (400–600 weight)

**Character:** Inter carries the whole system, headings through body through numeric readouts — a deliberate departure from the prior pairing of a highway-signage display face (Overpass) with a monospace label face (Overpass Mono). One typeface, weight-differentiated, is the "standard app" signal the direction contract calls for.

### Hierarchy
- **Display** (800, 20–30px, tight line-height ~1.2, -0.01em tracking): page/app titles, greeting headline, SOS hero headline, sidebar brand name, stat-card counts.
- **Title** (700–800, 14–17.5px): section titles, card headers, sheet/subpage headers.
- **Body** (400–600, 12.5–14.5px, line-height 1.5): descriptions, hints, list-row text; landing thesis caps at ~42ch.
- **Label** (600–700, 11–12px, 0.01–0.04em tracking, often uppercase): stat labels, section labels, table headers, chip/tab text, tier badges.

### Named Rules
**The Tabular Readout Rule.** Any numeral that updates live (stat counts, timestamps, hop-adjacent figures) is set with `font-variant-numeric: tabular-nums` via the shared `.tabular` utility so digits don't shift the layout as they tick — preserved as a functional rule from the prior system, no longer tied to a monospace face.

## Layout

- **Landing** is a single centered column (max-width 440px, 760px at ≥760px breakpoint): logo mark, wordmark, one-line tagline, thesis copy, then a two-entry role picker that stacks vertically on mobile and sits side-by-side at ≥760px.
- **Citizen app** is presented in a fixed phone-chassis mockup (375:812 aspect, 44px case radius / 32px screen radius) with a persistent status strip + SOS banner + floating SOS FAB above a page stack, and a 5-item bottom tab bar (Home / Map / Report / Volunteer / Profile) as primary navigation. Profile pushes into sub-pages via standard `translateX` back-arrow navigation, not a spine of tabs. The Map page is transparent/click-through so the live Leaflet map underneath stays interactive.
- **LGU dashboard** is a full-height flex row: a fixed 216px left sidebar (logo, nav, mesh-health strip), and a main column of a stat-card header row followed by a content row holding a map card (flex 1.4) beside a docked 380–460px report panel (priority table / AI Triage tabs / detail view) — panel and map sit side by side permanently, not a drawer sliding over the map. Minimum viewport width 1180px, desktop-only.

## Elevation & Depth

Elevation is load-bearing: every card, panel, pill, and floating control carries a real, soft (blurred, non-offset) shadow. This is a deliberate, full reversal of the prior system's "flat instrument, no shadow" rule, not drift.

### Shadow Vocabulary
- **`--shadow-sm`** (`0 2px 8px rgba(20,33,61,0.06)`): resting state for cards, chips, pills, list containers.
- **`--shadow-md`** (`0 10px 28px rgba(20,33,61,0.10)`): floating/elevated elements — map legends, open dropdown-like overlays, hover state on landing role cards.
- **`--shadow-lg`** (`0 20px 48px rgba(20,33,61,0.16)`): reserved for the most prominent floating elements (defined in tokens; not yet exercised beyond the phone-chassis ambient shadow, which uses its own one-off value).
- SOS-specific accent shadows (e.g. `0 16px 32px rgba(194,58,34,0.35)` on the hero SOS button, `0 10px 24px rgba(194,58,34,0.4)` on the FAB) tint the shadow in the accent color to make the SOS affordance read as physically raised above the rest of the UI.

### Named Rules
**The Load-Bearing Shadow Rule.** Every card and floating control casts a soft, non-offset shadow at rest; flat, borderless surfaces are not part of this system's vocabulary except for hairline-divided list rows within a card.

## Shapes

Corners are drawn on a soft, generous scale: **10px** (small tiles, inputs, nav items), **16px** (standard cards, buttons, sheets), **24px** (primary containers — role cards, map card, docked panel, sos-hero card), and **999px/pill** (chips, badges, tabs, toggle track, status pills). Full circles (`border-radius: 50%`) are reserved for the SOS button, avatars, icon-buttons, map markers, and toggle knobs. This replaces the prior system's near-universal 4px radius; the change is deliberate, not drift.

## Components

### Buttons
- **Shape:** 16px radius (`--radius-md`) for rectangular buttons; full circle for the SOS button and icon-buttons; pill for chip-style toggles.
- **Primary (SOS / confirm / sign-out-adjacent destructive):** solid `--accent-dark` fill, white text, accent-tinted soft shadow; the SOS button and FAB additionally pulse (`box-shadow` ping, 1.6s loop) only while actively broadcasting.
- **Secondary/Ghost:** `--surface-alt` fill, `--ink` text, no shadow beyond the card it sits in.

### Chips
- **Style:** pill radius, `--surface-alt` fill, 1.5px `--border` border, `--ink-secondary` text at rest.
- **State:** each status chip (Safe/Trapped/Injured, water/food/meds) takes its own signal-color solid fill (or ~12–14% tint for grid items) when active — never a shared generic "selected" color.

### Cards / Containers
- **Corner Style:** 16px standard, 24px for primary containers (role cards, map card, docked panel).
- **Background:** `--surface` (white).
- **Shadow Strategy:** `--shadow-sm` at rest (see Elevation & Depth); landing role cards lift to `--shadow-md` plus a 2px translateY on hover/focus.
- **Internal Padding:** 12–20px.

### Inputs / Fields
- **Style:** 1px `--border` border, 10px radius, `--surface-alt` fill, no inset shadow.
- **Focus:** citizen profile inline-edit fields use borderless underline-style inputs; LGU toolbar inputs rely on the browser-default focus outline.

### Navigation
- **Bottom Tab Bar (citizen, primary nav):** 5 icon+label items, white surface, top hairline border; inactive items `--ink-secondary`, active item `--accent`. Replaces the prior left spine-tab column.
- **Left Sidebar (LGU, primary nav):** 216px fixed column, white surface, nav items at 10px radius; active item gets `--accent-tint` fill + `--accent-dark` text.

### SOS Confirm Sheet (citizen, signature)
A bottom sheet (`border-radius: 28px 28px 0 0`) that slides up over a dimmed backdrop for the SOS confirm-before-broadcast step — replacing the prior system's full-screen gate. The confirm step itself (accidental-broadcast protection) is preserved product truth, only its presentation changed.

### Docked Report Panel (LGU, signature)
A 380–460px panel permanently docked beside the map card (24px radius, `--shadow-sm`), holding the priority table and AI Triage tabs — replacing the prior system's `translateX` drawer that slid over a full-bleed map. Selecting a priority row lifts it (bold, full color) while dimming (not fading, `--ink-secondary`) the rest of the list, preserving a behavior carried over from the prior drawer. Every report keeps its deep-linkable case-reference URL hash (`lgu.html#N04`), unchanged from the prior system.

### Map Markers (citizen + LGU, signature)
Plotted nodes render as solid filled circles with white borders keyed to status color (`.marker-core`), with a dashed, reduced-opacity ring for "ghost" (last-known, offline) nodes — replacing the prior dashed-ring chart-instrument marker style while keeping the same shape-before-hue signal (solid vs. dashed) and the same 7-color legend. Real OpenStreetMap tiles sit underneath, tinted toward the light Clean Care register via a desaturating/brightening CSS filter on `.leaflet-tile-pane` in both apps.

### Icons
Font Awesome Solid remains the system's icon library (unchanged from the prior system) — status-strip, tab bar, sidebar nav, SOS/report/volunteer icons, chevrons. No unicode symbol or emoji stands in for an icon.

## Do's and Don'ts

### Do:
- **Do** spend AHON red on SOS/critical/primary-emergency meaning only, on every surface.
- **Do** keep the 7-state mesh legend's color-to-meaning mapping unchanged even as its rendering evolves.
- **Do** set every live-updating number in Inter with tabular numerals via the `.tabular` utility.
- **Do** give every card and floating control a soft, non-offset shadow at rest — this system has no flat-card mode.
- **Do** give every LGU report a deep-linkable URL hash reference (`#N04`) that reopens straight to that case.
- **Do** draw icons from Font Awesome Solid at one consistent weight; never substitute a unicode symbol or emoji.

### Don't:
- **Don't** reintroduce the prior system's graticule grid, dashed-instrument marker style, or Overpass/Overpass Mono type — that instrument identity is fully retired, not a fallback to preserve.
- **Don't** give a rectangular button or card a hard, offset (non-blurred) shadow; this is not a neobrutalist world — shadows stay soft and ambient.
- **Don't** put the LGU priority list or AI Triage panel back into a drawer that slides over the map; they are permanently docked beside it in this world.
- **Don't** add an eighth accent hue without the same justification the seven-state legend required for Volunteer Violet.
