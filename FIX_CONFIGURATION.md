# Fix Configuration Issues - Gallery & Upload Not Working

## Problem
You're seeing these errors:
- ⚠️ Gallery Error: "Unable to load gallery"
- ❌ Upload images not working

## Root Cause
The Supabase `get-config` Edge Function is either:
1. Not deployed
2. Missing required secrets (GALLERY_FOLDER_ID, UPLOAD_FOLDER_ID, GUEST_SHEET_ID)
3. Returning 401/404 errors

## Solution

### Step 1: Check Supabase Connection

First, verify your Supabase project is set up:

1. Go to: https://supabase.com/dashboard
2. Find your project (or create one if needed)
3. Note your project reference ID (e.g., `gosvleaijwscbrrnqkkt`)

### Step 2: Set Up Environment Variables Locally

Create a `.env` file in the project root (if it doesn't exist):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

To get your anon key:
1. Go to: Supabase Dashboard → Project Settings → API
2. Copy the **anon/public** key
3. Paste it in `.env`

### Step 3: Deploy the get-config Function

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace YOUR_PROJECT_REF with your actual project reference)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the get-config function
supabase functions deploy get-config
```

**Option B: Using Supabase Dashboard**

1. Go to: Supabase Dashboard → Edge Functions
2. Click **"Create Function"** or find `get-config`
3. Name: `get-config`
4. Copy the code from `supabase/functions/get-config/index.ts`
5. Click **"Deploy"**

### Step 4: Set Required Secrets

1. Go to: Supabase Dashboard → Project Settings → Edge Functions → **Secrets**
2. Add these three secrets:

   | Secret Name | Value | How to Get |
   |------------|-------|------------|
   | `GUEST_SHEET_ID` | Your Google Sheet ID | From Google Sheets URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit` |
   | `UPLOAD_FOLDER_ID` | Your Google Drive folder ID | From Google Drive folder URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE` |
   | `GALLERY_FOLDER_ID` | Your Google Drive folder ID | From Google Drive folder URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE` |

3. Click **"Save"** for each secret

### Step 5: Verify It Works

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Open your browser and check the console:
   - Should NOT see "Error fetching config"
   - Gallery should load (or show "No photos yet" if empty)
   - Upload section should be accessible

3. Test the gallery:
   - Scroll to Gallery section
   - Should see images (if folder has images) or "No photos yet" message

4. Test upload:
   - Scroll to Upload section
   - Try selecting an image
   - Should be able to upload (if UPLOAD_FOLDER_ID is set)

## Troubleshooting

### Still seeing 401/404 errors?

1. **Check function is deployed:**
   ```bash
   supabase functions list
   ```
   Should show `get-config` in the list

2. **Check function logs:**
   - Go to: Supabase Dashboard → Edge Functions → `get-config` → Logs
   - Look for any errors

3. **Verify secrets are set:**
   - Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Make sure all three secrets exist

4. **Check Supabase URL and Key:**
   - Verify `.env` file has correct values
   - Restart dev server after changing `.env`

### Gallery shows "Unable to load gallery" but config loads?

1. Check `GALLERY_FOLDER_ID` secret is set correctly
2. Verify the Google Drive folder exists and is accessible
3. Check `get-gallery` function is deployed:
   ```bash
   supabase functions deploy get-gallery
   ```

### Upload not working?

1. Check `UPLOAD_FOLDER_ID` secret is set correctly
2. Verify the Google Drive folder exists
3. Check `upload-photo` function is deployed:
   ```bash
   supabase functions deploy upload-photo
   ```
4. Make sure the folder is shared with your service account email

## Quick Test

Run this diagnostic script:
```bash
node scripts/check-config.js
```

This will show you exactly what's missing.

## Need Help?

If you're still having issues:
1. Check browser console for specific error messages
2. Check Supabase Edge Function logs
3. Verify all secrets are set correctly
4. Make sure all Edge Functions are deployed

