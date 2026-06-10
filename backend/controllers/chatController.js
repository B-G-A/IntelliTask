const { chatWithContextStream } = require('../services/aiService');
const { findRelevantItems } = require('../services/ragService');

// POST /api/chat — RAG-based AI chat (Streaming)
const chat = async (req, res) => {
  console.log('--- Chat Request Received ---');
  console.log('Message:', req.body.message);
  
  try {
    const { message, history } = req.body;

    if (!message || message.trim().length < 2) {
      console.log('Message validation failed');
      return res.status(400).json({ message: 'Message is required' });
    }

    console.log('Setting SSE headers...');
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Step 1: Retrieve only the top 3 relevant items via keyword search
    const relevantItems = await findRelevantItems(req.user._id, message, 3);

    // Step 2: Send question + relevant context + history to TinyLlama (Streaming)
    await chatWithContextStream(message, relevantItems, history, res);

  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.status(503).json({
        message: 'Ollama is not running. Please start Ollama and try again.',
      });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { chat };
