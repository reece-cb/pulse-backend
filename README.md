# Pulse — MVP Backend

Daily check-in API that scores your day with AI. Every day you answer 5 questions and get a score out of 100, a personalized insight, and a global percentile ranking.

## Tech Stack

- **Express** — REST API
- **Supabase** — PostgreSQL database (via JS client)
- **Anthropic SDK** — AI scoring with `claude-haiku-4-5`
- **bcrypt** — password hashing
- **jsonwebtoken** — JWT authentication
- **dotenv** — environment config

---

## Setup

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the **SQL Editor**, run the contents of `schema.sql` to create the tables
3. Copy your **Project URL** and **service_role** key from Project Settings → API

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → `service_role` key |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `JWT_SECRET` | Generate with: `openssl rand -hex 64` |

### 4. Run the server

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## API Reference

### Authentication

All endpoints except `/user/register`, `/user/login`, and `/leaderboard` require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <token>
```

---

### POST /user/register

Create a new account.

**Request body:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "user": { "id": "uuid", "username": "alice", "email": "alice@example.com", "created_at": "..." },
  "token": "eyJ..."
}
```

---

### POST /user/login

Login and receive a JWT token.

**Request body:**
```json
{
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "username": "alice", "email": "alice@example.com" },
  "token": "eyJ..."
}
```

---

### POST /checkin *(requires auth)*

Submit your daily answers. One check-in per user per day.

**Request body:**
```json
{
  "sleep": 7,
  "mood": 8,
  "productive": true,
  "productiveDescription": "Finished the project proposal",
  "money": -45.50,
  "win": "Had a great workout at the gym"
}
```

| Field | Type | Description |
|---|---|---|
| `sleep` | number 1–10 | Sleep quality last night |
| `mood` | number 1–10 | Energy/mood today |
| `productive` | boolean | Did something productive |
| `productiveDescription` | string (optional) | What you did |
| `money` | number | Money made (positive) or spent (negative) |
| `win` | string | Your one win today |

**Response (201):**
```json
{
  "checkin": {
    "id": "uuid",
    "date": "2026-03-21",
    "score": 78,
    "insight": "Strong sleep and high energy made today a solid day. That gym win is a great habit to keep up!",
    "percentile": 84,
    "shareCard": "📊 My Pulse today: 78/100\nSleep 7 · Mood 8 · Productivity Yes · Money -$45.5\nBeat 84% of the world today 🌍"
  }
}
```

---

### GET /leaderboard

Today's top scores (public, no auth required).

**Query params:**
- `limit` — number of results (default: 20, max: 100)

**Response (200):**
```json
{
  "date": "2026-03-21",
  "leaderboard": [
    { "rank": 1, "username": "alice", "score": 95, "date": "2026-03-21" },
    { "rank": 2, "username": "bob",   "score": 88, "date": "2026-03-21" }
  ]
}
```

---

### GET /user/:id/history

Last 30 days of check-ins for a user.

**Response (200):**
```json
{
  "user": { "id": "uuid", "username": "alice" },
  "stats": { "average": 74, "best": 92, "totalCheckins": 18 },
  "history": [
    {
      "id": "uuid",
      "checkin_date": "2026-03-21",
      "score": 78,
      "insight": "...",
      "sleep": 7,
      "mood": 8,
      "productive": true,
      "money": -45.50,
      "win": "Had a great workout at the gym"
    }
  ]
}
```

---

## Health Check

```
GET /health
```

Returns `{ "status": "ok", "timestamp": "..." }`.

---

## Push Notifications (Future)

The schema is ready. To send daily 9pm notifications, use a cron job or Supabase Edge Function that queries all users and triggers your notification service (Expo Push, FCM, APNs, etc.).

---

## Project Structure

```
pulse/
├── src/
│   ├── index.js              # Express app entry point
│   ├── lib/
│   │   └── supabase.js       # Supabase client
│   ├── middleware/
│   │   └── auth.js           # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js           # POST /user/register, POST /user/login
│   │   ├── checkin.js        # POST /checkin
│   │   ├── leaderboard.js    # GET /leaderboard
│   │   └── history.js        # GET /user/:id/history
│   └── services/
│       └── claude.js         # Anthropic SDK — AI scoring
├── schema.sql                # Supabase table definitions
├── .env.example              # Environment variable template
└── README.md
```
