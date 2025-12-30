# Upload Error Fix - Stack Overflow Issue

## Critical Error Found

**Error:** `Maximum call stack size exceeded`  
**Status Code:** 500  
**Location:** `supabase/functions/upload-photo/index.ts` - Base64 encoding

## Root Cause

The base64 encoding was using the spread operator (`String.fromCharCode(...fileBuffer)`) which causes a stack overflow even for moderately sized files (500KB+). The spread operator tries to pass all array elements as function arguments, exceeding JavaScript's call stack limit.

## Fix Applied

✅ **Changed base64 encoding to always use chunked processing:**
- Process files in 16KB chunks
- Use `Array.from()` + `map()` instead of spread operator
- Build binary string incrementally
- More memory-efficient approach

## Code Changes

**Before (caused stack overflow):**
```typescript
base64Data = btoa(String.fromCharCode(...fileBuffer));
```

**After (chunked encoding):**
```typescript
const chunkSize = 16384; // 16KB chunks
let binaryString = '';

for (let i = 0; i < fileBuffer.length; i += chunkSize) {
  const chunk = fileBuffer.slice(i, Math.min(i + chunkSize, fileBuffer.length));
  const chunkArray = Array.from(chunk);
  const chunkString = chunkArray.map(byte => String.fromCharCode(byte)).join('');
  binaryString += chunkString;
}

base64Data = btoa(binaryString);
```

## Next Steps

1. **Deploy the updated Edge Function:**
   ```bash
   supabase functions deploy upload-photo
   ```

2. **Test the upload again:**
   - The upload should now work without stack overflow errors
   - Files should successfully upload to Google Drive

3. **Verify in Google Drive:**
   - Check your upload folder in Google Drive
   - Files should appear with public permissions

## Test Results

- ✅ File validation working (size limits, file types)
- ✅ Frontend error handling improved
- ❌ Backend base64 encoding: **FIXED** (was causing stack overflow)
- ⏳ **Needs deployment** to test actual uploads

## Additional Improvements Made

1. Enhanced error message extraction from Supabase responses
2. Better logging for debugging upload issues
3. Improved error messages with specific context
4. Chunked base64 encoding for all file sizes


