import puppeteer from 'puppeteer';

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5173';
const USE_PRODUCTION = process.env.PRODUCTION === 'true';
const PRODUCTION_URL = 'https://fadyandsandra-specialday.github.io/our-special-day/';

async function testMusicErrorsWithScroll() {
  const url = USE_PRODUCTION ? PRODUCTION_URL : WEBSITE_URL;
  console.log('🎵 Starting comprehensive music error test with scrolling...\n');
  console.log(`🌐 Opening website: ${url}\n`);

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security', // Allow cross-origin if needed
    ],
  });

  try {
    const page = await browser.newPage();

    // Capture ALL console messages immediately
    const allConsoleMessages = [];
    const allErrors = [];
    const musicRelatedMessages = [];
    const musicErrors = [];
    
    // Listen to console messages (capture immediately)
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      const timestamp = new Date().toISOString();
      
      allConsoleMessages.push({ timestamp, type, text });
      
      if (type === 'error' || type === 'warning') {
        allErrors.push({ timestamp, type, text });
      }
      
      // Check if it's music-related
      const lowerText = text.toLowerCase();
      if (
        lowerText.includes('audio') || 
        lowerText.includes('music') || 
        lowerText.includes('🎵') ||
        lowerText.includes('loading') ||
        lowerText.includes('error') ||
        lowerText.includes('failed') ||
        lowerText.includes('play') ||
        lowerText.includes('mute') ||
        lowerText.includes('source') ||
        lowerText.includes('format') ||
        lowerText.includes('codec')
      ) {
        musicRelatedMessages.push({ timestamp, type, text });
        if (type === 'error' || type === 'warning') {
          musicErrors.push({ timestamp, type, text });
        }
      }
    });

    // Listen to page errors
    page.on('pageerror', (error) => {
      const timestamp = new Date().toISOString();
      const errorInfo = {
        timestamp,
        message: error.message,
        stack: error.stack,
      };
      allErrors.push({ timestamp, type: 'pageerror', text: error.message });
      musicErrors.push({ timestamp, type: 'pageerror', text: error.message });
      console.error('❌ Page Error:', error.message);
    });

    // Listen to request failures
    const failedRequests = [];
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('music') || url.includes('.mp3') || url.includes('.m4a') || url.includes('.mp4')) {
        failedRequests.push({
          url,
          failureText: request.failure()?.errorText,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    const startTime = Date.now();
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Don't wait for all resources, capture errors faster
      timeout: 30000,
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Page DOM loaded in ${loadTime}ms\n`);

    // Immediately check for errors (before waiting)
    console.log('🔍 Checking for immediate errors (first 100ms)...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (musicErrors.length > 0) {
      console.log(`\n⚠️  Found ${musicErrors.length} music-related errors in first 100ms:`);
      musicErrors.forEach(err => {
        console.log(`   [${err.timestamp}] ${err.type.toUpperCase()}: ${err.text}`);
      });
    }

    // Wait a bit more for audio initialization
    console.log('\n⏳ Waiting 2 seconds for audio initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check audio element state
    console.log('\n🔍 Checking audio element state...');
    const audioState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;

      return {
        exists: true,
        src: audio.src || 'No src',
        currentSrc: audio.currentSrc || 'No currentSrc',
        readyState: audio.readyState,
        networkState: audio.networkState,
        error: audio.error ? {
          code: audio.error.code,
          message: audio.error.message,
        } : null,
        paused: audio.paused,
        muted: audio.muted,
        autoplay: audio.autoplay,
        preload: audio.preload,
        currentTime: audio.currentTime,
        duration: audio.duration,
        sources: Array.from(audio.querySelectorAll('source')).map(src => ({
          src: src.src,
          type: src.type,
        })),
      };
    });

    if (audioState) {
      console.log('📊 Audio Element State:');
      console.log(`   Current Source: ${audioState.currentSrc}`);
      console.log(`   Ready State: ${audioState.readyState}`);
      console.log(`   Network State: ${audioState.networkState}`);
      console.log(`   Paused: ${audioState.paused}`);
      console.log(`   Muted: ${audioState.muted}`);
      console.log(`   Autoplay: ${audioState.autoplay}`);
      
      if (audioState.error) {
        console.log(`\n❌ Audio Error Detected:`);
        console.log(`   Code: ${audioState.error.code}`);
        console.log(`   Message: ${audioState.error.message}`);
      }
      
      if (audioState.sources.length > 0) {
        console.log(`\n   Source Elements:`);
        audioState.sources.forEach((src, i) => {
          console.log(`     ${i + 1}. ${src.src}`);
          console.log(`        Type: ${src.type}`);
        });
      }
    } else {
      console.log('⚠️  No audio element found');
    }

    // Now test scrolling
    console.log('\n📜 Testing scrolling behavior...');
    
    // Get page height
    const pageHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
    });
    
    console.log(`   Page height: ${pageHeight}px`);
    
    // Clear previous errors before scrolling
    const errorsBeforeScroll = [...musicErrors];
    
    // Scroll down gradually
    const scrollSteps = 5;
    const scrollAmount = pageHeight / scrollSteps;
    
    for (let i = 1; i <= scrollSteps; i++) {
      const scrollTo = scrollAmount * i;
      console.log(`   Scrolling to ${Math.round(scrollTo)}px (step ${i}/${scrollSteps})...`);
      
      await page.evaluate((y) => {
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, scrollTo);
      
      // Wait a bit after each scroll
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check for new errors after scroll
      const newErrors = musicErrors.slice(errorsBeforeScroll.length);
      if (newErrors.length > 0) {
        console.log(`   ⚠️  ${newErrors.length} new error(s) detected after scroll:`);
        newErrors.forEach(err => {
          console.log(`      [${err.timestamp}] ${err.text}`);
        });
      }
    }
    
    // Scroll back to top
    console.log('\n   Scrolling back to top...');
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Final error check
    console.log('\n📊 Final Error Summary:');
    console.log('='.repeat(60));
    
    if (musicErrors.length > 0) {
      console.log(`\n❌ Total Music-Related Errors: ${musicErrors.length}`);
      console.log('\nAll Music Errors:');
      musicErrors.forEach((err, index) => {
        console.log(`\n${index + 1}. [${err.timestamp}] ${err.type.toUpperCase()}`);
        console.log(`   ${err.text}`);
      });
    } else {
      console.log('\n✅ No music-related errors detected');
    }

    if (failedRequests.length > 0) {
      console.log(`\n❌ Failed Music File Requests: ${failedRequests.length}`);
      failedRequests.forEach((req, index) => {
        console.log(`\n${index + 1}. [${req.timestamp}]`);
        console.log(`   URL: ${req.url}`);
        console.log(`   Error: ${req.failureText || 'Unknown'}`);
      });
    }

    // Show all music-related console messages
    if (musicRelatedMessages.length > 0) {
      console.log(`\n📝 Total Music-Related Console Messages: ${musicRelatedMessages.length}`);
      console.log('\nLast 30 Music-Related Messages:');
      musicRelatedMessages.slice(-30).forEach((msg, index) => {
        const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${msg.timestamp}] ${msg.text}`);
      });
    }

    // Check audio state one more time
    console.log('\n🔍 Final Audio State Check:');
    const finalAudioState = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) return null;
      return {
        error: audio.error ? {
          code: audio.error.code,
          message: audio.error.message,
        } : null,
        paused: audio.paused,
        readyState: audio.readyState,
        networkState: audio.networkState,
      };
    });

    if (finalAudioState) {
      if (finalAudioState.error) {
        console.log(`❌ Final Audio Error: Code ${finalAudioState.error.code} - ${finalAudioState.error.message}`);
      } else {
        console.log(`✅ Audio element is healthy`);
        console.log(`   Ready State: ${finalAudioState.readyState}`);
        console.log(`   Network State: ${finalAudioState.networkState}`);
        console.log(`   Paused: ${finalAudioState.paused}`);
      }
    }

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      url,
      loadTime,
      audioState,
      finalAudioState,
      musicErrors,
      failedRequests,
      musicRelatedMessages: musicRelatedMessages.slice(-50), // Last 50 messages
      totalConsoleMessages: allConsoleMessages.length,
      totalErrors: allErrors.length,
    };

    // Save report to file
    const fs = await import('fs');
    const reportPath = 'music-error-scroll-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Full report saved to: ${reportPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed');
    console.log('='.repeat(60));

    // Keep browser open for a bit to observe
    console.log('\n⏳ Keeping browser open for 3 seconds to observe...');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testMusicErrorsWithScroll().catch(console.error);

