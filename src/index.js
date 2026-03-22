require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkin');
const leaderboardRoutes = require('./routes/leaderboard');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

// Security headers
app.use(helmet());
app.use(cors());

// Request logging
app.use(morgan('combined'));

app.use(express.json());

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});

// Strict rate limit for login: 5 per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' },
});

app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Routes (login limiter applied before the auth router)
app.use('/user/login', loginLimiter);
app.use('/user', authRoutes);
app.use('/checkin', checkinRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/user', historyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

app.listen(PORT, () => {
  console.log(`Pulse API running on http://localhost:${PORT}`);
});

module.exports = app;
