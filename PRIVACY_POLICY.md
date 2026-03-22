# Privacy Policy — Pulse

**Last updated: March 22, 2026**

Pulse ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.

---

## 1. Information We Collect

### Information You Provide
- **Account information:** username, email address, and password (stored as a bcrypt hash — we never store your plaintext password)
- **Daily check-in data:** sleep quality, mood rating, productivity rating, money spent/earned, and your daily win — submitted voluntarily each day

### Information Collected Automatically
- **Usage data:** timestamps of check-ins, app open events (no third-party analytics SDKs are used)
- **Push notification token:** only if you grant notification permission — used solely to send your daily 9pm check-in reminder

### Information We Do NOT Collect
- We do not collect your precise location
- We do not collect contacts, photos, microphone, or camera data
- We do not use third-party advertising SDKs or tracking pixels
- We do not sell your data to third parties

---

## 2. How We Use Your Information

| Purpose | Data Used |
|---------|-----------|
| Authenticate your account | Email, password hash |
| Generate your daily AI score and insight | Check-in answers (sleep, mood, productivity, money, win) |
| Display leaderboard rankings | Username, daily score |
| Show your personal history and trends | Check-in history (visible only to you) |
| Send daily check-in reminders | Push notification token |

Your check-in answers are sent to Anthropic's Claude API to generate your personalized score and insight. Anthropic processes this data under their API terms of service and privacy policy. We do not store raw answers beyond what is needed to display your history.

---

## 3. Data Sharing

We do not sell, rent, or share your personal data with third parties except:

- **Anthropic** — your daily check-in answers are processed by the Claude API to generate your score and insight. See [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) for details.
- **Supabase** — our database infrastructure provider. Data is stored in Supabase-hosted PostgreSQL. See [Supabase's Privacy Policy](https://supabase.com/privacy) for details.
- **Legal requirements** — if required by law, court order, or to protect the rights and safety of our users.

Your **username and daily score** are visible on the public leaderboard. Your detailed check-in answers and personal history are visible only to you.

---

## 4. Data Retention

- Your account and check-in history are retained as long as your account is active.
- If you delete your account, all associated data is permanently deleted within 30 days.
- Push notification tokens are deleted immediately upon disabling notifications or deleting your account.

---

## 5. Security

We use industry-standard security practices:
- Passwords are hashed with bcrypt (never stored in plaintext)
- All API communication is encrypted via HTTPS/TLS
- Authentication uses signed JWT tokens with a 30-day expiry
- Database access is restricted to our backend service only

---

## 6. Children's Privacy

Pulse is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.

---

## 7. Your Rights

Depending on your location, you may have the right to:
- **Access** the personal data we hold about you
- **Correct** inaccurate data
- **Delete** your account and all associated data
- **Export** your check-in history

To exercise these rights, contact us at the email below.

---

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of Pulse after changes constitutes acceptance of the updated policy.

---

## 9. Contact Us

If you have questions about this Privacy Policy, please contact us at:

**Email:** privacy@pulse.app
**App:** Pulse — Daily Check-In
