import { useState } from 'react';
import { TEMPLATES } from './templates';
import { loadStorage, saveStorage } from '../../utils/storage';

const HISTORY_KEY = 'nandhini_outreach';
const STATUS_OPTIONS = ['Sent', 'Replied', 'No Response'];

function loadHistory() { return loadStorage(HISTORY_KEY, []); }
function saveHistory(h) { saveStorage(HISTORY_KEY, h); }

export default function Outreach() {
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [fields, setFields]     = useState({});
  const [copied, setCopied]     = useState(false);
  const [history, setHistory]   = useState(loadHistory);

  const message = selected.body(fields);

  function handleFieldChange(field, value) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Auto-log
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      template: selected.label,
      name: fields['Name'] || '—',
      company: fields['Company'] || fields['Topic / Company'] || '—',
      status: 'Sent',
    };
    const updated = [entry, ...history];
    setHistory(updated);
    saveHistory(updated);
  }

  function updateStatus(id, status) {
    const updated = history.map((h) => (h.id === id ? { ...h, status } : h));
    setHistory(updated);
    saveHistory(updated);
  }

  function deleteEntry(id) {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
  }

  const statusColor = {
    Sent: 'bg-blue-100 text-blue-700',
    Replied: 'bg-green-100 text-green-700',
    'No Response': 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 md:pb-4 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900">Outreach Hub</h2>

      {/* Template picker */}
      <div className="flex gap-2 flex-wrap">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => { setSelected(t); setFields({}); }}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors
              ${selected.id === t.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Field inputs */}
      <div className="flex flex-col gap-3">
        {selected.fields.map((field) => (
          <div key={field}>
            <label className="text-xs font-medium text-gray-600 block mb-1">{field}</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              placeholder={`Enter ${field}`}
              value={fields[field] || ''}
              onChange={(e) => handleFieldChange(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
        {message}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors
          ${copied
            ? 'bg-green-600 text-white'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
      >
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </button>

      {/* Outreach history */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Outreach History</h3>
          {history.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{entry.name} · {entry.company}</p>
                <p className="text-xs text-gray-400">{entry.date} · {entry.template}</p>
              </div>
              <select
                value={entry.status}
                onChange={(e) => updateStatus(entry.id, e.target.value)}
                className={`text-xs rounded px-1.5 py-0.5 font-medium border-0 ${statusColor[entry.status]}`}
              >
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-gray-300 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
