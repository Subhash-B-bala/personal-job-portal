import { useState } from 'react';
import { useApify } from '../../hooks/useApify';
import JobCard from './JobCard';

const TABS = ['All Jobs', 'Flagged'];

export default function JobFeed({ onAddToTracker }) {
  const { jobs, loading, error, statusMsg, refresh } = useApify();
  const [tab, setTab] = useState('All Jobs');
  const [statuses, setStatuses] = useState({});   // { jobId: 'apply' | 'skip' | 'save' }
  const [trusted, setTrusted] = useState({});      // { jobId: true }

  function handleAction(id, action) {
    setStatuses((prev) => ({ ...prev, [id]: action }));
  }

  function handleTrust(id) {
    setTrusted((prev) => ({ ...prev, [id]: true }));
  }

  const enriched = jobs.map((j) => ({
    ...j,
    status: statuses[j.id],
    trusted: trusted[j.id] ?? false,
  }));

  const mainJobs    = enriched.filter((j) => (j.scam?.flags?.length ?? 0) < 4 || j.trusted);
  const flaggedJobs = enriched.filter((j) => (j.scam?.flags?.length ?? 0) >= 4 && !j.trusted);

  const displayed = tab === 'All Jobs' ? mainJobs : flaggedJobs;

  return (
    <div className="flex flex-col gap-4 p-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Job Feed</h2>
          <p className="text-xs text-gray-500">Top matches for today · refreshes daily</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {t}
            {t === 'Flagged' && flaggedJobs.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                {flaggedJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {statusMsg || 'Fetching jobs from Naukri…'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Usually takes 1–3 minutes</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 w-full mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Job cards */}
      {!loading && displayed.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">
          {tab === 'Flagged' ? 'No flagged jobs — great!' : 'No jobs found. Click Refresh to fetch.'}
        </p>
      )}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {displayed.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onAction={handleAction}
              onTrust={handleTrust}
              onAddToTracker={onAddToTracker}
            />
          ))}
        </div>
      )}
    </div>
  );
}
