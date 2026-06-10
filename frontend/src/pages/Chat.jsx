import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: `Hi ${user?.username || ''}! I'm IntelliTask AI. I can answer questions specifically about the Tasks and Notes in your workspace. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', text: trimmed }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Prepare to receive AI message
    setMessages(prev => [...prev, { role: 'ai', text: '', context: [] }]);

    try {
      const history = newMessages.slice(-5).map(m => ({ role: m.role, text: m.text }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);

              if (data.type === 'context') {
                setMessages(prev => {
                  const last = { ...prev[prev.length - 1] };
                  last.context = data.data;
                  return [...prev.slice(0, -1), last];
                });
              } else if (data.type === 'text') {
                setMessages(prev => {
                  const last = { ...prev[prev.length - 1] };
                  last.text += data.text;
                  return [...prev.slice(0, -1), last];
                });
              } else if (data.type === 'error') {
                setMessages(prev => {
                  const last = { ...prev[prev.length - 1] };
                  last.text += `\n[Error: ${data.message}]`;
                  last.isError = true;
                  return [...prev.slice(0, -1), last];
                });
              } else if (data.type === 'end') {
                // Done
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const last = { ...prev[prev.length - 1] };
        last.text = 'Sorry, something went wrong connecting to the AI. Ensure the server is fully running.';
        last.isError = true;
        return [...prev.slice(0, -1), last];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-10 py-6 border-b border-gray-200 bg-white shrink-0 shadow-sm z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-white text-lg shadow-sm">
            ✦
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">IntelliTask AI</h1>
            <p className="text-gray-500 text-xs font-medium">Powered by local RAG indexing</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-10 custom-scrollbar bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-br-sm'
                    : msg.isError
                      ? 'bg-red-50 border border-red-200 text-red-600 rounded-bl-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap font-medium">{msg.text || (loading && i === messages.length - 1 ? 'Thinking...' : '')}</div>
                {msg.context && msg.context.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">Sources Referenced</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.context.map((c, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded">
                          {c.type === 'task' ? '✓' : '📝'} {c.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-gray-200 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your tasks or notes..."
            rows={1}
            className="w-full bg-white border border-gray-200 rounded-xl pl-6 pr-16 py-4 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-black transition-colors resize-none shadow-sm"
            style={{ minHeight: '60px', maxHeight: '200px' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 top-3 bg-black hover:bg-gray-800 disabled:opacity-40 text-white w-12 rounded-lg flex items-center justify-center transition-all shadow-sm"
          >
            <span className="text-xl -rotate-45 relative -top-0.5 -left-0.5">🚀</span>
          </button>
        </div>
        <p className="text-center text-gray-400 text-xs mt-3 font-medium">IntelliTask AI is restricted to answering questions specifically about your workspace data.</p>
      </div>
    </div>
  );
}
