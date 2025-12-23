# Music File Troubleshooting

## Format Error Issues

If you're seeing "MEDIA_ELEMENT_ERROR: Format error", here are the possible causes:

### 1. Invalid MP3 Files

The files might not be actual MP3 files. Check:

```powershell
# Check file headers (should start with ID3 or MP3 sync)
$bytes = [System.IO.File]::ReadAllBytes("public\music\your-file.mp3")[0..10]
$header = -join ($bytes | ForEach-Object { '{0:X2}' -f $_ })
Write-Output "File header: $header"
```

Valid MP3 headers:
- `494433` - ID3v2 tag (most common)
- `FFFB` or `FFF3` - MP3 frame sync

### 2. Corrupted Files

Try playing the files in:
- Windows Media Player
- VLC Media Player
- Any audio player

If they don't play, the files are corrupted.

### 3. File Encoding Issues

Files with special characters or spaces are now URL-encoded automatically. The script handles:
- Spaces → `%20`
- Accented characters → Proper UTF-8 encoding

### 4. File Path Issues

Make sure:
- Files are in `public/music/` folder
- Files have `.mp3` extension (lowercase)
- Filenames are not too long

---

## Quick Fixes

### Fix 1: Re-download/Re-encode Files

If files are corrupted:
1. Get original source files
2. Re-encode them as MP3 using:
   - Audacity (free)
   - VLC Media Player (convert)
   - Online converter

### Fix 2: Test Files Locally

1. Start dev server: `npm run dev`
2. Open browser console (F12)
3. Try loading file directly:
   ```javascript
   const audio = new Audio('/music/die%20with%20smile.mp3');
   audio.play();
   ```
4. Check for errors in console

### Fix 3: Verify File Format

Use a file format checker or try:
- Right-click file → Properties → Check "Type"
- Should say "MP3 Audio" or similar

---

## Current File Status

The script now automatically:
- ✅ URL-encodes filenames with spaces/special characters
- ✅ Sorts files alphabetically
- ✅ Generates proper paths

If you still get errors, the files themselves might need to be re-encoded or replaced.

