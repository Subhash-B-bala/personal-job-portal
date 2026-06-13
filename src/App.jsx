import { useState } from 'react';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import JobFeed from './components/JobFeed/JobFeed';
import Tracker from './components/Tracker/Tracker';
import Outreach from './components/Outreach/Outreach';
import DailyChecklist from './components/Checklist/DailyChecklist';
import Settings from './components/Settings/Settings';

export default function App() {
  const [page, setPage] = useState('jobs');
  const [pendingTrackerJob, setPendingTrackerJob] = useState(null);

  function handleAddToTracker(job) {
    setPendingTrackerJob(job);
    setPage('tracker');
  }

  function renderPage() {
    switch (page) {
      case 'jobs':
        return <JobFeed onAddToTracker={handleAddToTracker} />;
      case 'tracker':
        return (
          <Tracker
            initialCard={pendingTrackerJob}
            key={pendingTrackerJob?.id}
          />
        );
      case 'outreach':
        return <Outreach />;
      case 'checklist':
        return <DailyChecklist />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={page} onNavigate={setPage} />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
