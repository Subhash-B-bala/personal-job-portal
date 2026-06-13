import { useState, useEffect } from 'react';
import { scoreJob } from '../utils/scoring';
import { detectScam } from '../utils/scamDetect';
import { loadStorage } from '../utils/storage';

const CACHE_KEY      = 'nandhini_jobs_cache';
const CACHE_DATE_KEY = 'nandhini_jobs_date';
const SETTINGS_KEY   = 'nandhini_settings';

// Default actor — bovi/naukri-jobs-scraper (best for Naukri India jobs)
export const DEFAULT_ACTOR_ID = 'bovi/naukri-jobs-scraper';

// Input payload for bovi/naukri-jobs-scraper
const NAUKRI_INPUT = {
  searchKeywords: ['Data Analyst', 'Power BI Analyst', 'SQL Analyst'],
  location: 'Chennai',
  maxItems: 50,
  maxPages: 3,
  proxyConfiguration: {
    useApifyProxy: true,
    apifyProxyCountry: 'IN',
  },
};

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
  const saved = loadStorage(SETTINGS_KEY, {});
  return {
    apifyApiKey:  saved.apifyApiKey  || '',
    apifyActorId: saved.apifyActorId || DEFAULT_ACTOR_ID,
  };
}

/**
 * Normalise a raw item from bovi/naukri-jobs-scraper to the shape
 * the rest of the app expects: { id, title, company, location,
 * description, postedAt, source, applyUrl }
 */
function normaliseItem(item) {
  return {
    id:          item.job_id    ?? item.id    ?? crypto.randomUUID(),
    title:       item.title     ?? item.role  ?? '',
    company:     item.company   ?? '',
    location:    item.location  ?? '',
    description: item.description_snippet ?? item.description ?? '',
    postedAt:    item.posted_date ?? item.scraped_at ?? new Date().toISOString(),
    source:      'Naukri',
    applyUrl:    item.job_url   ?? item.applyUrl ?? '#',
    // keep originals too (useful for scoring extra fields)
    skills:      item.skills    ?? '',
    experience:  item.experience ?? '',
    salary:      item.salary    ?? '',
  };
}

function processItems(items) {
  return items
    .map((raw) => {
      const item  = normaliseItem(raw);
      const score = scoreJob(item);
      const scam  = detectScam(item);
      return { ...item, score, scam };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ── Apify REST API helpers ────────────────────────────────────────────────

function buildActorInput(actorId) {
  // Use Naukri-specific input for the default actor; generic fallback for others
  if (actorId === DEFAULT_ACTOR_ID) return NAUKRI_INPUT;
  return {
    queries:    ['Data Analyst Chennai', 'Power BI Analyst fresher India'],
    maxResults: 50,
    keyword:    'Data Analyst',
    location:   'Chennai',
    country:    'IN',
  };
}

async function startActorRun(actorId, apiKey) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildActorInput(actorId)),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Apify error (${res.status})`);
  }
  return (await res.json()).data;
}

async function waitForRun(runId, apiKey, maxWaitMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 4000));
    const res    = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    const data   = await res.json();
    const status = data?.data?.status;
    if (status === 'SUCCEEDED') return data.data;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify run ${status.toLowerCase()}`);
    }
  }
  throw new Error('Apify run timed out — try again later.');
}

async function fetchDatasetItems(datasetId, apiKey) {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=50`
  );
  if (!res.ok) throw new Error(`Failed to fetch results (${res.status})`);
  return res.json();
}

// ── Hook ─────────────────────────────────────────────────────────────────

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

    if (!apifyApiKey) {
      setJobs(getMockJobs());
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
        throw new Error('No jobs returned — actor may need different search keywords.');
      }

      const processed = processItems(items);
      saveCache(processed);
      setJobs(processed);
    } catch (err) {
      setJobs(getMockJobs());
      setError(`${err.message} — showing demo data.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs(); }, []);

  return { jobs, loading, error, refresh: () => fetchJobs(true) };
}

// ── Mock / demo data ──────────────────────────────────────────────────────

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
      source: 'Naukri',
      applyUrl: 'https://careers.freshworks.com',
    },
    {
      id: '3',
      title: 'Junior Data Analyst',
      company: 'Latent View Analytics',
      location: 'Remote',
      description: 'Fresher role for a junior data analyst. Required: SQL, Excel, Tableau. ETL pipelines, client reporting dashboards, and data quality checks. Strong analytical and communication skills are a plus. Remote-first team with Chennai office.',
      postedAt: new Date().toISOString(),
      source: 'Naukri',
      applyUrl: 'https://latentview.com/careers',
    },
    {
      id: '4',
      title: 'SQL Data Analyst',
      company: 'Fractal Analytics',
      location: 'Remote',
      description: 'SQL analyst role: advanced querying, data modeling, Power BI dashboard creation. Fresher to 2 years experience. Strong Excel and DAX skills needed. Work with global clients on analytics. Chennai and remote options available.',
      postedAt: new Date().toISOString(),
      source: 'Naukri',
      applyUrl: 'https://fractal.ai/careers',
    },
    {
      id: '5',
      title: 'Analytics Intern → Full Time',
      company: 'Tiger Analytics',
      location: 'Chennai, TN',
      description: 'Convert from intern to full-time data analyst. Excel, SQL, Power BI required. ETL knowledge a plus. 0-1 year experience. Chennai office hybrid. Join a fast-growing analytics team on real-world problems across industries.',
      postedAt: new Date().toISOString(),
      source: 'Naukri',
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
