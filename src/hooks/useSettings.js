import { useState } from 'react';
import { loadStorage, saveStorage } from '../utils/storage';

const KEY = 'nandhini_settings';

const DEFAULTS = {
  apifyApiKey: '',
  apifyActorId: '',
  groqApiKey: '',
};

export function useSettings() {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULTS,
    ...loadStorage(KEY, {}),
  }));

  function saveSettings(updates) {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveStorage(KEY, next);
  }

  return { settings, saveSettings };
}
