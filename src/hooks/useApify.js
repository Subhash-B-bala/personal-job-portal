import { useState, useEffect } from 'react';
import { scoreJob } from '../utils/scoring';
import { detectScam } from '../utils/scamDetect';
import { loadStorage } from '../utils/storage';

const CACHE_KEY      = 'nandhini_jobs_cache';
const CACHE_DATE_KEY = 'nandhini_jobs_date';
const SETTINGS_KEY   = 'nandhini_settings';

// Best verified Naukri scraper on Apify (1,850 users, 6,784 runs)
export const DEFAULT_ACTOR_ID = 'automation-lab/naukri-scraper';

// Run 2 searches and merge — keeps results targeted for Nandhini's profile
const SEARCH_RUNS = [
  {
    keyword: 'data analyst',
    location: 'chennai',
    maxJobs: 30,
    experienceMin: 0,
    experienceMax: 2,
    sortBy: 'date',
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  },
  {
    keyword: 'power bi analyst',
    location: 'chennai',
    maxJobs: 20,
    experienceMin: 0,
    experienceMax: 2,
    sortBy: 'date',
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  },
];

// Generic fallback input for other actors
function genericInput() {
  return {
    keyword: 'data analyst',
    location: 'chennai',
    maxJobs: 50,
    queries: ['Data Analyst Chennai', 'Power BI Analyst fresher India'],
    maxResults: 50,
  };
}

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
 * Normalise raw item → app schema.
 * Handles field name variations across different Naukri actors.
 */
function normaliseItem(item) {
  const title   = item.title       ?? item.jobTitle   ?? item.role        ?? item.position      ?? '';
  const company = item.company     ?? item.companyName ?? item.employer    ?? item.organisation  ?? '';
  const loc     = item.location    ?? item.city        ?? item.jobLocation ?? '';
  const desc    = item.description ?? item.jobDescription ?? item.about   ?? item.snippet       ?? '';
  const url     = item.applyLink   ?? item.jobUrl      ?? item.url        ?? item.link          ?? item.job_url ?? '#';
  const posted  = item.postedAt    ?? item.date        ?? item.postedDate ?? item.scraped_at    ?? new Date().toISOString();
  const id      = item.jobId       ?? item.job_id      ?? item.id         ?? crypto.randomUUID();

  return {
    id,
    title,
    company,
    location: loc,
    description: desc,
    postedAt: posted,
    source: 'Naukri',
    applyUrl: url,
    salary:     item.salary     ?? item.salaryRange ?? '',
    experience: item.experience ?? item.exp         ?? '',
    skills:     Array.isArray(item.skills) ? item.skills.join(', ') : (item.skills ?? ''),
  };
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function processItems(items) {
  return dedupeById(
    items
      .map((raw) => {
        const item  = normaliseItem(raw);
        return { ...item, score: scoreJob(item), scam: detectScam(item) };
      })
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ── Apify REST helpers ────────────────────────────────────────────────────

async function startRun(actorId, apiKey, input) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Apify start error (${res.status})`);
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
      throw new Error(`Actor run ${status.toLowerCase()}`);
    }
  }
  throw new Error('Timed out waiting for results (>2 min). Try again later.');
}

async function fetchItems(datasetId, apiKey) {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=60`
  );
  if (!res.ok) throw new Error(`Failed to fetch dataset (${res.status})`);
  return res.json();
}

// Run a single actor call and return its items
async function runOnce(actorId, apiKey, input) {
  const run      = await startRun(actorId, apiKey, input);
  const finished = await waitForRun(run.id, apiKey);
  return fetchItems(finished.defaultDatasetId, apiKey);
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
      let allItems = [];

      if (apifyActorId === DEFAULT_ACTOR_ID) {
        // Run 2 targeted searches in sequence and merge
        for (const input of SEARCH_RUNS) {
          try {
            const items = await runOnce(apifyActorId, apifyApiKey, input);
            if (Array.isArray(items)) allItems = allItems.concat(items);
          } catch {
            // If one search fails, continue with others
          }
        }
      } else {
        // Generic single run for other actors
        allItems = await runOnce(apifyActorId, apifyApiKey, genericInput());
      }

      if (allItems.length === 0) {
        throw new Error('No jobs returned from Naukri. Your Apify free credits may have run out, or try refreshing.');
      }

      const processed = processItems(allItems);
      saveCache(processed);
      setJobs(processed);
    } catch (err) {
      setJobs(getMockJobs());
      setError(err.message);
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
