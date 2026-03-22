# Deploy Pulse Backend to Render

## Step 1: Push backend to GitHub
```bash
cd C:\Users\PE-Estimator\.openclaw\projects\pulse
git add .
git commit -m "Pulse backend ready for deployment"
git remote add origin https://github.com/reece-cb/pulse-backend.git
git push -u origin main
```

## Step 2: Create Render Web Service
1. Go to render.com → New → Web Service
2. Connect GitHub → select pulse-backend repo
3. Settings:
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
   - Instance Type: Free

## Step 3: Add Environment Variables in Render
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=pulse_jwt_secret_2026
PORT=3000
```

## Step 4: Update mobile app
In pulse/mobile/src/api/client.js:
- Set MOCK_MODE = false
- Set API_BASE_URL to your Render URL (e.g. https://pulse-backend.onrender.com)

## Step 5: Run Supabase schema
1. Go to supabase.com → your project → SQL Editor
2. Paste contents of pulse/schema.sql
3. Run it
