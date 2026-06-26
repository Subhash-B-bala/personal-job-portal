// Vercel serverless function — proxies Apify calls server-side (no CORS issues)
// Receives API key from the browser via header, never stored on server.

const ACTOR_ID = 'automation-lab/naukri-scraper';

const SEARCHES = [
  { keyword: 'data analyst',       location: 'chennai', maxJobs: 30, sortBy: 'date', proxyConfiguration: { useApifyProxy: true } },
  { keyword: 'power bi sql analyst', location: 'chennai', maxJobs: 30, sortBy: 'date', proxyConfiguration: { useApifyProxy: true } },
];

async function runSearch(apiKey, input) {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/run-sync-get-dataset-items`
    + `?token=${apiKey}&timeout=90&memory=256`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Apify ${res.status}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-apify-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // API key comes from the browser (stored in user's localStorage)
  const apiKey = req.headers['x-apify-key'] || '';

  if (!apiKey) {
    return res.status(200).json([]);   // no key → browser will show mock data
  }

  try {
    // Run both searches in parallel on the server
    const results = await Promise.allSettled(
      SEARCHES.map((input) => runSearch(apiKey, input))
    );

    let items = [];
    const errors = [];

    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        items = items.concat(r.value);
      } else if (r.status === 'rejected') {
        errors.push(r.reason?.message || 'unknown error');
      }
    }

    if (items.length === 0) {
      const msg = errors.length ? errors.join(' | ') : 'Actor returned no results';
      return res.status(502).json({ error: msg });
    }

    return res.status(200).json(items);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
