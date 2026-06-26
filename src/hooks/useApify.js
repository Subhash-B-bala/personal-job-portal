import { useState, useEffect } from 'react';
import { scoreJob } from '../utils/scoring';
import { detectScam } from '../utils/scamDetect';
import { loadStorage } from '../utils/storage';

export const DEFAULT_ACTOR_ID = 'automation-lab/naukri-scraper';

const CACHE_KEY      = 'nandhini_jobs_cache';
const CACHE_DATE_KEY = 'nandhini_jobs_date';
const SETTINGS_KEY   = 'nandhini_settings';

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
  return { apifyApiKey: saved.apifyApiKey || '' };
}

// ── Field normalisation ───────────────────────────────────────────────────

function normaliseItem(item) {
  return {
    id:          item.jobId       ?? item.job_id      ?? item.id         ?? crypto.randomUUID(),
    title:       item.title       ?? item.jobTitle    ?? item.role       ?? item.position     ?? '',
    company:     item.company     ?? item.companyName ?? item.employer   ?? '',
    location:    item.location    ?? item.city        ?? item.jobLocation ?? '',
    description: item.description ?? item.jobDescription ?? item.about  ?? item.snippet      ?? '',
    postedAt:    item.postedAt    ?? item.date        ?? item.postedDate ?? new Date().toISOString(),
    source:      'Naukri',
    applyUrl:    item.applyLink   ?? item.jobUrl      ?? item.url        ?? item.job_url      ?? '#',
    salary:      item.salary      ?? item.salaryRange ?? '',
    experience:  item.experience  ?? item.exp         ?? '',
    skills:      Array.isArray(item.skills) ? item.skills.join(', ') : (item.skills ?? ''),
  };
}

function tooMuchExperience(expStr) {
  if (!expStr) return false;
  const nums = [...String(expStr).matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  if (!nums.length) return false;
  return Math.min(...nums) > 1;
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function processItems(rawItems) {
  return dedupeById(
    rawItems
      .map((raw) => {
        const item = normaliseItem(raw);
        return { ...item, score: scoreJob(item), scam: detectScam(item) };
      })
      .filter((item) => !tooMuchExperience(item.experience))
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ── Apify polling helpers (browser → Apify direct GET, CORS-safe) ─────────

async function pollUntilDone(runId, apiKey, maxWaitMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 5000)); // poll every 5s

    const res  = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    const data = await res.json();
    const status = data?.data?.status;

    if (status === 'SUCCEEDED') return data.data.defaultDatasetId;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify run ${status}`);
    }
  }
  throw new Error('Timed out waiting for results (>5 min).');
}

async function fetchDataset(datasetId, apiKey) {
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=50`
  );
  if (!res.ok) throw new Error(`Failed to fetch dataset (${res.status})`);
  return res.json();
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useApify() {
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  async function fetchJobs(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = loadCache();
      if (cached) { setJobs(cached); return; }
    }

    const { apifyApiKey } = getApiSettings();
    if (!apifyApiKey) {
      setJobs(getMockJobs());
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg('Starting Naukri scraper…');

    try {
      // Step 1: Start actor runs via serverless fn (avoids CORS on POST)
      const startRes = await fetch('/api/jobs', {
        headers: { 'x-apify-key': apifyApiKey },
      });
      const startData = await startRes.json();

      if (!startRes.ok) throw new Error(startData?.error || `Server error (${startRes.status})`);
      const { runs } = startData;
      if (!runs?.length) throw new Error('Could not start actor runs. Check your Apify API key.');

      // Step 2: Poll each run until done, then fetch results
      setStatusMsg(`Scraping Naukri… (${runs.length} searches running)`);

      const settled = await Promise.allSettled(
        runs.map(async ({ runId, defaultDatasetId }) => {
          const datasetId = await pollUntilDone(runId, apifyApiKey);
          return fetchDataset(datasetId || defaultDatasetId, apifyApiKey);
        })
      );

      let allItems = [];
      const errors = [];
      for (const r of settled) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          allItems = allItems.concat(r.value);
        } else if (r.status === 'rejected') {
          errors.push(r.reason?.message);
        }
      }

      if (allItems.length === 0) {
        throw new Error(errors.join(' | ') || 'No jobs returned from Naukri.');
      }

      const processed = processItems(allItems);
      saveCache(processed);
      setJobs(processed);
      setStatusMsg('');
    } catch (err) {
      setJobs(getMockJobs());
      setError(err.message);
      setStatusMsg('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs(); }, []);

  return { jobs, loading, error, statusMsg, refresh: () => fetchJobs(true) };
}

// ── Mock / demo data ──────────────────────────────────────────────────────

function getMockJobs() {
  const raw = [
    {
      id: '1', title: 'Data Analyst', company: 'Zoho Corporation', location: 'Chennai, TN',
      description: 'Looking for a data analyst with strong SQL, Power BI, and Excel skills. DAX knowledge preferred. Freshers with 0-1 years experience welcome. Build KPI dashboards and automated reports.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://careers.zohocorp.com',
    },
    {
      id: '2', title: 'Power BI Analyst', company: 'Freshworks', location: 'Chennai, TN',
      description: 'Power BI Analyst to build dashboards using DAX and data modeling. SQL and Excel required. 0-1 years experience accepted.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://careers.freshworks.com',
    },
    {
      id: '3', title: 'Junior Data Analyst', company: 'Latent View Analytics', location: 'Remote',
      description: 'Fresher role. Required: SQL, Excel, Tableau. ETL pipelines and client reporting. Strong communication skills a plus.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://latentview.com/careers',
    },
    {
      id: '4', title: 'SQL Data Analyst', company: 'Fractal Analytics', location: 'Remote',
      description: 'SQL analyst role: querying, data modeling, Power BI. Fresher to 1 year experience. Chennai and remote options.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://fractal.ai/careers',
    },
    {
      id: '5', title: 'Analytics Trainee', company: 'Tiger Analytics', location: 'Chennai, TN',
      description: 'Entry-level analyst trainee. Excel, SQL, Power BI. 0-1 year experience. Chennai hybrid.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://tigeranalytics.com/careers',
    },
    {
      id: '6', title: 'Data Analyst Fresher', company: 'EXL Service', location: 'Chennai, TN',
      description: 'Entry-level data analyst. SQL, Excel, Power BI. Work on real client projects. 0-1 year experience. Chennai office.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://exlservice.com/careers',
    },
    {
      id: 'scam-1', title: 'Data Entry Work From Home', company: 'FastCash Solutions', location: 'Remote',
      description: 'Earn daily ₹80,000/month. WhatsApp video call interview only.',
      postedAt: new Date().toISOString(), source: 'OLX', applyUrl: '#',
    },
  ];
  return raw
    .map((item) => ({ ...item, score: scoreJob(item), scam: detectScam(item) }))
    .sort((a, b) => b.score - a.score);
}
