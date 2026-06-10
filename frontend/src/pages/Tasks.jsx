import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';

const STATUS_COLUMNS = [
  { key: 'todo',        label: 'To Do',        color: 'bg-gray-50',  dot: 'bg-gray-400' },
  { key: 'in-progress', label: 'In Progress',  color: 'bg-blue-50/50', dot: 'bg-blue-400' },
  { key: 'done',        label: 'Done',          color: 'bg-green-50/50', dot: 'bg-green-400' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];

const prioConfig = {
  low:    { label: 'Low',    class: 'text-gray-500 bg-gray-100', weight: 1 },
  medium: { label: 'Medium', class: 'text-yellow-600 bg-yellow-50', weight: 2 },
  high:   { label: 'High',   class: 'text-red-600 bg-red-50', weight: 3 },
};

const BLANK_FORM = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' };

const smartSort = (tasks) => {
  return [...tasks].sort((a, b) => {
    const prioDiff = (prioConfig[b.priority]?.weight || 0) - (prioConfig[a.priority]?.weight || 0);
    if (prioDiff !== 0) return prioDiff;
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aDate - bDate;
  });
};

const getDueBadge = (dueDate) => {
  if (!dueDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.floor((due - now) / (1000*60*60*24));
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, class: 'text-red-600 bg-red-50' };
  if (diff === 0) return { text: 'Due today', class: 'text-yellow-600 bg-yellow-50' };
  if (diff <= 2)  return { text: `${diff}d left`, class: 'text-blue-600 bg-blue-50' };
  return { text: `${diff}d left`, class: 'text-gray-500 bg-gray-100' };
};

export default function Tasks() {
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask,  setEditTask]  = useState(null);
  const [form,      setForm]      = useState(BLANK_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const fetchTasks = async () => {
    try {
      const { data } = await axios.get('/api/tasks');
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const openCreate = () => {
    setEditTask(null);
    setForm(BLANK_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      title:       task.title,
      description: task.description || '',
      status:      task.status,
      priority:    task.priority,
      dueDate:     task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      if (editTask) {
        const { data } = await axios.put(`/api/tasks/${editTask._id}`, form);
        setTasks((prev) => prev.map((t) => (t._id === editTask._id ? data : t)));
      } else {
        const { data } = await axios.post('/api/tasks', form);
        setTasks((prev) => [data, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const quickStatus = async (task, newStatus) => {
    try {
      const { data } = await axios.put(`/api/tasks/${task._id}`, { ...task, status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? data : t)));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = tasks.filter(t => t.status !== 'done').length;

  return (
    <div className="p-10 lg:p-14 max-w-[1600px] mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 shrink-0 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Tasks</h1>
          <p className="text-gray-500 text-sm">{tasks.length} total • {activeCount} active</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-black hover:bg-gray-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
        >
          New Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
        {STATUS_COLUMNS.map((col) => {
          const colTasks = smartSort(tasks.filter((t) => t.status === col.key));
          return (
            <div key={col.key} className={`flex flex-col rounded-xl border border-gray-200 overflow-hidden ${col.color}`}>
              {/* Column header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-gray-900 font-semibold text-sm">{col.label}</span>
                </div>
                <span className="text-gray-500 text-xs font-medium">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <p className="text-gray-400 text-sm">No tasks</p>
                  </div>
                )}
                {colTasks.map((task) => {
                  const dueBadge = getDueBadge(task.dueDate);
                  return (
                    <div
                      key={task._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 group hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex flex-col gap-3"
                      onClick={() => openEdit(task)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-900 text-sm font-medium leading-snug flex-1">{task.title}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(task._id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                        >✕</button>
                      </div>

                      {task.description && (
                        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${prioConfig[task.priority].class}`}>
                          {prioConfig[task.priority].label}
                        </span>
                        {dueBadge && (
                          <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${dueBadge.class}`}>
                            {dueBadge.text}
                          </span>
                        )}
                      </div>

                      {/* Quick status change */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                        {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                          <button
                            key={c.key}
                            onClick={() => quickStatus(task, c.key)}
                            className="flex-1 text-[10px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 py-1.5 rounded transition-all border border-gray-100"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-scale-up">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-gray-900 font-semibold text-lg">
                {editTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-black transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-black transition-colors"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-black transition-colors"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
