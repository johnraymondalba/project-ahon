# iFlood — Project AHON

*Alert, Help, Offline Network.* An offline-first, BLE-mesh disaster response
prototype for flood-prone Nabua and Naga City, Camarines Sur. Built as a
web demo for BETT Show Asia — there's no real BLE/LoRa hardware here, the
mesh network is simulated so the app is fully demo-able in a browser.

## What's in here

- **`index.html`** — landing page with the role selector (Citizen vs LGU).
- **`citizen.html`** — mobile-first, dark phone-mockup UI: live mesh map,
  one-tap status (Safe/Trapped/Injured), supply-need chips, Volunteer Mode,
  Broadcast SOS, a mesh connectivity indicator, and "ghost node" last-signal
  markers for nodes that have gone offline.
- **`lgu.html`** — desktop-first, light "Command Center" dashboard: a live
  priority map (Google Maps), summary cards, a sortable/filterable priority
  list, an AI Triage panel (Gemini), and a mesh/network health strip.
- **`iFlood.html`** — the original single-file mockup; now just redirects
  to `index.html` since its content was split into the files above.

### JS/CSS layout

```
css/
  brand.css      shared color tokens, logo, typography — used by every page
  landing.css    landing page styles
  citizen.css    citizen app styles (dark phone UI)
  lgu.css        LGU dashboard styles (light UI)
js/
  config.js            local API keys — gitignored, created from config.example.js
  config.example.js     committed template for config.js
  mock-data.js          shared mock mesh dataset (~13 nodes around Nabua)
  mesh-simulator.js     interval that randomly nudges node statuses, simulating live mesh traffic
  citizen-map.js         Leaflet map logic for the citizen app
  citizen-app.js         citizen app UI/state (status, needs, SOS, volunteer mode, mesh indicator)
  lgu-map.js             Google Maps integration for the LGU dashboard
  lgu-dashboard.js        LGU dashboard UI/state (table, cards, detail panel, health strip)
  gemini-triage.js        Gemini API call + rule-based fallback for AI Triage
assets/
  iflood-logo.svg  brand mark (circular navy arc over a cyan double-wave)
```

## Running it locally

This is a static site — no build step. The simplest option is any static
file server, run from the project root:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080/index.html` (or `:8080/8080` port shown).
Opening the HTML files directly via `file://` mostly works too, but a local
server avoids occasional browser restrictions on `fetch()`/scripts from
`file://` origins — recommended, especially for the LGU dashboard.

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
