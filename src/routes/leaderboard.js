const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

// GET /leaderboard — today's top scores (public)
router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('score, checkin_date, users(username)')
      .eq('checkin_date', today)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const leaderboard = data.map((row, index) => ({
      rank: index + 1,
      username: row.users?.username || 'anonymous',
      score: row.score,
      date: row.checkin_date,
    }));

    res.json({ date: today, leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', code: 'SERVER_ERROR' });
  }
});

// GET /leaderboard/alltime — all-time leaders by average score (public)
router.get('/alltime', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('user_id, score, users(username)');

    if (error) throw error;

    // Group by user, compute average score
    const userMap = {};
    data.forEach((row) => {
      const uid = row.user_id;
      if (!userMap[uid]) {
        userMap[uid] = { username: row.users?.username || 'anonymous', scores: [] };
      }
      userMap[uid].scores.push(row.score);
    });

    const leaderboard = Object.values(userMap)
      .map((u) => ({
        username: u.username,
        score: Math.round(u.scores.reduce((a, b) => a + b, 0) / u.scores.length),
        checkins: u.scores.length,
      }))
      .sort((a, b) => b.score - a.score || b.checkins - a.checkins)
      .slice(0, limit)
      .map((u, i) => ({ rank: i + 1, username: u.username, score: u.score, checkins: u.checkins }));

    res.json({ date: 'All Time', leaderboard });
  } catch (err) {
    console.error('All-time leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
