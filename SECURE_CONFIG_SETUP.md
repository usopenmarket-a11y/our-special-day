# Secure Configuration Setup Guide

## Overview

To protect your Google Drive folder IDs and Google Sheet IDs from being exposed in your public GitHub repository, these values are now stored securely in Supabase Edge Function secrets and fetched dynamically at runtime.

## Why This Is Important

- **Public Repository**: If your repo is public (required for GitHub Pages free tier), hardcoded IDs would be visible to anyone
- **Security**: Even though folder IDs aren't passwords, they reveal information about your Google Drive structure
- **Best Practice**: Sensitive configuration should never be in version control

## Setup Instructions

### Step 1: Add Secrets to Supabase

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Add the following secrets:

   | Secret Name | Value | Description |
   |------------|-------|-------------|
   | `GUEST_SHEET_ID` | `add your value` | Google Sheet ID for RSVP guest list |
   | `UPLOAD_FOLDER_ID` | `add your value` | Google Drive folder ID for photo uploads |
   | `GALLERY_FOLDER_ID` | `add your value` | Google Drive folder ID for gallery images |

5. Click **Save** for each secret

### Step 2: Deploy the Edge Function

The `get-config` Edge Function needs to be deployed to Supabase:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the get-config function
supabase functions deploy get-config
```

Or use the Supabase Dashboard:
1. Go to **Edge Functions** in the Supabase Dashboard
2. Click **Create Function**
3. Name it `get-config`
4. Copy the code from `supabase/functions/get-config/index.ts`
5. Deploy it

### Step 3: Verify It Works

1. Visit your website
2. Open browser DevTools → Console
3. You should see no errors related to config loading
4. Test the Gallery section - images should load
5. Test the Photo Upload section - uploads should work
6. Test the RSVP section - it should work

### Step 4: Remove Hardcoded IDs from Repository (Optional but Recommended)

The IDs are now removed from `src/lib/weddingConfig.ts`, but you may want to check your Git history and remove them from previous commits if they were exposed.

**Note**: If you need to access previous commits with the IDs, consider:
- Making the repository private (if using GitHub Pages, you'll need GitHub Pro)
- Or accepting that the IDs in old commits are already public

## How It Works

1. **Frontend**: On app load, `ConfigContext` fetches config from Supabase Edge Function `get-config`
2. **Edge Function**: Returns the IDs from Supabase secrets (environment variables)
3. **Components**: Use the fetched IDs instead of hardcoded values
4. **Fallback**: If config fetch fails, components handle it gracefully with error messages

## Troubleshooting

### "Failed to load configuration" Error

- **Check**: Are the secrets set in Supabase Dashboard?
- **Check**: Is the `get-config` Edge Function deployed?
- **Check**: Does your Supabase project allow public access to Edge Functions?
- **Solution**: Set secrets and redeploy the function

### Gallery/Upload Not Working

- **Check**: Are the correct folder IDs in the Supabase secrets?
- **Check**: Are the folders shared with the service account?
- **Solution**: Verify folder IDs and sharing permissions

### RSVP Not Working

- **Check**: Is `GUEST_SHEET_ID` set correctly in Supabase secrets?
- **Check**: Is the sheet shared with the service account?
- **Solution**: Verify sheet ID and sharing permissions

## Alternative: Using GitHub Secrets (For Build-Time Injection)

If you prefer to use GitHub Actions secrets instead (though values will still be in built files):

1. Add secrets to GitHub: Repository → Settings → Secrets and variables → Actions
2. Add: `GUEST_SHEET_ID`, `UPLOAD_FOLDER_ID`, `GALLERY_FOLDER_ID`
3. Update `.github/workflows/deploy.yml` to inject these as environment variables
4. Update `src/lib/weddingConfig.ts` to read from `import.meta.env.VITE_*`

**Note**: This approach still exposes IDs in the built JavaScript files, so it's less secure than the Supabase secrets approach.

## Security Best Practices

✅ **Do:**
- Store IDs in Supabase secrets (recommended)
- Use environment variables for sensitive data
- Keep secrets out of version control
- Use separate secrets for development and production

❌ **Don't:**
- Commit secrets to Git
- Hardcode IDs in source files
- Share secrets in documentation or screenshots
- Use the same secrets for multiple projects

## Support

If you encounter issues:
1. Check Supabase Edge Function logs in the Dashboard
2. Check browser console for error messages
3. Verify all secrets are set correctly
4. Ensure Edge Functions are deployed

