import { useNotifications } from '../context/NotificationContext';

const typeConfig = {
  overdue: {
    bg:     'bg-red-500/15 border-red-500/30',
    icon:   '🔴',
    accent: 'text-red-400',
  },
  today: {
    bg:     'bg-yellow-500/15 border-yellow-500/30',
    icon:   '🟡',
    accent: 'text-yellow-400',
  },
  soon: {
    bg:     'bg-blue-500/15 border-blue-500/30',
    icon:   '🔵',
    accent: 'text-blue-400',
  },
};

export default function NotificationBanner() {
  const { notifications, dismissNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-64 right-0 z-40 p-3 space-y-2 pointer-events-none">
      {notifications.slice(0, 3).map((n) => {
        const cfg = typeConfig[n.type] || typeConfig.soon;
        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${cfg.bg} animate-slide-up`}
          >
            <span className="text-lg shrink-0">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{n.title}</p>
              <p className={`text-xs ${cfg.accent}`}>{n.message}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              n.priority === 'high' ? 'text-red-400 bg-red-400/10' :
              n.priority === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
              'text-slate-400 bg-slate-400/10'
            }`}>
              {n.priority}
            </span>
            <button
              onClick={() => dismissNotification(n.id)}
              className="text-[#64748b] hover:text-white text-lg leading-none transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
