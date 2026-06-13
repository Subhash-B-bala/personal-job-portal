import ScoreBar from './ScoreBar';

const STATUS_LABELS = { apply: 'Apply', skip: 'Skip', save: 'Save for Later' };
const STATUS_COLORS = {
  apply: 'bg-green-600 text-white',
  skip:  'bg-gray-200 text-gray-600',
  save:  'bg-amber-500 text-white',
};

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function JobCard({ job, onAction, onTrust, onAddToTracker }) {
  const { scam } = job;
  const flagCount = scam?.flags?.length ?? 0;

  return (
    <div className={`bg-white rounded-xl border p-4 flex flex-col gap-3 shadow-sm
      ${flagCount >= 2 ? 'border-red-300' : 'border-gray-200'}`}>

      {/* Scam badge */}
      {flagCount >= 2 && !job.trusted && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            ⚠ Possible Scam ({flagCount} flags)
          </span>
          <button
            onClick={() => onTrust(job.id)}
            className="text-xs text-gray-500 underline hover:text-gray-800"
          >
            Trust this job
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{job.title}</h3>
          <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(job.postedAt)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{job.company}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-500">{job.location}</span>
          {job.source && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              via {job.source}
            </span>
          )}
        </div>
      </div>

      {/* Score bar */}
      <ScoreBar score={job.score} />

      {/* Description preview */}
      {job.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{job.description}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mt-1">
        {['apply', 'save', 'skip'].map((action) => (
          <button
            key={action}
            onClick={() => onAction(job.id, action)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity
              ${job.status === action
                ? STATUS_COLORS[action] + ' opacity-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {STATUS_LABELS[action]}
          </button>
        ))}

        {job.status === 'apply' && (
          <button
            onClick={() => onAddToTracker(job)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ml-auto"
          >
            + Add to Tracker
          </button>
        )}

        {job.applyUrl && job.applyUrl !== '#' && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg font-medium border border-indigo-300 text-indigo-600 hover:bg-indigo-50 ml-auto"
          >
            Apply →
          </a>
        )}
      </div>
    </div>
  );
}
