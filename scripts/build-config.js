/*
  Generates js/config.js from environment variables at deploy time (Vercel
  build step). This keeps API keys out of git while still letting a hosted
  deployment supply real keys via Project Settings -> Environment Variables.

  Locally, just `cp js/config.example.js js/config.js` instead — see README.md.
*/
const fs = require('fs');
const path = require('path');

const mapsKey = process.env.GOOGLE_MAPS_API_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const contents = `/* Auto-generated at build time from environment variables. Do not edit directly. */
window.APP_CONFIG = {
    GOOGLE_MAPS_API_KEY: ${JSON.stringify(mapsKey)},
    GEMINI_API_KEY: ${JSON.stringify(geminiKey)},
};
`;

const outPath = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(outPath, contents);
console.log(`Wrote ${outPath} (GOOGLE_MAPS_API_KEY: ${mapsKey ? 'set' : 'empty'}, GEMINI_API_KEY: ${geminiKey ? 'set' : 'empty'})`);
