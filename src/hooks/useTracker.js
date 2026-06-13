import { useState } from 'react';
import { loadStorage, saveStorage } from '../utils/storage';

const STORAGE_KEY = 'nandhini_tracker';

export const COLUMNS = [
  'Spotted',
  'Applied',
  'Followed Up',
  'Interview',
  'Offer',
  'Rejected / No Response',
];

function newCard(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    company: '',
    role: '',
    dateApplied: new Date().toISOString().slice(0, 10),
    source: 'careers page',   // 'careers page' | 'DM' | 'referral'
    notes: '',
    nextActionDate: '',
    link: '',
    column: 'Spotted',
    ...overrides,
  };
}

export function useTracker() {
  const [cards, setCards] = useState(() => loadStorage(STORAGE_KEY, []));

  function persist(updated) {
    setCards(updated);
    saveStorage(STORAGE_KEY, updated);
  }

  function addCard(overrides = {}) {
    persist([...cards, newCard(overrides)]);
  }

  function updateCard(id, changes) {
    persist(cards.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  function moveCard(id, column) {
    persist(cards.map((c) => (c.id === id ? { ...c, column } : c)));
  }

  function deleteCard(id) {
    persist(cards.filter((c) => c.id !== id));
  }

  function exportCSV() {
    const headers = ['Company', 'Role', 'Date Applied', 'Source', 'Column', 'Notes', 'Next Action', 'Link'];
    const rows = cards.map((c) => [
      c.company, c.role, c.dateApplied, c.source, c.column, c.notes, c.nextActionDate, c.link,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nandhini_tracker_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const appliedThisMonth = cards.filter(
    (c) => c.column !== 'Spotted' && c.dateApplied?.startsWith(thisMonth)
  ).length;
  const interviewed = cards.filter((c) => c.column === 'Interview' || c.column === 'Offer').length;
  const applied = cards.filter((c) => c.column !== 'Spotted').length;
  const replied = cards.filter((c) =>
    ['Interview', 'Offer', 'Rejected / No Response'].includes(c.column)
  ).length;
  const responseRate = applied ? Math.round((replied / applied) * 100) : 0;
  const interviewRate = applied ? Math.round((interviewed / applied) * 100) : 0;

  // Best source
  const sourceCounts = {};
  cards.filter((c) => c.column !== 'Spotted').forEach((c) => {
    sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1;
  });
  const bestSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return {
    cards,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    exportCSV,
    stats: { appliedThisMonth, responseRate, interviewRate, bestSource },
  };
}
