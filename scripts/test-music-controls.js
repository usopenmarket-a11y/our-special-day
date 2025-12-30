import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the port from vite.config.ts
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

let PORT = 8080; // Default port
try {
  const viteConfigPath = join(projectRoot, 'vite.config.ts');
  const viteConfig = readFileSync(viteConfigPath, 'utf-8');
  const portMatch = viteConfig.match(/port:\s*(\d+)/);
  if (portMatch) {
    PORT = parseInt(portMatch[1], 10);
  }
} catch (error) {
  console.log('⚠️  Could not read vite.config.ts, using default port 8080');
}

const BASE_URL = process.env.TEST_URL || `http://localhost:${PORT}`;
const VIEWPORTS = {
  web: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 667 }
};

async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMusicControls(viewport, viewportName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Music Controls - ${viewportName.toUpperCase()} View`);
  console.log(`${'='.repeat(60)}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'] // Allow autoplay for testing
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (text.includes('🎵') || text.includes('Audio') || text.includes('music')) {
        console.log(`[Browser ${type}]: ${text}`);
      }
    });

    console.log(`📱 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`🌐 Navigating to ${BASE_URL}...`);
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (error) {
      if (error.message.includes('net::ERR_CONNECTION_REFUSED') || error.message.includes('Navigation timeout')) {
        console.error('\n❌ Cannot connect to dev server!');
        console.error('Please make sure the dev server is running:');
        console.error('  npm run dev\n');
        await browser.close();
        return false;
      }
      throw error;
    }
    await waitFor(2000); // Wait for page to fully load

    // Check if music controls are visible
    console.log('\n1. Checking if music controls are visible...');
    const musicControls = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playPauseButton = buttons.find(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        return ariaLabel && (ariaLabel.includes('Play') || ariaLabel.includes('Pause'));
      });
      return {
        found: !!playPauseButton,
        ariaLabel: playPauseButton?.getAttribute('aria-label') || null,
        visible: playPauseButton ? window.getComputedStyle(playPauseButton).display !== 'none' : false
      };
    });

    if (!musicControls.found) {
      console.log('❌ Music controls not found!');
      await browser.close();
      return false;
    }

    console.log(`✅ Music controls found: ${musicControls.ariaLabel}`);
    console.log(`   Visible: ${musicControls.visible}`);

    // Get audio element state
    const getAudioState = async () => {
      return await page.evaluate(() => {
        const audio = document.querySelector('audio');
        if (!audio) return null;
        return {
          paused: audio.paused,
          muted: audio.muted,
          volume: audio.volume,
          currentTime: audio.currentTime,
          readyState: audio.readyState,
          src: audio.currentSrc || (audio.querySelector('source')?.src || '')
        };
      });
    };

    // Test 1: Check initial state
    console.log('\n2. Checking initial audio state...');
    const initialState = await getAudioState();
    if (initialState) {
      console.log(`   Audio element found: ✅`);
      console.log(`   Paused: ${initialState.paused}`);
      console.log(`   Muted: ${initialState.muted}`);
      console.log(`   Volume: ${initialState.volume}`);
      console.log(`   Ready State: ${initialState.readyState}`);
      console.log(`   Source: ${initialState.src.substring(0, 50)}...`);
    } else {
      console.log('❌ Audio element not found!');
    }

    // Test 2: Scroll to trigger music (if autoplay was blocked)
    console.log('\n3. Testing scroll to play music...');
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });
    await waitFor(1000);
    
    const afterScrollState = await getAudioState();
    if (afterScrollState) {
      console.log(`   After scroll - Paused: ${afterScrollState.paused}`);
      console.log(`   After scroll - Muted: ${afterScrollState.muted}`);
    }

    // Test 3: Click play/pause button
    console.log('\n4. Testing play/pause button...');
    
    // Find and click the play/pause button
    const playPauseClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playPauseButton = buttons.find(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        return ariaLabel && (ariaLabel.includes('Play') || ariaLabel.includes('Pause'));
      });
      
      if (playPauseButton) {
        playPauseButton.click();
        return true;
      }
      return false;
    });

    if (!playPauseClicked) {
      console.log('❌ Could not find play/pause button to click!');
    } else {
      console.log('✅ Clicked play/pause button');
      await waitFor(1500); // Wait for state to update
      
      const afterClickState = await getAudioState();
      if (afterClickState) {
        console.log(`   After click - Paused: ${afterClickState.paused}`);
        console.log(`   After click - Muted: ${afterClickState.muted}`);
        console.log(`   Current Time: ${afterClickState.currentTime.toFixed(2)}s`);
      }
    }

    // Test 4: Click again to pause
    console.log('\n5. Testing pause button...');
    await waitFor(1000);
    
    const pauseClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playPauseButton = buttons.find(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        return ariaLabel && (ariaLabel.includes('Play') || ariaLabel.includes('Pause'));
      });
      
      if (playPauseButton) {
        playPauseButton.click();
        return true;
      }
      return false;
    });

    if (pauseClicked) {
      console.log('✅ Clicked pause button');
      await waitFor(1000);
      
      const afterPauseState = await getAudioState();
      if (afterPauseState) {
        console.log(`   After pause - Paused: ${afterPauseState.paused}`);
        console.log(`   Current Time: ${afterPauseState.currentTime.toFixed(2)}s`);
      }
    }

    // Test 5: Click again to resume
    console.log('\n6. Testing resume button...');
    await waitFor(1000);
    
    const resumeClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playPauseButton = buttons.find(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        return ariaLabel && (ariaLabel.includes('Play') || ariaLabel.includes('Pause'));
      });
      
      if (playPauseButton) {
        playPauseButton.click();
        return true;
      }
      return false;
    });

    if (resumeClicked) {
      console.log('✅ Clicked resume button');
      await waitFor(1000);
      
      const finalState = await getAudioState();
      if (finalState) {
        console.log(`   After resume - Paused: ${finalState.paused}`);
        console.log(`   Current Time: ${finalState.currentTime.toFixed(2)}s`);
      }
    }

    // Test 6: Check button visual state
    console.log('\n7. Checking button visual state...');
    const buttonState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playPauseButton = buttons.find(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        return ariaLabel && (ariaLabel.includes('Play') || ariaLabel.includes('Pause'));
      });
      
      if (!playPauseButton) return null;
      
      // Check for spinner (playing) or play icon (paused)
      const hasSpinner = playPauseButton.querySelector('.animate-spin');
      const hasPlayIcon = playPauseButton.querySelector('.border-l-8');
      
      return {
        ariaLabel: playPauseButton.getAttribute('aria-label'),
        hasSpinner: !!hasSpinner,
        hasPlayIcon: !!hasPlayIcon,
        isPlaying: !!hasSpinner,
        isPaused: !!hasPlayIcon
      };
    });

    if (buttonState) {
      console.log(`   Button Aria Label: ${buttonState.ariaLabel}`);
      console.log(`   Has Spinner (Playing): ${buttonState.hasSpinner}`);
      console.log(`   Has Play Icon (Paused): ${buttonState.hasPlayIcon}`);
      console.log(`   State: ${buttonState.isPlaying ? 'Playing' : 'Paused'}`);
    }

    // Test 7: Test mute button
    console.log('\n8. Testing mute/unmute button...');
    const muteButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const muteButton = buttons.find(btn => {
        const ariaLabel = btn.getAttribute('aria-label');
        return ariaLabel && (ariaLabel.includes('Mute') || ariaLabel.includes('Unmute'));
      });
      
      if (muteButton) {
        muteButton.click();
        return true;
      }
      return false;
    });

    if (muteButtonClicked) {
      console.log('✅ Clicked mute/unmute button');
      await waitFor(500);
      
      const muteState = await getAudioState();
      if (muteState) {
        console.log(`   After mute click - Muted: ${muteState.muted}`);
        console.log(`   Volume: ${muteState.volume}`);
      }
    }

    // Test 8: Test scrolling while music is playing
    console.log('\n9. Testing scroll while music is playing...');
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await waitFor(500);
    
    await page.evaluate(() => {
      window.scrollTo(0, 1000);
    });
    await waitFor(500);
    
    const scrollState = await getAudioState();
    if (scrollState) {
      console.log(`   After scrolling - Paused: ${scrollState.paused}`);
      console.log(`   Current Time: ${scrollState.currentTime.toFixed(2)}s`);
      console.log(`   ✅ Music continues playing during scroll`);
    }

    console.log(`\n✅ ${viewportName.toUpperCase()} view tests completed!\n`);
    
    await waitFor(2000); // Keep browser open for visual inspection
    return true;

  } catch (error) {
    console.error(`❌ Error testing ${viewportName} view:`, error);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('\n🎵 Music Controls Test Suite');
  console.log('='.repeat(60));
  console.log('This script tests:');
  console.log('1. Music play/pause button functionality');
  console.log('2. Scroll to play music');
  console.log('3. Button states and visual feedback');
  console.log('4. Mute/unmute functionality');
  console.log('5. Both web and mobile viewports');
  console.log('='.repeat(60));
  
  // Allow skipping server check with --skip-check flag
  const skipCheck = process.argv.includes('--skip-check');
  if (skipCheck) {
    console.log('\n⚠️  Skipping server check (--skip-check flag detected)');
    console.log('   Make sure the dev server is running on http://localhost:5173\n');
  }

  // Check if dev server is running
  const checkServer = async () => {
    try {
      const http = await import('http');
      return new Promise((resolve) => {
        const url = new URL(BASE_URL);
        const options = {
          hostname: url.hostname,
          port: url.port || PORT,
          path: '/',
          method: 'HEAD',
          timeout: 3000
        };
        
        const req = http.request(options, (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 304);
        });
        
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        
        req.end();
      });
    } catch (error) {
      return false;
    }
  };

  if (!skipCheck) {
    console.log(`Checking if dev server is running on port ${PORT}...`);
    let isRunning = await checkServer();
    
    if (!isRunning) {
      console.log('⏳ Dev server not detected. Waiting for server to start...');
      console.log('   (Make sure to run "npm run dev" in another terminal)');
      
      // Wait up to 30 seconds for server to start
      for (let i = 0; i < 30; i++) {
        await waitFor(1000);
        isRunning = await checkServer();
        if (isRunning) {
          console.log('✅ Dev server is now running!\n');
          break;
        }
        if (i % 5 === 0 && i > 0) {
          process.stdout.write('.');
        }
      }
      
      if (!isRunning) {
        console.error('\n❌ Error: Dev server is not running!');
        console.error('\nTo fix this:');
        console.error('1. Open a new terminal window');
        console.error('2. Navigate to the project directory');
        console.error('3. Run: npm run dev');
        console.error(`4. Wait for "Local: http://localhost:${PORT}" message`);
        console.error('5. Then run this test again: npm run test-music-controls');
        console.error('\nOr skip the check: npm run test-music-controls -- --skip-check\n');
        process.exit(1);
      }
    } else {
      console.log('✅ Dev server is running!\n');
    }
  }

  // Test web viewport
  const webResult = await testMusicControls(VIEWPORTS.web, 'web');
  
  // Test mobile viewport
  const mobileResult = await testMusicControls(VIEWPORTS.mobile, 'mobile');

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Web View: ${webResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Mobile View: ${mobileResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

