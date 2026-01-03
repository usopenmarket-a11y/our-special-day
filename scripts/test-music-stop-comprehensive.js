import puppeteer from 'puppeteer';

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:8081';

async function testMusicStopComprehensive() {
  console.log('🎵 Comprehensive Music Stop Test\n');
  console.log(`🌐 Testing: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();

    // Track all console messages
    const consoleMessages = [];
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push({ type, text, timestamp: new Date().toISOString() });
      
      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Navigate to website
    console.log('📱 Navigating to website...');
    await page.goto(WEBSITE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded\n');

    // Wait for audio to initialize
    console.log('⏳ Waiting for audio to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check initial state
    console.log('\n🔍 Step 1: Checking initial audio state...');
    let audioState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;
      return {
        exists: true,
        paused: audio.paused,
        currentTime: audio.currentTime,
        volume: audio.volume,
        readyState: audio.readyState,
        src: audio.src || audio.currentSrc,
      };
    });

    if (!audioState) {
      console.log('❌ No audio element found!');
      await browser.close();
      return;
    }

    console.log(`   Audio exists: ${audioState.exists}`);
    console.log(`   Paused: ${audioState.paused}`);
    console.log(`   Ready state: ${audioState.readyState}`);
    console.log(`   Current time: ${audioState.currentTime.toFixed(2)}s`);

    // Start music if not playing
    if (audioState.paused) {
      console.log('\n▶️  Starting music...');
      const playButton = await page.$('button[aria-label*="Play"], button[aria-label*="play"]');
      if (playButton) {
        await playButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Try programmatic play
        await page.evaluate(() => {
          const audio = document.querySelector('audio');
          if (audio) audio.play().catch(console.error);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Verify music is playing
    audioState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    if (!audioState || audioState.paused) {
      console.log('⚠️  Music is not playing. Continuing test anyway...');
    } else {
      console.log(`✅ Music is playing (time: ${audioState.currentTime.toFixed(2)}s)`);
    }

    // Test 1: Visibility Change (Tab Switch)
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST 1: Tab Switch (visibilitychange)');
    console.log('='.repeat(70));

    const beforeVisibility = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    console.log(`   Before: paused=${beforeVisibility?.paused}, time=${beforeVisibility?.currentTime.toFixed(2)}s`);

    // Simulate visibility change
    await page.evaluate(() => {
      // Override document.hidden
      let hiddenValue = true;
      Object.defineProperty(document, 'hidden', {
        get: () => hiddenValue,
        configurable: true,
      });
      Object.defineProperty(document, 'visibilityState', {
        get: () => hiddenValue ? 'hidden' : 'visible',
        configurable: true,
      });
      
      // Dispatch event
      const event = new Event('visibilitychange', { bubbles: true });
      document.dispatchEvent(event);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterVisibility = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        volume: audio.volume,
      } : null;
    });

    console.log(`   After: paused=${afterVisibility?.paused}, time=${afterVisibility?.currentTime.toFixed(2)}s, volume=${afterVisibility?.volume}`);

    // Check console for pause message
    const visibilityPauseLogs = consoleMessages.filter(msg => 
      msg.text.includes('Music paused - tab switched') || 
      msg.text.includes('Music paused - tab') ||
      msg.text.includes('⏸️ Music paused')
    );

    if (visibilityPauseLogs.length > 0) {
      console.log(`   ✅ Found pause log: ${visibilityPauseLogs[0].text}`);
    } else {
      console.log('   ⚠️  No pause log found in console');
    }

    const test1Passed = afterVisibility && afterVisibility.paused;
    console.log(`   Result: ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Reset visibility
    await page.evaluate(() => {
      let hiddenValue = false;
      Object.defineProperty(document, 'hidden', {
        get: () => hiddenValue,
        configurable: true,
      });
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true,
      });
      const event = new Event('visibilitychange', { bubbles: true });
      document.dispatchEvent(event);
    });

    // Test 2: Page Hide (Mobile)
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST 2: Page Hide (pagehide - Mobile)');
    console.log('='.repeat(70));

    // Restart music
    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (audio) audio.play().catch(console.error);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const beforePageHide = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    console.log(`   Before: paused=${beforePageHide?.paused}, time=${beforePageHide?.currentTime.toFixed(2)}s`);

    // Simulate pagehide
    await page.evaluate(() => {
      const event = new Event('pagehide', { bubbles: true });
      Object.defineProperty(event, 'persisted', { value: false, writable: false });
      window.dispatchEvent(event);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterPageHide = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        volume: audio.volume,
      } : null;
    });

    console.log(`   After: paused=${afterPageHide?.paused}, time=${afterPageHide?.currentTime.toFixed(2)}s, volume=${afterPageHide?.volume}`);

    const pageHideLogs = consoleMessages.filter(msg => 
      msg.text.includes('Music paused - page hiding') ||
      msg.text.includes('pagehide') ||
      (msg.text.includes('⏸️') && msg.text.includes('page'))
    );

    if (pageHideLogs.length > 0) {
      console.log(`   ✅ Found pause log: ${pageHideLogs[pageHideLogs.length - 1].text}`);
    }

    const test2Passed = afterPageHide && afterPageHide.paused;
    console.log(`   Result: ${test2Passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Test 3: Before Unload
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST 3: Before Unload (browser close)');
    console.log('='.repeat(70));

    // Restart music
    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (audio) audio.play().catch(console.error);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const beforeUnload = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    console.log(`   Before: paused=${beforeUnload?.paused}, time=${beforeUnload?.currentTime.toFixed(2)}s`);

    // Simulate beforeunload
    await page.evaluate(() => {
      const event = new Event('beforeunload', { bubbles: true, cancelable: true });
      window.dispatchEvent(event);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterUnload = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        volume: audio.volume,
      } : null;
    });

    console.log(`   After: paused=${afterUnload?.paused}, time=${afterUnload?.currentTime.toFixed(2)}s, volume=${afterUnload?.volume}`);

    const beforeUnloadLogs = consoleMessages.filter(msg => 
      msg.text.includes('Music paused - browser closing') ||
      msg.text.includes('beforeunload')
    );

    if (beforeUnloadLogs.length > 0) {
      console.log(`   ✅ Found pause log: ${beforeUnloadLogs[beforeUnloadLogs.length - 1].text}`);
    }

    const test3Passed = afterUnload && afterUnload.paused;
    console.log(`   Result: ${test3Passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Check for event listener registration
    console.log('\n' + '='.repeat(70));
    console.log('🔍 Checking Event Listener Registration');
    console.log('='.repeat(70));

    const registrationLogs = consoleMessages.filter(msg => 
      msg.text.includes('Registering visibility change listeners') ||
      msg.text.includes('All event listeners registered') ||
      msg.text.includes('Suspend listener added')
    );

    if (registrationLogs.length > 0) {
      console.log('   ✅ Event listeners registered:');
      registrationLogs.forEach(log => {
        console.log(`      - ${log.text}`);
      });
    } else {
      console.log('   ⚠️  No registration logs found');
    }

    // Check for visibility change detection
    const visibilityLogs = consoleMessages.filter(msg => 
      msg.text.includes('Visibility change detected') ||
      msg.text.includes('Tab hidden') ||
      msg.text.includes('Tab visible')
    );

    if (visibilityLogs.length > 0) {
      console.log('\n   ✅ Visibility change events detected:');
      visibilityLogs.forEach(log => {
        console.log(`      - ${log.text}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Test 1 (visibilitychange): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 2 (pagehide): ${test2Passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 3 (beforeunload): ${test3Passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = test1Passed && test2Passed && test3Passed;
    
    // Console messages summary
    console.log('\n📝 Console Messages Summary:');
    console.log(`   Total messages: ${consoleMessages.length}`);
    console.log(`   Errors: ${consoleErrors.length}`);
    console.log(`   Warnings: ${consoleWarnings.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Errors found:');
      consoleErrors.forEach((err, idx) => {
        if (typeof err === 'string') {
          console.log(`   ${idx + 1}. ${err}`);
        } else {
          console.log(`   ${idx + 1}. [Error object - check details]`);
        }
      });
    }
    
    // Get detailed error information
    const detailedErrors = await page.evaluate(() => {
      const errors = [];
      // Check for any unhandled errors
      return errors;
    });
    
    // Show relevant music-related logs
    const musicLogs = consoleMessages.filter(msg => 
      msg.text.includes('🎵') || 
      msg.text.includes('Music') || 
      msg.text.includes('Audio') ||
      msg.text.includes('⏸️') ||
      msg.text.includes('▶️')
    );

    if (musicLogs.length > 0) {
      console.log('\n🎵 Music-related console logs (last 10):');
      musicLogs.slice(-10).forEach(log => {
        console.log(`   [${log.type}] ${log.text}`);
      });
    }

    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Music stops correctly.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Review the implementation.');
      console.log('\n💡 Debugging tips:');
      console.log('   - Check if event listeners are being registered');
      console.log('   - Verify visibilitychange event is firing');
      console.log('   - Check browser console for errors');
    }

    // Keep browser open for observation
    console.log('\n⏳ Keeping browser open for 3 seconds for observation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testMusicStopComprehensive().catch(console.error);

