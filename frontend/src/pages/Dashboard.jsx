import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const statColors = {
  todo:          { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  'in-progress': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
  done:          { bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-400'  },
};

const prioColors = {
  low:    'text-gray-500  bg-gray-100',
  medium: 'text-yellow-600 bg-yellow-50',
  high:   'text-red-600    bg-red-50',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [tasks,  setTasks]  = useState([]);
  const [notes,  setNotes]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [t, n] = await Promise.all([
          axios.get('/api/tasks'),
          axios.get('/api/notes'),
        ]);
        setTasks(t.data);
        setNotes(n.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const taskStats = {
    total:      tasks.length,
    todo:       tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    done:       tasks.filter((t) => t.status === 'done').length,
  };

  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-10 lg:p-14 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {greeting}, {user?.username}
          </h1>
          <p className="text-gray-500 text-base">Here's an overview of your workspace today.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/tasks"
            className="flex items-center justify-center bg-black hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
          >
            New Task
          </Link>
          <Link
            to="/notes"
            className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-lg transition-all shadow-sm"
          >
            New Note
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Tasks',  value: taskStats.total,      icon: '📋' },
          { label: 'To Do',        value: taskStats.todo,        icon: '⚪' },
          { label: 'In Progress',  value: taskStats.inProgress,  icon: '🔵' },
          { label: 'Completed',    value: taskStats.done,        icon: '🟢' },
          { label: 'Notes',        value: notes.length,          icon: '📝' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-gray-400 text-sm mb-4">{icon}</div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
            <div className="text-gray-500 text-xs mt-1 font-medium uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Completion Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-gray-900 text-base font-bold mb-6">Completion Rate</h3>
          <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            <span className="text-gray-500 text-sm">{taskStats.done} of {taskStats.total} tasks completed</span>
            <span className="text-gray-900 text-sm font-bold">{completionRate}%</span>
          </div>
        </div>

        {/* Overdue Alerts */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-gray-900 text-base font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> Overdue Tasks
          </h3>
          {overdueTasks.length === 0 ? (
            <div className="flex items-center text-gray-500 text-sm">
              All caught up.
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks.slice(0, 3).map(t => (
                <div key={t._id} className="flex items-center gap-3">
                  <p className="text-gray-900 text-sm font-medium truncate flex-1">{t.title}</p>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${prioColors[t.priority]}`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-gray-900 text-base font-bold mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <Link to="/tasks" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">✓</div>
              <div>
                <p className="text-gray-900 text-sm font-medium group-hover:text-black">Manage Tasks</p>
                <p className="text-gray-500 text-xs mt-0.5">View your structured board</p>
              </div>
            </Link>
            <Link to="/chat" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">✦</div>
              <div>
                <p className="text-gray-900 text-sm font-medium group-hover:text-black">Ask AI</p>
                <p className="text-gray-500 text-xs mt-0.5">Search your workspace data</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 font-bold text-lg">Recent Tasks</h2>
            <Link to="/tasks" className="text-gray-500 text-sm hover:text-gray-900 transition-colors">View all</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="py-8 text-gray-500 text-sm">No tasks yet.</div>
          ) : (
            <div className="space-y-4">
              {tasks.slice(0, 5).map((task) => (
                <div key={task._id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${statColors[task.status]?.dot}`} />
                    <p className="text-gray-900 text-sm font-medium truncate">{task.title}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider shrink-0 ${prioColors[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 font-bold text-lg">Recent Notes</h2>
            <Link to="/notes" className="text-gray-500 text-sm hover:text-gray-900 transition-colors">View all</Link>
          </div>
          {notes.length === 0 ? (
            <div className="py-8 text-gray-500 text-sm">No notes yet.</div>
          ) : (
            <div className="space-y-4">
              {notes.slice(0, 4).map((note) => (
                <div key={note._id} className="py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-gray-900 text-sm font-medium truncate">{note.title}</p>
                    {note.aiSummary && (
                      <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">AI</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-1">{note.content?.substring(0, 100) || 'No content'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
