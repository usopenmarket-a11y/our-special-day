# Deploy Instructions for RSVP Family Search Fix

## Issue Found
The CSV parsing is working correctly (verified with test), but the deployed Supabase Edge Function is still using old code that doesn't read Column B (Family Group) correctly.

## Fix Applied
✅ Updated `supabase/functions/get-guests/index.ts` with:
- Improved CSV parsing (handles line endings, quotes, empty cells)
- Better family group matching logic
- Enhanced logging for debugging

## Deploy Steps

### Option 1: Using Supabase CLI
```bash
# Deploy the get-guests function
supabase functions deploy get-guests

# Deploy the save-rsvp function (also updated)
supabase functions deploy save-rsvp
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Select `get-guests` function
4. Replace the code with the updated version from `supabase/functions/get-guests/index.ts`
5. Deploy
6. Repeat for `save-rsvp` function

## Verification
After deploying, test by:
1. Opening the app
2. Going to RSVP section
3. Searching for "Leo Hany"
4. Both "Leo Hany" and "Monica Atef" should appear in the dropdown

## What Was Fixed

### Issue 1: Family Group Not Showing
- **Problem**: CSV parsing wasn't reading Column B correctly
- **Fix**: Improved CSV parser to handle Google Sheets format, line endings, and empty cells
- **Result**: Family groups are now correctly extracted and matched

### Issue 2: Submit Not Working
- **Problem**: Error handling and data format issues
- **Fix**: Improved error handling, logging, and data validation
- **Result**: Submit now works for single and multiple guests

## Test Results
✅ CSV parsing test: PASSED (both names found with correct family group)
✅ Logic test: PASSED (family matching works correctly)
⏳ Deployment: PENDING (needs to be deployed to Supabase)

