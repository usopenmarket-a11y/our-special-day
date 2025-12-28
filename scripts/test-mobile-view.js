import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE size

// Helper to wait for server
async function waitForServer(url, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function testMobileView() {
  console.log('🧪 Starting Mobile View Tests...\n');
  
  // Wait for server if using localhost
  if (BASE_URL.includes('localhost')) {
    console.log('⏳ Waiting for dev server to start...');
    const serverReady = await waitForServer(BASE_URL);
    if (!serverReady) {
      console.error('❌ Dev server not responding. Please start it with: npm run dev');
      process.exit(1);
    }
    console.log('✅ Dev server is ready!\n');
  }
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: MOBILE_VIEWPORT,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(MOBILE_VIEWPORT);
    
    // Set mobile user agent
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    );

    console.log(`📱 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const errors = [];
    const warnings = [];

    // Test 1: Check if page loads without white screen
    console.log('\n✅ Test 1: Page Load');
    try {
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (!bodyText || bodyText.trim().length === 0) {
        errors.push('Page appears to be blank (white screen)');
      } else {
        console.log('   ✓ Page loaded successfully');
      }
    } catch (e) {
      errors.push(`Page load check failed: ${e.message}`);
    }

    // Test 2: Check navigation menu
    console.log('\n✅ Test 2: Navigation Menu');
    try {
      const menuButton = await page.$('button[aria-label*="menu"], button:has-text("Menu"), button svg');
      if (!menuButton) {
        // Try to find menu icon
        const menuIcon = await page.$('svg[class*="lucide-menu"]');
        if (menuIcon) {
          const menuButtonParent = await menuIcon.evaluateHandle(el => el.closest('button'));
          if (menuButtonParent) {
            await menuButtonParent.asElement().click();
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('   ✓ Mobile menu opened');
          }
        } else {
          warnings.push('Menu button not found');
        }
      } else {
        await menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('   ✓ Mobile menu opened');
      }
    } catch (e) {
      warnings.push(`Menu test failed: ${e.message}`);
    }

    // Test 3: Check Hero Section
    console.log('\n✅ Test 3: Hero Section');
    try {
      const heroText = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.innerText : null;
      });
      if (heroText) {
        console.log(`   ✓ Hero section found: "${heroText.substring(0, 30)}..."`);
      } else {
        warnings.push('Hero section h1 not found');
      }

      // Check if text is readable (not too small)
      const heroFontSize = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1) {
          const style = window.getComputedStyle(h1);
          return parseFloat(style.fontSize);
        }
        return null;
      });
      if (heroFontSize && heroFontSize < 20) {
        warnings.push(`Hero text might be too small on mobile: ${heroFontSize}px`);
      } else if (heroFontSize) {
        console.log(`   ✓ Hero text size: ${heroFontSize}px`);
      }
    } catch (e) {
      warnings.push(`Hero section test failed: ${e.message}`);
    }

    // Test 4: Scroll and check sections
    console.log('\n✅ Test 4: Scroll Through Sections');
    try {
      // Scroll to RSVP section
      await page.evaluate(() => {
        const rsvpSection = document.querySelector('#rsvp, [id*="rsvp"]');
        if (rsvpSection) {
          rsvpSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const rsvpVisible = await page.evaluate(() => {
        const rsvp = document.querySelector('#rsvp, [id*="rsvp"]');
        if (!rsvp) return false;
        const rect = rsvp.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight;
      });
      if (rsvpVisible) {
        console.log('   ✓ RSVP section is visible');
      } else {
        warnings.push('RSVP section not found or not visible');
      }

      // Scroll to Details section
      await page.evaluate(() => {
        const detailsSection = document.querySelector('#details');
        if (detailsSection) {
          detailsSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const detailsVisible = await page.evaluate(() => {
        const details = document.querySelector('#details');
        if (!details) return false;
        const rect = details.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight;
      });
      if (detailsVisible) {
        console.log('   ✓ Details section is visible');
      } else {
        warnings.push('Details section not found or not visible');
      }
    } catch (e) {
      warnings.push(`Scroll test failed: ${e.message}`);
    }

    // Test 5: Check RSVP form mobile layout
    console.log('\n✅ Test 5: RSVP Form Mobile Layout');
    try {
      // Scroll to RSVP
      await page.evaluate(() => {
        const rsvp = document.querySelector('#rsvp, [id*="rsvp"]');
        if (rsvp) rsvp.scrollIntoView({ behavior: 'smooth' });
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check search input
      const searchInput = await page.$('input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="بحث"]');
      if (searchInput) {
        const inputBox = await searchInput.boundingBox();
        if (inputBox && inputBox.height < 40) {
          warnings.push(`Search input might be too small for touch: ${inputBox.height}px`);
        } else {
          console.log('   ✓ Search input has adequate size');
        }
      }

      // Check search button
      const searchButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const text = btn.innerText.toLowerCase();
          return text.includes('search') || text.includes('بحث');
        });
      });
      if (searchButton) {
        const buttonBox = await page.evaluateHandle((btn) => {
          return btn.getBoundingClientRect();
        }, searchButton);
        const rect = await buttonBox.jsonValue();
        if (rect && rect.height < 40) {
          warnings.push(`Search button might be too small for touch: ${rect.height}px`);
        } else {
          console.log('   ✓ Search button has adequate size');
        }
      }

      // Check attendance buttons
      const attendanceButtons = await page.$$('label[for="attending"], label[for="not-attending"]');
      if (attendanceButtons.length >= 2) {
        const firstButton = await attendanceButtons[0].boundingBox();
        if (firstButton && firstButton.height < 100) {
          warnings.push(`Attendance buttons might be too small: ${firstButton.height}px`);
        } else {
          console.log('   ✓ Attendance buttons have adequate size');
        }
      }
    } catch (e) {
      warnings.push(`RSVP mobile layout test failed: ${e.message}`);
    }

    // Test 6: Check touch targets
    console.log('\n✅ Test 6: Touch Targets');
    try {
      const allButtons = await page.$$('button, a, input[type="button"], input[type="submit"]');
      let smallTargets = 0;
      for (const button of allButtons) {
        const box = await button.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          smallTargets++;
        }
      }
      if (smallTargets > 0) {
        warnings.push(`Found ${smallTargets} buttons/links smaller than 44x44px (recommended touch target)`);
      } else {
        console.log('   ✓ All touch targets meet minimum size (44x44px)');
      }
    } catch (e) {
      warnings.push(`Touch targets test failed: ${e.message}`);
    }

    // Test 7: Check text readability
    console.log('\n✅ Test 7: Text Readability');
    try {
      const allText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'));
        return elements
          .filter(el => {
            const text = el.innerText.trim();
            return text.length > 0 && text.length < 100;
          })
          .slice(0, 10)
          .map(el => {
            const style = window.getComputedStyle(el);
            return {
              text: el.innerText.substring(0, 30),
              fontSize: parseFloat(style.fontSize),
            };
          });
      });

      const smallText = allText.filter(t => t.fontSize < 14);
      if (smallText.length > 0) {
        warnings.push(`Found ${smallText.length} text elements with font size < 14px`);
      } else {
        console.log('   ✓ Text sizes are readable on mobile');
      }
    } catch (e) {
      warnings.push(`Text readability test failed: ${e.message}`);
    }

    // Test 8: Check horizontal scrolling
    console.log('\n✅ Test 8: Horizontal Scrolling');
    try {
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (hasHorizontalScroll) {
        errors.push('Page has horizontal scrolling (should be fixed)');
      } else {
        console.log('   ✓ No horizontal scrolling');
      }
    } catch (e) {
      warnings.push(`Horizontal scroll test failed: ${e.message}`);
    }

    // Test 9: Check images load
    console.log('\n✅ Test 9: Image Loading');
    try {
      const images = await page.$$('img');
      let loadedImages = 0;
      for (const img of images) {
        const isLoaded = await img.evaluate(el => el.complete && el.naturalHeight > 0);
        if (isLoaded) loadedImages++;
      }
      console.log(`   ✓ ${loadedImages}/${images.length} images loaded`);
    } catch (e) {
      warnings.push(`Image loading test failed: ${e.message}`);
    }

    // Test 10: Check language switcher
    console.log('\n✅ Test 10: Language Switcher');
    try {
      const langButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const text = btn.innerText.toLowerCase();
          return text.includes('ar') || text.includes('en') || text.includes('عربي') || text.includes('english');
        });
      });
      if (langButton) {
        console.log('   ✓ Language switcher found');
      } else {
        warnings.push('Language switcher not found');
      }
    } catch (e) {
      warnings.push(`Language switcher test failed: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All tests passed! Mobile view looks good.');
    } else {
      if (errors.length > 0) {
        console.log(`\n❌ ERRORS (${errors.length}):`);
        errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
      }
      if (warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'mobile-view-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: mobile-view-test.png');

    return { errors, warnings };

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run tests
testMobileView()
  .then(({ errors, warnings }) => {
    if (errors.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

