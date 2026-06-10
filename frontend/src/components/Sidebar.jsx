import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const NAV_ITEMS = [
    { to: '/',      label: 'Dashboard', icon: '📊' },
    { to: '/tasks', label: 'Tasks',     icon: '✓' },
    { to: '/notes', label: 'Notes',     icon: '📝' },
    { to: '/chat',  label: 'AI Chat',   icon: '✦' },
  ];

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10">
      <div className="p-8 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xl">
            I
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">IntelliTask</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-8 px-4 custom-scrollbar">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Main Menu</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className={`text-lg opacity-80`}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 text-sm font-semibold truncate">{user?.username || 'User'}</p>
            <p className="text-gray-400 text-xs truncate">Pro Member</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 font-medium py-3 rounded-lg transition-all shadow-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
