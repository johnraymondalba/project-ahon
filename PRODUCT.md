# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Citizens** in flood-prone Nabua and Naga City, Camarines Sur, Philippines — real residents (not only demo viewers) who may need to report their status and needs, or volunteer to help neighbors, during an actual flood: often outdoors, under stress, one-handed, in bright daylight/glare, on a phone that may be low on battery. Explicitly includes elderly and PWD (persons with disabilities) users as a core audience, not an edge case.
- **LGU / Command Center staff** — real local-government emergency responders who monitor incoming reports, triage by priority, and dispatch help from a desktop/laptop command center, under time pressure with many simultaneous reports.
- **BETT Show Asia audience** (secondary) — an education-technology conference audience/judges evaluating the working prototype in a short demo window. The design must read as polished and impressive there, but the primary design target is real future deployment, not just the demo.

## Product Purpose

AHON ("Project AHON"; Alert, Help, Offline Network) is an offline-first, BLE-mesh disaster response network for flood-prone Nabua and Naga City, Camarines Sur. It lets citizens broadcast SOS/status/needs and lets LGU command centers triage and dispatch help — entirely without internet or cellular connectivity. Reports hop phone-to-phone over a BLE mesh until they reach an LGU gateway node.

Success means: a citizen with zero signal can still get a status/need/SOS report to an LGU gateway, and LGU staff can see and act on incoming reports fast enough to prioritize who needs help first.

## Positioning

The mechanism a connectivity-dependent disaster app cannot truthfully copy: AHON works with **zero internet or cellular signal** by relaying reports phone-to-phone over a BLE mesh, however many hops it takes to reach an LGU gateway node. The tagline "Only takes One Hop to Help" names this directly.

## Operating Context

- Citizens use the app in real flood conditions: outdoors, stressed, possibly one-handed, in bright daylight, on a phone that may be low on battery or losing signal entirely.
- LGU staff operate the command center dashboard on a desktop/laptop, triaging multiple incoming reports at once and dispatching field teams under time pressure.
- The product is demonstrated at BETT Show Asia as a working prototype. There is no real BLE/LoRa hardware yet — the mesh network and map data are simulated for the demo. The two real, live integrations are the Google Maps JavaScript API (LGU live map) and the Gemini API (AI Triage scoring); both degrade gracefully to a rule-based/placeholder fallback when no API key is configured, so the app looks and functions complete with zero keys set.
- Static site, no backend, no build step (plain HTML/CSS/JS). Deployable to Vercel; a build-time script generates the gitignored API-key config from environment variables so keys are never committed.

## Capabilities and Constraints

- **Landing / role select:** routes to the Citizen app or the LGU Command Center.
- **Citizen app:** an SOS/Volunteer entry gate (SOS requires a confirm step before broadcasting); one-tap status (Safe/Trapped/Injured); supply-need chips (water/food/meds); Volunteer Mode; a live mesh map with color-coded node status; a mesh connectivity indicator (online with hop-count to LGU, or offline "store & forward"); "ghost node" markers showing the last-known position/time of a node that has gone offline.
- **LGU Command Center:** a live priority map; summary stat cards (critical/high/cleared counts); a sortable/filterable priority list; an AI Triage panel (Gemini-scored Critical/High/Low with a reasoning sentence and recommended action, rule-based fallback without a key); a mesh/network health strip (phone node count, LoRa relay count).
- Both real integrations (Google Maps, Gemini) are optional at runtime; the product must never look broken or incomplete with zero keys configured.
- The mesh network already tracks a distinct "Senior / PWD" node status as a first-class category (not just Safe/Trapped/Injured), reflecting that elderly/PWD citizens are an explicit part of the user base.
- Open/undecided: whether the citizen or LGU UI needs Filipino/Bikol localization, or stays English-only. Not yet confirmed — do not invent copy in another language without asking.

## Brand Commitments

- **Name:** the product has been rebranded. **"AHON" (Project AHON) is now the sole primary name.** The prior name, "iFlood," is fully retired — it must not appear in page titles, headings, or any user-facing UI copy going forward (history in README changelog/commit messages is fine).
- **Tagline:** "Only takes One Hop to Help" — existing, confirmed brand copy, kept.
- **Assets:** `assets/` holds 6 logo SVG files (uploaded by the user, replacing an older single-mark logo): a mark-only badge (`logo.svg`), a mark-only black/white circular badge for dark surfaces (`logo-whote.svg`), a mark + "AHON" wordmark in color (`logo-w-text.svg`) and in white (`logo-w-text-white.svg`), and two horizontal mark+wordmark lockups — one on white (`logo1.svg`), one transparent (`logo2-no_bg.svg`). These are available to the redesign to reuse, adapt, or replace; nothing about their current styling is binding.
- **Existing mark colors** (navy ~#1800ad, cyan ~#3ec4e4) appear in the current logo files but are not a locked palette — the redesign brief explicitly treats the current navy/cyan UI look as anti-reference.

## Evidence on Hand

- A mock mesh dataset of ~13 nodes around Nabua, used to simulate live mesh traffic for the demo.
- No real user testimonials, case studies, or field photos exist; none should be fabricated.
- No real BLE/LoRa hardware exists yet; the mesh network is simulated. Do not present it as real hardware.
- Google Maps JavaScript API and Gemini (Generative Language) API are the only two real, working integrations, both optional and both already wired with graceful fallbacks.

## Product Principles

1. The offline-mesh mechanism is the product's core truth, not a network fallback — every design decision should defer to "this must make sense with zero connectivity."
2. Citizen-facing critical paths (SOS, status, needs) must be usable by a stressed, possibly elderly or PWD person, one-handed, outdoors, in seconds — clarity and speed outrank density or cleverness.
3. LGU-facing flows must support fast, confident triage decisions under pressure — scanability and information density outrank expression there.
4. Never blur what's simulated (mesh network, hardware) versus what's real (Google Maps, Gemini) in how the product presents itself.
5. AHON is the one and only brand identity going forward; no "iFlood" naming survives in the shipped product.

## Accessibility & Inclusion

Elderly and PWD usability is a confirmed **core design constraint** for the citizen app's critical paths (SOS, status, supply needs) — large touch targets, high contrast, minimal reading burden, and simplified one-handed interaction, not just baseline good practice. Language localization (Filipino/Bikol vs. English-only) is unconfirmed and open.
