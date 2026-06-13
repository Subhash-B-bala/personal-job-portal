import { useState } from 'react';
import { loadStorage, saveStorage } from '../utils/storage';

const TASKS = [
  { id: 'check-tracker',  label: 'Check tracker — what needs follow-up today?',               duration: '5 min' },
  { id: 'apply',          label: 'Apply to 1 quality company via official careers page',        duration: '10 min' },
  { id: 'dm',             label: 'Send 1 personalised LinkedIn DM',                            duration: '5 min' },
  { id: 'comment',        label: 'Comment on 3 LinkedIn posts by data professionals',           duration: '5 min' },
  { id: 'update-tracker', label: 'Update tracker with today\'s actions',                       duration: '5 min' },
];

export { TASKS };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function useStreak() {
  const [checkedItems, setCheckedItems] = useState(() => {
    const savedDate = localStorage.getItem('nandhini_checklist_date');
    if (savedDate === todayStr()) {
      return loadStorage('nandhini_checklist_items', []);
    }
    return []; // new day — reset
  });

  const [streak, setStreak] = useState(() => loadStorage('nandhini_streak', 0));

  function toggleItem(id) {
    const wasAllDone = checkedItems.length === TASKS.length;
    const next = checkedItems.includes(id)
      ? checkedItems.filter((i) => i !== id)
      : [...checkedItems, id];

    setCheckedItems(next);
    saveStorage('nandhini_checklist_items', next);
    localStorage.setItem('nandhini_checklist_date', todayStr());

    // Increment streak when all tasks completed for the first time today
    const nowAllDone = next.length === TASKS.length;
    if (!wasAllDone && nowAllDone) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      saveStorage('nandhini_streak', newStreak);
    }
  }

  function resetStreak() {
    setStreak(0);
    saveStorage('nandhini_streak', 0);
  }

  return { checkedItems, toggleItem, streak, resetStreak, tasks: TASKS };
}
