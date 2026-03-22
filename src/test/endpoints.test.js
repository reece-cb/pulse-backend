/**
 * Pulse API — endpoint smoke tests using mock data.
 * Run with:  node src/test/endpoints.test.js
 *
 * Does NOT require a real Supabase instance or Anthropic key.
 * Stubs are injected via module-level mocks before the app is loaded.
 */

'use strict';

// ── Environment stubs (must happen before any require of the app) ──────────
process.env.PORT           = '3999';
process.env.SUPABASE_URL   = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key';
process.env.JWT_SECRET     = 'test-jwt-secret-that-is-long-enough-to-be-safe';
process.env.ANTHROPIC_API_KEY = 'mock-anthropic-key';

// ── Supabase mock ──────────────────────────────────────────────────────────
const mockUser = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2b$12$placeholder', // not used in these tests
  created_at: new Date().toISOString(),
};

const mockCheckin = {
  id: 'cccccccc-0000-0000-0000-000000000001',
  user_id: mockUser.id,
  checkin_date: new Date().toISOString().split('T')[0],
  sleep: 7,
  mood: 8,
  productive: true,
  productive_description: 'Finished the backend tests',
  money: 50,
  win: 'Shipped the API',
  score: 82,
  insight: 'Great productive day with solid sleep.',
  created_at: new Date().toISOString(),
};

// Build a chainable query builder that resolves to a given response
function makeQueryBuilder(response) {
  const q = {
    select: () => q,
    insert: () => q,
    update: () => q,
    eq:     () => q,
    neq:    () => q,
    lt:     () => q,
    gte:    () => q,
    order:  () => q,
    limit:  () => q,
    single: () => Promise.resolve(response),
    then:   (resolve) => Promise.resolve(response).then(resolve),
  };
  return q;
}

// Track state for the "already checked in" test
let checkinExists = false;

