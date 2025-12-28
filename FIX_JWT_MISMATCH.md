# 🔴 CRITICAL ISSUE FOUND: JWT Token Mismatch

## The Problem
Your `.env` file has a JWT token for the **WRONG Supabase project**!

- **JWT Token is for:** `ccwfazfmmhinjttskhrr`
- **Your project is:** `gosvleaijwscbrrnqkkt`
- **Result:** 401 Unauthorized error

## The Fix

### Step 1: Get the Correct Anon Key

1. Go to: **https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api**
2. Scroll to **"Project API keys"** section
3. Find the **"anon public"** key
4. **Copy the entire key** (it's a long string starting with `eyJ...`)

### Step 2: Update .env File

Replace the `VITE_SUPABASE_PUBLISHABLE_KEY` value in your `.env` file with the correct key from Step 1.

**Current (WRONG):**
```env
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2ZhemZtbWhpbmp0dHNraHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTQwNjIsImV4cCI6MjA4MTI3MDA2Mn0.hfI75MNA1BZWmZQhUmHoeNVt3ccNVAJTxlxiplJjCs0
```

**Should be (CORRECT - from your dashboard):**
```env
VITE_SUPABASE_PUBLISHABLE_KEY=paste_the_correct_key_here
```

### Step 3: Restart Dev Server

**CRITICAL:** After updating `.env`, you MUST restart:

1. Stop server: `Ctrl+C` in terminal
2. Start again: `npm run dev`
3. Refresh browser

### Step 4: Verify

Run this test:
```bash
node scripts/test-get-config-direct.js
```

Should show ✅ 200 OK instead of ❌ 401.

## Quick Test Script

I'll create a script to help you verify the key is correct after you update it.

