# Pulse — Deployment Guide

Complete instructions for deploying the Pulse backend to Railway and publishing the mobile app via EAS.

---

## 1. Supabase Setup

### Create a Project
1. Go to [supabase.com](https://supabase.com) → New Project.
2. Note your **Project URL** and **service role key** (Settings → API → `service_role` — keep this secret).

### Run the Schema
1. Open the Supabase **SQL Editor**.
2. Paste the contents of `schema.sql` and click **Run**.
3. Verify the tables exist: `users`, `checkins`, `push_tokens`.

### RLS Policies
The schema already includes Row Level Security policies. Confirm they're enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
All three tables should show `rowsecurity = true`.

---

## 2. Backend — Deploy to Railway

### Prerequisites
- [Railway CLI](https://docs.railway.app/develop/cli): `npm i -g @railway/cli`
- A Railway account (free tier works for MVP)

### Steps

```bash
# From the project root (pulse/)
railway login
railway init          # creates a new Railway project
railway up            # deploys using package.json start script
```

Railway auto-detects Node.js. The `start` script (`node src/index.js`) is used in production.

### Environment Variables
Set these in Railway → your service → **Variables**:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Railway sets this automatically — leave unset | |
| `SUPABASE_URL` | Your Supabase project URL | `https://abcdef.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (secret) | `eyJ...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `JWT_SECRET` | Long random string for signing JWTs | `openssl rand -hex 64` |

Generate a strong JWT secret locally:
```bash
openssl rand -hex 64
```

### Verify Deployment
```bash
curl https://your-app.railway.app/health
# → {"status":"ok","timestamp":"..."}
```

Railway gives you a public URL like `https://pulse-production.up.railway.app`. Copy it — you'll need it for the mobile app.

---

## 3. Mobile — Configure API URL

Edit `mobile/.env` (copy from `mobile/.env.example`):
```
EXPO_PUBLIC_API_URL=https://your-app.railway.app
```

Or edit `mobile/src/api/client.js` directly if not using env vars.

---

## 4. Mobile — Build with EAS

### Prerequisites
- Expo account: [expo.dev](https://expo.dev)
- EAS CLI: `npm i -g eas-cli`
- Apple Developer account (iOS, $99/yr)
- Google Play Developer account (Android, $25 one-time)

### First-Time Setup
```bash
cd mobile
eas login
eas build:configure   # already done — eas.json exists
```

### Update app.json
Fill in your real values:
```json
{
  "expo": {
    "name": "Pulse",
    "slug": "pulse",
    "ios": { "bundleIdentifier": "com.yourcompany.pulse" },
    "android": { "package": "com.yourcompany.pulse" },
    "extra": { "eas": { "projectId": "your-eas-project-id" } }
  }
}
```

Get your EAS project ID from `expo.dev` after running `eas build:configure`.

### Build for App Store (iOS)
```bash
cd mobile
eas build --platform ios --profile production
```
This produces a `.ipa` file. EAS handles code signing if you provide Apple credentials when prompted.

### Build for Google Play (Android)
```bash
eas build --platform android --profile production
```
This produces an `.aab` (Android App Bundle).

### OTA Updates (post-launch)
For JS-only changes (no native code changes):
```bash
eas update --branch production --message "Fix: ..."
```

---

## 5. End-to-End Test Checklist

Run through this after deploying backend and before submitting to stores.

### Backend
- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `POST /user/register` creates a user (check Supabase dashboard)
- [ ] `POST /user/login` returns a JWT token
- [ ] `POST /checkin` with valid JWT and all 5 fields returns score + insight
- [ ] `GET /leaderboard` returns today's top scores
- [ ] `GET /user/:id/history` returns last 30 days

### Mobile (on device or simulator)
- [ ] Onboarding screens display correctly
- [ ] Register a new account
- [ ] Log in with that account
- [ ] Complete a daily check-in (all 5 questions)
- [ ] Score card animates in; AI insight displays
- [ ] Share card renders (Wordle-style)
- [ ] Leaderboard shows today's entries
- [ ] History screen shows heatmap + line chart
- [ ] Profile screen shows account info + logout works
- [ ] Push notification permission prompt appears
- [ ] Daily 9 PM reminder is scheduled

### Edge Cases
- [ ] Attempting a second check-in on the same day is blocked
- [ ] Expired/missing JWT returns 401
- [ ] Invalid check-in values (out of range) return 400

---

## 6. App Store Submission Checklist

### Both Platforms
- [ ] App icon 1024×1024 PNG (no alpha, no rounded corners for iOS)
- [ ] Screenshots for all required device sizes (see `mobile/SCREENSHOTS.md`)
- [ ] Privacy policy URL (required by both stores)
- [ ] App description, keywords, subtitle filled in (see `APP_STORE_PREP.md`)
- [ ] Age rating completed
- [ ] Export compliance (no custom encryption → answer "No")

### iOS — App Store Connect
- [ ] Create app record at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] Upload `.ipa` via `eas submit --platform ios` or Transporter
- [ ] Fill TestFlight internal testing group; verify on device
- [ ] Submit for App Review (allow 1–3 business days)

### Android — Google Play Console
- [ ] Create app at [play.google.com/console](https://play.google.com/console)
- [ ] Upload `.aab` to Internal Testing track first
- [ ] Promote to Production after verifying
- [ ] Complete store listing, content rating questionnaire, data safety form

---

## 7. Post-Launch

- Monitor Railway logs: `railway logs --tail`
- Monitor Supabase logs: Dashboard → Logs
- Set up Railway auto-deploy from GitHub for CD:
  - Railway → Settings → Source → connect GitHub repo → enable auto-deploy on push to `main`
