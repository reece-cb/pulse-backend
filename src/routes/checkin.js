const express = require('express');
const supabase = require('../lib/supabase');
const { analyzeCheckin } = require('../services/claude');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const WIN_MAX_LENGTH = 500;
const DESC_MAX_LENGTH = 1000;
const MONEY_MIN = -1_000_000;
const MONEY_MAX = 1_000_000;

// POST /checkin
router.post('/', requireAuth, async (req, res) => {
  const { sleep, mood, productive, productiveDescription, money, win } = req.body;
  const userId = req.userId;

  // --- Input validation ---

  // sleep: integer 1–10
  if (typeof sleep !== 'number' || !Number.isInteger(sleep) || sleep < 1 || sleep > 10) {
    return res.status(400).json({ error: 'sleep must be an integer between 1 and 10', code: 'INVALID_INPUT' });
  }

  // mood: integer 1–10
  if (typeof mood !== 'number' || !Number.isInteger(mood) || mood < 1 || mood > 10) {
    return res.status(400).json({ error: 'mood must be an integer between 1 and 10', code: 'INVALID_INPUT' });
  }

  // productive: boolean
  if (typeof productive !== 'boolean') {
    return res.status(400).json({ error: 'productive must be a boolean', code: 'INVALID_INPUT' });
  }

  // productiveDescription: optional string, max length
  if (productiveDescription !== undefined && productiveDescription !== null) {
    if (typeof productiveDescription !== 'string') {
      return res.status(400).json({ error: 'productiveDescription must be a string', code: 'INVALID_INPUT' });
    }
    if (productiveDescription.length > DESC_MAX_LENGTH) {
      return res.status(400).json({ error: `productiveDescription must be ${DESC_MAX_LENGTH} characters or fewer`, code: 'INVALID_INPUT' });
    }
  }

  // money: finite number within sane bounds
  if (typeof money !== 'number' || !isFinite(money)) {
    return res.status(400).json({ error: 'money must be a finite number (positive = earned, negative = spent)', code: 'INVALID_INPUT' });
  }
  if (money < MONEY_MIN || money > MONEY_MAX) {
    return res.status(400).json({ error: `money must be between ${MONEY_MIN} and ${MONEY_MAX}`, code: 'INVALID_INPUT' });
  }

  // win: non-empty string, max length
  if (!win || typeof win !== 'string' || win.trim().length === 0) {
    return res.status(400).json({ error: 'win is required and must be a non-empty string', code: 'INVALID_INPUT' });
  }
  if (win.length > WIN_MAX_LENGTH) {
    return res.status(400).json({ error: `win must be ${WIN_MAX_LENGTH} characters or fewer`, code: 'INVALID_INPUT' });
  }

  // --- Rate limiting: one check-in per user per day ---
  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'You have already checked in today', code: 'CONFLICT' });
    }
  } catch (err) {
    // .single() throws when no row found — that's expected; only re-throw real errors
    if (err?.code !== 'PGRST116') {
      console.error('Checkin duplicate check error:', err);
      return res.status(500).json({ error: 'Failed to verify check-in status', code: 'SERVER_ERROR' });
    }
  }

  // --- AI scoring ---
  let score, insight;
  try {
    const result = await analyzeCheckin({
      sleep,
      mood,
      productive,
      productiveDescription: productiveDescription || '',
      money,
      win: win.trim(),
    });
    score = result.score;
    insight = result.insight;
  } catch (err) {
    console.error('Claude scoring error:', err);
    return res.status(502).json({ error: 'Failed to analyze check-in', code: 'BAD_GATEWAY' });
  }

  // --- Persist check-in ---
  const { data: checkin, error: insertError } = await supabase
    .from('checkins')
    .insert({
      user_id: userId,
      checkin_date: today,
      sleep,
      mood,
      productive,
      productive_description: productiveDescription?.trim() || null,
      money,
      win: win.trim(),
      score,
      insight,
    })
    .select()
    .single();

  if (insertError) {
    // Unique constraint violation means a race-condition double submit
    if (insertError.code === '23505') {
      return res.status(409).json({ error: 'You have already checked in today', code: 'CONFLICT' });
    }
    console.error('Checkin insert error:', insertError);
    return res.status(500).json({ error: 'Failed to save check-in', code: 'SERVER_ERROR' });
  }

  // --- Compute global percentile ---
  const { count: totalToday } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('checkin_date', today);

  const { count: beatCount } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('checkin_date', today)
    .lt('score', score);

  const percentile = totalToday > 1
    ? Math.round((beatCount / (totalToday - 1)) * 100)
    : 100;

  // --- Build shareable card ---
  const productiveLabel = productive ? 'Yes' : 'No';
  const moneyLabel = money >= 0 ? `+$${money}` : `-$${Math.abs(money)}`;
  const shareCard = [
    `📊 My Pulse today: ${score}/100`,
    `Sleep ${sleep} · Mood ${mood} · Productivity ${productiveLabel} · Money ${moneyLabel}`,
    `Beat ${percentile}% of the world today 🌍`,
  ].join('\n');

  res.status(201).json({
    checkin: {
      id: checkin.id,
      date: today,
      score,
      insight,
      percentile,
      shareCard,
      sleep,
      mood,
      productive,
      money,
      win: win.trim(),
    },
  });
});

module.exports = router;
