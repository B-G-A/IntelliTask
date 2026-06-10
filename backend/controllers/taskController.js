const Task = require('../models/Task');

const PRIO_WEIGHT = { high: 3, medium: 2, low: 1 };

// GET /api/tasks — get all tasks for logged-in user, sorted by priority + dueDate
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).lean();

    // Sort: highest priority first, then soonest due date first (null dates last)
    tasks.sort((a, b) => {
      const prioDiff = (PRIO_WEIGHT[b.priority] || 0) - (PRIO_WEIGHT[a.priority] || 0);
      if (prioDiff !== 0) return prioDiff;
      // If same priority, sort by due date (soonest first, null last)
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDate - bDate;
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks — create a new task
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const task = await Task.create({
      title,
      description,
      status:   status   || 'todo',
      priority: priority || 'medium',
      dueDate,
      userId: req.user._id,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/tasks/:id — update a task
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { title, description, status, priority, dueDate } = req.body;

    task.title       = title       ?? task.title;
    task.description = description ?? task.description;
    task.status      = status      ?? task.status;
    task.priority    = priority    ?? task.priority;
    task.dueDate     = dueDate     ?? task.dueDate;

    const updated = await task.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id — delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
