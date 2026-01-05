# Testing Music Tab Visibility Locally

## Quick Start

1. **Start the dev server** (in one terminal):
   ```bash
   npm run dev
   ```

2. **Wait for the server to start** (you should see "Local: http://localhost:5173")

3. **Run the tests** (in another terminal):
   ```bash
   # Test desktop mode only
   npm run test-music-tab-visibility -- --desktop
   
   # Test mobile mode only
   npm run test-music-tab-visibility -- --mobile
   
   # Test both modes (default)
   npm run test-music-tab-visibility
   ```

## What the Tests Do

The test script will:
1. Open the website in a browser
2. Wait for audio to initialize
3. Start playing music (if not already playing)
4. **Test 1**: Simulate tab hide → Music should STOP
5. **Test 2**: Simulate tab show → Music should RESUME

## Expected Behavior

- ✅ When you switch to another tab → Music pauses
- ✅ When you return to the tab → Music resumes (if it was playing before)

## Manual Testing

You can also test manually:

1. Open http://localhost:5173 in your browser
2. Start the music (click the play button)
3. Switch to another tab (Ctrl+Tab or click another tab)
4. Check: Music should stop playing
5. Switch back to the wedding website tab
6. Check: Music should resume playing

### Mobile Testing

To test mobile behavior:
1. Open Chrome DevTools (F12)
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Select a mobile device (e.g., iPhone 12)
4. Follow the same steps as above


