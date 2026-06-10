const axios = require('axios');

const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const MODEL      = 'tinyllama';
const MAX_CHUNK_WORDS = 500; // Safe limit for TinyLlama's 2048-token window

// ─── Low-level Ollama call ────────────────────────────────────────────────────
const callOllama = async (prompt) => {
  const response = await axios.post(
    OLLAMA_URL,
    { model: MODEL, prompt, stream: false },
    { timeout: 120000 }
  );
  return response.data.response.trim();
};

// ─── Split text into word-count-limited chunks ────────────────────────────────
const chunkText = (text, maxWords = MAX_CHUNK_WORDS) => {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
};

// ─── Summarize a single short text (for notes) ───────────────────────────────
const generateSummary = async (text) => {
  // If text is short enough, summarize directly
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_CHUNK_WORDS) {
    const prompt = `Summarize this in 2-3 clear sentences:\n\n${text}\n\nSummary:`;
    return await callOllama(prompt);
  }
  // Otherwise use chunked summarization
  return await summarizeChunked(text);
};

// ─── RAG: Chunked summarization for large text (PDFs) ─────────────────────────
const summarizeChunked = async (text) => {
  const chunks = chunkText(text);
  const partialSummaries = [];

  for (let i = 0; i < chunks.length; i++) {
    const prompt = `Summarize this text section (part ${i + 1} of ${chunks.length}) in 2-3 sentences:\n\n${chunks[i]}\n\nSummary:`;
    const summary = await callOllama(prompt);
    partialSummaries.push(summary);
  }

  // If only one chunk, return its summary directly
  if (partialSummaries.length === 1) {
    return partialSummaries[0];
  }

  // Combine partial summaries into a final master summary
  // The combined text should be short enough for one final call
  const combined = partialSummaries.join(' ');
  const finalPrompt = `Combine these section summaries into one clear, cohesive summary in 3-4 sentences:\n\n${combined}\n\nFinal Summary:`;
  return await callOllama(finalPrompt);
};

// ─── RAG: Chat with context, history, and real-time streaming ───────────────
const chatWithContextStream = async (question, relevantItems, history = [], res) => {
  // Build a minimal context string from the top 3 items
  let context = '';
  relevantItems.forEach((item, i) => {
    const type = item.status ? 'Task' : 'Note';
    context += `${i + 1}. [${type}] "${item.title}"`;
    if (item.status)   context += ` | Status: ${item.status}`;
    if (item.priority)  context += ` | Priority: ${item.priority}`;
    if (item.dueDate)   context += ` | Due: ${new Date(item.dueDate).toLocaleDateString()}`;
    if (item.content)   context += ` | Content: ${item.content.substring(0, 150)}`;
    if (item.description) context += ` | Details: ${item.description.substring(0, 150)}`;
    context += '\n';
  });

  // Format history as simple past Q/A so it doesn't trigger transcript continuation
  let historyStr = '';
  if (history && history.length > 0) {
    historyStr = "PAST CHAT:\n" + history.map(h => `${h.role === 'user' ? 'Q' : 'A'}: ${h.text}`).join('\n') + "\n\n";
  }

  // Ultra-simple prompt structure for small 1B parameter models like TinyLlama
  const prompt = `Use the following workspace data to answer the question. If the answer is not in the data, say "I can only answer questions about your workspace." Do not invent information. Do not write a transcript.

WORKSPACE DATA:
${context || 'None.'}

${historyStr}CURRENT QUESTION: ${question}

ANSWER:`;

  // Send initial context data to the frontend so it knows what was used
  const contextMetadata = relevantItems.map(item => ({
    type: item.status ? 'task' : 'note',
    title: item.title,
  }));
  res.write(`data: ${JSON.stringify({ type: 'context', data: contextMetadata })}\n\n`);

  try {
    const response = await axios.post(
      OLLAMA_URL,
      { 
        model: MODEL, 
        prompt, 
        stream: true,
        options: {
          stop: ["User:", "\nUser:", "System:"]
        }
      },
      { responseType: 'stream', timeout: 120000 }
    );

    response.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            // Send text chunk to frontend
            res.write(`data: ${JSON.stringify({ type: 'text', text: parsed.response })}\n\n`);
          }
        }
      } catch (err) {
        // Ignore parse errors on partial chunks
      }
    });

    response.data.on('end', () => {
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('Ollama stream error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Connection to Ollama failed.' })}\n\n`);
    res.end();
  }
};

module.exports = { generateSummary, summarizeChunked, chatWithContextStream, chunkText };
