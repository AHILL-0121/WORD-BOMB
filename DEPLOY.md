# 🚀 Vercel Deployment Guide

## ✅ You're All Set for Development!

Both servers are now running:
- **Next.js Frontend**: http://localhost:3001
- **PartyKit Server**: http://127.0.0.1:1999

## 🎮 Test the Game Locally

1. Open **two browser windows** at http://localhost:3001
2. Window 1: Create a room (enter your name → CREATE ROOM)
3. Copy the 6-character room code
4. Window 2: Join the room (enter different name → JOIN ROOM → paste code)
5. In Window 1: Click "START GAME"
6. Play! 💣

## 🌐 Deploy to Production with Vercel

### Architecture
- **Frontend (Next.js)** → Vercel ✅
- **WebSocket Server (PartyKit)** → PartyKit/Cloudflare ✅

*Note: Vercel doesn't support long-lived WebSocket connections, so PartyKit must be deployed separately.*

### Step 1: Deploy PartyKit Server (via WSL)

```powershell
# In PowerShell, open WSL
wsl
```

Then in WSL:
```bash
# Navigate to your project frontend
cd /mnt/c/Users/Asus/Desktop/wordbomb/frontend

# Install dependencies (first time only)
npm install

# Login to PartyKit (creates account if needed)
npx partykit login

# Deploy the server
npx partykit deploy

# 📝 Copy the URL you get (e.g., wordbomb.yourname.partykit.dev)
```

### Step 2: Prepare for Vercel

Create/update `.env.local` with your PartyKit URL:

```env
NEXT_PUBLIC_PARTYKIT_HOST=wordbomb.YOURNAME.partykit.dev
```

**Important**: Just the hostname, no `wss://` or `https://`!

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI (Quick)

```powershell
# Navigate to frontend directory
cd frontend

# Install Vercel CLI globally (first time only)
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? wordbomb (or your choice)
# - Directory? ./ (current directory)
# - Override settings? No

# After first deployment, set environment variable:
vercel env add NEXT_PUBLIC_PARTYKIT_HOST

# Paste your PartyKit URL: wordbomb.yourname.partykit.dev
# Select: Production

# Redeploy with environment variable:
vercel --prod
```

#### Option B: Using Vercel Dashboard (Recommended)

1. **Push to GitHub**:
   ```powershell
   # From root wordbomb directory
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/wordbomb.git
   git push -u origin main
   ```

2. **Import in Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure project:
     - Framework Preset: **Next.js** (auto-detected)
     - Root Directory: **frontend** (⚠️ Important!)
     - Build Command: `npm run build` (auto-filled)
     - Output Directory: `.next` (auto-filled)

3. **Add Environment Variable**:
   - Before clicking "Deploy", expand "Environment Variables"
   - Add: `NEXT_PUBLIC_PARTYKIT_HOST` = `wordbomb.yourname.partykit.dev`
   - Click "Add"

4. **Deploy**:
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your game is live! 🎉

### Step 4: Configure Custom Domain (Optional)

In Vercel Dashboard:
- Go to Project Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

## 📝 Quick Commands Reference

### Local Development (PowerShell)
```powershell
# Navigate to frontend directory
cd frontend

# Start Next.js frontend
npm run dev

# Start PartyKit server (in separate terminal, also in frontend/)
npm run party:dev

# Both must be running for local testing
```

### Deployment (WSL)
```bash
# Navigate to project frontend in WSL
cd /mnt/c/Users/Asus/Desktop/wordbomb/frontend

# Deploy PartyKit updates
npx partykit deploy
```

### Deployment (Vercel)
```powershell
# From frontend directory
cd frontend

# Deploy from PowerShell
vercel --prod

# Or just push to GitHub (auto-deploys if connected)
cd ..
git push origin main
```

## 🎯 Deployment Checklist

- [ ] Deploy PartyKit server via WSL
- [ ] Copy PartyKit URL (e.g., `wordbomb.yourname.partykit.dev`)
- [ ] Push code to GitHub (if using Dashboard method)
- [ ] Import project in Vercel
- [ ] Add environment variable: `NEXT_PUBLIC_PARTYKIT_HOST`
- [ ] Deploy and test with multiple browsers
- [ ] ✅ Game is live!

## 🔄 Updating Your Deployed Game

### Update Frontend
```powershell
# Make your changes, then:
git add .
git commit -m "Your changes"
git push origin main

# Vercel auto-deploys! Or manually:
vercel --prod
```

### Update PartyKit Server
```powershell
# Open WSL
wsl

# In WSL:
cd /mnt/c/Users/Asus/Desktop/wordbomb/frontend
npx partykit deploy
```

## 🐛 Troubleshooting

**Local: Can't connect to game**:
- Ensure `.env.local` has: `NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999`
- Both servers must be running (`npm run dev` AND `npm run party:dev`)
- Restart Next.js after changing `.env.local`

**Production: Players can't connect**:
- Check environment variable in Vercel Dashboard
- Must be just the hostname: `wordbomb.yourname.partykit.dev`
- NOT `wss://` or `https://` prefix
- Redeploy if you changed the variable

**PartyKit deploy fails in PowerShell**:
- Use WSL: `wsl` → `cd /mnt/c/Users/Asus/Desktop/wordbomb/frontend` → `npx partykit deploy`

**Vercel build fails**:
- Check build logs in Vercel Dashboard
- Ensure all dependencies in `package.json`
- Make sure environment variable is set

## 🎮 Testing Production

1. Open your Vercel URL in **multiple browsers** (Chrome, Firefox, Edge)
2. Create a room in one browser
3. Join with the room code in other browsers
4. Play a full game to test all features
5. Check timer, word validation, elimination, winner screen

## 📊 Monitoring

- **Vercel**: Dashboard shows deployment status, logs, analytics
- **PartyKit**: Login at https://partykit.io to see server stats, logs, connections

Enjoy your deployed game! 🎮💣🚀
