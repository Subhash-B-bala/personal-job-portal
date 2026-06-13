import { COLUMNS } from '../../hooks/useTracker';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function TrackerCard({ card, onUpdate, onMove, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card);

  // Import useState inside component isn't idiomatic — import at top
  // But to avoid re-write, we handle this via inline approach
  const daysSinceApplied = daysSince(card.dateApplied);

  const showFollowUpReminder =
    card.column === 'Applied' && daysSinceApplied !== null && daysSinceApplied >= 7;
  const showNoResponseReminder =
    card.column === 'Followed Up' && daysSinceApplied !== null && daysSinceApplied >= 14;

  function save() {
    onUpdate(card.id, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-indigo-300 p-3 shadow-sm flex flex-col gap-2 text-sm">
        <input
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          placeholder="Company"
          value={draft.company}
          onChange={(e) => setDraft({ ...draft, company: e.target.value })}
        />
        <input
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          placeholder="Role"
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value })}
        />
        <input
          type="date"
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          value={draft.dateApplied}
          onChange={(e) => setDraft({ ...draft, dateApplied: e.target.value })}
        />
        <select
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          value={draft.source}
          onChange={(e) => setDraft({ ...draft, source: e.target.value })}
        >
          <option>careers page</option>
          <option>DM</option>
          <option>referral</option>
        </select>
        <textarea
          className="border border-gray-200 rounded px-2 py-1 text-sm resize-none"
          rows={2}
          placeholder="Notes"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        <input
          type="date"
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          placeholder="Next action date"
          value={draft.nextActionDate}
          onChange={(e) => setDraft({ ...draft, nextActionDate: e.target.value })}
        />
        <input
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          placeholder="Job link"
          value={draft.link}
          onChange={(e) => setDraft({ ...draft, link: e.target.value })}
        />
        <div className="flex gap-2">
          <button onClick={save} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm flex flex-col gap-1.5 text-sm">
      {/* Reminders */}
      {showFollowUpReminder && (
        <div className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1">
          Follow up now — {daysSinceApplied} days since applied
        </div>
      )}
      {showNoResponseReminder && (
        <div className="text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-2 py-1">
          Consider marking as no response
        </div>
      )}

      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="font-semibold text-gray-900">{card.company || 'Company'}</p>
          <p className="text-gray-500 text-xs">{card.role || 'Role'}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-indigo-600 text-xs">✏</button>
          <button onClick={() => onDelete(card.id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
        </div>
      </div>

      <div className="flex gap-2 text-xs text-gray-400 flex-wrap">
        <span>{card.dateApplied}</span>
        <span>·</span>
        <span>{card.source}</span>
      </div>

      {card.notes && <p className="text-xs text-gray-500 line-clamp-2">{card.notes}</p>}

      {card.link && (
        <a href={card.link} target="_blank" rel="noopener noreferrer"
          className="text-xs text-indigo-600 underline truncate">
          View posting
        </a>
      )}

      {/* Move to column */}
      <select
        value={card.column}
        onChange={(e) => onMove(card.id, e.target.value)}
        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50 mt-1"
      >
        {COLUMNS.map((col) => (
          <option key={col}>{col}</option>
        ))}
      </select>
    </div>
  );
}

// useState must be imported — fix with proper import at top
import { useState } from 'react';
