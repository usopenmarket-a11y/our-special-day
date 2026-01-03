import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Test both local and production URLs
const LOCAL_URL = 'http://localhost:8080';
const PRODUCTION_URL = 'https://fadyandsandra-specialday.github.io/our-special-day/';

async function testBackground() {
  console.log('🖼️  Starting background image test...\n');

  // Check if background image exists
  const bgPath = join(projectRoot, 'public', 'background.png');
  if (!existsSync(bgPath)) {
    console.log('❌ Background image not found at:', bgPath);
    return;
  }
  console.log('✅ Background image file exists at:', bgPath);

  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Try local first, fallback to production
    let url = LOCAL_URL;
    console.log(`\n🌐 Testing URL: ${url}`);
    
    const page = await browser.newPage();
    
    // Listen to console messages
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 10000,
      });
    } catch (error) {
      console.log(`⚠️  Local server not running, trying production URL...`);
      url = PRODUCTION_URL;
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
    }

    console.log(`✅ Page loaded: ${url}\n`);

    // Wait for page to fully render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Desktop View
    console.log('🖥️  Testing DESKTOP view...');
    await page.setViewport({ width: 1920, height: 1080 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const desktopBgInfo = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      const bgImage = computedStyle.backgroundImage;
      const bgSize = computedStyle.backgroundSize;
      const bgPosition = computedStyle.backgroundPosition;
      const bgRepeat = computedStyle.backgroundRepeat;
      const bgAttachment = computedStyle.backgroundAttachment;
      const bgColor = computedStyle.backgroundColor;

      let imageUrl = null;
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch) {
          imageUrl = urlMatch[1];
          if (!imageUrl.startsWith('http')) {
            imageUrl = window.location.origin + imageUrl;
          }
        }
      }

      return {
        hasBackgroundImage: bgImage && bgImage !== 'none',
        backgroundImage: bgImage,
        imageUrl: imageUrl,
        backgroundSize: bgSize,
        backgroundPosition: bgPosition,
        backgroundRepeat: bgRepeat,
        backgroundAttachment: bgAttachment,
        backgroundColor: bgColor,
      };
    });

    console.log('📊 Desktop Background Info:');
    console.log(`   Has Background Image: ${desktopBgInfo.hasBackgroundImage}`);
    if (desktopBgInfo.hasBackgroundImage) {
      console.log(`   Background Image: ${desktopBgInfo.backgroundImage}`);
      if (desktopBgInfo.imageUrl) {
        console.log(`   Image URL: ${desktopBgInfo.imageUrl}`);
      }
    }
    console.log(`   Background Size: ${desktopBgInfo.backgroundSize}`);
    console.log(`   Background Position: ${desktopBgInfo.backgroundPosition}`);
    console.log(`   Background Repeat: ${desktopBgInfo.backgroundRepeat}`);
    console.log(`   Background Attachment: ${desktopBgInfo.backgroundAttachment}`);
    console.log(`   Background Color: ${desktopBgInfo.backgroundColor}`);

    // Get page dimensions
    const pageDimensions = await page.evaluate(() => {
      return {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth,
      };
    });
    console.log(`\n📏 Page dimensions: ${pageDimensions.width}x${pageDimensions.height}px`);

    // Screenshot at TOP
    console.log('\n📸 Taking screenshot at TOP of page...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const desktopTopScreenshot = join(projectRoot, 'background-test-desktop-top.png');
    await page.screenshot({ 
      path: desktopTopScreenshot, 
      fullPage: false 
    });
    console.log(`✅ Desktop screenshot (TOP) saved: ${desktopTopScreenshot}`);

    // Screenshot at MIDDLE
    console.log('\n📸 Taking screenshot at MIDDLE of page...');
    const middleScroll = Math.floor(pageDimensions.height / 2);
    await page.evaluate((scrollPos) => {
      window.scrollTo(0, scrollPos);
    }, middleScroll);
    await new Promise(resolve => setTimeout(resolve, 500));
    const desktopMiddleScreenshot = join(projectRoot, 'background-test-desktop-middle.png');
    await page.screenshot({ 
      path: desktopMiddleScreenshot, 
      fullPage: false 
    });
    console.log(`✅ Desktop screenshot (MIDDLE) saved: ${desktopMiddleScreenshot}`);

    // Screenshot at BOTTOM
    console.log('\n📸 Taking screenshot at BOTTOM of page...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const desktopBottomScreenshot = join(projectRoot, 'background-test-desktop-bottom.png');
    await page.screenshot({ 
      path: desktopBottomScreenshot, 
      fullPage: false 
    });
    console.log(`✅ Desktop screenshot (BOTTOM) saved: ${desktopBottomScreenshot}`);

    // Full page screenshot for reference
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const desktopFullScreenshot = join(projectRoot, 'background-test-desktop-full.png');
    await page.screenshot({ 
      path: desktopFullScreenshot, 
      fullPage: true 
    });
    console.log(`✅ Desktop screenshot (FULL PAGE) saved: ${desktopFullScreenshot}`);

    // Test Mobile View
    console.log('\n📱 Testing MOBILE view...');
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mobileBgInfo = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      const bgImage = computedStyle.backgroundImage;
      const bgSize = computedStyle.backgroundSize;
      const bgPosition = computedStyle.backgroundPosition;
      const bgRepeat = computedStyle.backgroundRepeat;
      const bgAttachment = computedStyle.backgroundAttachment;
      const bgColor = computedStyle.backgroundColor;

      return {
        hasBackgroundImage: bgImage && bgImage !== 'none',
        backgroundImage: bgImage,
        backgroundSize: bgSize,
        backgroundPosition: bgPosition,
        backgroundRepeat: bgRepeat,
        backgroundAttachment: bgAttachment,
        backgroundColor: bgColor,
      };
    });

    console.log('📊 Mobile Background Info:');
    console.log(`   Has Background Image: ${mobileBgInfo.hasBackgroundImage}`);
    if (mobileBgInfo.hasBackgroundImage) {
      console.log(`   Background Image: ${mobileBgInfo.backgroundImage}`);
    }
    console.log(`   Background Size: ${mobileBgInfo.backgroundSize}`);
    console.log(`   Background Position: ${mobileBgInfo.backgroundPosition}`);
    console.log(`   Background Repeat: ${mobileBgInfo.backgroundRepeat}`);
    console.log(`   Background Attachment: ${mobileBgInfo.backgroundAttachment}`);
    console.log(`   Background Color: ${mobileBgInfo.backgroundColor}`);

    // Get page dimensions for mobile
    const mobilePageDimensions = await page.evaluate(() => {
      return {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth,
      };
    });
    console.log(`\n📏 Mobile page dimensions: ${mobilePageDimensions.width}x${mobilePageDimensions.height}px`);

    // Screenshot at TOP (mobile)
    console.log('\n📸 Taking screenshot at TOP of page (mobile)...');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const mobileTopScreenshot = join(projectRoot, 'background-test-mobile-top.png');
    await page.screenshot({ 
      path: mobileTopScreenshot, 
      fullPage: false 
    });
    console.log(`✅ Mobile screenshot (TOP) saved: ${mobileTopScreenshot}`);

    // Screenshot at MIDDLE (mobile)
    console.log('\n📸 Taking screenshot at MIDDLE of page (mobile)...');
    const mobileMiddleScroll = Math.floor(mobilePageDimensions.height / 2);
    await page.evaluate((scrollPos) => {
      window.scrollTo(0, scrollPos);
    }, mobileMiddleScroll);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mobileMiddleScreenshot = join(projectRoot, 'background-test-mobile-middle.png');
    await page.screenshot({ 
      path: mobileMiddleScreenshot, 
      fullPage: false 
    });
    console.log(`✅ Mobile screenshot (MIDDLE) saved: ${mobileMiddleScreenshot}`);

    // Screenshot at BOTTOM (mobile)
    console.log('\n📸 Taking screenshot at BOTTOM of page (mobile)...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const mobileBottomScreenshot = join(projectRoot, 'background-test-mobile-bottom.png');
    await page.screenshot({ 
      path: mobileBottomScreenshot, 
      fullPage: false 
    });
    console.log(`✅ Mobile screenshot (BOTTOM) saved: ${mobileBottomScreenshot}`);

    // Full page screenshot for reference (mobile)
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const mobileFullScreenshot = join(projectRoot, 'background-test-mobile-full.png');
    await page.screenshot({ 
      path: mobileFullScreenshot, 
      fullPage: true 
    });
    console.log(`✅ Mobile screenshot (FULL PAGE) saved: ${mobileFullScreenshot}`);

    // Check for errors
    if (errors.length > 0) {
      console.log('\n⚠️  Errors found:');
      errors.forEach(error => {
        console.log(`   ${error}`);
      });
    }

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    if (desktopBgInfo.hasBackgroundImage) {
      console.log('✅ PASSED: Background image CSS is set on desktop');
      console.log('   Check the screenshot to verify visibility');
    } else {
      console.log('❌ FAILED: No background image CSS found on desktop');
    }

    if (mobileBgInfo.hasBackgroundImage) {
      console.log('✅ PASSED: Background image CSS is set on mobile');
    } else {
      console.log('❌ FAILED: No background image CSS found on mobile');
    }

    console.log('\n📸 All Screenshots saved:');
    console.log('\n🖥️  DESKTOP:');
    console.log(`   Top: ${desktopTopScreenshot}`);
    console.log(`   Middle: ${desktopMiddleScreenshot}`);
    console.log(`   Bottom: ${desktopBottomScreenshot}`);
    console.log(`   Full Page: ${desktopFullScreenshot}`);
    console.log('\n📱 MOBILE:');
    console.log(`   Top: ${mobileTopScreenshot}`);
    console.log(`   Middle: ${mobileMiddleScreenshot}`);
    console.log(`   Bottom: ${mobileBottomScreenshot}`);
    console.log(`   Full Page: ${mobileFullScreenshot}`);
    console.log('\n💡 Check all screenshots to verify the background is visible throughout the entire website');
    console.log('\n');

    // Keep browser open for a bit to observe
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testBackground().catch(console.error);

