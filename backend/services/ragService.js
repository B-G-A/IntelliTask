const Task = require('../models/Task');
const Note = require('../models/Note');

// ─── Stop words to ignore during keyword extraction ──────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can',
  'could','about','above','after','again','all','also','am','and','any','as',
  'at','because','before','below','between','both','but','by','came','come',
  'could','each','for','from','get','got','had','has','have','he','her','here',
  'him','himself','his','how','if','in','into','it','its','just','know','like',
  'make','many','me','might','more','most','much','my','no','not','now','of',
  'on','one','only','or','other','our','out','over','own','said','same','she',
  'so','some','still','such','take','than','that','their','them','then','there',
  'these','they','this','those','through','to','too','under','up','us','very',
  'want','was','way','we','well','were','what','when','where','which','while',
  'who','whom','why','with','you','your','show','tell','list','give','find',
  'what','whats',"what's",'i','my','mine'
]);

// ─── Extract meaningful keywords from user question ──────────────────────────
const extractKeywords = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
};

// ─── Search tasks and notes by keyword relevance ─────────────────────────────
const findRelevantItems = async (userId, question, limit = 3) => {
  const keywords = extractKeywords(question);

  if (keywords.length === 0) {
    // No meaningful keywords — return most recent items
    const [tasks, notes] = await Promise.all([
      Task.find({ userId }).sort({ updatedAt: -1 }).limit(2).lean(),
      Note.find({ userId }).sort({ updatedAt: -1 }).limit(1).lean(),
    ]);
    return [...tasks, ...notes];
  }

  // Build regex patterns for each keyword
  const regexPatterns = keywords.map(kw => new RegExp(kw, 'i'));

  // Fetch all user items (lean for performance)
  const [allTasks, allNotes] = await Promise.all([
    Task.find({ userId }).lean(),
    Note.find({ userId }).lean(),
  ]);

  // Score each item by how many keywords match its title + description/content
  const scored = [];

  for (const task of allTasks) {
    const searchText = `${task.title} ${task.description || ''} ${task.status} ${task.priority}`.toLowerCase();
    let score = 0;
    for (const rx of regexPatterns) {
      if (rx.test(searchText)) score++;
    }
    // Boost overdue/high priority tasks slightly
    if (task.priority === 'high') score += 0.5;
    if (task.dueDate && new Date(task.dueDate) < new Date()) score += 0.3;
    if (score > 0) scored.push({ ...task, _type: 'task', score });
  }

  for (const note of allNotes) {
    const searchText = `${note.title} ${note.content || ''} ${note.aiSummary || ''}`.toLowerCase();
    let score = 0;
    for (const rx of regexPatterns) {
      if (rx.test(searchText)) score++;
    }
    if (score > 0) scored.push({ ...note, _type: 'note', score });
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
};

module.exports = { extractKeywords, findRelevantItems };
