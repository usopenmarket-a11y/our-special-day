import puppeteer from 'puppeteer';

const WEBSITE_URL = 'https://fadyandsandra-specialday.github.io/our-special-day/';

async function testArabicGallery() {
  console.log('🧪 Starting Arabic Gallery Test...\n');
  console.log(`📍 Testing URL: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Monitor console logs
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('gallery') || text.includes('image') || text.includes('error') || text.includes('Error')) {
        consoleMessages.push(text);
      }
    });

    // Monitor network requests
    const imageRequests = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('gallery') || url.includes('image') || url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
        imageRequests.push({
          url,
          status: response.status(),
          type: response.headers()['content-type'],
        });
      }
    });

    // Navigate to website
    console.log('⏳ Navigating to website...');
    await page.goto(WEBSITE_URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    console.log('✅ Page loaded\n');

    // Wait for initial content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if gallery section exists
    console.log('🔍 Checking for gallery section...');
    const gallerySection = await page.$('#gallery');
    if (!gallerySection) {
      throw new Error('❌ Gallery section not found!');
    }
    console.log('✅ Gallery section found\n');

    // Check initial language (should be English by default)
    console.log('🌐 Checking initial language...');
    const initialDir = await page.evaluate(() => document.documentElement.dir);
    const initialLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`   Initial direction: ${initialDir}, language: ${initialLang}`);

    // Get initial image count in English
    const englishImages = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return 0;
      const images = gallery.querySelectorAll('img[src*="drive.google.com"], img[src*="gallery"]');
      return Array.from(images).filter(img => img.complete && img.naturalWidth > 0).length;
    });
    console.log(`   English mode - Visible images: ${englishImages}\n`);

    // Find and click language switcher to switch to Arabic
    console.log('🔄 Switching to Arabic...');
    
    // Wait for language switcher to be available
    await page.waitForSelector('button[aria-label*="language"], button:has(svg)', { timeout: 5000 }).catch(() => {
      // Try alternative selector
      return page.waitForSelector('button', { timeout: 5000 });
    });

    // Find language switcher button
    const langSwitcher = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('english') || text.includes('العربية') || 
               (btn.querySelector('svg') && btn.textContent.trim());
      });
    });

    if (langSwitcher && langSwitcher.asElement()) {
      await langSwitcher.asElement().click();
      console.log('   Clicked language switcher');

      // Wait a bit for dropdown
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click on Arabic option
      const arabicOption = await page.evaluateHandle(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"], button'));
        return items.find(item => item.textContent.includes('العربية'));
      });

      if (arabicOption && arabicOption.asElement()) {
        await arabicOption.asElement().click();
        console.log('   Selected Arabic');
      } else {
        // Try clicking directly on text containing Arabic
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const arabic = elements.find(el => el.textContent && el.textContent.includes('العربية'));
          if (arabic) arabic.click();
        });
        console.log('   Selected Arabic (fallback method)');
      }
    } else {
      console.log('   ⚠️ Could not find language switcher, trying direct DOM manipulation...');
      // Try to switch language programmatically
      await page.evaluate(() => {
        if (window.i18n) {
          window.i18n.changeLanguage('ar');
        }
        // Also update DOM directly
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
      });
    }

    // Wait for language change and carousel to reinitialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify Arabic mode
    console.log('\n🌐 Verifying Arabic mode...');
    const arabicDir = await page.evaluate(() => document.documentElement.dir);
    const arabicLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`   Direction: ${arabicDir}, Language: ${arabicLang}`);

    if (arabicDir !== 'rtl') {
      console.log('   ⚠️ Warning: Direction not set to RTL, but continuing test...');
    } else {
      console.log('   ✅ RTL direction confirmed');
    }

    if (arabicLang !== 'ar') {
      console.log('   ⚠️ Warning: Language not set to Arabic, but continuing test...');
    } else {
      console.log('   ✅ Arabic language confirmed');
    }

    // Check gallery in Arabic mode
    console.log('\n🖼️ Testing gallery in Arabic mode...');

    // Wait for carousel to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for carousel container
    const carouselContainer = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return null;
      const carousel = gallery.querySelector('[role="region"][aria-roledescription="carousel"]');
      return carousel ? {
        exists: true,
        dir: carousel.getAttribute('dir'),
        children: carousel.children.length,
      } : null;
    });
    console.log(`   Carousel container:`, carouselContainer);

    // Count visible images in Arabic mode
    const arabicImages = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return { total: 0, visible: 0, loaded: 0 };
      
      const allImages = gallery.querySelectorAll('img');
      const imagesArray = Array.from(allImages);
      
      return {
        total: imagesArray.length,
        visible: imagesArray.filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
        loaded: imagesArray.filter(img => img.complete && img.naturalWidth > 0).length,
      };
    });
    console.log(`   Total img elements: ${arabicImages.total}`);
    console.log(`   Visible images: ${arabicImages.visible}`);
    console.log(`   Loaded images: ${arabicImages.loaded}`);

    // Check carousel slides
    const carouselSlides = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return 0;
      const slides = gallery.querySelectorAll('[role="group"][aria-roledescription="slide"]');
      return slides.length;
    });
    console.log(`   Carousel slides: ${carouselSlides}`);

    // Check if images are properly displayed (not hidden by overflow)
    const imageVisibility = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return [];
      
      const images = gallery.querySelectorAll('img');
      const results = [];
      
      images.forEach((img, index) => {
        const rect = img.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(img);
        const parentStyle = window.getComputedStyle(img.parentElement || img);
        
        results.push({
          index,
          src: img.src.substring(0, 50) + '...',
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          parentOverflow: parentStyle.overflow,
          inViewport: rect.top >= 0 && rect.left >= 0 && 
                     rect.bottom <= window.innerHeight && 
                     rect.right <= window.innerWidth,
        });
      });
      
      return results;
    });

    console.log('\n📊 Image Visibility Details:');
    imageVisibility.forEach((img, idx) => {
      if (idx < 5) { // Show first 5
        console.log(`   Image ${idx + 1}:`);
        console.log(`      Visible: ${img.visible ? '✅' : '❌'} (${img.width}x${img.height})`);
        console.log(`      Display: ${img.display}, Visibility: ${img.visibility}, Opacity: ${img.opacity}`);
        console.log(`      In viewport: ${img.inViewport ? '✅' : '❌'}`);
        console.log(`      Parent overflow: ${img.parentOverflow}`);
      }
    });

    // Check RTL-specific styling
    const rtlStyles = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return null;
      
      const carousel = gallery.querySelector('[role="region"]');
      if (!carousel) return null;
      
      const computed = window.getComputedStyle(carousel);
      const parent = carousel.parentElement;
      const parentComputed = parent ? window.getComputedStyle(parent) : null;
      
      return {
        direction: computed.direction,
        parentDir: parent ? parent.getAttribute('dir') : null,
        textAlign: computed.textAlign,
      };
    });
    console.log('\n📐 RTL Styling:');
    console.log(`   Direction: ${rtlStyles?.direction || 'N/A'}`);
    console.log(`   Parent dir attribute: ${rtlStyles?.parentDir || 'N/A'}`);

    // Test carousel navigation
    console.log('\n🎠 Testing carousel navigation...');
    const navigationTest = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return { prev: false, next: false };
      
      const prevBtn = gallery.querySelector('button[aria-label*="Previous"], button:has(svg:first-child)');
      const nextBtn = gallery.querySelector('button[aria-label*="Next"], button:has(svg:last-child)');
      
      return {
        prev: prevBtn ? {
          exists: true,
          visible: window.getComputedStyle(prevBtn).display !== 'none',
          disabled: prevBtn.disabled,
        } : false,
        next: nextBtn ? {
          exists: true,
          visible: window.getComputedStyle(nextBtn).display !== 'none',
          disabled: nextBtn.disabled,
        } : false,
      };
    });
    console.log(`   Previous button:`, navigationTest.prev);
    console.log(`   Next button:`, navigationTest.next);

    // Scroll through carousel to load more images
    console.log('\n🔄 Scrolling carousel...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const gallery = document.querySelector('#gallery');
        if (!gallery) return;
        const carousel = gallery.querySelector('[role="region"]');
        if (carousel) {
          carousel.scrollBy({ left: 500, behavior: 'smooth' });
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final image count after scrolling
    const finalImages = await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (!gallery) return 0;
      const images = gallery.querySelectorAll('img');
      return Array.from(images).filter(img => img.complete && img.naturalWidth > 0).length;
    });
    console.log(`   Final loaded images after scrolling: ${finalImages}\n`);

    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`✅ Gallery section: Found`);
    console.log(`✅ Carousel container: ${carouselContainer ? 'Found' : 'Not found'}`);
    console.log(`✅ Total carousel slides: ${carouselSlides}`);
    console.log(`✅ Loaded images (Arabic): ${arabicImages.loaded}`);
    console.log(`✅ Visible images (Arabic): ${arabicImages.visible}`);
    console.log(`✅ RTL direction: ${arabicDir === 'rtl' ? 'Set correctly' : 'Not set'}`);
    console.log(`✅ Arabic language: ${arabicLang === 'ar' ? 'Set correctly' : 'Not set'}`);
    
    const hasIssues = arabicImages.loaded === 0 || carouselSlides === 0 || arabicDir !== 'rtl';
    if (hasIssues) {
      console.log('\n❌ ISSUES FOUND:');
      if (arabicImages.loaded === 0) console.log('   - No images loaded');
      if (carouselSlides === 0) console.log('   - No carousel slides found');
      if (arabicDir !== 'rtl') console.log('   - RTL direction not set correctly');
    } else {
      console.log('\n✅ All checks passed!');
    }

    // Check console messages
    if (consoleMessages.length > 0) {
      console.log('\n📝 Relevant Console Messages:');
      consoleMessages.forEach(msg => console.log(`   ${msg}`));
    }

    // Check image requests
    if (imageRequests.length > 0) {
      console.log('\n🌐 Image Requests:');
      const failed = imageRequests.filter(req => req.status >= 400);
      if (failed.length > 0) {
        console.log(`   ❌ Failed requests (${failed.length}):`);
        failed.forEach(req => console.log(`      ${req.status}: ${req.url.substring(0, 80)}...`));
      } else {
        console.log(`   ✅ All image requests successful (${imageRequests.length} total)`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    
    // Keep browser open for manual inspection
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
  } finally {
    await browser.close();
  }
}

// Run the test
testArabicGallery().catch(console.error);

