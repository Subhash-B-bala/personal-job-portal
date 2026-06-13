import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

// Curated list of Apify actors that scrape jobs in India
const KNOWN_ACTORS = [
  {
    id: 'bebity/linkedin-jobs-scraper',
    name: 'LinkedIn Jobs Scraper',
    description: 'Scrapes LinkedIn job listings. Best for mid-level roles with detailed JDs.',
    sites: ['LinkedIn'],
  },
  {
    id: 'apify/indeed-scraper',
    name: 'Indeed Scraper',
    description: 'Scrapes Indeed job posts. Good coverage for fresher and entry-level roles.',
    sites: ['Indeed'],
  },
  {
    id: 'vaclavrut/naukri-jobs-scraper',
    name: 'Naukri Jobs Scraper',
    description: 'Scrapes Naukri.com — top platform for Data Analyst jobs in Chennai.',
    sites: ['Naukri'],
  },
  {
    id: 'curious_coder/job-scraper',
    name: 'Multi-site Job Scraper',
    description: 'Scrapes multiple Indian job boards including Naukri, Shine, and TimesJobs.',
    sites: ['Naukri', 'Shine', 'TimesJobs'],
  },
  {
    id: 'tri_angle/wellfound-scraper',
    name: 'Wellfound (AngelList) Scraper',
    description: 'Best for startup and remote Data Analyst roles.',
    sites: ['Wellfound'],
  },
];

async function suggestActorWithGroq(groqApiKey) {
  const prompt = `You are helping a fresher Data Analyst named Nandhini find the best Apify actor (web scraper) to find jobs.

She is looking for: Data Analyst jobs in Chennai, India or Remote. Skills: Power BI, SQL, Excel, DAX. Experience: 0-2 years (fresher).

Here are the available Apify actors she can use:
${KNOWN_ACTORS.map((a, i) => `${i + 1}. Actor ID: "${a.id}" | Name: "${a.name}" | Sites: ${a.sites.join(', ')} | About: ${a.description}`).join('\n')}

Which ONE actor ID would you recommend for her? Reply with ONLY a JSON object like:
{"actorId": "the/actor-id", "reason": "one sentence why"}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 150,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';

  // Extract JSON from response (may have markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Groq returned unexpected format');
  return JSON.parse(jsonMatch[0]);
}

export default function Settings() {
  const { settings, saveSettings } = useSettings();

  const [apifyKey, setApifyKey]   = useState(settings.apifyApiKey);
  const [actorId, setActorId]     = useState(settings.apifyActorId);
  const [groqKey, setGroqKey]     = useState(settings.groqApiKey);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [groqError, setGroqError]   = useState('');
  const [saved, setSaved]           = useState(false);

  function handleSave() {
    saveSettings({ apifyApiKey: apifyKey, apifyActorId: actorId, groqApiKey: groqKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSuggest() {
    if (!groqKey) { setGroqError('Enter your Groq API key first.'); return; }
    setSuggesting(true);
    setSuggestion(null);
    setGroqError('');
    try {
      const result = await suggestActorWithGroq(groqKey);
      setSuggestion(result);
    } catch (err) {
      setGroqError(err.message);
    } finally {
      setSuggesting(false);
    }
  }

  function applyActorSuggestion() {
    if (suggestion?.actorId) setActorId(suggestion.actorId);
  }

  const apifyConfigured = !!apifyKey && apifyKey !== 'your_apify_key_here';
  const groqConfigured  = !!groqKey;

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 md:pb-4 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          API keys are saved only to this browser — never sent anywhere except the respective APIs.
        </p>
      </div>

      {/* ── Apify section ──────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-800">Apify</span>
          {apifyConfigured
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Connected</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Not set — using demo data</span>
          }
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Apify API Key</label>
          <input
            type="password"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 font-mono"
            placeholder="apify_api_xxxxxxxxxxxx"
            value={apifyKey}
            onChange={(e) => setApifyKey(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Get yours free at{' '}
            <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer"
              className="text-indigo-500 underline">
              console.apify.com → Integrations
            </a>
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Apify Actor ID</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 font-mono"
              placeholder="e.g. bebity/linkedin-jobs-scraper"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
            />
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              className="text-xs px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
            >
              {suggesting ? 'Thinking…' : '✦ Ask AI'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Not sure which actor to use? Enter your Groq key below and click "Ask AI".
          </p>
        </div>

        {/* Actor picker */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-600">Or pick from known job scrapers:</p>
          {KNOWN_ACTORS.map((actor) => (
            <button
              key={actor.id}
              onClick={() => setActorId(actor.id)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors
                ${actorId === actor.id
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{actor.name}</span>
                <span className="text-xs text-gray-400">{actor.sites.join(', ')}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{actor.description}</p>
              <p className="text-xs font-mono text-gray-400 mt-1">{actor.id}</p>
            </button>
          ))}
        </div>

        {/* Groq suggestion result */}
        {suggestion && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-purple-700">AI Recommendation</p>
            <p className="text-sm font-mono text-purple-900">{suggestion.actorId}</p>
            <p className="text-xs text-purple-700">{suggestion.reason}</p>
            <button
              onClick={applyActorSuggestion}
              className="self-start text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Use this actor
            </button>
          </div>
        )}

        {groqError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{groqError}</p>
        )}
      </section>

      {/* ── Groq section ───────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-800">Groq AI</span>
          {groqConfigured
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Connected</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Not set</span>
          }
        </div>
        <p className="text-xs text-gray-500">
          Used to suggest the best Apify actor for your job search. Free tier is generous.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Groq API Key</label>
          <input
            type="password"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 font-mono"
            placeholder="gsk_xxxxxxxxxxxx"
            value={groqKey}
            onChange={(e) => setGroqKey(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Free at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
              className="text-indigo-500 underline">
              console.groq.com/keys
            </a>
          </p>
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`py-2.5 rounded-xl font-medium text-sm transition-colors
          ${saved ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>

      {/* Status summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500 flex flex-col gap-1">
        <p className={apifyConfigured ? 'text-green-600' : ''}>
          {apifyConfigured ? '✓' : '○'} Apify API Key {apifyConfigured ? 'set' : 'not set'}
        </p>
        <p className={actorId ? 'text-green-600' : ''}>
          {actorId ? '✓' : '○'} Actor ID {actorId ? `set → ${actorId}` : 'not set'}
        </p>
        <p className={groqConfigured ? 'text-green-600' : ''}>
          {groqConfigured ? '✓' : '○'} Groq API Key {groqConfigured ? 'set' : 'not set'}
        </p>
        {!apifyConfigured && (
          <p className="mt-1 text-amber-600">
            No Apify key — Job Feed is running on demo data.
          </p>
        )}
      </div>
    </div>
  );
}
