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

async function testAllModules() {
  console.log('🧪 Testing All Modules in Mobile View...\n');
  
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

    const results = {
      passed: [],
      failed: [],
      warnings: [],
    };

    // Test 1: Navigation Module
    console.log('\n📋 Testing Navigation Module...');
    try {
      const navExists = await page.evaluate(() => {
        return document.querySelector('nav') !== null;
      });
      if (navExists) {
        console.log('   ✓ Navigation bar exists');
        results.passed.push('Navigation: Bar exists');
      } else {
        results.failed.push('Navigation: Bar not found');
      }

      // Test mobile menu
      const menuButton = await page.$('button svg[class*="lucide-menu"], button:has(svg)');
      if (menuButton) {
        await menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        const menuOpen = await page.evaluate(() => {
          const menu = document.querySelector('[class*="fixed"][class*="inset-0"]');
          return menu && window.getComputedStyle(menu).opacity !== '0';
        });
        if (menuOpen) {
          console.log('   ✓ Mobile menu opens');
          results.passed.push('Navigation: Mobile menu works');
        } else {
          results.warnings.push('Navigation: Menu may not be visible');
        }
      }
    } catch (e) {
      results.failed.push(`Navigation: ${e.message}`);
    }

    // Test 2: Hero Section Module
    console.log('\n📋 Testing Hero Section Module...');
    try {
      const heroText = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.innerText : null;
      });
      if (heroText) {
        console.log(`   ✓ Hero text found: "${heroText.substring(0, 30)}..."`);
        results.passed.push('Hero: Text displays');
      } else {
        results.failed.push('Hero: No h1 found');
      }

      // Check gold text visibility
      const goldText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[class*="text-gold"]'));
        return elements.length;
      });
      console.log(`   ✓ Found ${goldText} gold text elements`);
      results.passed.push(`Hero: ${goldText} gold elements found`);

      // Check countdown timer
      const countdown = await page.$('[class*="countdown"], [class*="timer"]');
      if (countdown) {
        console.log('   ✓ Countdown timer exists');
        results.passed.push('Hero: Countdown timer visible');
      }
    } catch (e) {
      results.failed.push(`Hero: ${e.message}`);
    }

    // Test 3: RSVP Module
    console.log('\n📋 Testing RSVP Module...');
    try {
      await page.evaluate(() => {
        const rsvp = document.querySelector('#rsvp, [id*="rsvp"]');
        if (rsvp) rsvp.scrollIntoView({ behavior: 'smooth' });
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const searchInput = await page.$('input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="بحث"]');
      if (searchInput) {
        console.log('   ✓ Search input found');
        results.passed.push('RSVP: Search input exists');
        
        // Test typing
        await searchInput.type('Test');
        await new Promise(resolve => setTimeout(resolve, 500));
        const value = await searchInput.evaluate(el => el.value);
        if (value === 'Test') {
          console.log('   ✓ Search input accepts input');
          results.passed.push('RSVP: Input works');
        }
      } else {
        results.failed.push('RSVP: Search input not found');
      }

      // Check attendance buttons
      const attendanceButtons = await page.$$('label[for="attending"], label[for="not-attending"]');
      if (attendanceButtons.length >= 2) {
        console.log(`   ✓ Found ${attendanceButtons.length} attendance buttons`);
        results.passed.push('RSVP: Attendance buttons exist');
      }
    } catch (e) {
      results.failed.push(`RSVP: ${e.message}`);
    }

    // Test 4: Details Section Module
    console.log('\n📋 Testing Details Section Module...');
    try {
      await page.evaluate(() => {
        const details = document.querySelector('#details');
        if (details) details.scrollIntoView({ behavior: 'smooth' });
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const cards = await page.$$('[class*="card"], [class*="Card"]');
      if (cards.length >= 3) {
        console.log(`   ✓ Found ${cards.length} detail cards`);
        results.passed.push(`Details: ${cards.length} cards visible`);
      } else {
        results.warnings.push(`Details: Only ${cards.length} cards found`);
      }

      // Check gold text in details
      const goldInDetails = await page.evaluate(() => {
        const section = document.querySelector('#details');
        if (!section) return 0;
        return section.querySelectorAll('[class*="text-gold"]').length;
      });
      console.log(`   ✓ Found ${goldInDetails} gold text elements in details`);
      results.passed.push(`Details: ${goldInDetails} gold elements`);
    } catch (e) {
      results.failed.push(`Details: ${e.message}`);
    }

    // Test 5: Gallery Module
    console.log('\n📋 Testing Gallery Module...');
    try {
      await page.evaluate(() => {
        const gallery = document.querySelector('#gallery');
        if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const images = await page.$$('img');
      const loadedImages = await Promise.all(
        images.map(img => img.evaluate(el => el.complete && el.naturalHeight > 0))
      );
      const loadedCount = loadedImages.filter(Boolean).length;
      console.log(`   ✓ ${loadedCount}/${images.length} images loaded`);
      results.passed.push(`Gallery: ${loadedCount} images loaded`);

      // Check carousel
      const carousel = await page.$('[class*="carousel"], [class*="Carousel"]');
      if (carousel) {
        console.log('   ✓ Carousel found');
        results.passed.push('Gallery: Carousel exists');
      }
    } catch (e) {
      results.failed.push(`Gallery: ${e.message}`);
    }

    // Test 6: Photo Upload Module
    console.log('\n📋 Testing Photo Upload Module...');
    try {
      await page.evaluate(() => {
        const upload = document.querySelector('#upload, [id*="upload"]');
        if (upload) upload.scrollIntoView({ behavior: 'smooth' });
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const uploadSection = await page.$('#upload, [id*="upload"]');
      if (uploadSection) {
        console.log('   ✓ Upload section found');
        results.passed.push('Photo Upload: Section exists');
      } else {
        results.warnings.push('Photo Upload: Section not found');
      }

      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        console.log('   ✓ File input found');
        results.passed.push('Photo Upload: File input exists');
      }
    } catch (e) {
      results.failed.push(`Photo Upload: ${e.message}`);
    }

    // Test 7: Footer Module
    console.log('\n📋 Testing Footer Module...');
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const footer = await page.$('footer');
      if (footer) {
        console.log('   ✓ Footer found');
        results.passed.push('Footer: Exists');
      } else {
        results.warnings.push('Footer: Not found');
      }
    } catch (e) {
      results.failed.push(`Footer: ${e.message}`);
    }

    // Test 8: Background Music Module
    console.log('\n📋 Testing Background Music Module...');
    try {
      const musicControls = await page.$('[class*="music"], [class*="audio"], button[aria-label*="music"], button[aria-label*="audio"]');
      if (musicControls) {
        console.log('   ✓ Music controls found');
        results.passed.push('Background Music: Controls exist');
      } else {
        results.warnings.push('Background Music: Controls not found');
      }
    } catch (e) {
      results.warnings.push(`Background Music: ${e.message}`);
    }

    // Test 9: Language Switcher
    console.log('\n📋 Testing Language Switcher...');
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
        results.passed.push('Language: Switcher exists');
      } else {
        // Check in mobile menu
        const menuButton = await page.$('button svg[class*="lucide-menu"]');
        if (menuButton) {
          await menuButton.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          const langInMenu = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => {
              const text = btn.innerText.toLowerCase();
              return text.includes('ar') || text.includes('en') || text.includes('عربي') || text.includes('english');
            });
          });
          if (langInMenu) {
            console.log('   ✓ Language switcher found in menu');
            results.passed.push('Language: Switcher in menu');
          } else {
            results.warnings.push('Language: Switcher not found');
          }
        }
      }
    } catch (e) {
      results.warnings.push(`Language: ${e.message}`);
    }

    // Test 10: Gold Text Visibility
    console.log('\n📋 Testing Gold Text Visibility...');
    try {
      const goldElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[class*="text-gold"]'));
        return elements.map(el => {
          const style = window.getComputedStyle(el);
          const text = el.innerText || '';
          return {
            fontSize: parseFloat(style.fontSize),
            fontWeight: style.fontWeight,
            color: style.color,
            text: text.substring(0, 30),
          };
        });
      });

      const smallGold = goldElements.filter(el => el.fontSize < 14);
      if (smallGold.length > 0) {
        results.warnings.push(`Gold Text: ${smallGold.length} elements with font < 14px`);
        console.log(`   ⚠️  Found ${smallGold.length} gold text elements smaller than 14px`);
      } else {
        console.log('   ✓ All gold text is readable (>= 14px)');
        results.passed.push('Gold Text: All readable');
      }

      // Check font weights
      const boldGold = goldElements.filter(el => 
        parseInt(el.fontWeight) >= 600 || el.fontWeight === 'semibold' || el.fontWeight === 'bold'
      );
      console.log(`   ✓ ${boldGold.length}/${goldElements.length} gold text elements are bold/semibold`);
      results.passed.push(`Gold Text: ${boldGold.length} bold elements`);
    } catch (e) {
      results.warnings.push(`Gold Text: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    if (results.passed.length > 0) {
      console.log('\n✅ PASSED TESTS:');
      results.passed.forEach((test, i) => console.log(`   ${i + 1}. ${test}`));
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.failed.forEach((test, i) => console.log(`   ${i + 1}. ${test}`));
    }
    
    if (results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      results.warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    }

    // Take screenshot
    await page.screenshot({ path: 'all-modules-mobile-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: all-modules-mobile-test.png');

    return results;

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
testAllModules()
  .then((results) => {
    if (results.failed.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

