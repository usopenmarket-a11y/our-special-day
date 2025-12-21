# GitHub Pages Deployment Guide

Complete step-by-step guide to host your wedding website on GitHub Pages.

## 📋 Prerequisites

- ✅ Your code is pushed to GitHub repository: `usopenmarket-a11y/our-special-day`
- ✅ You have access to the repository settings
- ✅ Supabase project is set up (already done)

---

## 🚀 Step-by-Step Instructions

### Step 1: Update Vite Configuration

First, we need to set the correct base path for GitHub Pages.

**File:** `vite.config.ts`

Update it to include the base path:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: '/our-special-day/', // ← Add this line for GitHub Pages
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**Why?** GitHub Pages serves your site at `https://usopenmarket-a11y.github.io/our-special-day/`, so all assets need this base path.

---

### Step 2: Set Up GitHub Secrets

Your website needs Supabase credentials to work. Add them as GitHub Secrets:

1. **Go to your GitHub repository**
   - URL: https://github.com/usopenmarket-a11y/our-special-day

2. **Navigate to Settings**
   - Click **"Settings"** tab (top menu)

3. **Go to Secrets**
   - In left sidebar: **"Secrets and variables"** → **"Actions"**

4. **Add these secrets:**

   **Secret 1: VITE_SUPABASE_URL**
   - Click **"New repository secret"**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://gosvleaijwscbrrnqkkt.supabase.co`
   - Click **"Add secret"**

   **Secret 2: VITE_SUPABASE_PUBLISHABLE_KEY**
   - Click **"New repository secret"** again
   - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Value:** Your Supabase anon/public key
     - Get it from: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api
     - Copy the **"anon public"** key
   - Click **"Add secret"**

**✅ Done!** Your secrets are now stored securely.

---

### ⚠️ Important: Refresh Token Not Needed for GitHub Pages

**You don't need to add the OAuth refresh token to GitHub Secrets!**

**Why?**
- The **refresh token** is used by **Supabase Edge Functions** (backend), not the frontend
- GitHub Pages only hosts the **frontend** (React app)
- The refresh token is already stored in **Supabase secrets** (not GitHub)
- Your frontend only needs the Supabase URL and anon key (which you just added above)

**Where is the refresh token used?**
- It's stored in Supabase Dashboard → Settings → Edge Functions → Secrets
- It's used by the `upload-photo` Edge Function when uploading photos to Google Drive
- It's already set up (if you followed `COMPLETE_SETUP_GUIDE.md`)

**What you need for GitHub Pages:**
- ✅ `VITE_SUPABASE_URL` (frontend connects to Supabase)
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` (frontend authenticates)
- ❌ Refresh token (NOT needed - backend only)

---

### Step 3: Create GitHub Actions Workflow

Create the deployment workflow file:

**File:** `.github/workflows/deploy.yml`

Create the folder and file:

```powershell
# In your project root, run:
mkdir -p .github/workflows
```

Then create the file with this content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### Step 4: Enable GitHub Pages

1. **Go to repository Settings**
   - https://github.com/usopenmarket-a11y/our-special-day/settings

2. **Scroll to "Pages" section** (left sidebar)

3. **Under "Source"**
   - Select **"GitHub Actions"** (not "Deploy from a branch")
   - This uses the workflow we just created

4. **Save** - No need to click anything else, it's automatic!

---

### Step 5: Push Your Changes

Commit and push the workflow file:

```powershell
# Add the new files
git add vite.config.ts .github/workflows/deploy.yml

# Commit
git commit -m "Setup GitHub Pages deployment"

# Push
git push origin main
```

---

### Step 6: Wait for Deployment

1. **Go to "Actions" tab** in your GitHub repository
   - You'll see the workflow running
   - It takes 2-3 minutes to build and deploy

2. **Watch the progress**
   - Click on the workflow run to see logs
   - Wait for green checkmark ✅

3. **Get your website URL**
   - After deployment completes, go to **Settings → Pages**
   - Your site URL will be: **`https://usopenmarket-a11y.github.io/our-special-day/`**

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Website loads at: `https://usopenmarket-a11y.github.io/our-special-day/`
- [ ] All images load correctly
- [ ] RSVP form works (can search guests)
- [ ] Photo gallery loads
- [ ] Photo upload works
- [ ] Countdown timer displays correctly

---

## 🔄 Future Updates

**Every time you push to `main` branch:**
- GitHub Actions automatically builds and deploys
- Your site updates in 2-3 minutes
- No manual steps needed! 🎉

---

## 🐛 Troubleshooting

### Issue: Website shows 404 or blank page

**Solution:**
- Check that `base: '/our-special-day/'` is set in `vite.config.ts`
- Verify the workflow completed successfully (green checkmark)
- Wait 1-2 minutes after deployment (GitHub needs time to propagate)

### Issue: Assets (images/CSS) not loading

**Solution:**
- Ensure `base` path matches your repository name exactly
- Check browser console for 404 errors
- Verify the build completed successfully

### Issue: Supabase errors (can't connect)

**Solution:**
- Verify GitHub Secrets are set correctly:
  - Go to Settings → Secrets → Actions
  - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` exist
- Check workflow logs for environment variable errors
- Make sure secrets match your Supabase project

### Issue: Photo upload fails on deployed site

**Solution:**
- This is a **backend** issue, not a GitHub Pages issue
- The refresh token is stored in **Supabase secrets**, not GitHub
- Check Supabase Dashboard → Edge Functions → upload-photo → Logs
- Verify these Supabase secrets are set:
  - `GOOGLE_SERVICE_ACCOUNT` (or `GOOGLE_SERVICE_ACCOUNT_JSON`)
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REFRESH_TOKEN`
- See `COMPLETE_SETUP_GUIDE.md` for backend setup

### Issue: Workflow fails

**Solution:**
- Click on the failed workflow run
- Check the error logs
- Common issues:
  - Missing secrets → Add them in Settings → Secrets → Actions
  - Build errors → Check the "Build project" step logs
  - Node version → Already set to 20, should be fine

---

## 📝 Quick Reference

**Your Website URL:**
```
https://usopenmarket-a11y.github.io/our-special-day/
```

**Repository:**
```
https://github.com/usopenmarket-a11y/our-special-day
```

**Supabase Project:**
```
https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt
```

**GitHub Secrets Location:**
```
https://github.com/usopenmarket-a11y/our-special-day/settings/secrets/actions
```

---

## 🎉 You're Done!

Your wedding website is now live on GitHub Pages! Share the URL with your guests.

**Next Steps:**
- Test all features on the live site
- Share the URL with family and friends
- Any code changes you push will automatically deploy

---

## 📚 Understanding Frontend vs Backend

**Frontend (GitHub Pages):**
- Hosts your React website
- Needs: Supabase URL + anon key (for connecting to Supabase)
- Stored in: GitHub Secrets → Actions

**Backend (Supabase Edge Functions):**
- Handles photo uploads, RSVP saving, gallery fetching
- Needs: Service account JSON + OAuth refresh token (for Google Drive/Sheets)
- Stored in: Supabase Dashboard → Settings → Edge Functions → Secrets

**Key Point:** The refresh token is **already set up** in Supabase (if you followed the setup guide). You don't need to do anything with it for GitHub Pages deployment!

