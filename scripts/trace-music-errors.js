import puppeteer from 'puppeteer';
import http from 'http';

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:8080';
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

async function traceMusicErrors() {
  console.log('🔍 Tracing music-related errors on the website...\n');
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
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();

    // Track all console messages
    const consoleMessages = [];
    const errors = [];
    const warnings = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      const location = msg.location();
      
      const logEntry = {
        type,
        text,
        location: location ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : 'unknown',
        timestamp: new Date().toISOString(),
      };
      
      consoleMessages.push(logEntry);
      
      if (type === 'error') {
        errors.push(logEntry);
        console.log(`\n❌ ERROR: ${text}`);
        if (location) {
          console.log(`   📍 ${location.url}:${location.lineNumber}:${location.columnNumber}`);
        }
      } else if (type === 'warning') {
        warnings.push(logEntry);
        console.log(`⚠️  WARNING: ${text}`);
      }
    });

    // Track page errors
    page.on('pageerror', (error) => {
      const errorEntry = {
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };
      errors.push(errorEntry);
      console.log(`\n💥 PAGE ERROR: ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n   ')}`);
      }
    });

    // Track request failures
    const failedRequests = [];
    page.on('requestfailed', (request) => {
      const failure = {
        url: request.url(),
        method: request.method(),
        failureText: request.failure()?.errorText,
        timestamp: new Date().toISOString(),
      };
      failedRequests.push(failure);
      console.log(`\n🚫 REQUEST FAILED: ${request.method()} ${request.url()}`);
      if (request.failure()?.errorText) {
        console.log(`   Error: ${request.failure().errorText}`);
      }
    });

    // Track response errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        const errorResponse = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString(),
        };
        console.log(`\n⚠️  HTTP ERROR: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded\n');

    // Wait a bit to catch any initial errors
    console.log('⏳ Waiting 3 seconds to catch initial errors...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for audio element and related errors
    console.log('🔍 Checking audio element...');
    const audioInfo = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (!audio) {
        return { exists: false };
      }

      const sources = Array.from(audio.querySelectorAll('source')).map(source => ({
        src: source.getAttribute('src'),
        type: source.getAttribute('type'),
      }));

      return {
        exists: true,
        paused: audio.paused,
        muted: audio.muted,
        volume: audio.volume,
        readyState: audio.readyState,
        error: audio.error ? {
          code: audio.error.code,
          message: audio.error.message,
        } : null,
        currentSrc: audio.currentSrc,
        sources,
      };
    });

    console.log('📊 Audio Element Info:');
    console.log(JSON.stringify(audioInfo, null, 2));

    // Check for React errors
    console.log('\n🔍 Checking for React errors...');
    const reactErrors = await page.evaluate(() => {
      // Check for React error boundaries
      const errorBoundaries = Array.from(document.querySelectorAll('[data-error-boundary]'));
      return {
        errorBoundariesFound: errorBoundaries.length,
        errors: Array.from(document.querySelectorAll('[data-error]')).map(el => ({
          message: el.textContent,
          element: el.tagName,
        })),
      };
    });

    if (reactErrors.errorBoundariesFound > 0 || reactErrors.errors.length > 0) {
      console.log('⚠️  React errors detected:');
      console.log(JSON.stringify(reactErrors, null, 2));
    }

    // Check console for music-related errors
    console.log('\n🎵 Music-related console messages:');
    const musicRelated = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('music') ||
      msg.text.toLowerCase().includes('audio') ||
      msg.text.toLowerCase().includes('play') ||
      msg.text.toLowerCase().includes('error') ||
      msg.text.toLowerCase().includes('🎵') ||
      msg.text.toLowerCase().includes('failed') ||
      msg.text.toLowerCase().includes('cannot')
    );

    if (musicRelated.length > 0) {
      musicRelated.forEach(msg => {
        console.log(`   [${msg.type.toUpperCase()}] ${msg.text}`);
        if (msg.location !== 'unknown') {
          console.log(`      📍 ${msg.location}`);
        }
      });
    } else {
      console.log('   (No music-related messages found)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ERROR SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);
    console.log(`Failed Requests: ${failedRequests.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.type || 'error'}:`);
        console.log(`   Message: ${error.message || error.text}`);
        if (error.location && error.location !== 'unknown') {
          console.log(`   Location: ${error.location}`);
        }
        if (error.stack) {
          console.log(`   Stack (first 3 lines):`);
          error.stack.split('\n').slice(0, 3).forEach(line => {
            console.log(`      ${line}`);
          });
        }
      });
    }

    if (failedRequests.length > 0) {
      console.log('\n🚫 FAILED REQUESTS:');
      failedRequests.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${failure.method} ${failure.url}`);
        if (failure.failureText) {
          console.log(`   Error: ${failure.failureText}`);
        }
      });
    }

    // Check audio errors specifically
    if (audioInfo.exists && audioInfo.error) {
      console.log('\n🎵 AUDIO ELEMENT ERROR:');
      console.log(`   Code: ${audioInfo.error.code}`);
      console.log(`   Message: ${audioInfo.error.message}`);
      console.log(`   Source: ${audioInfo.currentSrc}`);
    }

    // Keep browser open for observation
    console.log('\n⏳ Keeping browser open for 10 seconds for observation...');
    console.log('   You can inspect the page manually in the browser window.');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: TARGET_URL,
      errors,
      warnings,
      failedRequests,
      audioInfo,
      reactErrors,
      allConsoleMessages: consoleMessages.filter(msg => 
        msg.type === 'error' || msg.type === 'warning'
      ),
    };

    const fs = await import('fs');
    const reportPath = 'music-error-trace-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the trace
traceMusicErrors().catch(console.error);

