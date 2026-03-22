# Donnie Status — Pulse App (2026-03-22)

## Session Summary (Latest)

Audited full codebase — all screens verified clean, no broken code found.
Added pull-to-refresh (RefreshControl) to HistoryScreen and ProfileScreen — both were missing it while Leaderboard and Today already had it. All four main tabs now support pull-to-refresh consistently.

## Current State of the App

| Area | Status |
|------|--------|
| Auth flow (onboarding → login → register → main tabs) | ✅ Complete |
| OnboardingScreen animated dark UI | ✅ Complete |
| LoginScreen — gradient bg, glow orb, validation, gradient CTA | ✅ Complete |
| RegisterScreen — gradient bg, dual orbs, feature pills, validation | ✅ Complete |
| Bottom nav icons (Ionicons — all valid) | ✅ Complete |
| Daily check-in (5-step form, animations, validation) | ✅ Complete |
| ScoreCard (animated score, AI insight, percentile, share) | ✅ Complete |
| Leaderboard today (top N, medals, pull-to-refresh) | ✅ Complete |
| Leaderboard all-time (avg score per user) | ✅ Complete |
| History (heatmap, line chart, stats, recent entries, pull-to-refresh) | ✅ Complete |
| Profile (avatar, streak, stats, settings, notif toggle, logout, pull-to-refresh) | ✅ Complete |
| Push notifications (daily 9 PM, toggleable from Profile) | ✅ Complete |
| Navigation (auth guard, tab nav, ScoreCard modal) | ✅ Complete |
| API client (mock + live, JWT auto-inject, all routes mapped) | ✅ Complete |
| Backend (auth, checkin, leaderboard, history, Claude AI) | ✅ Complete |
| Error states with retry on all data-fetching screens | ✅ Complete |
| Loading states / skeleton loaders on all async operations | ✅ Complete |
| Pull-to-refresh on all 4 main tabs | ✅ Complete |
| Assets (icon, splash, adaptive-icon, favicon) | ✅ Present |
| app.config.js (dynamic Expo config) | ✅ Present |
| babel.config.js (reanimated plugin) | ✅ Present |

## Architecture Notes

- **Mock mode**: `MOCK_MODE = true` in `src/api/client.js` — app runs without a backend
- **Auth**: JWT stored in AsyncStorage, session restored on launch, 30-day expiry
- **Navigation**: Stack (Onboarding/Login/Register/ScoreCard) + BottomTabs (Today/Leaderboard/History/Profile)
- **Bottom tab icons**: `pulse`/`trophy`/`calendar`/`person` from Ionicons (@expo/vector-icons v14)
- **Login/Register UI**: Dark gradient bg (#050508 → #0a0a1a) + animated blue glow orbs + LinearGradient CTA button
- **Pull-to-refresh**: All data-fetching screens use `isRefresh` param to avoid skeleton flash on refresh

## Remaining Nice-to-Haves (not blocking)

- No token refresh logic (JWT is 30d; users silently logged out after expiry)
- No rate limiting on backend endpoints
- No offline caching (leaderboard/history always require network)
- No analytics / crash reporting (Sentry, etc.)
- Heatmap shows 35 days (5×7 grid) while backend returns 30 — extra 5 days show as empty cells
- Forgot password flow (needs backend email endpoint)
- Deep-link support for push notification tap → check-in screen
