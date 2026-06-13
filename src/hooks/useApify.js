import { useState, useEffect } from 'react';
import { scoreJob } from '../utils/scoring';
import { detectScam } from '../utils/scamDetect';
import { loadStorage } from '../utils/storage';

const CACHE_KEY      = 'nandhini_jobs_cache';
const CACHE_DATE_KEY = 'nandhini_jobs_date';
const SETTINGS_KEY   = 'nandhini_settings';

// Best verified Naukri scraper on Apify (1,850 users, 6,784 runs)
export const DEFAULT_ACTOR_ID = 'automation-lab/naukri-scraper';

// 2 parallel searches — merged and deduped
const SEARCH_RUNS = [
  {
    keyword: 'data analyst',
    location: 'chennai',
    maxJobs: 20,
    experienceMin: 0,
    experienceMax: 1,
    sortBy: 'date',
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  },
  {
    keyword: 'power bi analyst',
    location: 'chennai',
    maxJobs: 20,
    experienceMin: 0,
    experienceMax: 1,
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

/**
 * Return true if the experience field looks like it requires > 1 year.
 * Handles formats like "10 - 15 Yrs", "5+ years", "3-5 yrs", "2 Years".
 */
function tooMuchExperience(expStr) {
  if (!expStr) return false;
  const str = String(expStr).toLowerCase();

  // Extract all numbers from the string
  const nums = [...str.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  if (nums.length === 0) return false;

  // The minimum required experience is the first (smallest) number
  const minRequired = Math.min(...nums);
  return minRequired > 1;
}

function processItems(items) {
  return dedupeById(
    items
      .map((raw) => {
        const item  = normaliseItem(raw);
        return { ...item, score: scoreJob(item), scam: detectScam(item) };
      })
      .filter((item) => !tooMuchExperience(item.experience))
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ── Apify REST helpers ────────────────────────────────────────────────────

/**
 * Uses Apify's sync endpoint — starts run, waits, returns items in ONE request.
 * No polling needed. Timeout 60s per search.
 */
async function runSync(actorId, apiKey, input) {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`
    + `?token=${apiKey}&timeout=60&memory=256`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Apify error (${res.status})`);
  }

  return res.json(); // returns array of items directly
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
        // Run 2 searches IN PARALLEL — cuts wait time in half
        const results = await Promise.allSettled(
          SEARCH_RUNS.map((input) => runSync(apifyActorId, apifyApiKey, input))
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            allItems = allItems.concat(r.value);
          }
        }
      } else {
        allItems = await runSync(apifyActorId, apifyApiKey, genericInput());
      }

      if (allItems.length === 0) {
        throw new Error('No jobs returned. Check your Apify credits or try a different actor.');
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
