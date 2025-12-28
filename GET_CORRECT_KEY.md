# 🚨 URGENT: Get Correct Supabase Key

## The Issue
Your JWT token is for project `ccwfazfmmhinjttskhrr` but you need one for `gosvleaijwscbrrnqkkt`.

## Quick Fix (2 minutes)

### Step 1: Open Supabase Dashboard
Click this link: **https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api**

### Step 2: Copy the Anon Key
1. Scroll to **"Project API keys"** section
2. Find **"anon public"** key
3. Click the **copy icon** next to it
4. The key is a long string starting with `eyJ...`

### Step 3: Update .env File
Open `.env` in the project root and replace the `VITE_SUPABASE_PUBLISHABLE_KEY` line:

**Replace this:**
```
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2ZhemZtbWhpbmp0dHNraHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTQwNjIsImV4cCI6MjA4MTI3MDA2Mn0.hfI75MNA1BZWmZQhUmHoeNVt3ccNVAJTxlxiplJjCs0
```

**With this (paste the key you copied):**
```
VITE_SUPABASE_PUBLISHABLE_KEY=paste_your_correct_key_here
```

**Important:** No quotes, no spaces, just the key directly.

### Step 4: Verify
Run this command:
```bash
node scripts/verify-jwt.js
```

Should show: ✅ JWT token matches project!

### Step 5: Restart Dev Server
1. Stop: `Ctrl+C`
2. Start: `npm run dev`
3. Refresh browser

## That's It!
After this, the 401 error will be fixed and Gallery/Upload will work (once you set the secrets).

