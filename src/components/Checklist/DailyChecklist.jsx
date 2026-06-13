import { useStreak } from '../../hooks/useStreak';

// Weekly non-negotiables (0-indexed week of month, 1-based reminder shown)
const WEEKLY_REMINDERS = {
  1: null,
  2: 'Week 2 goal: Push a GitHub project',
  3: 'Week 3 goal: Publish a Power BI dashboard',
  4: 'Week 4 goal: Write a LinkedIn post about your data journey',
};

function weekOfMonth() {
  const day = new Date().getDate();
  return Math.ceil(day / 7);
}

export default function DailyChecklist() {
  const { checkedItems, toggleItem, streak, tasks } = useStreak();
  const done = checkedItems.length;
  const total = tasks.length;
  const pct = Math.round((done / total) * 100);
  const weekReminder = WEEKLY_REMINDERS[weekOfMonth()];

  return (
    <div className="flex flex-col gap-5 p-4 pb-20 md:pb-4 max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Daily 30-Min Routine</h2>
        <span className="text-sm font-medium text-orange-500">
          {streak > 0 ? `🔥 Day ${streak} streak` : 'Start your streak!'}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{done}/{total} done</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
              ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="text-xs text-green-600 font-medium mt-1">All done — great work today!</p>
        )}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {tasks.map((task) => {
          const checked = checkedItems.includes(task.id);
          return (
            <button
              key={task.id}
              onClick={() => toggleItem(task.id)}
              className={`flex items-start gap-3 text-left p-3 rounded-xl border transition-colors
                ${checked
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-indigo-200'
                }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                {checked && <span className="text-white text-xs">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{task.duration}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Weekly non-negotiable reminder */}
      {weekReminder && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700">
          <span className="font-semibold">Weekly goal:</span> {weekReminder.replace(/^Week \d+ goal: /, '')}
        </div>
      )}
    </div>
  );
}
