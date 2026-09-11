/*
  Copy this file to js/config.js and fill in real keys for local development.
  js/config.js is gitignored — never commit real API keys.

  GOOGLE_MAPS_API_KEY — powers the LGU dashboard's live map (Maps JavaScript API).
  GEMINI_API_KEY      — powers AI Triage (Generative Language API).

  Both are optional for the demo: the LGU map falls back to a "add a key to
  enable the live map" placeholder, and AI Triage falls back to rule-based
  scoring, so judges can run this with zero keys configured.
*/
window.APP_CONFIG = {
    GOOGLE_MAPS_API_KEY: '',
    GEMINI_API_KEY: '',
};
