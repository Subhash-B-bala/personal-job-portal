// 8-point scam detection — pure logic, no UI

const SCAM_SOURCES = ['whatsapp', 'telegram', 'olx', 'quikr'];

const VAGUE_TERMS = [
  'data entry', 'earn daily', 'work from home earn', 'earn from home',
  'daily income', 'part time earn', 'guaranteed income',
];

const PERSONAL_DATA_TERMS = ['aadhaar', 'aadhar', 'pan card', 'bank details', 'bank account number'];

const WHATSAPP_INTERVIEW = ['whatsapp video call', 'whatsapp interview', 'interview on whatsapp'];

/**
 * Run all 8 checks on a job object.
 * Returns { flags: string[], flagCount: number }
 */
export function detectScam(job) {
  const flags = [];

  const title       = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const source      = (job.source || '').toLowerCase();
  const company     = (job.company || '').toLowerCase();
  const text        = `${title} ${description}`;

  // 1. Suspicious source
  if (SCAM_SOURCES.some((s) => source.includes(s))) {
    flags.push('Suspicious source platform');
  }

  // 2. Unrealistic salary promise for fresher
  const salaryMatch = description.match(/₹?\s*(\d[\d,]*)\s*(\/month|per month|monthly|lpa|lakh)/gi);
  if (salaryMatch) {
    for (const match of salaryMatch) {
      const num = parseInt(match.replace(/[^\d]/g, ''), 10);
      // Flag if monthly salary > 50,000 for a fresher role
      if (num > 50000 && description.includes('fresher')) {
        flags.push('Unrealistic salary for fresher');
        break;
      }
    }
  }

  // 3. Posted very recently + mentions interview
  if (job.postedAt) {
    const ageMs = Date.now() - new Date(job.postedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 2 && (text.includes('interview') || text.includes('hiring'))) {
      flags.push('Interview push within 2 hours of posting');
    }
  }

  // 4. Vague / bait job description
  if (VAGUE_TERMS.some((t) => text.includes(t))) {
    flags.push('Vague or bait job description');
  }

  // 5. Asks for personal/financial data
  if (PERSONAL_DATA_TERMS.some((t) => text.includes(t))) {
    flags.push('Requests personal financial data');
  }

  // 6. WhatsApp-only interview
  if (WHATSAPP_INTERVIEW.some((t) => text.includes(t))) {
    flags.push('WhatsApp-only interview');
  }

  // 7. Very small/unknown company (≤10 employees if data available)
  const employeeCount = job.companySize ?? job.employeeCount ?? null;
  if (employeeCount !== null && employeeCount <= 10) {
    flags.push('Company has 10 or fewer employees');
  }
  if (!job.company || company === 'unknown' || company === '') {
    flags.push('Company name missing or unknown');
  }

  // 8. Very short job description (< 100 words)
  const wordCount = (job.description || '').split(/\s+/).filter(Boolean).length;
  if (wordCount < 100) {
    flags.push('Job description too short (< 100 words)');
  }

  return { flags, flagCount: flags.length };
}
