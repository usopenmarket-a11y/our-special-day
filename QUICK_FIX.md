# Quick Fix for Gallery & Upload Issues

## The Problem
- Gallery shows: "Unable to load gallery"
- Upload images doesn't work

## The Cause
The Supabase `get-config` function is not accessible (404/401 error), which means:
1. The function is not deployed, OR
2. Supabase credentials are missing/incorrect

## Quick Solution

### Step 1: Check Your .env File

Create or update `.env` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

**To get these values:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

### Step 2: Deploy get-config Function

**Using Supabase Dashboard (Easiest):**

1. Go to: Supabase Dashboard → Edge Functions
2. Click **"Create Function"** (or edit if exists)
3. Name: `get-config`
4. Copy code from: `supabase/functions/get-config/index.ts`
5. Click **"Deploy"**

**Or using CLI:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy get-config
```

### Step 3: Set Secrets

1. Go to: Supabase Dashboard → Settings → Edge Functions → **Secrets**
2. Add these secrets:

   ```
   GUEST_SHEET_ID = your_google_sheet_id
   UPLOAD_FOLDER_ID = your_upload_folder_id
   GALLERY_FOLDER_ID = your_gallery_folder_id
   ```

**To get Google Drive Folder IDs:**
- Open the folder in Google Drive
- Copy the ID from URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

**To get Google Sheet ID:**
- Open the sheet
- Copy the ID from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 5: Verify

1. Open browser console (F12)
2. Should NOT see "Error fetching config"
3. Gallery section should work
4. Upload section should work

## Still Not Working?

Run diagnostic:
```bash
node scripts/check-config.js
```

This will show exactly what's missing.

## Common Issues

**401 Error:**
- Check `.env` file has correct Supabase URL and key
- Restart dev server after changing `.env`

**404 Error:**
- `get-config` function not deployed
- Deploy it using steps above

**Gallery still shows error:**
- Check `GALLERY_FOLDER_ID` secret is set
- Verify folder exists in Google Drive
- Deploy `get-gallery` function: `supabase functions deploy get-gallery`

**Upload still not working:**
- Check `UPLOAD_FOLDER_ID` secret is set
- Verify folder exists in Google Drive
- Deploy `upload-photo` function: `supabase functions deploy upload-photo`

