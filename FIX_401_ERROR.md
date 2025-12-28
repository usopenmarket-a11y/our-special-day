# Fix 401 Error - Immediate Solution

## Current Status
✅ `.env` file exists  
✅ `get-config` function is deployed  
❌ Getting 401 Unauthorized error

## The Issue
The dev server needs to be restarted to load the `.env` file, OR the `.env` file format needs to be fixed.

## Quick Fix

### Option 1: Restart Dev Server (Try This First)

1. **Stop the current dev server:**
   - In the terminal where `npm run dev` is running, press `Ctrl+C`

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for it to start** (should show "Local: http://localhost:8080")

4. **Refresh your browser** at http://localhost:8080/our-special-day/

5. **Check the console** - should NOT see 401 error anymore

### Option 2: Fix .env File Format

If restarting doesn't work, check your `.env` file format:

**Current format (with quotes):**
```env
VITE_SUPABASE_URL="https://gosvleaijwscbrrnqkkt.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Should be (without quotes):**
```env
VITE_SUPABASE_URL=https://gosvleaijwscbrrnqkkt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Remove the quotes** around the values, then restart the dev server.

### Option 3: Verify Credentials

1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api
2. Verify:
   - **Project URL** matches what's in `.env`
   - **anon public** key matches what's in `.env`
3. If they don't match, update `.env` and restart

## Test After Fix

Run this to verify:
```bash
node scripts/test-supabase-connection.js
```

Should show:
- ✅ 200 OK (instead of 🔒 401)
- No "Error fetching config" in console
- Gallery and Upload should work

## Still Not Working?

1. **Check browser console** for specific error messages
2. **Verify .env file location** - must be in project root (same folder as `package.json`)
3. **Check file encoding** - should be UTF-8, no BOM
4. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

