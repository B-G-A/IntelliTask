import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  
  const saveTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchNotes = async () => {
    try {
      const { data } = await axios.get('/api/notes');
      setNotes(data);
      if (data.length > 0 && !activeId) setActiveId(data[0]._id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  const activeNote = notes.find(n => n._id === activeId);

  const updateNoteLocally = (id, updates) => {
    setNotes(prev => prev.map(n => n._id === id ? { ...n, ...updates } : n));
    setSaving(true);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const noteToSave = notes.find(n => n._id === id);
        const toSave = { ...noteToSave, ...updates };
        await axios.put(`/api/notes/${id}`, { title: toSave.title, content: toSave.content });
      } catch (err) {
        console.error('Failed to save', err);
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const handleNew = async () => {
    try {
      const { data } = await axios.post('/api/notes', { title: 'Untitled Note', content: '' });
      setNotes([data, ...notes]);
      setActiveId(data._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await axios.delete(`/api/notes/${id}`);
      const newNotes = notes.filter(n => n._id !== id);
      setNotes(newNotes);
      if (activeId === id) {
        setActiveId(newNotes.length > 0 ? newNotes[0]._id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSummarize = async () => {
    if (!activeNote || !activeNote.content) return;
    setSummarizing(true);
    try {
      const { data } = await axios.post(`/api/notes/${activeNote._id}/summarize`);
      setNotes(prev => prev.map(n => n._id === activeNote._id ? { ...n, aiSummary: data.aiSummary } : n));
    } catch (err) {
      alert(err.response?.data?.message || 'Summarization failed');
    } finally {
      setSummarizing(false);
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('pdf', file);
    
    try {
      const { data } = await axios.post('/api/notes/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNotes([data, ...notes]);
      setActiveId(data._id);
    } catch (err) {
      alert(err.response?.data?.message || 'PDF processing failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar List */}
      <div className="w-[350px] bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Notes</h1>
            <span className="text-gray-500 text-xs font-semibold">{notes.length} notes</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleNew}
              className="flex-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-900 text-sm font-medium py-2 rounded-lg transition-colors shadow-sm"
            >
              New Note
            </button>
            <div className="relative flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handlePdfUpload(e.target.files?.[0])}
                disabled={uploading}
              />
              <div className={`w-full h-full flex items-center justify-center text-sm font-medium py-2 rounded-lg transition-colors border shadow-sm
                ${uploading
                  ? 'bg-gray-100 border-gray-200 text-gray-400'
                  : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                }`}
              >
                {uploading ? 'Uploading...' : '📄 PDF'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {notes.map((note) => (
            <div
              key={note._id}
              onClick={() => setActiveId(note._id)}
              className={`p-4 rounded-lg cursor-pointer transition-colors border
                ${activeId === note._id
                  ? 'bg-white border-gray-300 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-gray-100'
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className={`font-semibold text-sm truncate ${activeId === note._id ? 'text-black' : 'text-gray-700'}`}>
                  {note.title || 'Untitled'}
                </h3>
                {note.aiSummary && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                    AI
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                {note.content || 'No content'}
              </p>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No notes yet. Create one or upload a PDF.
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {activeNote ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-xs font-medium">
                  Last edited {new Date(activeNote.updatedAt).toLocaleTimeString()}
                </span>
                {saving && <span className="text-gray-500 text-xs font-medium animate-pulse">Saving...</span>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSummarize}
                  disabled={summarizing || activeNote.content?.length < 10}
                  className="flex items-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 border border-gray-200 text-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <span className="text-gray-500">✦</span>
                  {summarizing ? 'Summarizing...' : 'Summarize'}
                </button>
                <button
                  onClick={() => handleDelete(activeNote._id)}
                  className="bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-500 hover:text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar max-w-4xl mx-auto w-full space-y-8">
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => updateNoteLocally(activeNote._id, { title: e.target.value })}
                placeholder="Note Title"
                className="w-full bg-transparent text-gray-900 text-4xl font-bold tracking-tight placeholder-gray-300 focus:outline-none"
              />

              {/* AI Summary Banner */}
              {activeNote.aiSummary && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-500 text-xs">
                      ✦
                    </div>
                    <h4 className="text-gray-900 text-sm font-bold tracking-wide uppercase">AI Summary</h4>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{activeNote.aiSummary}</p>
                </div>
              )}

              <textarea
                value={activeNote.content}
                onChange={(e) => updateNoteLocally(activeNote._id, { content: e.target.value })}
                placeholder="Start writing..."
                className="w-full h-full min-h-[600px] bg-transparent text-gray-800 text-base leading-relaxed placeholder-gray-300 focus:outline-none resize-none"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-5xl mb-4 opacity-50">📝</div>
            <p className="text-sm font-medium text-gray-500">Select a note or create a new one</p>
          </div>
        )}

        {/* Uploading Overlay */}
        {uploading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-black animate-bounce [animation-delay:0ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-black animate-bounce [animation-delay:150ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-black animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-gray-900 text-sm font-bold tracking-tight">Processing PDF...</p>
            <p className="text-gray-500 mt-1 text-xs">Extracting text & generating summary</p>
          </div>
        )}
      </div>
    </div>
  );
}
