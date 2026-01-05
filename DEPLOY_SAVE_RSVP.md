# 🚨 URGENT: Redeploy save-rsvp Function

## Issue
"Yes, Attending" is being written to the wrong column in Google Sheets.

## Expected Column Structure
- Column A: English Name
- Column B: Arabic Name  
- Column C: Family Group
- **Column D: Confirmation** ← Should write here
- Column E: Table number
- Column F: Date
- Column G: Time

## Action Required

### Step 1: Open Function Editor
Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code

### Step 2: Copy ENTIRE File
1. Open: `supabase/functions/save-rsvp/index.ts` in your editor
2. Select ALL (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)

### Step 3: Paste and Deploy
1. In Supabase editor, select ALL existing code (Ctrl+A)
2. Paste your copied code (Ctrl+V)
3. **Verify the code shows:**
   - Line 189: `range: \`Sheet1!D${actualRow}\`` (Column D for Confirmation)
   - Line 195: `range: \`Sheet1!F${actualRow}\`` (Column F for Date)
   - Line 201: `range: \`Sheet1!G${actualRow}\`` (Column G for Time)
4. Click **"Deploy"** or **"Save"**
5. Wait for "Deployed" status

### Step 4: Test
After deploying, submit an RSVP and check:
- Column D should have "Yes, Attending" or "Regretfully Decline"
- Column F should have the date
- Column G should have the time
- Column C (Family Group) should NOT be overwritten

## Verification
Check Supabase logs after deployment:
https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/logs/edge-functions

Look for log messages showing:
- `Writing to: Sheet1!D{row} (Confirmation)`
- `Writing to: Sheet1!F{row} (Date)`
- `Writing to: Sheet1!G{row} (Time)`

