# RSVP Function Deployment Checklist

## Issues Found During Testing

### 1. get-guests Function - 503 Error
**Status**: Function returns 503 "Function failed to start"

**Possible Causes**:
- Syntax error in deployed code
- Missing environment variables
- Import/deno version mismatch

**Fix Applied**:
- Added safe request body parsing
- Added error handling for undefined searchQuery
- Added validation for searchQuery type

**Action Required**:
1. ✅ Copy the updated code from `supabase/functions/get-guests/index.ts`
2. ✅ Redeploy at: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code
3. ⚠️ Check Supabase logs for startup errors
4. ⚠️ Verify environment variable `GUEST_SHEET_ID` is set in Supabase secrets

### 2. save-rsvp Function - Column Writing Issue
**Status**: Writing to wrong columns (C, D, E instead of D, F, G)

**Fix Applied**:
- Updated to write to columns D (Confirmation), F (Date), G (Time)
- Added detailed logging for debugging

**Action Required**:
1. ✅ Copy the updated code from `supabase/functions/save-rsvp/index.ts`
2. ✅ Redeploy at: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code

## Column Structure (Verified)

Google Sheet Structure:
- **Column A (index 0)**: English Name
- **Column B (index 1)**: Arabic Name
- **Column C (index 2)**: Family Group
- **Column D (index 3)**: Confirmation ← **WRITE HERE**
- **Column E (index 4)**: Table number (read only)
- **Column F (index 5)**: Date ← **WRITE HERE**
- **Column G (index 6)**: Time ← **WRITE HERE**

## Testing Steps

### 1. Test get-guests API Directly
```bash
npm run test-api
```

Expected Response Format:
```json
{
  "guests": [
    {
      "englishName": "Sarah abdelrahman",
      "arabicName": "سارة عبد الرحمان",
      "familyGroup": "Sarah And Hossni's Family",
      "tableNumber": "1",
      "rowIndex": 0
    }
  ],
  "searchLanguage": "en"
}
```

### 2. Test in Browser
1. Start dev server: `npm run dev`
2. Navigate to RSVP section
3. Search for "Sarah abdelrahman" → Should show English names
4. Search for "سارة عبد الرحمان" → Should show Arabic names
5. Submit RSVP → Check Google Sheet columns D, F, G

### 3. Check Supabase Logs
1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/logs/edge-functions
2. Filter by function: `get-guests` or `save-rsvp`
3. Look for errors or warnings

## Common Issues & Solutions

### Issue: 503 Function failed to start
**Solution**: 
- Check Supabase logs for syntax errors
- Verify all imports are correct
- Ensure Deno version compatibility

### Issue: API returns old format (`name` instead of `englishName`)
**Solution**:
- Function not redeployed with latest code
- Clear browser cache
- Redeploy function

### Issue: Data written to wrong columns
**Solution**:
- Verify save-rsvp function is redeployed
- Check that ranges are: `Sheet1!D{row}`, `Sheet1!F{row}`, `Sheet1!G{row}`

## Verification Commands

```bash
# Test API directly
npm run test-api

# Test with browser automation
npm run trace-rsvp

# Test full bilingual flow
npm run test-bilingual-rsvp
```

