import puppeteer from 'puppeteer';

const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE size
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad size

async function testMobileDesign() {
  console.log('🚀 Starting mobile design test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Test iPhone SE size (smallest common mobile)
    console.log('📱 Testing iPhone SE viewport (375x667)...');
    await page.setViewport(MOBILE_VIEWPORT);
    await page.goto('http://localhost:8080/our-special-day/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshots of each section
    console.log('\n📸 Taking screenshots of sections...');
    
    // Hero Section
    const heroSection = await page.$('#home');
    if (heroSection) {
      await heroSection.screenshot({ path: 'mobile-hero.png' });
      console.log('✅ Hero section screenshot saved');
    }

    // RSVP Section
    await page.evaluate(() => {
      document.querySelector('#rsvp')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const rsvpSection = await page.$('#rsvp');
    if (rsvpSection) {
      await rsvpSection.screenshot({ path: 'mobile-rsvp.png' });
      console.log('✅ RSVP section screenshot saved');
    }

    // Details Section
    await page.evaluate(() => {
      document.querySelector('#details')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const detailsSection = await page.$('#details');
    if (detailsSection) {
      await detailsSection.screenshot({ path: 'mobile-details.png' });
      console.log('✅ Details section screenshot saved');
    }

    // Gallery Section
    await page.evaluate(() => {
      document.querySelector('#gallery')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for gallery to load
    const gallerySection = await page.$('#gallery');
    if (gallerySection) {
      await gallerySection.screenshot({ path: 'mobile-gallery.png' });
      console.log('✅ Gallery section screenshot saved');
    }

    // Upload Section
    await page.evaluate(() => {
      document.querySelector('#upload')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const uploadSection = await page.$('#upload');
    if (uploadSection) {
      await uploadSection.screenshot({ path: 'mobile-upload.png' });
      console.log('✅ Upload section screenshot saved');
    }

    // Full page screenshot
    await page.screenshot({ path: 'mobile-fullpage.png', fullPage: true });
    console.log('✅ Full page screenshot saved');

    // Check for design issues
    console.log('\n🔍 Checking for design issues...\n');

    // 1. Check text sizes
    const textSizes = await page.evaluate(() => {
      const heroTitle = document.querySelector('#home h1');
      const rsvpTitle = document.querySelector('#rsvp h2');
      const detailsTitle = document.querySelector('#details h2');
      
      return {
        heroTitle: heroTitle ? window.getComputedStyle(heroTitle).fontSize : null,
        rsvpTitle: rsvpTitle ? window.getComputedStyle(rsvpTitle).fontSize : null,
        detailsTitle: detailsTitle ? window.getComputedStyle(detailsTitle).fontSize : null,
      };
    });
    console.log('📏 Text Sizes:', textSizes);

    // 2. Check touch targets (should be at least 44x44px)
    const touchTargets = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]'));
      return buttons.map(btn => {
        const rect = btn.getBoundingClientRect();
        return {
          tag: btn.tagName,
          text: btn.textContent?.substring(0, 30) || btn.getAttribute('aria-label') || 'N/A',
          width: rect.width,
          height: rect.height,
          minSize: Math.min(rect.width, rect.height),
          isTooSmall: Math.min(rect.width, rect.height) < 44
        };
      }).filter(t => t.isTooSmall);
    });
    
    if (touchTargets.length > 0) {
      console.log('⚠️  Touch targets too small (< 44px):');
      touchTargets.forEach(t => {
        console.log(`   - ${t.tag}: ${t.text} (${t.width}x${t.height}px)`);
      });
    } else {
      console.log('✅ All touch targets are adequate size (≥44px)');
    }

    // 3. Check spacing and padding
    const spacing = await page.evaluate(() => {
      const sections = ['#home', '#rsvp', '#details', '#gallery', '#upload'];
      return sections.map(selector => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          section: selector,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
        };
      }).filter(Boolean);
    });
    console.log('\n📐 Section Spacing:', spacing);

    // 4. Check for horizontal overflow
    const overflow = await page.evaluate(() => {
      return {
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        hasOverflow: document.body.scrollWidth > window.innerWidth
      };
    });
    console.log('\n📊 Overflow Check:', overflow);
    if (overflow.hasOverflow) {
      console.log('⚠️  Horizontal overflow detected!');
    } else {
      console.log('✅ No horizontal overflow');
    }

    // 5. Check navigation menu
    console.log('\n🧭 Testing Navigation Menu...');
    const navButton = await page.$('button[aria-label="Open menu"], button:has(svg)');
    if (navButton) {
      await navButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      const menuVisible = await page.evaluate(() => {
        const menu = document.querySelector('nav, [class*="menu"]');
        return menu && window.getComputedStyle(menu).display !== 'none';
      });
      console.log(menuVisible ? '✅ Mobile menu opens correctly' : '⚠️  Mobile menu may not be visible');
      
      // Close menu
      const closeButton = await page.$('button:has(svg[class*="X"]), button:has(svg[class*="x"])');
      if (closeButton) {
        await closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // 6. Test RSVP form interaction
    console.log('\n📝 Testing RSVP Form...');
    await page.evaluate(() => {
      document.querySelector('#rsvp')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const searchInput = await page.$('#rsvp input[type="text"]');
    if (searchInput) {
      const inputSize = await searchInput.boundingBox();
      console.log(`✅ Search input size: ${inputSize.width}x${inputSize.height}px`);
      
      if (inputSize.height < 44) {
        console.log('⚠️  Search input height is less than 44px (recommended for mobile)');
      }
    }

    // 7. Check gold text visibility
    const goldText = await page.evaluate(() => {
      const goldElements = Array.from(document.querySelectorAll('.text-gold, [class*="gold"]'));
      return goldElements.map(el => {
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent?.substring(0, 30) || 'N/A',
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
        };
      }).slice(0, 5); // First 5 gold elements
    });
    console.log('\n✨ Gold Text Samples:', goldText);

    // 8. Test language switcher
    console.log('\n🌐 Testing Language Switcher...');
    const langButton = await page.$('button:has(svg[class*="Globe"])');
    if (langButton) {
      const langButtonSize = await langButton.boundingBox();
      console.log(`✅ Language button size: ${langButtonSize.width}x${langButtonSize.height}px`);
    }

    // Test tablet view
    console.log('\n\n📱 Testing iPad viewport (768x1024)...');
    await page.setViewport(TABLET_VIEWPORT);
    await page.goto('http://localhost:8080/our-special-day/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'tablet-fullpage.png', fullPage: true });
    console.log('✅ Tablet screenshot saved');

    console.log('\n✅ Mobile design test completed!');
    console.log('\n📸 Screenshots saved:');
    console.log('   - mobile-hero.png');
    console.log('   - mobile-rsvp.png');
    console.log('   - mobile-details.png');
    console.log('   - mobile-gallery.png');
    console.log('   - mobile-upload.png');
    console.log('   - mobile-fullpage.png');
    console.log('   - tablet-fullpage.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testMobileDesign().catch(console.error);

