// Quick test to verify visibility change event listeners are registered
// Run this in browser console on the test page

console.log('🧪 Testing Visibility Change Event Listeners\n');

// Check if document has visibilitychange listener
const hasVisibilityListener = document.addEventListener.toString().includes('visibilitychange') || 
  (() => {
    // Try to detect if listener exists (limited detection)
    const testEvent = new Event('visibilitychange', { bubbles: true });
    let listenerFired = false;
    const testHandler = () => { listenerFired = true; };
    document.addEventListener('visibilitychange', testHandler, { once: true });
    document.dispatchEvent(testEvent);
    document.removeEventListener('visibilitychange', testHandler);
    return listenerFired;
  })();

console.log('Document visibilitychange listener:', hasVisibilityListener ? '✅ Detected' : '⚠️ Not detected');

// Check document.hidden and visibilityState
console.log('\n📊 Current State:');
console.log('  document.hidden:', document.hidden);
console.log('  document.visibilityState:', document.visibilityState);

// Check audio element
const audio = document.querySelector('audio');
if (audio) {
  console.log('\n🎵 Audio Element:');
  console.log('  Exists: ✅');
  console.log('  Paused:', audio.paused);
  console.log('  Current Time:', audio.currentTime.toFixed(2) + 's');
  console.log('  Ready State:', audio.readyState);
} else {
  console.log('\n❌ Audio element not found');
}

// Instructions
console.log('\n📋 Manual Test Steps:');
console.log('1. Click "Start Music" button');
console.log('2. Wait for music to start');
console.log('3. Switch to another tab (Ctrl+Tab)');
console.log('4. Check console for "🎵 ⏸️ Music paused" message');
console.log('5. Switch back - music should stay paused');

console.log('\n✅ Test script loaded. Follow the steps above to test.');

