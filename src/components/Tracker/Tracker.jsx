import { useTracker } from '../../hooks/useTracker';
import KanbanBoard from './KanbanBoard';

export default function Tracker({ initialCard }) {
  const { cards, addCard, updateCard, moveCard, deleteCard, exportCSV, stats } = useTracker();

  // If a job was sent from Job Feed, auto-add it (one-time on mount)
  const [seenInitial, setSeenInitial] = useState(false);
  if (initialCard && !seenInitial) {
    addCard({
      company: initialCard.company,
      role: initialCard.title,
      link: initialCard.applyUrl,
      column: 'Spotted',
    });
    setSeenInitial(true);
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:pb-4">
      {/* Stats panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Applied This Month', value: stats.appliedThisMonth },
          { label: 'Response Rate', value: `${stats.responseRate}%` },
          { label: 'Interview Rate', value: `${stats.interviewRate}%` },
          { label: 'Best Source', value: stats.bestSource },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
            <p className="text-xl font-bold text-indigo-600">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Application Tracker</h2>
        <button
          onClick={exportCSV}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      {/* Kanban board */}
      <KanbanBoard
        cards={cards}
        onUpdate={updateCard}
        onMove={moveCard}
        onDelete={deleteCard}
        onAdd={addCard}
      />
    </div>
  );
}

import { useState } from 'react';
