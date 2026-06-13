const NAV_ITEMS = [
  { id: 'jobs',      label: 'Job Feed',        icon: '🔍' },
  { id: 'tracker',   label: 'Tracker',          icon: '📋' },
  { id: 'outreach',  label: 'Outreach Hub',     icon: '💬' },
  { id: 'checklist', label: 'Daily Checklist',  icon: '✅' },
  { id: 'settings',  label: 'Settings',         icon: '⚙️' },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 min-h-screen bg-gray-50 border-r border-gray-200 pt-4 gap-1 px-2 shrink-0">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors
              ${active === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
              }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors
              ${active === item.id ? 'text-indigo-600' : 'text-gray-500'}`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label.split(' ')[0]}
          </button>
        ))}
      </nav>
    </>
  );
}
