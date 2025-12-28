# ✅ Upload Folder Verified

## Upload Folder Configuration

**Folder ID:** `1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL`  
**Folder URL:** https://drive.google.com/drive/u/1/folders/1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL

## Status

✅ **Upload folder ID is set in Supabase secrets**  
✅ **get-config function returns the correct folder ID**  
✅ **Photo upload component is configured to use this folder**

## How It Works

1. **User uploads photo** → PhotoUploadSection component
2. **Component gets folder ID** → From ConfigContext (fetched from get-config)
3. **Photo sent to** → `upload-photo` Edge Function
4. **Function uploads to** → Google Drive folder `1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL`

## Important: Folder Permissions

For uploads to work, the Google Drive folder must be:

1. **Shared with Service Account:**
   - Service Account Email: Check your `GOOGLE_SERVICE_ACCOUNT` secret in Supabase
   - The folder must be shared with "Editor" or "Viewer" permissions (Editor recommended)

2. **To verify sharing:**
   - Open: https://drive.google.com/drive/u/1/folders/1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL
   - Click "Share" button
   - Add the service account email with "Editor" access

## Testing Upload

After restarting the dev server:

1. Go to: http://localhost:8080/our-special-day/#upload
2. Drag & drop an image or click to browse
3. Click "Upload All"
4. Image should upload to the folder

## Current Configuration Summary

- ✅ **Gallery Folder:** `1l4IlQOJ5z7tA-Nn3_T3zsJHVAzPRrE2D` (14 images)
- ✅ **Upload Folder:** `1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL` (for user uploads)
- ✅ **Guest Sheet:** `13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs` (RSVP)

All folders are configured and ready! 🎉

