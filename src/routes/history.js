const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /user/:id/history — last 30 days of scores (auth required, own data only)
router.get('/:id/history', requireAuth, async (req, res) => {
  const { id } = req.params;

  if (req.userId !== id) {
    return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
  }

  try {
    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('checkins')
      .select('id, checkin_date, score, insight, sleep, mood, productive, money, win')
      .eq('user_id', id)
      .gte('checkin_date', since)
      .order('checkin_date', { ascending: false });

    if (error) throw error;

    const scores = data.map((c) => c.score);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const best = scores.length > 0 ? Math.max(...scores) : null;

    res.json({
      user: { id: user.id, username: user.username },
      stats: { average: avg, best, totalCheckins: data.length },
      history: data,
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
