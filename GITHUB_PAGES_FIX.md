# GitHub Pages White Screen Fix

## Issues Fixed

1. **Supabase Client Initialization**: Added error handling for missing environment variables
2. **Error Boundary**: Added React error boundary to catch and display errors gracefully
3. **Global Error Handlers**: Added handlers for uncaught errors and promise rejections

## Required Actions

### 1. Verify GitHub Secrets Are Set

Your GitHub Actions workflow requires these secrets to be set in your repository:

1. Go to your repository: `https://github.com/fadyandsandra-specialday/our-special-day`
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Verify these secrets exist:
   - `VITE_SUPABASE_URL` - Should be: `https://gosvleaijwscbrrnqkkt.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key

4. If secrets are missing:
   - Click **"New repository secret"**
   - Add each secret with the correct name and value
   - Get your Supabase key from: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api

### 2. Trigger a New Deployment

After setting/verifying secrets:

1. Go to **Actions** tab in your repository
2. Click **"Run workflow"** → **"Run workflow"** (if available)
3. Or make a small commit and push to `main` branch to trigger the workflow

### 3. Check Build Logs

1. Go to **Actions** tab
2. Click on the latest workflow run
3. Check the **"Build project"** step
4. Look for any errors related to:
   - Missing environment variables
   - Build failures
   - Asset loading issues

### 4. Verify Deployment

After deployment completes:

1. Visit: https://fadyandsandra-specialday.github.io/our-special-day/
2. Open browser console (F12)
3. Check for any errors:
   - Red errors in console
   - Network tab for failed requests
   - Any error messages displayed on screen

## Common Issues

### White Screen Still Appears

If you still see a white screen:

1. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for red error messages
   - Common errors:
     - `Failed to fetch` - Supabase connection issue
     - `Cannot read property` - JavaScript error
     - `404` errors for assets - Base path issue

2. **Check Network Tab**:
   - Look for failed requests (red)
   - Verify assets are loading from `/our-special-day/` path
   - Check if Supabase requests are failing

3. **Verify Base Path**:
   - The `vite.config.ts` has `base: '/our-special-day/'`
   - This should match your repository name
   - If your repo name is different, update it

### Environment Variables Not Working

If Supabase features don't work:

1. Verify secrets are set correctly in GitHub
2. Check workflow logs to see if env vars are being passed
3. The app will now show warnings in console instead of crashing
4. Some features may not work, but the app should still render

## Testing Locally

To test the build locally:

```bash
# Build the project
npm run build

# Preview the build
npm run preview
```

Visit `http://localhost:4173/our-special-day/` (or the port shown)

## Next Steps

1. ✅ Verify GitHub secrets are set
2. ✅ Trigger new deployment
3. ✅ Check browser console for errors
4. ✅ Test all features (RSVP, Gallery, etc.)

If issues persist, check the browser console and share the error messages.

