# Function Deployment Guide

## Current Status

### get-guests Function
- **Status**: ❌ 503 Error - Function failed to start
- **Issue**: Function is not starting properly
- **Action**: Need to check Supabase logs and redeploy

## Step-by-Step Deployment

### 1. Check Supabase Logs First

Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/logs/edge-functions

Filter by: `get-guests`

Look for:
- Syntax errors
- Import errors
- Runtime errors
- Any error messages

### 2. Deploy get-guests Function

1. Open: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code

2. **Copy the ENTIRE content** from: `supabase/functions/get-guests/index.ts`

3. **Paste into Supabase editor**

4. **Click "Deploy" or "Save"**

5. **Wait for deployment to complete**

6. **Check logs** to verify it started successfully

### 3. Verify Environment Variable

Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/functions

Check that `GUEST_SHEET_ID` secret exists with value:
```
13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs
```

### 4. Test the Function

After deployment, test with:
```bash
npm run test-api
```

Expected: Should return guests with `englishName`, `arabicName`, `familyGroup`, `tableNumber`

### 5. Deploy save-rsvp Function

1. Open: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code

2. **Copy the ENTIRE content** from: `supabase/functions/save-rsvp/index.ts`

3. **Paste into Supabase editor**

4. **Click "Deploy" or "Save"**

## Common Deployment Issues

### Issue: 503 Function failed to start
**Possible causes:**
- Syntax error in code
- Missing closing brace
- Import error
- Deno version mismatch

**Solution:**
1. Check Supabase logs for specific error
2. Verify code has no syntax errors
3. Ensure all functions are properly closed
4. Check that imports are correct

### Issue: Function works but returns wrong format
**Solution:**
- Clear browser cache
- Verify latest code is deployed
- Check function logs to see what's being returned

### Issue: Data written to wrong columns
**Solution:**
- Verify save-rsvp is using correct column ranges (D, F, G)
- Check that ranges are: `Sheet1!D{row}`, `Sheet1!F{row}`, `Sheet1!G{row}`

## Verification Checklist

After deployment, verify:

- [ ] get-guests returns `englishName` (not `name`)
- [ ] get-guests returns `arabicName`
- [ ] get-guests returns `familyGroup`
- [ ] get-guests returns `tableNumber`
- [ ] get-guests returns `searchLanguage` ('en' or 'ar')
- [ ] save-rsvp writes to Column D (Confirmation)
- [ ] save-rsvp writes to Column F (Date)
- [ ] save-rsvp writes to Column G (Time)
- [ ] No 503 errors
- [ ] No 500 errors

## Testing Commands

```bash
# Test API directly
npm run test-api

# Test with browser
npm run trace-rsvp

# Test full flow
npm run test-bilingual-rsvp
```

