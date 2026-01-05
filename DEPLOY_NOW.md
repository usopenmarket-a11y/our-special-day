# 🚨 URGENT: Deploy Functions Now

## Current Status
- ✅ **save-rsvp**: Working
- ❌ **get-guests**: 503 Error - Function failed to start

## Immediate Action Required

### Step 1: Deploy get-guests Function

1. **Open the function editor:**
   https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code

2. **Copy the ENTIRE file content** from:
   `supabase/functions/get-guests/index.ts`
   
   ⚠️ **IMPORTANT**: Copy the ENTIRE file, line by line, including:
   - All imports
   - All functions
   - The serve() call
   - The parseCSVLine() function at the end

3. **Paste into Supabase editor**

4. **Click "Deploy" or "Save"**

5. **Wait for deployment** (should show "Deployed" status)

6. **Check for errors** in the editor (red underlines indicate syntax errors)

### Step 2: Verify Deployment

After deploying, run:
```bash
npm run verify-deploy
```

Expected result:
- ✅ Status: 200
- ✅ Returns guests with `englishName`, `arabicName`, `familyGroup`, `tableNumber`

### Step 3: If Still Getting 503 Error

1. **Check Supabase Logs:**
   https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/logs/edge-functions
   
   Filter by: `get-guests`
   
   Look for:
   - Syntax errors
   - Import errors
   - Runtime errors
   - Any error messages

2. **Common Issues:**
   - Missing closing brace `}`
   - Typo in function name
   - Invalid import URL
   - Missing environment variable

3. **Share the error message** from logs so I can fix it

## Quick Test After Deployment

```bash
npm run test-api
```

This will test:
- ✅ Function starts (no 503)
- ✅ Returns correct format (englishName, not name)
- ✅ Includes all fields (arabicName, familyGroup, tableNumber)
- ✅ Search language detection works

## File Locations

- **get-guests**: `supabase/functions/get-guests/index.ts` (341 lines)
- **save-rsvp**: `supabase/functions/save-rsvp/index.ts` (276 lines)

Both files are ready to deploy!

