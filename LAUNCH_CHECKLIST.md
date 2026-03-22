# Pulse — Launch Checklist

## Phase 1: Dre's One-Time Setup (30 min total)

### Apple Developer Account ($99/year)
- [ ] Go to developer.apple.com → Enroll → Individual
- [ ] Pay $99/year
- [ ] Send AJ your Apple Team ID (found in developer.apple.com/account)

### Google Play Console ($25 one-time)
- [ ] Go to play.google.com/console → Pay $25
- [ ] Send AJ your Google Play Developer account email

### Supabase (free)
- [ ] Go to supabase.com → Create new project → name it "pulse"
- [ ] Go to Settings → Database → copy the connection string
- [ ] Go to Settings → API → copy the URL and anon key
- [ ] Send AJ: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY

### EAS Account (free)
- [ ] Run in terminal: eas login
- [ ] Create account at expo.dev
- [ ] Run: eas init (in pulse/mobile folder)
- [ ] Send AJ your EAS project ID

---

## Phase 2: AJ/Donnie Handle (automatically once above is done)
- [ ] Run schema.sql against Supabase
- [ ] Deploy backend to Render
- [ ] Set MOCK_MODE = false in mobile app
- [ ] Build production binaries with EAS
- [ ] Submit to App Store
- [ ] Submit to Google Play

---

## Phase 3: Launch
- [ ] App Store review (1-3 days)
- [ ] Google Play review (1-7 days)
- [ ] Share score card on social media
- [ ] Let the viral loop work

---

## What Each Thing Costs
| Item | Cost |
|------|------|
| Apple Developer | $99/year |
| Google Play | $25 one-time |
| Supabase | Free (up to 500MB) |
| Render (backend hosting) | Free tier to start |
| EAS Build | Free (30 builds/month) |
| **Total to launch** | **$124** |
