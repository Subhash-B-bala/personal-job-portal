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
  return {
    apifyApiKey:  saved.apifyApiKey  || '',
    apifyActorId: saved.apifyActorId || DEFAULT_ACTOR_ID,
  };
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
    rawItems.map((raw) => {
      const item = normaliseItem(raw);
      return { ...item, score: scoreJob(item), scam: detectScam(item) };
    }).filter((item) => !tooMuchExperience(item.experience))
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
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

    const { apifyApiKey } = getApiSettings();

    if (!apifyApiKey) {
      setJobs(getMockJobs());
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call Vercel serverless function — avoids browser CORS restrictions
      const res = await fetch('/api/jobs', {
        headers: { 'x-apify-key': apifyApiKey },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Server error (${res.status})`);
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No jobs returned. The actor may be busy — try again in a minute.');
      }

      const processed = processItems(data);
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
      id: '1', title: 'Data Analyst', company: 'Zoho Corporation', location: 'Chennai, TN',
      description: 'Looking for a data analyst with strong SQL, Power BI, and Excel skills. DAX knowledge preferred. Freshers with 0-1 years experience welcome. Build KPI dashboards, create automated reports, and drive data-driven decisions across product teams.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://careers.zohocorp.com',
    },
    {
      id: '2', title: 'Power BI Analyst', company: 'Freshworks', location: 'Chennai, TN',
      description: 'Power BI Analyst to build interactive dashboards using DAX and data modeling. SQL and Excel proficiency required. ETL pipeline management and stakeholder reporting. 0-1 years experience accepted.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://careers.freshworks.com',
    },
    {
      id: '3', title: 'Junior Data Analyst', company: 'Latent View Analytics', location: 'Remote',
      description: 'Fresher role for a junior data analyst. Required: SQL, Excel, Tableau. ETL pipelines, client reporting dashboards, and data quality checks. Strong analytical and communication skills are a plus.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://latentview.com/careers',
    },
    {
      id: '4', title: 'SQL Data Analyst', company: 'Fractal Analytics', location: 'Remote',
      description: 'SQL analyst role: advanced querying, data modeling, Power BI dashboard creation. Fresher to 1 year experience. Strong Excel and DAX skills needed. Chennai and remote options available.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://fractal.ai/careers',
    },
    {
      id: '5', title: 'Analytics Trainee', company: 'Tiger Analytics', location: 'Chennai, TN',
      description: 'Entry-level data analyst trainee. Excel, SQL, Power BI required. 0-1 year experience. Chennai office hybrid. Join a fast-growing analytics team on real-world problems.',
      postedAt: new Date().toISOString(), source: 'Naukri', applyUrl: 'https://tigeranalytics.com/careers',
    },
    {
      id: '6', title: 'Data Analyst Fresher', company: 'EXL Service', location: 'Chennai, TN',
      description: 'Entry-level data analyst. Learn SQL, Excel, Power BI in a structured environment. Work on real client projects. 0-1 year experience. Chennai office.',
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
