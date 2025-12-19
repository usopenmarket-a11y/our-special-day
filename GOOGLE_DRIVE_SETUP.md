# Google Drive Storage Setup Guide

This guide will walk you through setting up Google Drive storage for your photo upload feature using Google Cloud Service Account and APIs.

## Prerequisites

- A Google account
- Access to Google Cloud Console (https://console.cloud.google.com)
- A Supabase project (already configured in this project)

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter a project name (e.g., "Wedding Photo Upload")
5. Click **"Create"**
6. Wait for the project to be created, then select it from the dropdown

---

## Step 2: Enable Google Drive API

1. In your Google Cloud project, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google Drive API"**
3. Click on **"Google Drive API"** from the results
4. Click **"Enable"**
5. Wait for the API to be enabled (this may take a minute)

---

## Step 3: Create a Service Account

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"Service account"**
4. Fill in the details:
   - **Service account name**: `wedding-photo-upload` (or any name you prefer)
   - **Service account ID**: Will auto-generate (you can change it)
   - **Description**: "Service account for wedding photo uploads"
5. Click **"CREATE AND CONTINUE"**
6. Skip the optional steps (Grant access, Grant users access) and click **"DONE"**

---

## Step 4: Create and Download Service Account Key

1. In the **"Credentials"** page, find your newly created service account
2. Click on the service account email (it will look like `wedding-photo-upload@your-project-id.iam.gserviceaccount.com`)
3. Go to the **"Keys"** tab
4. Click **"ADD KEY"** > **"Create new key"**
5. Select **"JSON"** format
6. Click **"CREATE"**
7. A JSON file will be downloaded automatically - **SAVE THIS FILE SECURELY** (you'll need it in Step 6)

**⚠️ IMPORTANT**: This JSON file contains sensitive credentials. Never commit it to version control or share it publicly.

The JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "wedding-photo-upload@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## Step 5: Create a Google Drive Folder and Share with Service Account

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder (or use an existing one) where you want photos to be uploaded
   - Example: "Wedding Photos 2026"
3. Right-click on the folder and select **"Share"**
4. In the sharing dialog, you need to add your service account email:
   - Get the service account email from the JSON file you downloaded (the `client_email` field)
   - Or find it in Google Cloud Console under **"IAM & Admin"** > **"Service Accounts"**
5. Paste the service account email in the "Add people and groups" field
6. Set the permission to **"Editor"** (so it can upload files)
7. **Uncheck** "Notify people" (service accounts don't have email addresses)
8. Click **"Share"**

**Note**: The service account email looks like: `wedding-photo-upload@your-project-id.iam.gserviceaccount.com`

---

## Step 6: Get the Google Drive Folder ID

1. Open the folder you just shared in Google Drive
2. Look at the URL in your browser
3. The folder ID is the long string after `/folders/` in the URL

Example URL:
```
https://drive.google.com/drive/folders/1dW9zf5S9z4nWJSm8IOKwe64sfvwzkQz1
```

In this case, the folder ID is: `1dW9zf5S9z4nWJSm8IOKwe64sfvwzkQz1`

4. Update the folder ID in your project:
   - Open `src/lib/weddingConfig.ts`
   - Update the `uploadFolderId` value with your folder ID:
   ```typescript
   uploadFolderId: "YOUR_FOLDER_ID_HERE",
   ```

---

## Step 7: Configure Service Account in Supabase

You need to set the service account JSON as an environment variable in Supabase.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **"Project Settings"** (gear icon in the sidebar)
4. Click on **"Edge Functions"** in the left menu
5. Scroll down to **"Secrets"** section
6. Click **"Add new secret"**
7. Set:
   - **Name**: `GOOGLE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire contents of the JSON file you downloaded in Step 4
     - You can paste it as-is (raw JSON)
     - Or encode it as base64 (the code supports both)
8. Click **"Save"**

### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Set the secret (replace with your actual JSON content)
supabase secrets set GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

Or if you want to use base64 encoding:

```bash
# On Windows PowerShell
$json = Get-Content path/to/your/service-account.json -Raw
$base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
supabase secrets set GOOGLE_SERVICE_ACCOUNT=$base64
```

---

## Step 8: Deploy Supabase Edge Functions

If you haven't deployed the Edge Functions yet:

1. Make sure you have Supabase CLI installed:
   
   **Windows (using Scoop - recommended):**
   ```powershell
   # Install Scoop if you don't have it
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   
   # Install Supabase CLI
   scoop install supabase
   ```
   
   **Windows (using Chocolatey):**
   ```powershell
   choco install supabase
   ```
   
   **macOS (using Homebrew):**
   ```bash
   brew install supabase/tap/supabase
   ```
   
   **Linux:**
   ```bash
   # Using npm (not global)
   npx supabase --help
   # Or download binary from: https://github.com/supabase/cli/releases
   ```
   
   **Note:** Installing Supabase CLI globally via `npm install -g supabase` is **not supported**. Use one of the methods above.

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (You can find your project ref in Supabase Dashboard > Settings > General)

4. Deploy the upload-photo function:
   ```bash
   supabase functions deploy upload-photo
   ```

---

## Step 9: Configure Frontend Environment Variables

Make sure your frontend has the correct Supabase credentials:

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add these variables:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   ```

You can find these values in:
- Supabase Dashboard > Settings > API
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = anon/public key

---

## Step 10: Test the Upload Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the photo upload section on your website
3. Try uploading a test image
4. Check your Google Drive folder - the image should appear there!

---

## Troubleshooting

### Error: "Google service account not configured"
- Make sure you've set the `GOOGLE_SERVICE_ACCOUNT` secret in Supabase
- Verify the secret name is exactly `GOOGLE_SERVICE_ACCOUNT` (case-sensitive)
- Redeploy your Edge Function after setting the secret

### Error: "Upload failed: 403" or "Permission denied"
- Verify the service account email has **Editor** access to the Google Drive folder
- Make sure you shared the folder with the service account email (not your personal email)
- Check that Google Drive API is enabled in your Google Cloud project

### Error: "Invalid GOOGLE_SERVICE_ACCOUNT"
- Verify the JSON is valid (you can test it at jsonlint.com)
- Make sure you copied the entire JSON file, including all brackets
- If using base64, ensure it's properly encoded

### Images not appearing in Drive
- Check the folder ID is correct in `weddingConfig.ts`
- Verify the folder is shared with the service account
- Check Supabase Edge Function logs for errors:
  - Supabase Dashboard > Edge Functions > upload-photo > Logs

---

## Security Best Practices

1. **Never commit** the service account JSON file to Git
2. **Never expose** the service account credentials in client-side code
3. **Use environment variables** for all sensitive data
4. **Limit permissions** - only grant the minimum necessary permissions (Editor on the specific folder)
5. **Rotate keys** periodically - create new keys and delete old ones
6. **Monitor usage** - check Google Cloud Console for unusual activity

---

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Google Cloud Console](https://console.cloud.google.com)

---

## Summary Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google Drive API
- [ ] Created Service Account
- [ ] Downloaded Service Account JSON key
- [ ] Created Google Drive folder
- [ ] Shared folder with service account (Editor permission)
- [ ] Got folder ID and updated `weddingConfig.ts`
- [ ] Set `GOOGLE_SERVICE_ACCOUNT` secret in Supabase
- [ ] Deployed Supabase Edge Functions
- [ ] Configured frontend environment variables
- [ ] Tested photo upload feature

Once you complete all these steps, your photo upload feature will be fully functional! 🎉

