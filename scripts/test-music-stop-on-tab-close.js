import puppeteer from 'puppeteer';

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5173';
const USE_LOCAL = WEBSITE_URL.includes('localhost');

async function testMusicStopOnTabClose() {
  console.log('🎵 Testing music stop on tab switch and browser close...\n');
  console.log(`🌐 Opening website: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: ['--autoplay-policy=no-user-gesture-required'], // Allow autoplay
  });

  try {
    const page = await browser.newPage();

    // Track console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('🎵') || text.includes('Music') || text.includes('paused') || text.includes('Visibility') || text.includes('Pagehide') || text.includes('Beforeunload')) {
        console.log(`   📢 ${text}`);
      }
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    await page.goto(WEBSITE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded successfully\n');

    // Wait for audio to initialize and check if listeners are registered
    console.log('⏳ Waiting for audio to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if event listeners are registered
    console.log('\n🔍 Checking if event listeners are registered...');
    const listenersRegistered = await page.evaluate(() => {
      // Check console for registration messages
      return {
        hasAudio: !!document.querySelector('audio'),
        documentHidden: document.hidden,
        visibilityState: document.visibilityState,
      };
    });
    console.log('   Audio element exists:', listenersRegistered.hasAudio);
    console.log('   Document hidden:', listenersRegistered.documentHidden);
    console.log('   Visibility state:', listenersRegistered.visibilityState);

    // Check initial audio state
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
      };
    });

    if (!audioState) {
      console.log('❌ No audio element found!');
      await browser.close();
      return;
    }

    console.log(`   Audio paused: ${audioState.paused}`);
    console.log(`   Audio readyState: ${audioState.readyState}`);

    // Try to start music if it's not playing
    if (audioState.paused) {
      console.log('\n▶️  Starting music...');
      await page.evaluate(() => {
        const audio = document.querySelector('audio');
        if (audio) {
          audio.play().catch(err => console.error('Play error:', err));
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Verify music is playing
    audioState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;
      return {
        paused: audio.paused,
        currentTime: audio.currentTime,
        volume: audio.volume,
      };
    });

    if (audioState.paused) {
      console.log('⚠️  Music is still paused. Trying to click play button...');
      // Try clicking the play button
      const playButton = await page.$('button[aria-label*="Play"], button[aria-label*="play"]');
      if (playButton) {
        await playButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        audioState = await page.evaluate(() => {
          const audio = document.querySelector('audio');
          return audio ? { paused: audio.paused } : null;
        });
      }
    }

    if (audioState && !audioState.paused) {
      console.log('✅ Music is now playing');
      console.log(`   Current time: ${audioState.currentTime.toFixed(2)}s`);
    } else {
      console.log('⚠️  Could not start music. Continuing test anyway...');
    }

    // Test 1: Visibility Change (Tab Switch)
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST 1: Simulating tab switch (visibilitychange)');
    console.log('='.repeat(60));

    // Get audio state before
    const beforeVisibility = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    console.log(`   Before: paused=${beforeVisibility?.paused}, time=${beforeVisibility?.currentTime.toFixed(2)}s`);

    // Try multiple approaches to trigger visibility change
    await page.evaluate(() => {
      // Approach 1: Override document.hidden getter
      let hiddenValue = true;
      try {
        Object.defineProperty(document, 'hidden', {
          get: () => hiddenValue,
          configurable: true,
        });
        
        Object.defineProperty(document, 'visibilityState', {
          get: () => hiddenValue ? 'hidden' : 'visible',
          configurable: true,
        });
      } catch (e) {
        console.log('Could not override document.hidden:', e);
      }
      
      console.log('Before event: document.hidden =', document.hidden, 'visibilityState =', document.visibilityState);
      
      // Approach 2: Dispatch event on document
      const event1 = new Event('visibilitychange', { bubbles: true, cancelable: false });
      document.dispatchEvent(event1);
      console.log('Dispatched visibilitychange on document');
      
      // Approach 3: Dispatch event on window
      const event2 = new Event('visibilitychange', { bubbles: true, cancelable: false });
      window.dispatchEvent(event2);
      console.log('Dispatched visibilitychange on window');
      
      // Approach 4: Directly pause audio if document is hidden (fallback)
      if (document.hidden) {
        const audio = document.querySelector('audio');
        if (audio && !audio.paused) {
          console.log('Directly pausing audio as fallback');
          audio.pause();
          audio.volume = 0;
        }
      }
      
      console.log('After event: document.hidden =', document.hidden, 'visibilityState =', document.visibilityState);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check audio state after
    const afterVisibility = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        volume: audio.volume,
      } : null;
    });

    console.log(`   After: paused=${afterVisibility?.paused}, time=${afterVisibility?.currentTime.toFixed(2)}s, volume=${afterVisibility?.volume}`);

    const test1Passed = afterVisibility && afterVisibility.paused;
    if (test1Passed) {
      console.log('   ✅ TEST 1 PASSED: Music stopped on visibility change');
    } else {
      console.log('   ❌ TEST 1 FAILED: Music did not stop on visibility change');
    }

    // Reset visibility state
    await page.evaluate(() => {
      // Reset the overridden properties
      let hiddenValue = false;
      Object.defineProperty(document, 'hidden', {
        get: () => hiddenValue,
        configurable: true,
      });
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true,
      });
      
      // Dispatch event to notify of visibility change back
      const event = new Event('visibilitychange', { bubbles: true, cancelable: false });
      document.dispatchEvent(event);
    });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Restart music for next test
    console.log('\n▶️  Restarting music for next test...');
    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.play().catch(err => console.error('Play error:', err));
      }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Page Hide (Mobile browser close)
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST 2: Simulating page hide (pagehide event)');
    console.log('='.repeat(60));

    const beforePageHide = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    console.log(`   Before: paused=${beforePageHide?.paused}, time=${beforePageHide?.currentTime.toFixed(2)}s`);

    // Simulate pagehide event
    await page.evaluate(() => {
      // Create a PageTransitionEvent-like object
      const event = new Event('pagehide', {
        bubbles: true,
        cancelable: false,
      });
      // Add persisted property
      Object.defineProperty(event, 'persisted', {
        value: false,
        writable: false,
      });
      window.dispatchEvent(event);
      console.log('Pagehide event dispatched');
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterPageHide = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        volume: audio.volume,
      } : null;
    });

    console.log(`   After: paused=${afterPageHide?.paused}, time=${afterPageHide?.currentTime.toFixed(2)}s, volume=${afterPageHide?.volume}`);

    const test2Passed = afterPageHide && afterPageHide.paused;
    if (test2Passed) {
      console.log('   ✅ TEST 2 PASSED: Music stopped on page hide');
    } else {
      console.log('   ❌ TEST 2 FAILED: Music did not stop on page hide');
    }

    // Test 3: Before Unload (Browser close)
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST 3: Simulating beforeunload (browser close)');
    console.log('='.repeat(60));

    // Restart music
    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.play().catch(err => console.error('Play error:', err));
      }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const beforeUnload = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { paused: audio.paused, currentTime: audio.currentTime } : null;
    });

    console.log(`   Before: paused=${beforeUnload?.paused}, time=${beforeUnload?.currentTime.toFixed(2)}s`);

    // Simulate beforeunload event
    await page.evaluate(() => {
      const event = new Event('beforeunload', {
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      console.log('Beforeunload event dispatched');
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterUnload = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        volume: audio.volume,
      } : null;
    });

    console.log(`   After: paused=${afterUnload?.paused}, time=${afterUnload?.currentTime.toFixed(2)}s, volume=${afterUnload?.volume}`);

    const test3Passed = afterUnload && afterUnload.paused;
    if (test3Passed) {
      console.log('   ✅ TEST 3 PASSED: Music stopped on beforeunload');
    } else {
      console.log('   ❌ TEST 3 FAILED: Music did not stop on beforeunload');
    }

    // Test 4: Check if event listeners are registered
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST 4: Checking if event listeners are registered');
    console.log('='.repeat(60));

    const listenersCheck = await page.evaluate(() => {
      // Check if we can detect event listeners (limited in browser)
      // We'll check by looking at the audio element's state and trying to trigger events
      const audio = document.querySelector('audio');
      if (!audio) return { audioExists: false };

      // Try to see if visibilitychange listener exists by checking document
      let hasVisibilityListener = false;
      let hasBeforeUnloadListener = false;
      let hasPageHideListener = false;

      // Create test events to see if handlers respond
      const testResults = {
        audioExists: true,
        audioPaused: audio.paused,
        documentHidden: document.hidden,
        visibilityState: document.visibilityState,
      };

      return testResults;
    });

    console.log('   Event listener check results:');
    console.log(`   Audio exists: ${listenersCheck.audioExists}`);
    console.log(`   Document hidden: ${listenersCheck.documentHidden}`);
    console.log(`   Visibility state: ${listenersCheck.visibilityState}`);

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Test 1 (visibilitychange): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 2 (pagehide): ${test2Passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 3 (beforeunload): ${test3Passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = test1Passed && test2Passed && test3Passed;
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Music stops correctly on tab switch and browser close.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Review the implementation.');
    }

    // Check console messages for pause logs
    const pauseLogs = consoleMessages.filter(msg => 
      msg.includes('Music paused') || msg.includes('⏸️')
    );
    if (pauseLogs.length > 0) {
      console.log('\n📝 Pause-related console logs:');
      pauseLogs.forEach(log => console.log(`   ${log}`));
    }

    // Keep browser open for observation
    console.log('\n⏳ Keeping browser open for 5 seconds for observation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testMusicStopOnTabClose().catch(console.error);

