# ✅ SOLUTION FOUND - JWT Token Mismatch

## Root Cause
Your `.env` file has a JWT token for the **WRONG Supabase project**:
- **Current token:** For project `ccwfazfmmhinjttskhrr` ❌
- **Your project:** `gosvleaijwscbrrnqkkt` ✅
- **Result:** 401 Unauthorized error

## The Fix (Choose One Method)

### Method 1: Manual Fix (Recommended)

1. **Get the correct key:**
   - Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api
   - Copy the **"anon public"** key

2. **Update .env file:**
   - Open `.env` in project root
   - Find: `VITE_SUPABASE_PUBLISHABLE_KEY=...`
   - Replace with: `VITE_SUPABASE_PUBLISHABLE_KEY=paste_correct_key_here`
   - **No quotes, no spaces**

3. **Verify:**
   ```bash
   node scripts/verify-jwt.js
   ```
   Should show: ✅ JWT token matches project!

4. **Restart dev server:**
   - Stop: `Ctrl+C`
   - Start: `npm run dev`

### Method 2: Use Helper Script

```bash
node scripts/update-env-key.js
```

Follow the prompts to paste the new key.

## After Fix

Once the 401 error is fixed, you still need to set secrets for Gallery/Upload:

1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/functions
2. Scroll to **Secrets**
3. Add:
   - `GUEST_SHEET_ID`
   - `UPLOAD_FOLDER_ID`
   - `GALLERY_FOLDER_ID`

## Test

After updating the key and restarting:
```bash
node scripts/test-get-config-direct.js
```

Should show: ✅ 200 OK

## Why This Happened

The `.env` file had a token from a different Supabase project. This can happen if:
- Project was changed
- Token was copied from wrong project
- Old token from previous setup

## Files Created to Help

- `GET_CORRECT_KEY.md` - Step-by-step guide
- `scripts/verify-jwt.js` - Verify token matches project
- `scripts/update-env-key.js` - Helper to update key
- `FIX_JWT_MISMATCH.md` - Detailed explanation

