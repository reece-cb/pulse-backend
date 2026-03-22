const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /user/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required', code: 'MISSING_FIELDS' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'INVALID_INPUT' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { data, error } = await supabase
    .from('users')
    .insert({ username, email, password_hash: passwordHash })
    .select('id, username, email, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username or email already taken', code: 'CONFLICT' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed', code: 'SERVER_ERROR' });
  }

  const token = jwt.sign({ userId: data.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.status(201).json({ user: data, token });
});

// POST /user/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required', code: 'MISSING_FIELDS' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, password_hash, created_at')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// POST /user/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required', code: 'MISSING_FIELDS' });
  }

  // Log for now — email sending requires Resend API integration
  console.log(`[forgot-password] Reset requested for: ${email}`);

  res.json({ ok: true });
});

// POST /user/push-token
router.post('/push-token', requireAuth, async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required', code: 'MISSING_FIELDS' });
  }

  const { error } = await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', req.userId);

  if (error) {
    console.error('Push token save error:', error);
    return res.status(500).json({ error: 'Failed to save push token', code: 'SERVER_ERROR' });
  }

  res.json({ ok: true });
});

module.exports = router;
