/*
  AI Triage — the "AI scores each report for priority" feature from the
  pitch. Sends a structured prompt to the Gemini (Generative Language) API
  for each active report and parses back:
    { priorityTier: 'Critical' | 'High' | 'Low', reasoning, recommendedAction }

  If GEMINI_API_KEY is not set (see config.js / config.example.js) or the
  request fails, this falls back to simple rule-based scoring so the LGU
  dashboard demo still works fully offline / without a key during judging.

  Note: Google Earth and NotebookLM were only used during design/research
  (terrain mapping and census data analysis) — they are not runtime
  dependencies of this app and are not called here.
*/

const GEMINI_MODEL = 'gemini-2.0-flash';

function buildTriagePrompt(node) {
    const needs = Object.keys(node.needs || {}).filter(k => node.needs[k]);
    const flags = Object.keys(node.flags || {}).filter(k => node.flags[k]);
    return `You are triaging incoming reports for a flood disaster-response command center in Nabua, Camarines Sur, Philippines.

Report:
- Status: ${node.status}
- Supplies needed: ${needs.length ? needs.join(', ') : 'none reported'}
- Vulnerability flags: ${flags.length ? flags.join(', ') : 'none'}
- Minutes since last signal: ${Math.round(node.lastSignalMin)}

Score this report's rescue priority. Respond with ONLY a JSON object, no markdown, matching exactly:
{"priorityTier": "Critical" | "High" | "Low", "reasoning": "one short sentence", "recommendedAction": "what a rescuer should bring or do, one short sentence"}`;
}

// Rule-based fallback so the demo works with no API key / no internet.
function ruleBasedTriage(node) {
    const needs = node.needs || {};
    const flags = node.flags || {};
    const vulnerable = flags.pwd || flags.infant || flags.elder;
    const stale = node.lastSignalMin > 30;

    let priorityTier = 'Low';
    let reasoning = 'Reporter is safe with no outstanding needs.';
    let recommendedAction = 'Monitor status; no immediate dispatch needed.';

    if (node.status === 'SOS' || node.status === 'INJURED' || (node.status === 'TRAPPED' && vulnerable) || stale) {
        priorityTier = 'Critical';
        reasoning = stale
            ? `No signal for ${Math.round(node.lastSignalMin)} minutes — last known position may no longer be accurate.`
            : `${node.status === 'INJURED' ? 'Injury reported' : 'Active SOS'}${vulnerable ? ' with a vulnerable person on-site' : ''} requires immediate response.`;
        recommendedAction = needs.meds ? 'Dispatch medical team with first-aid kit immediately.' : 'Dispatch nearest rescue team immediately.';
    } else if (node.status === 'TRAPPED' || needs.meds || needs.water || needs.food) {
        priorityTier = 'High';
        reasoning = 'Person is trapped or has unmet supply needs but is not in immediate medical danger.';
        recommendedAction = needs.water ? 'Bring water and check on evacuation route.' : 'Assess and plan evacuation within the hour.';
    }

    return { priorityTier, reasoning, recommendedAction, source: 'fallback' };
}

async function getAiTriage(node) {
    const apiKey = window.APP_CONFIG && window.APP_CONFIG.GEMINI_API_KEY;
    if (!apiKey) return ruleBasedTriage(node);

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildTriagePrompt(node) }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                }),
            }
        );

        if (!res.ok) throw new Error(`Gemini API responded ${res.status}`);

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini API returned no content');

        const parsed = JSON.parse(text);
        if (!parsed.priorityTier || !parsed.reasoning || !parsed.recommendedAction) {
            throw new Error('Gemini API response missing expected fields');
        }
        return { ...parsed, source: 'gemini' };
    } catch (err) {
        console.warn('[iFlood] Gemini triage failed, using rule-based fallback:', err.message);
        return ruleBasedTriage(node);
    }
}

if (typeof window !== 'undefined') {
    window.getAiTriage = getAiTriage;
    window.ruleBasedTriage = ruleBasedTriage;
}
