const Note = require('../models/Note');
const { generateSummary, summarizeChunked } = require('../services/aiService');
const pdfParse = require('pdf-parse');

// GET /api/notes — get all notes for logged-in user
const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notes — create a new note
const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const note = await Note.create({ title, content, userId: req.user._id });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notes/:id — update a note
const updateNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const { title, content } = req.body;

    note.title   = title   ?? note.title;
    note.content = content ?? note.content;

    const updated = await note.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notes/:id — delete a note
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notes/:id/summarize — AI summarize a note via TinyLlama
const summarizeNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });

    if (!note) return res.status(404).json({ message: 'Note not found' });

    if (!note.content || note.content.trim().length < 10) {
      return res.status(400).json({ message: 'Note content is too short to summarize' });
    }

    const summary = await generateSummary(note.content);

    note.aiSummary = summary;
    await note.save();

    res.json({ aiSummary: summary });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.status(503).json({
        message: 'Ollama is not running. Please start Ollama and try again.',
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notes/upload-pdf — upload a PDF, extract text, chunk-summarize via RAG
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    // Extract text from PDF buffer
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text.trim();

    if (!extractedText || extractedText.length < 20) {
      return res.status(400).json({ message: 'Could not extract enough text from this PDF' });
    }

    // Use the filename (minus extension) as the note title
    const fileName = req.file.originalname.replace(/\.pdf$/i, '');

    // Extract words to truncate for AI summarization (avoiding timeouts on huge PDFs)
    const words = extractedText.split(/\s+/).filter(Boolean);
    const textToSummarize = words.slice(0, 1500).join(' ');

    // RAG: Chunked summarization — each 500-word chunk is summarized individually
    const masterSummary = await summarizeChunked(textToSummarize);

    // Create a note with the FULL extracted text and the generated master summary
    const note = await Note.create({
      title:     `📄 ${fileName}`,
      content:   extractedText,
      aiSummary: masterSummary + (words.length > 1500 ? ' (Summary of first 1,500 words)' : ''),
      userId:    req.user._id,
    });

    res.status(201).json(note);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.status(503).json({
        message: 'Ollama is not running. Please start Ollama and try again.',
      });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getNotes, createNote, updateNote, deleteNote, summarizeNote, uploadPdf };
