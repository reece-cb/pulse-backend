const jwt = require('jsonwebtoken');

// Validate JWT_SECRET is configured at startup, not at first request
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Cannot start server.');
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
}

module.exports = { requireAuth };
