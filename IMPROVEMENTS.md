# AHON — improvement log

Work done on **17 September 2026**, ahead of BETT Show Asia. Branched from
`main` at `44d9372`.

Everything here is presentation and correctness work on the existing
prototype. No feature was added or removed, no data model changed, and the
BLE/LoRa mesh remains simulated exactly as before.

**Please read before merging:** none of this was verified in a browser.
There is no Node install and no browser tooling on the machine it was
written on, so the live-sync server was never started and no page was ever
rendered. The changes are reviewed and reasoned but not seen. Load all
three pages and click through every citizen tab before you rely on any of
it — the pointer-events change in particular touches the shell that all
five citizen tabs share.

---

## Part 1 — Change log

Oldest first. Each entry is one commit.

### `f928ff6` — Add page metadata and fix three judge-facing details

None of the three pages had a favicon, description, `theme-color`, or
`og:` tags. Browser tabs showed a blank document icon and a shared link
previewed as a bare URL.

- Added per-page metadata to `index.html`, `citizen.html`, `lgu.html`.
  `theme-color` matches each page's own ground — `#0B0E15` for the citizen
  app's dark world, `#F4F6FA` for the two light pages.
- `og:image` is left commented out with instructions. It needs a 1200×630
  PNG and an absolute deployed URL; crawlers ignore relative paths.
- `index.html` title read `AHON | Project AHON`. Now carries the tagline.
- The landing footnote pointed judges at `README.md`. It now names what is
  simulated (the BLE/LoRa mesh) and what is live (Maps, Gemini) — the line
  we want to hold on stage anyway.
- The citizen map legend opened minimized, hiding the colour key the whole
  map reads by. It now opens expanded.
- The LGU "Cleared" stat card counts Low-tier reports, not cleared ones.
  Relabelled to "Low" — id and class renamed too, so they don't drift.

### `576c57d` — Rescore a report when it changes, not just when it is new

The bug that broke the demo we most wanted to give.

`js/lgu-dashboard.js` only triaged nodes it had never seen. A citizen
connected as SAFE, was scored Low, then tapped SOS — and the row read
`SOS` while the priority column still read `Low`, with the Critical
counter unmoved, until someone clicked "Re-run AI Triage" by hand.

- Cached scores now carry a fingerprint of the inputs triage actually
  reads: status, unmet needs, vulnerability flags, staleness. The exact
  `lastSignalMin` is deliberately excluded — it drifts every tick and would
  invalidate every score constantly.
- Reports whose fingerprint changed are rescored with the instant
  rule-based pass *before* anything renders, so the new priority lands in
  the same frame.
- Those reports are then queued for a Gemini upgrade, debounced 1.5 s and
  batched, since ambient mesh traffic can change several reports a second
  and each upgrade is a network call.
- Both the upgrade pass and `runTriage` now discard a result whose report
  changed mid-flight, rather than overwriting a fresher rule-based score
  with an answer to the old question.

### `07b4bbf` — Let the citizen map be panned and zoomed

The map could not be dragged, pinched or zoomed at all. Only the one fixed
view around Nabua was ever reachable.

Leaflet was never the problem. `.app-shell` is absolutely positioned across
the whole screen above `#map`, and neither it nor `.pages` opted out of hit
testing, so their transparent areas swallowed every gesture. `.page--map`
did set `pointer-events: none` — and then `.page--map.active` set it
straight back to `auto`, which is the only state in which the map is on
screen.

- The shell and page stack are click-through by default; each interactive
  piece opts back in. `.status-strip` already worked this way; the SOS
  banner, FAB, tab bar, ordinary pages, and the map's overlay and sheet now
  do the same.
- Added zoom in/out as one segmented pill, and a recenter control that
  returns to "you" after panning — keeping the user's zoom unless they were
  further out than the default. Leaflet's own zoom control stays off; these
  match the phone UI and clear the docked sheet.

### `072e644` — Clean up the citizen map: no scrollbars, fewer labels

Three things were making the Map tab hard to look at.

- **A desktop scrollbar ran the full height of the phone screen.** The map
  page inherited `.page`'s `overflow-y`. It is a fixed window, so it now
  never scrolls — and the surfaces that legitimately do scroll (pages,
  sub-page bodies, the sheet) no longer paint a scrollbar gutter. A native
  scrollbar down a phone mockup is the single thing that most breaks the
  illusion of a real device.
- **The markers were a wall of colliding text.** Ghost nodes carried
  `LAST SEEN 55m AGO` across two lines and got clipped; that is now
  `55m ago`. SAFE neighbours were labelled too — the resting state and the
  most common one on the map — so `SOS`, `TRAPPED` and `INJURED` were
  competing with labels carrying no news. Safe nodes now read as colour
  alone, which the legend already explains.
- **The control stack could clip itself.** Zoom and recenter now sit
  directly under the legend toggle with the legend box last, so opening it
  grows the stack down into empty map rather than pushing the buttons off
  screen. The stack is capped to the visible height.

### `708aaf8` — Shrink the map legend into a key

At 172 px wide with six stacked rows, the legend covered close to half the
width and a quarter of the height of the map it was there to explain — and
it opens by default, so that was the resting state of the tab.

- Two-column grid instead of one tall list: roughly half the height, no
  wider.
