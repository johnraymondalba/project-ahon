# AHON

*Project AHON — Alert, Help, Offline Network.* An offline-first, BLE-mesh disaster response
prototype for flood-prone Nabua and Naga City, Camarines Sur. Built as a
web demo for BETT Show Asia — there's no real BLE/LoRa hardware here, the
mesh network is simulated so the app is fully demo-able in a browser.

## What's in here

The UI follows a "Clean Care" design language — white soft-shadowed cards,
a light grey ground, a single AHON-red accent, Inter type — a standard,
familiar mobile/admin app look rather than a bespoke visual identity. See
`.impeccable/surfaces/*.md` for the full direction contracts.

- **`index.html`** — landing page: logo, one-line pitch, and two role cards
  (Citizen vs LGU / Command Center).
- **`citizen.html`** — mobile-first citizen app in a phone-mockup chassis,
  navigated by a bottom tab bar:
  - **Home** — greeting header, the big SOS button, your current status
    summary, and one-tap quick-report shortcuts (Safe/Trapped/Injured).
  - **Map** — the live mesh map on real OpenStreetMap street tiles (no API
    key needed), with "ghost node" last-signal markers for nodes gone offline.
  - **Report** — status chips (Safe/Trapped/Injured) and supply-need chips
    (water/food/meds).
  - **Volunteer** — the volunteer-mode toggle plus a live "nearby needs"
    list built from the mesh.
  - **Profile** — a hub linking to four sub-pages (standard back-arrow push
    navigation): **My info & vulnerability** (name/age/blood type/height/
    weight, PWD/Elder/Infant flags — the flags broadcast to the LGU mesh for
    triage, everything else is local to the device), **Emergency contacts**
    (hotlines + personal contacts, one-tap `tel:` calling), **Settings**
    (notification preferences), and **Activity** (a local log of this
    device's own SOS broadcasts, status changes, and supply requests).
  - A persistent SOS floating button and broadcast banner stay visible on
    every tab except Home, where the hero button already covers it. Tapping
    SOS always opens a confirm-before-broadcast bottom sheet.
- **`lgu.html`** — desktop-first Command Center: a left sidebar (brand, nav,
  mesh health), a stat-card row (Critical/High/Cleared counts), a live map
  card (Google Maps when `GOOGLE_MAPS_API_KEY` is set, otherwise the same
  OpenStreetMap tiles as the citizen app — no key needed either way), and a
  docked panel with a sortable/filterable priority list, an AI Triage panel
  (Gemini), and a report detail view. Reports are deep-linkable
  (`lgu.html#N04`).
- **`iFlood.html`** — the original single-file mockup; now just redirects
  to `index.html`. Kept only so old bookmarks/links still resolve.

### JS/CSS layout

```
css/
  brand.css      shared color tokens, logo, typography — used by every page
  landing.css    landing page styles
  citizen.css    citizen app styles (light phone UI)
  lgu.css        LGU dashboard styles (light admin-dashboard UI)
js/
  config.js            local API keys — gitignored, created from config.example.js
  config.example.js     committed template for config.js
  mock-data.js          shared mock mesh dataset (~13 nodes around Nabua)
  mesh-simulator.js     interval that randomly nudges node statuses, simulating live mesh traffic (fallback when no live-sync server is reachable)
  realtime-client.js    WebSocket client that syncs citizen.html/lgu.html through server/index.js, when it's running
  citizen-map.js         Leaflet map logic for the citizen app (OpenStreetMap tiles, no API key)
  citizen-app.js         citizen app UI/state (status, needs, flags, SOS, volunteer mode, mesh indicator, Home/Volunteer summaries, local Profile/Contacts/Settings/Activity pages)
  citizen-gate.js         SOS confirm bottom sheet (confirm-before-broadcast flow)
  citizen-tabs.js         bottom tab-bar switching + Profile sub-page push navigation
  lgu-map.js             LGU map layer — Google Maps when a key is configured, otherwise the same OpenStreetMap-tiled fallback as the citizen app
  lgu-dashboard.js        LGU dashboard UI/state (table, cards, detail panel, health strip)
  lgu-deeplink.js         opens a report directly from a URL hash (lgu.html#N04)
  gemini-triage.js        Gemini API call + rule-based fallback for AI Triage
server/
  index.js                 optional local live-sync server (Express + ws) — see "Running it locally" below
assets/
  logo.svg                brand mark (circular navy arc over a cyan double-wave) — used across the app
  logo-w-text.svg          mark + "AHON" wordmark, color, transparent background
  logo-whote.svg           mark only, as a black circular badge with a white mark (for dark surfaces)
  logo-w-text-white.svg    black badge + white "AHON" wordmark (for dark surfaces)
  logo1.svg               horizontal mark + wordmark lockup, white background
  logo2-no_bg.svg          horizontal mark + wordmark lockup, transparent background
```

## Running it locally

### With live sync between the citizen app and the LGU dashboard (recommended)

By default `citizen.html` and `lgu.html` are two disconnected page loads —
tapping SOS on the phone mockup only changes that one screen. To actually
see an SOS broadcast (or a volunteer opt-in) show up on the LGU dashboard,
run the small local Node server in `server/`, which holds the one real copy
of the mesh state and pushes it to every open tab over WebSockets:

```bash
npm install
npm start
```

Then open two tabs:

- `http://localhost:3000/citizen.html` — tap **SOS**, change your status or
  supply needs on the **Report** tab, or flip **Volunteer** mode, and it
  broadcasts to the server.
- `http://localhost:3000/lgu.html` — watch the new report appear live in
  the priority table/map and get AI-triaged, no refresh needed.

This also works from two different devices on the same wifi network: swap
`localhost` for your machine's LAN IP (e.g. `http://192.168.1.23:3000/citizen.html`)
on the second device.

If the server isn't running, both pages still work standalone exactly as
before (each simulating its own local mesh) — they just won't sync with
each other.

### Static-only (no live sync)

This is otherwise a static site — no build step. Any static file server
works, e.g.:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080/index.html` (or the port shown).
Opening the HTML files directly via `file://` mostly works too, but a local
server avoids occasional browser restrictions on `fetch()`/scripts from
`file://` origins — recommended, especially for the LGU dashboard.

## Deploying to Vercel

This is a static site, so a Vercel deployment needs no framework preset —
just import the repo. `vercel.json` sets the build/output config, and
`scripts/build-config.js` generates `js/config.js` at build time from
environment variables (it's gitignored, so it doesn't exist in the repo
itself):

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework Preset: **Other** (no build tooling is needed beyond the config
   script, which Vercel runs automatically via `vercel.json`).
3. Optional — in Project Settings → Environment Variables, add
   `GOOGLE_MAPS_API_KEY` and/or `GEMINI_API_KEY` to enable the live map and
   Gemini AI Triage in the deployed app. Leave them unset to deploy with the
   same zero-key fallback behavior as local dev.
4. Deploy. Every build regenerates `js/config.js` from whatever env vars are
   set at deploy time.

You can also deploy from the CLI with `vercel` (preview) / `vercel --prod`
from the project root, after `vercel login`.

## Adding real API keys

Two Google APIs are wired up for real, working calls:

1. **Google Maps JavaScript API** — powers the LGU dashboard's live map.
2. **Gemini API (Generative Language API)** — powers the AI Triage panel,
   which scores each incoming report as `Critical` / `High` / `Low` with a
   short reasoning sentence and a recommended action.

Both keys are read from `js/config.js` at runtime — **never hardcoded**.
`js/config.js` is gitignored; `js/config.example.js` is the committed
template.

**Setup:**

```bash
cp js/config.example.js js/config.js
```

Then edit `js/config.js`:

```js
window.APP_CONFIG = {
    GOOGLE_MAPS_API_KEY: 'your-maps-key-here',
    GEMINI_API_KEY: 'your-gemini-key-here',
};
```

- Get a Google Maps key from the [Google Cloud Console](https://console.cloud.google.com/)
  with the **Maps JavaScript API** enabled.
- Get a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).

**Both keys are optional for the demo.** If `GOOGLE_MAPS_API_KEY` is empty,
the LGU dashboard shows a placeholder instead of the live map. If
`GEMINI_API_KEY` is empty (or a Gemini call fails), AI Triage falls back to
simple rule-based scoring — so the whole app still runs and looks complete
with zero keys configured, which is the default state of this repo for
judging.

> **Note on client-side keys:** because this is a static, no-backend
> prototype, both API calls are made directly from the browser. That's fine
> for a local demo, but a production version should proxy the Gemini call
> through a backend so the key isn't exposed to end users, and should
> restrict the Maps key by HTTP referrer in the Google Cloud Console.

## Design/research tools (not runtime dependencies)

Google Earth and NotebookLM were used during the design and research phase
(terrain mapping and census data analysis for the Nabua/Naga flood
corridor) but are not called by the running app — only Google Maps and
Gemini are live integrations here.