const supabaseMock = {
  from: (table) => {
    if (table === 'users') {
      return {
        select: () => ({
          eq:     () => ({
            single: () => Promise.resolve({ data: mockUser, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { ...mockUser, password_hash: undefined },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    }

    if (table === 'checkins') {
      return {
        select: (cols, opts) => {
          // count queries (used for percentile)
          if (opts && opts.count === 'exact') {
            return {
              eq:   () => ({ lt: () => Promise.resolve({ count: 5, error: null }),
                             then: (r) => Promise.resolve({ count: 10, error: null }).then(r) }),
              then: (r) => Promise.resolve({ count: 10, error: null }).then(r),
            };
          }
          return {
            eq:    () => ({
              eq:     () => ({
                single: () => Promise.resolve(
                  checkinExists
                    ? { data: { id: mockCheckin.id }, error: null }
                    : { data: null, error: { code: 'PGRST116' } }
                ),
              }),
              order:  () => ({ limit: () => Promise.resolve({ data: [{ ...mockCheckin, users: { username: mockUser.username } }], error: null }) }),
              gte:    () => ({ order: () => Promise.resolve({ data: [mockCheckin], error: null }) }),
              lt:     () => Promise.resolve({ count: 5, error: null }),
            }),
            order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
            then:  (r) => Promise.resolve({ data: [{ ...mockCheckin, users: { username: mockUser.username } }], error: null }).then(r),
          };
        },
        insert: () => ({
          select: () => ({
            single: () => {
              checkinExists = true;
              return Promise.resolve({ data: mockCheckin, error: null });
            },
          }),
        }),
      };
    }

    return makeQueryBuilder({ data: null, error: null });
  },
};

// Inject mock before the app loads
require.cache[require.resolve('../lib/supabase')] = {
  id: require.resolve('../lib/supabase'),
  filename: require.resolve('../lib/supabase'),
  loaded: true,
  exports: supabaseMock,
};

// ── Claude service mock ────────────────────────────────────────────────────
require.cache[require.resolve('../services/claude')] = {
  id: require.resolve('../services/claude'),
  filename: require.resolve('../services/claude'),
  loaded: true,
  exports: {
    analyzeCheckin: async () => ({ score: 82, insight: 'Great productive day with solid sleep.' }),
  },
};

// ── bcrypt mock (speed up tests — no real hashing needed) ─────────────────
const bcrypt = require('bcrypt');
const _originalHash    = bcrypt.hash.bind(bcrypt);
const _originalCompare = bcrypt.compare.bind(bcrypt);
bcrypt.hash    = async (plain) => `hashed:${plain}`;
bcrypt.compare = async (plain, hash) => hash === `hashed:${plain}`;

// ── Load app (index.js calls app.listen internally) ───────────────────────
require('../index');
const http = require('http');
const jwt  = require('jsonwebtoken');

// ── Helpers ────────────────────────────────────────────────────────────────
const BASE = `http://localhost:${process.env.PORT}`;

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: process.env.PORT,
      path,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function bearerToken(userId) {
  return `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
}

let passed = 0;
let failed = 0;

function assert(label, condition, got) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}  —  got: ${JSON.stringify(got)}`);
    failed++;
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────
async function runTests() {
  // Give index.js a tick to finish its app.listen() call
  await new Promise((r) => setTimeout(r, 100));
  console.log(`\nPulse API test server on ${BASE}\n`);

  // Reset state
  checkinExists = false;

  // ── /health ──────────────────────────────────────────────────────────────
  console.log('GET /health');
  {
    const r = await request('GET', '/health');
    assert('200 ok',              r.status === 200,       r.status);
    assert('has timestamp',       !!r.body.timestamp,     r.body);
  }

  // ── /user/register ───────────────────────────────────────────────────────
  console.log('\nPOST /user/register');
  {
    const r = await request('POST', '/user/register', {
      username: 'testuser', email: 'test@example.com', password: 'password123',
    });
    assert('201 created',         r.status === 201,       r.status);
    assert('has token',           typeof r.body.token === 'string', r.body);
    assert('no password_hash',    !r.body.user?.password_hash,      r.body.user);
  }

  {
    // Missing fields
    const r = await request('POST', '/user/register', { username: 'x' });
    assert('400 missing fields',  r.status === 400,       r.status);
  }

  {
    // Short password
    const r = await request('POST', '/user/register', {
      username: 'x', email: 'x@x.com', password: '123',
    });
    assert('400 short password',  r.status === 400,       r.status);
  }

  // ── /user/login ──────────────────────────────────────────────────────────
  console.log('\nPOST /user/login');
  {
    // Inject a valid hash so compare succeeds
    mockUser.password_hash = `hashed:password123`;
    const r = await request('POST', '/user/login', {
      email: 'test@example.com', password: 'password123',
    });
    assert('200 ok',              r.status === 200,       r.status);
    assert('has token',           typeof r.body.token === 'string', r.body);
  }

  {
    const r = await request('POST', '/user/login', { email: 'x@x.com' });
    assert('400 missing fields',  r.status === 400,       r.status);
  }

  // ── Auth middleware ───────────────────────────────────────────────────────
  console.log('\nAuth middleware');
  {
    const r = await request('POST', '/checkin', {});
    assert('401 no token',        r.status === 401,       r.status);
  }
  {
    const r = await request('POST', '/checkin', {}, { Authorization: 'Bearer bad.token.here' });
    assert('401 bad token',       r.status === 401,       r.status);
  }

  // ── POST /checkin — validation ────────────────────────────────────────────
  console.log('\nPOST /checkin — input validation');
  const authHeader = { Authorization: bearerToken(mockUser.id) };
  const validBody = { sleep: 7, mood: 8, productive: true, money: 50, win: 'Shipped it' };

  {
    const r = await request('POST', '/checkin', { ...validBody, sleep: 0 }, authHeader);
    assert('400 sleep out of range',   r.status === 400, r.status);
  }
  {
    const r = await request('POST', '/checkin', { ...validBody, sleep: 5.5 }, authHeader);
    assert('400 sleep non-integer',    r.status === 400, r.status);
  }
  {
    const r = await request('POST', '/checkin', { ...validBody, mood: 11 }, authHeader);
    assert('400 mood out of range',    r.status === 400, r.status);
  }
  {
    const r = await request('POST', '/checkin', { ...validBody, productive: 'yes' }, authHeader);
    assert('400 productive not bool',  r.status === 400, r.status);
  }
  {
    const r = await request('POST', '/checkin', { ...validBody, money: Infinity }, authHeader);
    assert('400 money infinite',       r.status === 400, r.status);
  }
  {
    const r = await request('POST', '/checkin', { ...validBody, money: 2_000_000 }, authHeader);
    assert('400 money too large',      r.status === 400, r.status);
  }
  {
    const r = await request('POST', '/checkin', { ...validBody, win: '' }, authHeader);
    assert('400 empty win',            r.status === 400, r.status);
  }
  {
    const longWin = 'x'.repeat(501);
    const r = await request('POST', '/checkin', { ...validBody, win: longWin }, authHeader);
    assert('400 win too long',         r.status === 400, r.status);
  }

  // ── POST /checkin — success ───────────────────────────────────────────────
  console.log('\nPOST /checkin — success');
  checkinExists = false;
  {
    const r = await request('POST', '/checkin', validBody, authHeader);
    assert('201 created',         r.status === 201,               r.status);
    assert('has score',           typeof r.body.checkin?.score === 'number', r.body);
    assert('has insight',         typeof r.body.checkin?.insight === 'string', r.body);
    assert('has percentile',      typeof r.body.checkin?.percentile === 'number', r.body);
    assert('has shareCard',       typeof r.body.checkin?.shareCard === 'string', r.body);
  }

  // ── POST /checkin — duplicate ─────────────────────────────────────────────
  console.log('\nPOST /checkin — rate limit (1 per day)');
  {
    checkinExists = true;
    const r = await request('POST', '/checkin', validBody, authHeader);
    assert('409 already checked in', r.status === 409, r.status);
  }

  // ── GET /leaderboard ─────────────────────────────────────────────────────
  console.log('\nGET /leaderboard');
  {
    const r = await request('GET', '/leaderboard');
    assert('200 ok',              r.status === 200,             r.status);
    assert('has leaderboard',     Array.isArray(r.body.leaderboard), r.body);
  }
  {
    const r = await request('GET', '/leaderboard/alltime');
    assert('200 alltime ok',      r.status === 200,             r.status);
    assert('has leaderboard',     Array.isArray(r.body.leaderboard), r.body);
  }

  // ── GET /user/:id/history ─────────────────────────────────────────────────
  console.log('\nGET /user/:id/history');
  {
    const r = await request('GET', `/user/${mockUser.id}/history`, null, authHeader);
    assert('200 ok',              r.status === 200,             r.status);
    assert('has stats',           !!r.body.stats,               r.body);
    assert('has history',         Array.isArray(r.body.history), r.body);
  }
  {
    // Forbidden: different user id
    const other = bearerToken('ffffffff-ffff-ffff-ffff-ffffffffffff');
    const r = await request('GET', `/user/${mockUser.id}/history`, null, { Authorization: other });
    assert('403 forbidden',       r.status === 403,             r.status);
  }

  // ── POST /user/push-token ─────────────────────────────────────────────────
  console.log('\nPOST /user/push-token');
  {
    const r = await request('POST', '/user/push-token', { token: 'ExponentPushToken[xxx]' }, authHeader);
    assert('200 ok',              r.status === 200,             r.status);
    assert('ok: true',            r.body.ok === true,           r.body);
  }
  {
    const r = await request('POST', '/user/push-token', {}, authHeader);
    assert('400 missing token',   r.status === 400,             r.status);
  }

  // ── 404 handler ───────────────────────────────────────────────────────────
  console.log('\n404 handler');
  {
    const r = await request('GET', '/nonexistent');
    assert('404',                 r.status === 404,             r.status);
  }

  // ── Results ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
