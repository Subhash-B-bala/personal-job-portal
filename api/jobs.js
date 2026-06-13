// Vercel serverless function — runs on Node.js, safe to use apify-client here
import { ApifyClient } from 'apify-client';

const SEARCH_QUERIES = [
  'Data Analyst Chennai',
  'Power BI Analyst Chennai',
  'SQL Analyst fresher',
  'Data Analyst Remote India',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey  = process.env.VITE_APIFY_API_KEY;
  const actorId = process.env.VITE_APIFY_ACTOR_ID;

  if (!apiKey || apiKey === 'your_apify_key_here') {
    // Return empty — frontend will use mock data
    return res.status(200).json([]);
  }

  try {
    const client = new ApifyClient({ token: apiKey });
    const run = await client.actor(actorId).call({ queries: SEARCH_QUERIES, maxResults: 50 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return res.status(200).json(items);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
