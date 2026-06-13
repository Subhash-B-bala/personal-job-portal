import { COLUMNS } from '../../hooks/useTracker';
import TrackerCard from './TrackerCard';

export default function KanbanBoard({ cards, onUpdate, onMove, onDelete, onAdd }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const colCards = cards.filter((c) => c.column === col);
        return (
          <div key={col} className="flex flex-col gap-2 min-w-[220px] w-[220px] shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{col}</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5">{colCards.length}</span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[80px]">
              {colCards.map((card) => (
                <TrackerCard
                  key={card.id}
                  card={card}
                  onUpdate={onUpdate}
                  onMove={onMove}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {/* Add card button (only in Spotted column) */}
            {col === 'Spotted' && (
              <button
                onClick={() => onAdd({ column: 'Spotted' })}
                className="text-xs text-gray-400 hover:text-indigo-600 border border-dashed border-gray-200 rounded-lg py-2 hover:border-indigo-300 transition-colors"
              >
                + Add job
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
