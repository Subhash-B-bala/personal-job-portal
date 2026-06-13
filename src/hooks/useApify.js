import { useState, useEffect } from 'react';
import { scoreJob } from '../utils/scoring';
import { detectScam } from '../utils/scamDetect';
import { loadStorage } from '../utils/storage';

const CACHE_KEY      = 'nandhini_jobs_cache';
const CACHE_DATE_KEY = 'nandhini_jobs_date';
const SETTINGS_KEY   = 'nandhini_settings';

const SEARCH_QUERIES = [
  'Data Analyst Chennai',
  'Power BI Analyst Chennai',
  'SQL Analyst fresher India',
  'Data Analyst Remote India',
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function loadCache() {
  if (localStorage.getItem(CACHE_DATE_KEY) === todayString()) {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  }
  return null;
}

function saveCache(jobs) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(jobs));
  localStorage.setItem(CACHE_DATE_KEY, todayString());
}

function getApiSettings() {
  return loadStorage(SETTINGS_KEY, { apifyApiKey: '', apifyActorId: '' });
}

function processItems(items) {
  return items
    .map((item) => ({
      ...item,
      id: item.id ?? item.jobId ?? crypto.randomUUID(),
      score: scoreJob(item),
      scam: detectScam(item),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ── Apify REST API helpers ─────────────────────────────────────────────────

async function startActorRun(actorId, apiKey) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: SEARCH_QUERIES,
        maxResults: 50,
        // Common field names across different actors
        keyword: SEARCH_QUERIES[0],
        location: 'Chennai',
        country: 'IN',
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Apify start failed (${res.status})`);
  }
  const data = await res.json();
  return data.data; // { id, defaultDatasetId, status, ... }
}

async function waitForRun(runId, apiKey, maxWaitMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    const data = await res.json();
    const status = data?.data?.status;
    if (status === 'SUCCEEDED') return data.data;
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status.toLowerCase()}`);
    }
  }
  throw new Error('Apify run timed out after 90 seconds');
}

async function fetchDatasetItems(datasetId, apiKey) {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=50`
  );
  if (!res.ok) throw new Error(`Failed to fetch dataset (${res.status})`);
  return res.json(); // returns array directly
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useApify() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function fetchJobs(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = loadCache();
      if (cached) { setJobs(cached); return; }
    }

    const { apifyApiKey, apifyActorId } = getApiSettings();

    if (!apifyApiKey || !apifyActorId) {
      // No keys configured → show demo data
      const mock = getMockJobs();
      setJobs(mock);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const run      = await startActorRun(apifyActorId, apifyApiKey);
      const finished = await waitForRun(run.id, apifyApiKey);
      const items    = await fetchDatasetItems(finished.defaultDatasetId, apifyApiKey);

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Actor returned no results — try a different actor or search query.');
      }

      const processed = processItems(items);
      saveCache(processed);
      setJobs(processed);
    } catch (err) {
      // Fallback to demo data so the UI stays usable
      setJobs(getMockJobs());
      setError(`${err.message} — showing demo data.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs(); }, []);

  return { jobs, loading, error, refresh: () => fetchJobs(true) };
}

// ── Demo / mock data ──────────────────────────────────────────────────────

function getMockJobs() {
  const raw = [
    {
      id: '1',
      title: 'Data Analyst',
      company: 'Zoho Corporation',
      location: 'Chennai, TN',
      description: 'Looking for a data analyst with strong SQL, Power BI, and Excel skills. DAX knowledge preferred. Freshers with 0-2 years experience welcome. Build KPI dashboards, create automated reports, and drive data-driven decisions across product teams.',
      postedAt: new Date().toISOString(),
      source: 'Naukri',
      applyUrl: 'https://careers.zohocorp.com',
    },
    {
      id: '2',
      title: 'Power BI Analyst',
      company: 'Freshworks',
      location: 'Chennai, TN',
      description: 'Power BI Analyst to build interactive dashboards using DAX and data modeling. SQL and Excel proficiency required. ETL pipeline management, stakeholder reporting, and data warehouse maintenance. 0-2 years experience accepted.',
      postedAt: new Date().toISOString(),
      source: 'LinkedIn',
      applyUrl: 'https://careers.freshworks.com',
    },
    {
      id: '3',
      title: 'Junior Data Analyst',
      company: 'Latent View Analytics',
      location: 'Remote',
      description: 'Fresher role for a junior data analyst. Required: SQL, Excel, Tableau. ETL pipelines, client reporting dashboards, and data quality checks. Strong analytical and communication skills are a plus. Remote-first team with Chennai office.',
      postedAt: new Date().toISOString(),
      source: 'Instahyre',
      applyUrl: 'https://latentview.com/careers',
    },
    {
      id: '4',
      title: 'SQL Data Analyst',
      company: 'Fractal Analytics',
      location: 'Remote',
      description: 'SQL analyst role: advanced querying, data modeling, Power BI dashboard creation. Fresher to 2 years experience. Strong Excel and DAX skills needed. Work with global clients on analytics. Chennai and remote options available.',
      postedAt: new Date().toISOString(),
      source: 'Cutshort',
      applyUrl: 'https://fractal.ai/careers',
    },
    {
      id: '5',
      title: 'Analytics Intern → Full Time',
      company: 'Tiger Analytics',
      location: 'Chennai, TN',
      description: 'Convert from intern to full-time data analyst. Excel, SQL, Power BI required. ETL knowledge a plus. 0-1 year experience. Chennai office hybrid. Join a fast-growing analytics team on real-world problems across industries.',
      postedAt: new Date().toISOString(),
      source: 'Wellfound',
      applyUrl: 'https://tigeranalytics.com/careers',
    },
    {
      id: '6',
      title: 'Data Analyst Trainee',
      company: 'EXL Service',
      location: 'Chennai, TN',
      description: 'Entry-level data analyst trainee. Learn SQL, Excel, Power BI in a structured environment. Work on real client projects. Excellent communication skills required. 0-1 year experience. Chennai office. Grow into a senior analyst role.',
      postedAt: new Date().toISOString(),
      source: 'Naukri',
      applyUrl: 'https://exlservice.com/careers',
    },
    {
      id: 'scam-1',
      title: 'Data Entry Work From Home',
      company: 'FastCash Solutions',
      location: 'Remote',
      description: 'Earn daily ₹80,000/month. WhatsApp video call interview only.',
      postedAt: new Date().toISOString(),
      source: 'OLX',
      applyUrl: '#',
    },
  ];

  return raw
    .map((item) => ({ ...item, score: scoreJob(item), scam: detectScam(item) }))
    .sort((a, b) => b.score - a.score);
}
