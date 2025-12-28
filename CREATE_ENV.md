# Create .env File to Fix 401 Error

## The Problem
You're getting a **401 Unauthorized** error when calling the `get-config` function. This means your Supabase credentials are missing or incorrect.

## The Solution
Create a `.env` file in the project root with your Supabase credentials.

## Step-by-Step Instructions

### Step 1: Get Your Supabase Credentials

1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api
2. Copy these two values:
   - **Project URL**: `https://gosvleaijwscbrrnqkkt.supabase.co`
   - **anon public** key: (a long string starting with `eyJ...`)

### Step 2: Create .env File

Create a file named `.env` in the project root (same folder as `package.json`) with this content:

```env
VITE_SUPABASE_URL=https://gosvleaijwscbrrnqkkt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=paste_your_anon_key_here
```

**Replace `paste_your_anon_key_here` with the actual anon key from Step 1.**

### Step 3: Restart Dev Server

**Important:** After creating/updating `.env`, you MUST restart the dev server:

1. Stop the current server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 4: Verify It Works

1. Open: http://localhost:8080/our-special-day/
2. Open browser console (F12)
3. Should NOT see "401" or "Error fetching config"
4. Gallery and Upload should work

## Quick Test

After creating `.env` and restarting, run:
```bash
node scripts/test-supabase-connection.js
```

Should show ✅ 200 OK instead of 🔒 401.

## Important Notes

- `.env` file should be in the **project root** (same folder as `package.json`)
- **Never commit `.env` to Git** (it should be in `.gitignore`)
- **Restart dev server** after changing `.env`
- The anon key is safe to use in frontend code (it's meant to be public)

