import puppeteer from 'puppeteer';

const PORTS = [5173, 8080, 8081, 3000];

async function findServer() {
  for (const port of PORTS) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`http://localhost:${port}`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      if (response.ok) return `http://localhost:${port}`;
    } catch (e) {}
  }
  return null;
}

async function testMobileMusic() {
  console.log('📱 Testing Mobile Music Autoplay on Scroll\n');
  
  const url = await findServer();
  if (!url) {
    console.log('❌ Dev server not found. Run: npm run dev');
    process.exit(1);
  }

  console.log(`✅ Server: ${url}\n`);

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: {
      width: 375,  // iPhone width
      height: 667, // iPhone height
      isMobile: true,
      hasTouch: true,
    }
  });
  const page = await browser.newPage();

  // Set mobile user agent
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');

  try {
    console.log('='.repeat(60));
    console.log('TEST 1: Load Page');
    console.log('-'.repeat(60));
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    console.log('✅ Page loaded');

    // Check if audio element exists
    const audioExists = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return !!audio;
    });
    console.log(`   Audio element exists: ${audioExists ? '✅' : '❌'}`);

    // Check initial audio state
    const initialState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;
      return {
        paused: audio.paused,
        muted: audio.muted,
        readyState: audio.readyState,
        src: audio.src
      };
    });
    console.log(`   Initial state:`, initialState);

    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Simulate Mobile Scroll');
    console.log('-'.repeat(60));

    // Simulate touch start
    await page.touchscreen.tap(200, 300);
    await new Promise(r => setTimeout(r, 100));

    // Simulate scroll by swiping
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await new Promise(r => setTimeout(r, 500));

    // Check if audio started playing after scroll
    const afterScrollState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;
      return {
        paused: audio.paused,
        muted: audio.muted,
        currentTime: audio.currentTime
      };
    });
    console.log(`   After scroll state:`, afterScrollState);
    
    if (afterScrollState && !afterScrollState.paused) {
      console.log('   ✅ Music started playing after scroll!');
    } else {
      console.log('   ❌ Music did not start after scroll');
    }

    // Try more scrolling
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Additional Scroll Actions');
    console.log('-'.repeat(60));

    // Simulate touch move (scrolling)
    await page.evaluate(() => {
      window.scrollTo(0, 1000);
    });
    await new Promise(r => setTimeout(r, 500));

    const finalState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;
      return {
        paused: audio.paused,
        muted: audio.muted,
        currentTime: audio.currentTime,
        volume: audio.volume
      };
    });
    console.log(`   Final state:`, finalState);

    // Check console logs for interaction messages
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Audio') || text.includes('interaction') || text.includes('scroll')) {
        consoleLogs.push(text);
      }
    });

    // Try touch events
    await page.touchscreen.tap(200, 400);
    await new Promise(r => setTimeout(r, 300));

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Audio element: ${audioExists ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Initial paused: ${initialState?.paused ? 'Yes' : 'No'}`);
    console.log(`   After scroll paused: ${afterScrollState?.paused ? 'Yes ❌' : 'No ✅'}`);
    console.log(`   Final paused: ${finalState?.paused ? 'Yes ❌' : 'No ✅'}`);
    
    if (finalState && !finalState.paused) {
      console.log('\n   ✅ SUCCESS: Music is playing after mobile scroll!');
    } else {
      console.log('\n   ❌ FAILED: Music did not start after mobile scroll');
      console.log('   💡 Check browser console for error messages');
    }

    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

testMobileMusic().catch(console.error);

