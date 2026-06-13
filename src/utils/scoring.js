// Weighted keyword scoring — max 100
const WEIGHTS = [
  { keywords: ['power bi', 'powerbi'],           weight: 20 },
  { keywords: ['sql', 'mysql'],                  weight: 15 },
  { keywords: ['data analyst', 'data analysis'], weight: 20 },
  { keywords: ['excel', 'spreadsheet'],          weight: 10 },
  { keywords: ['chennai', 'remote'],             weight: 15 },
  { keywords: ['dax'],                           weight: 10 },
  { keywords: ['fresher', 'freshers', '0-2', '0 to 2', 'entry level', 'entry-level'], weight: 10 },
];

/**
 * Score a job object 0–100 based on Nandhini's profile keywords.
 * Checks both title and description fields.
 */
export function scoreJob(job) {
  const text = `${job.title || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();

  let total = 0;
  for (const { keywords, weight } of WEIGHTS) {
    if (keywords.some((kw) => text.includes(kw))) {
      total += weight;
    }
  }

  return Math.min(total, 100);
}

/** Return Tailwind colour classes based on score */
export function scoreColor(score) {
  if (score >= 70) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
  if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400' };
  return { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-400' };
}