- Translucent with a blur so the map reads through it, matching the
  treatment the bottom sheet already uses.
- Tighter type and dots; labels lost the words carrying no meaning —
  "SOS Active" → "SOS", "Civilian / Safe" → "Safe", "Last Signal Found" →
  "Last seen", which is also what the ghost markers themselves now say.
- Ordered by urgency down each column rather than by the order the colours
  happened to be defined in.

### `e016c10` — Make the LGU map legend visible, and build it from the marker colours

The dashboard legend was in the markup and styled, but nobody had ever seen
it: at `z-index: 5` it painted underneath the map.

- `.leaflet-container` is positioned with `z-index: auto`, so it opens no
  stacking context and its panes (400) and control corners (1000) compete
  directly with siblings in the card. A small local z-index loses to the
  tiles. Now at 1200.
- Moved from bottom-left to top-right. Bottom-left is where the Google Maps
  logo lands once a key is configured, and that attribution must not be
  covered. Leaflet keeps zoom at top-left and attribution at bottom-right,
  so top-right is clear in both implementations. Google's fullscreen
  control is switched off to keep that corner free.
- The six swatches were hardcoded hex in `lgu.html`, duplicating
  `STATUS_COLOR` in `js/lgu-map.js` with nothing keeping them in step. They
  are now generated from it, ordered by urgency. A legend that quietly
  disagrees with the map is worse than no legend — and until now it
  disagreed invisibly.

---

## Part 2 — What improved

### Correctness

| Fix | Where | Why it mattered |
| --- | --- | --- |
| A live SOS now scores Critical immediately | `js/lgu-dashboard.js` | It previously stayed at the tier the citizen had on connect, so the hero demo showed `SOS` / `Low` side by side |
| The citizen map can be panned and zoomed | `css/citizen.css` | The whole map beyond one fixed view was unreachable |
| The LGU map legend is visible | `css/lgu.css` | It had been painting under the map tiles since it was written |
| The legend cannot disagree with the map | `js/lgu-map.js`, `lgu.html` | Swatches were duplicated hex with nothing keeping them in sync |
| Stale AI results no longer overwrite fresh ones | `js/lgu-dashboard.js` | A slow Gemini call could land after the report had already changed |
| "Cleared" renamed to "Low" | `lgu.html`, `css/lgu.css`, `js/lgu-dashboard.js` | The card counts low-priority reports; nothing had been cleared by anyone |

### Presentation

| Fix | Where |
| --- | --- |
| Favicon, description, `theme-color` and `og:` tags on all three pages | all HTML |
| Tab title no longer reads `AHON \| Project AHON` | `index.html` |
| Landing footnote names what is simulated and what is live, instead of pointing at `README.md` | `index.html` |
| No desktop scrollbars anywhere inside the phone mockup | `css/citizen.css` |
| Roughly a third fewer marker labels on the citizen map, and none clipped | `js/citizen-map.js` |
| Citizen legend is a compact translucent key, not a panel covering the map | `css/citizen.css`, `citizen.html` |
| LGU legend sits clear of the Google Maps attribution | `css/lgu.css`, `js/lgu-map.js` |

### Usability

- Zoom and recenter controls on the citizen map, matching the phone UI.
- The citizen map legend opens by default, so the colour key is free
  rather than hidden behind a toggle.
- Gemini triage calls are debounced and batched instead of firing per
  ambient mesh tick.

---

## Part 3 — Known gaps, not addressed here

Carried forward from the prototype audit. Ordered by how much each one
costs us in front of judges.

1. **The deployed link cannot do the citizen→LGU demo.** `vercel.json`
   ships static files; the WebSocket server in `server/index.js` never
   runs there. This works only on a laptop running `npm start`. Needs a
   host that keeps a process alive, or a move to a hosted realtime
   backend.
2. **The offline-first app breaks offline.** Leaflet, Font Awesome and map
   tiles all load from the network. Airplane mode — the demo a judge will
   ask for — renders an unstyled, mapless page. Needs vendored assets, a
   service worker and a cached tile pack.
3. **An SOS disappears when the phone sleeps.** `server/index.js` deletes
   the citizen node on socket close. A distress call should outlive the
   battery that sent it.
4. **The ambient simulator contradicts the presenter.** Node statuses flip
   every five seconds with no way to freeze or reset between run-throughs.
5. **No report lifecycle.** The LGU can see a report but cannot
   acknowledge, assign or resolve it, and nothing flows back to the
   citizen. This is the change that would make the dashboard read as an
   operational system rather than a live viewer.
6. **Mock data still reads as test data.** `Node 12`, `Unit 7 SOS`,
   `Mark T.` Real names and real barangays would do more for perceived
   realism than any styling. Left for the team — the barangay names should
   be ones we know are real.
7. **Accessibility contradiction.** Status chips are `<div onclick>`, not
   keyboard or screen-reader operable, while elderly and PWD usability is
   claimed as a core design constraint.
8. **Impact evidence is missing.** No sourced figures, no bill of
   materials, no rollout phases, no named owner.
9. **Rescuers and volunteers are invisible in the list.** They plot on the
   LGU map but `getReports()` filters them out of the table, so a green dot
   cannot be clicked through to anything.
10. **`README.md` is out of date** — it describes five citizen tabs; the
    app now has three, with Report and Volunteer folded into the map sheet.
