# 🚀 Complete Deployment Guide for Supabase Functions

## Current Status
- ✅ **save-rsvp**: Working (verified)
- ❌ **get-guests**: 503 Error - Needs deployment

## Step-by-Step Deployment Instructions

### 1. Deploy `get-guests` Function

#### A. Open the Function Editor
Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code

#### B. Copy the ENTIRE File
1. Open: `supabase/functions/get-guests/index.ts` in your editor
2. Select ALL (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)

#### C. Paste and Deploy
1. In Supabase editor, select ALL existing code (Ctrl+A)
2. Paste your copied code (Ctrl+V)
3. **Check for red underlines** (syntax errors)
4. Click **"Deploy"** or **"Save"** button
5. Wait for "Deployed" status

#### D. Verify Deployment
After deploying, run:
```bash
npm run verify-deploy
```

Expected: ✅ Status 200 (not 503)

---

### 2. Verify `save-rsvp` Function (Already Working)

The `save-rsvp` function is already working, but verify it has the latest code:

1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code
2. Compare with: `supabase/functions/save-rsvp/index.ts`
3. If different, copy and deploy the latest version

---

### 3. Check Environment Variables

1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/functions
2. Verify these secrets exist:
   - ✅ `GUEST_SHEET_ID` = `13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs`
   - ✅ `GOOGLE_SERVICE_ACCOUNT_JSON` (or `SERVICE_ACCOUNT_JSON`)
   - ✅ `SERVICE_ACCOUNT_JSON_B64` (optional, if using base64)

---

### 4. Test After Deployment

#### Quick Test
```bash
npm run verify-deploy
```

#### Full Test
```bash
npm run test-api
```

#### UI Test
```bash
npm run dev
# Then open http://localhost:5173 and test the RSVP form
```

---

## Troubleshooting 503 Error

If `get-guests` still returns 503 after deployment:

### Step 1: Check Supabase Logs
1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/logs/edge-functions
2. Filter by: `get-guests`
3. Look for:
   - Syntax errors
   - Import errors
   - Runtime errors
   - Missing environment variables

### Step 2: Common Issues

#### Issue: Missing Closing Brace
- **Symptom**: Syntax error in logs
- **Fix**: Ensure the file ends with `});` (closing the `serve()` call)

#### Issue: Import Error
- **Symptom**: "Cannot resolve import" in logs
- **Fix**: Verify the import URL is correct:
  ```typescript
  import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
  ```

#### Issue: Environment Variable Missing
- **Symptom**: Error accessing `Deno.env.get('GUEST_SHEET_ID')`
- **Fix**: Add `GUEST_SHEET_ID` secret in Supabase dashboard

#### Issue: Character Encoding
- **Symptom**: Strange characters in logs
- **Fix**: Ensure file is saved as UTF-8

### Step 3: Verify File Structure

The `get-guests/index.ts` file should:
- Start with: `import { serve } from ...`
- End with: `});` (closing the `serve()` call)
- Have exactly 341 lines
- Include the `parseCSVLine()` function at the end

---

## File Locations

| Function | Local File | Supabase URL |
|----------|-----------|--------------|
| `get-guests` | `supabase/functions/get-guests/index.ts` | https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code |
| `save-rsvp` | `supabase/functions/save-rsvp/index.ts` | https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code |

---

## Verification Checklist

After deployment, verify:

- [ ] `get-guests` returns status 200 (not 503)
- [ ] `get-guests` returns `englishName` (not `name`)
- [ ] `get-guests` includes `arabicName`, `familyGroup`, `tableNumber`
- [ ] `save-rsvp` writes to columns D, F, G (not C, D, E)
- [ ] Search works in both English and Arabic
- [ ] Table numbers appear in thank you message for attending guests

---

## Quick Commands

```bash
# Verify deployment status
npm run verify-deploy

# Test API directly
npm run test-api

# Test with Puppeteer (full UI test)
npm run test-bilingual-rsvp

# Trace API calls
npm run trace-rsvp
```

---

## Need Help?

If still having issues:
1. Share the error message from Supabase logs
2. Share the response from `npm run verify-deploy`
3. Verify the file was copied completely (all 341 lines)

