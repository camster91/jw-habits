# 🚀 Hostinger Deployment Guide

## ✅ Repository is Now Ready!

Your GitHub repository has been cleaned up and is now **deployment-ready** for Hostinger!

---

## 📊 What Was Changed

### ✅ Removed (Legacy files)
- ❌ Python scripts (old scraper)
- ❌ Old Node.js scraper files
- ❌ HTML email templates
- ❌ Windows batch files
- ❌ Old Docker configs

### ✅ Added (Clean structure)
- ✅ Root `package.json` with monorepo scripts
- ✅ Professional `.gitignore`
- ✅ Clean README with deployment instructions
- ✅ Proper project structure

### 📁 Current Structure
```
JW-News/
├── frontend/          ← React PWA
├── backend/           ← Express API
├── package.json       ← Root config (Hostinger reads this!)
├── README.md          ← Clean documentation
└── docs/              ← All documentation
```

---

## 🎯 Deploy to Hostinger - Step by Step

### Step 1: Push to GitHub

Push your clean repository to GitHub:
```bash
git add .
git commit -m "Initial commit: Clean Node.js PWA"
git push origin main
```

Repository URL:
```
https://github.com/camster91/JW-News
Branch: claude/convert-to-nodejs-2q51O
```

### Step 2: Connect to Hostinger

1. **Log in to Hostinger:**
   - Go to https://hpanel.hostinger.com
   - Navigate to your hosting dashboard

2. **Create Node.js Application:**
   - Click "Websites" or "Hosting"
   - Find "Node.js" section
   - Click "Create Application" or "Add New"

3. **Configure Application:**

   **Repository Settings:**
   ```
   Repository URL: https://github.com/camster91/JW-News
   Branch: main (or main after merge)
   ```

   **Application Settings:**
   ```
   Application Name: jw-news-pwa
   Node.js Version: 18.x or higher (20.x recommended)
   Application Root: /
   Application Startup File: backend/src/server.js
   ```

   **Build Settings:**
   ```
   Build Command: npm run build
   Start Command: npm start
   ```

   **Port:**
   ```
   Port: 3001 (or auto-assigned by Hostinger)
   ```

### Step 3: Set Environment Variables

In Hostinger panel, add these environment variables:

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
```

**Optional (if using SMTP features):**
```env
SMTP_HOST=smtp-relay.sendinblue.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### Step 4: Deploy!

1. Click "Deploy" or "Create Application"
2. Wait for deployment to complete (3-5 minutes)
3. Hostinger will:
   - Clone your repository
   - Run `npm install` (installs frontend + backend)
   - Run `npm run build` (builds frontend)
   - Run `npm start` (starts backend)

### Step 5: Test Your Deployment

**Backend API:**
```
https://your-app-name.hostinger-site.com/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

**Test API endpoints:**
```
https://your-app-name.hostinger-site.com/api/daily-text/today
https://your-app-name.hostinger-site.com/api/bible-reading/today
https://your-app-name.hostinger-site.com/api/meetings/current
```

---

## 🔧 Troubleshooting

### Issue: "No package.json found"

**Solution:** Make sure you're deploying from the root directory, not a subdirectory.

✅ Correct: `/` (root)
❌ Wrong: `/frontend` or `/backend`

---

### Issue: "Build failed"

**Check logs for:**
1. Node version (must be 18+)
2. Missing dependencies
3. Build command errors

**Solution:**
```bash
# Make sure these commands work locally first:
npm install
npm run build
npm start
```

---

### Issue: "Module not found"

**Possible causes:**
- Dependencies not installed
- Wrong start file path

**Solution:**
Check application startup file is set to:
```
backend/src/server.js
```

---

### Issue: "Port already in use"

**Solution:**
Let Hostinger auto-assign the port. Remove `PORT` from environment variables or use their assigned port.

---

## 🌐 Frontend Deployment Options

The backend is now deployed on Hostinger. For the **frontend**, you have two options:

### Option A: Deploy Frontend Separately (Recommended)

**Vercel (Free & Fast):**

1. Go to https://vercel.com
2. Import GitHub repository
3. Settings:
   ```
   Framework: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```
4. Environment Variables:
   ```
   VITE_API_URL=https://your-hostinger-backend.com/api
   ```
5. Deploy!

**Netlify (Alternative):**
Same process, just use Netlify instead of Vercel.

---

### Option B: Serve Frontend from Backend

Modify `backend/src/server.js` to serve built frontend:

```javascript
import express from 'express';
import path from 'path';

const app = express();

// Serve frontend build
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// API routes
app.use('/api', ...);

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
```

Then rebuild and redeploy.

---

## 📊 Expected Result

After successful deployment:

**Backend:**
- ✅ API running on Hostinger
- ✅ Health check returns OK
- ✅ All 10 endpoints working
- ✅ Scraping WOL data
- ✅ Caching properly

**Frontend (if on Vercel):**
- ✅ PWA loads instantly
- ✅ Connects to Hostinger backend
- ✅ Real data from JW.org displays
- ✅ Progress tracking works
- ✅ Can install as app

---

## 🎉 Post-Deployment Checklist

```
Backend (Hostinger):
[ ] Application deployed successfully
[ ] Health check returns OK status
[ ] Daily text endpoint works
[ ] Bible reading endpoint works
[ ] Meetings endpoint works
[ ] Logs show no errors
[ ] Environment variables set correctly

Frontend (Vercel/Netlify):
[ ] Site loads and displays
[ ] API connection works
[ ] Daily text fetches real data
[ ] Bible reading fetches real data
[ ] Meetings fetch real data
[ ] Progress persists on refresh
[ ] No console errors

Final Steps:
[ ] Test on mobile device
[ ] Test install as PWA
[ ] Share with others!
```

---

## 🔄 Updating Your Deployment

### To update the app:

1. **Make changes locally**
2. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **Hostinger auto-deploys!**
   - If auto-deploy enabled, changes deploy automatically
   - If not, click "Redeploy" in Hostinger panel

---

## 💡 Pro Tips

1. **Use a custom domain:**
   - In Hostinger, link your own domain
   - Update `FRONTEND_URL` environment variable

2. **Monitor logs:**
   - Check Hostinger logs regularly
   - Look for scraping errors
   - Monitor API usage

3. **Set up alerts:**
   - Use Hostinger monitoring
   - Get notified if app goes down

4. **Backup data:**
   - `history.json` contains user data
   - Download periodically or use database

5. **Scale if needed:**
   - Upgrade Hostinger plan for more traffic
   - Use CDN for frontend assets
   - Add Redis for better caching

---

## 📞 Need Help?

**Hostinger Support:**
- Live chat: Available 24/7
- Knowledge base: https://support.hostinger.com

**Repository Issues:**
- GitHub: https://github.com/camster91/JW-News/issues
- Email: jworgnewsfeed@gmail.com

---

## ✅ Success!

Once deployed, your app will be live and accessible worldwide!

Share the link with your congregation and enjoy the PWA! 🎉

**Your backend API:** `https://your-app.hostinger-site.com`
**Your frontend PWA:** `https://your-frontend.vercel.app`

---

**🎊 Congratulations on deploying your Study Helper PWA!**
