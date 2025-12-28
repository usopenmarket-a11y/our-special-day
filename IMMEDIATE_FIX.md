# ⚡ IMMEDIATE FIX - Restart Dev Server

## What I Just Fixed
✅ Removed quotes from `.env` file values  
✅ Fixed `.env` file format

## What You Need to Do NOW

### Step 1: Restart Dev Server

**IMPORTANT:** The dev server must be restarted to load the updated `.env` file.

1. **Stop the current server:**
   - Find the terminal window running `npm run dev`
   - Press `Ctrl+C` to stop it

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for it to start** (you'll see "Local: http://localhost:8080")

### Step 2: Test

1. Open: http://localhost:8080/our-special-day/
2. Open browser console (F12)
3. Should NOT see:
   - ❌ "401" error
   - ❌ "Error fetching config"
4. Should see:
   - ✅ Gallery loads (or shows "No photos yet" if empty)
   - ✅ Upload section works

### Step 3: Verify

Run this test:
```bash
node scripts/test-supabase-connection.js
```

Should show:
- ✅ 200 OK (instead of 🔒 401)
- No authentication errors

## Why This Happened

1. The `.env` file had quotes around values (e.g., `"value"` instead of `value`)
2. Vite might not parse quoted values correctly
3. The dev server needs to be restarted to reload `.env` changes

## If Still Not Working

1. **Check .env file location** - must be in project root (same folder as `package.json`)
2. **Verify no extra spaces** in .env file
3. **Clear browser cache** - Press Ctrl+Shift+R
4. **Check Supabase Dashboard** - Make sure the anon key is still valid

## Next Steps (After Fix Works)

Once the 401 error is fixed, you still need to:
1. Set secrets in Supabase Dashboard:
   - `GUEST_SHEET_ID`
   - `UPLOAD_FOLDER_ID` 
   - `GALLERY_FOLDER_ID`
2. Then Gallery and Upload will work fully

