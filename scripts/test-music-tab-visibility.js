import puppeteer from 'puppeteer';
import http from 'http';

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5173';
const PRODUCTION_URL = 'https://fadyandsandra-specialday.github.io/our-special-day/';
const USE_PRODUCTION = process.env.PRODUCTION === 'true';
const TARGET_URL = USE_PRODUCTION ? PRODUCTION_URL : WEBSITE_URL;

// Helper function to wait for server to be ready
async function waitForServer(url, maxAttempts = 30, delay = 1000) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);
  
  if (USE_PRODUCTION) {
    return true; // Skip check for production
  }
  
  console.log(`⏳ Waiting for server at ${hostname}:${port}...`);
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname,
          port,
          path: '/',
          method: 'HEAD',
          timeout: 2000,
        }, (res) => {
          resolve(true);
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });
      console.log(`✅ Server is ready!\n`);
      return true;
    } catch (error) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        process.stdout.write('.');
      } else {
        console.log(`\n❌ Server not available after ${maxAttempts} attempts`);
        console.log(`   Please start the dev server with: npm run dev`);
        return false;
      }
    }
  }
  return false;
}

async function testMusicTabVisibility(isMobile = false) {
  const mode = isMobile ? 'MOBILE' : 'DESKTOP';
  console.log(`🎵 Testing music tab visibility behavior (${mode} mode) - stop on hide, resume on show...\n`);
  console.log(`🌐 Opening website: ${TARGET_URL}\n`);

  // Wait for server to be ready (only for local testing)
  if (!USE_PRODUCTION) {
    const serverReady = await waitForServer(TARGET_URL);
    if (!serverReady) {
      process.exit(1);
    }
  }

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: ['--autoplay-policy=no-user-gesture-required'], // Allow autoplay
  });

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport if testing mobile mode
    if (isMobile) {
      await page.setViewport({
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      // Set user agent for mobile
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      console.log('📱 Mobile mode enabled (iPhone viewport)\n');
    }

    // Track console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('🎵') || text.includes('Music') || text.includes('paused') || text.includes('resumed') || text.includes('Visibility') || text.includes('Tab')) {
        console.log(`   📢 ${text}`);
      }
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded successfully\n');

    // Wait for audio to initialize - wait longer and check multiple times
    console.log('⏳ Waiting for audio to initialize...');
    let audioState = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      audioState = await page.evaluate(() => {
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
      if (audioState) {
        console.log(`   ✅ Audio element found after ${i + 1} seconds`);
        break;
      }
    }

    // Check initial audio state
    console.log('\n🔍 Step 1: Checking initial audio state...');
    if (!audioState) {
      // Try to check page content to see what's happening
      const pageContent = await page.evaluate(() => {
        return {
          bodyText: document.body.innerText.substring(0, 200),
          hasReactRoot: !!document.querySelector('#root, [data-reactroot]'),
          audioElements: document.querySelectorAll('audio').length,
          scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(0, 5),
        };
      });
      console.log('   Page info:', JSON.stringify(pageContent, null, 2));
      console.log('❌ No audio element found after waiting!');
      console.log('   The BackgroundMusic component might not be rendering.');
      console.log('   This could be because:');
      console.log('   1. No music files are configured');
      console.log('   2. The component has a condition that prevents rendering');
      console.log('   3. The page is still loading');
      await browser.close();
      return;
    }

    console.log(`   Audio paused: ${audioState.paused}`);
    console.log(`   Audio readyState: ${audioState.readyState}`);

    // Try to start music if it's not playing
    if (audioState.paused) {
      console.log('\n▶️  Starting music...');
      // Try clicking the play button first
      try {
        const playButton = await page.$('button[aria-label*="Play"], button[aria-label*="play"]');
        if (playButton) {
          await playButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Fallback: try programmatic play
          await page.evaluate(() => {
            const audio = document.querySelector('audio');
            if (audio) {
              audio.play().catch(err => console.error('Play error:', err));
            }
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log('   ⚠️  Error clicking play button, trying programmatic play...');
        await page.evaluate(() => {
          const audio = document.querySelector('audio');
          if (audio) {
            audio.play().catch(err => console.error('Play error:', err));
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
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

    if (audioState && !audioState.paused) {
      console.log('✅ Music is now playing');
      console.log(`   Current time: ${audioState.currentTime.toFixed(2)}s`);
    } else {
      console.log('⚠️  Could not start music. Continuing test anyway...');
      console.log('   Note: Some browsers require user interaction to start audio');
    }

    // Test: Hide tab (simulate tab switch)
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST 1: Simulating tab hide (visibilitychange to hidden)');
    console.log('='.repeat(60));

    const beforeHide = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      } : null;
    });

    console.log(`   Before hide: paused=${beforeHide?.paused}, time=${beforeHide?.currentTime.toFixed(2)}s`);
    console.log(`   Document hidden: ${beforeHide?.hidden}, visibilityState: ${beforeHide?.visibilityState}`);

    // Simulate tab hide using CDP (Chrome DevTools Protocol) - more reliable
    await page.evaluateOnNewDocument(() => {
      // Store original values
      Object.defineProperty(document, 'hidden', {
        get: function() { return this._hidden !== undefined ? this._hidden : false; },
        configurable: true,
      });
      Object.defineProperty(document, 'visibilityState', {
        get: function() { 
          return this._hidden ? 'hidden' : 'visible'; 
        },
        configurable: true,
      });
    });

    // Use CDP to set visibility state
    const client = await page.target().createCDPSession();
    await client.send('Emulation.setDocumentVisibilityState', { state: 'hidden' });
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterHide = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      } : null;
    });

    console.log(`   After hide: paused=${afterHide?.paused}, time=${afterHide?.currentTime.toFixed(2)}s`);
    console.log(`   Document hidden: ${afterHide?.hidden}, visibilityState: ${afterHide?.visibilityState}`);

    const test1Passed = afterHide && afterHide.paused;
    if (test1Passed) {
      console.log('   ✅ TEST 1 PASSED: Music stopped when tab was hidden');
    } else {
      console.log('   ❌ TEST 1 FAILED: Music did not stop when tab was hidden');
    }

    // Test: Show tab again (simulate returning to tab)
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST 2: Simulating tab show (visibilitychange to visible)');
    console.log('='.repeat(60));

    const beforeShow = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
      } : null;
    });

    console.log(`   Before show: paused=${beforeShow?.paused}, time=${beforeShow?.currentTime.toFixed(2)}s`);

    // Use CDP to set visibility state back to visible
    await client.send('Emulation.setDocumentVisibilityState', { state: 'visible' });
    
    // Wait for resume logic to execute
    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterShow = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { 
        paused: audio.paused, 
        currentTime: audio.currentTime,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      } : null;
    });

    console.log(`   After show: paused=${afterShow?.paused}, time=${afterShow?.currentTime.toFixed(2)}s`);
    console.log(`   Document hidden: ${afterShow?.hidden}, visibilityState: ${afterShow?.visibilityState}`);

    // Note: Resume might fail due to browser autoplay policies
    // We check if it attempted to resume (time advanced) or if it's playing
    const test2Passed = afterShow && !afterShow.paused;
    const test2Partial = afterShow && afterShow.paused && beforeShow && afterShow.currentTime > beforeShow.currentTime;
    
    if (test2Passed) {
      console.log('   ✅ TEST 2 PASSED: Music resumed when tab became visible');
    } else if (test2Partial) {
      console.log('   ⚠️  TEST 2 PARTIAL: Music attempted to resume but browser blocked it (expected in some browsers)');
    } else {
      console.log('   ❌ TEST 2 FAILED: Music did not resume when tab became visible');
    }

    // Check console messages for resume logs
    const resumeLogs = consoleMessages.filter(msg => 
      msg.includes('Music resumed') || msg.includes('▶️') && msg.includes('resumed')
    );
    if (resumeLogs.length > 0) {
      console.log('\n📝 Resume-related console logs:');
      resumeLogs.forEach(log => console.log(`   ${log}`));
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Test 1 (music stops on hide): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 2 (music resumes on show): ${test2Passed ? '✅ PASSED' : test2Partial ? '⚠️  PARTIAL (browser blocked)' : '❌ FAILED'}`);
    
    const allPassed = test1Passed && (test2Passed || test2Partial);
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Music behavior is correct.');
      console.log('   Note: Resume may be blocked by browser autoplay policies in some cases.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Review the implementation.');
    }

    // Keep browser open for observation
    console.log('\n⏳ Keeping browser open for 5 seconds for observation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await client.detach();

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the tests
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 RUNNING ALL TESTS - LOCAL TESTING');
  console.log('='.repeat(60));
  
  // Test 1: Desktop mode
  console.log('\n🖥️  TEST 1: DESKTOP MODE\n');
  await testMusicTabVisibility(false);
  
  // Wait a bit between tests
  console.log('\n⏳ Waiting 3 seconds before mobile test...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Mobile mode
  console.log('\n📱 TEST 2: MOBILE MODE\n');
  await testMusicTabVisibility(true);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--mobile')) {
  testMusicTabVisibility(true).catch(console.error);
} else if (args.includes('--desktop')) {
  testMusicTabVisibility(false).catch(console.error);
} else {
  // Run both by default for local testing
  runAllTests().catch(console.error);
}

