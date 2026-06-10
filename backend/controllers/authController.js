const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helper: generate signed JWT ─────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const emailExists    = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });

    if (emailExists)    return res.status(409).json({ message: 'Email already in use' });
    if (usernameExists) return res.status(409).json({ message: 'Username already taken' });

    const user = await User.create({ username, email, password });

    res.status(201).json({
      _id:      user._id,
      username: user.username,
      email:    user.email,
      token:    generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id:      user._id,
      username: user.username,
      email:    user.email,
      token:    generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/auth/me (get logged-in user profile) ───────────────────────────
const getMe = async (req, res) => {
  res.json({
    _id:      req.user._id,
    username: req.user.username,
    email:    req.user.email,
  });
};

module.exports = { register, login, getMe };
