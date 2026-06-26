// Vercel serverless function — only STARTS the Apify runs (fast, < 5s).
// Browser then polls Apify status + fetches results directly.

const ACTOR_ID = 'automation-lab/naukri-scraper';

const SEARCHES = [
  { keyword: 'data analyst',        location: 'chennai', maxJobs: 25, sortBy: 'date', proxyConfiguration: { useApifyProxy: true } },
  { keyword: 'power bi sql analyst', location: 'chennai', maxJobs: 25, sortBy: 'date', proxyConfiguration: { useApifyProxy: true } },
];

async function startRun(apiKey, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Apify ${res.status}`);
  }
  const data = await res.json();
  return { runId: data.data.id, defaultDatasetId: data.data.defaultDatasetId };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-apify-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = req.headers['x-apify-key'] || '';
  if (!apiKey) return res.status(200).json({ runs: [] });

  try {
    // Start both runs in parallel — each POST takes ~1-2s
    const results = await Promise.allSettled(
      SEARCHES.map((input) => startRun(apiKey, input))
    );

    const runs = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    const errors = results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason?.message);

    if (runs.length === 0) {
      return res.status(502).json({ error: errors.join(' | ') || 'Failed to start actor runs' });
    }

    // Return run IDs — browser polls status and fetches results directly
    return res.status(200).json({ runs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
