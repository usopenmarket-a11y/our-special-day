import puppeteer from 'puppeteer';

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

async function testArabicGallery() {
  console.log('🚀 Testing Arabic view gallery loading...\n');
  
  // Note: We'll check server connection in the page.goto call
  console.log('ℹ️  Make sure dev server is running on http://localhost:8080\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Test Mobile Arabic
    console.log('📱 Testing Mobile Arabic view (375x667)...');
    await page.setViewport(MOBILE_VIEWPORT);
    
    try {
      await page.goto('http://localhost:8080/our-special-day/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (error) {
      console.error('❌ Failed to load page:', error.message);
      console.error('Make sure the dev server is running on http://localhost:8080');
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Switch to Arabic
    console.log('\n🌐 Switching to Arabic...');
    const langButton = await page.$('button:has(svg[class*="Globe"]), button[aria-label*="language"], button:has-text("English"), button:has-text("العربية")');
    if (langButton) {
      try {
        await langButton.click();
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Wait for dropdown menu to appear
        await page.waitForSelector('[role="menuitem"], [class*="dropdown-menu-item"]', { timeout: 3000 }).catch(() => {
          console.log('⚠️  Dropdown menu not found, trying alternative selector...');
        });
        
        // Click Arabic option
        const menuItems = await page.$$('[role="menuitem"], [class*="dropdown-menu-item"], button:has-text("العربية")');
        let clicked = false;
        for (const item of menuItems) {
          const text = await page.evaluate(el => el.textContent?.trim() || '', item);
          if (text && (text.includes('العربية') || text === 'العربية')) {
            await item.click();
            clicked = true;
            console.log('✅ Clicked Arabic option');
            break;
          }
        }
        
        if (!clicked) {
          // Try clicking by evaluating
          const clickedByEval = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('[role="menuitem"], [class*="dropdown-menu-item"]'));
            const arabicItem = items.find(item => item.textContent?.includes('العربية'));
            if (arabicItem) {
              arabicItem.click();
              return true;
            }
            return false;
          });
          
          if (!clickedByEval) {
            console.log('⚠️  Could not find Arabic option, continuing with current language...');
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('⚠️  Error switching language:', error.message);
        console.log('Continuing with current language...');
      }
    } else {
      console.log('⚠️  Language button not found, continuing with current language...');
    }

    // Check document direction and language
    const pageInfo = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      bodyText: document.body.textContent?.substring(0, 100) || ''
    }));
    console.log(`✅ Document direction: ${pageInfo.dir}`);
    console.log(`✅ Document language: ${pageInfo.lang}`);
    if (pageInfo.dir !== 'rtl') {
      console.log('⚠️  Warning: Document is not in RTL mode. Arabic may not be active.');
    }

    // Scroll to gallery
    console.log('\n📸 Scrolling to gallery section...');
    await page.evaluate(() => {
      document.querySelector('#gallery')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 4000)); // Wait longer for images to load
    
    // Wait for images to start loading
    try {
      await page.waitForSelector('#gallery img', { timeout: 5000 });
      console.log('✅ Gallery images found');
    } catch (error) {
      console.log('⚠️  No images found in gallery yet, continuing...');
    }

    // Wait a bit more for lazy loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scroll through carousel to trigger lazy loading
    console.log('🔄 Scrolling carousel to trigger image loading...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const carousel = document.querySelector('[class*="carousel"]');
        if (carousel) {
          carousel.scrollBy({ left: 200, behavior: 'smooth' });
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check gallery images
    const galleryInfo = await page.evaluate(() => {
      const gallerySection = document.querySelector('#gallery');
      const images = gallerySection?.querySelectorAll('img');
      const carouselItems = gallerySection?.querySelectorAll('[class*="carousel-item"], [class*="CarouselItem"]');
      
      return {
        totalImages: images?.length || 0,
        carouselItems: carouselItems?.length || 0,
        imageSources: Array.from(images || []).map((img, idx) => ({
          index: idx,
          src: img.src.substring(0, 100), // Truncate for logging
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          alt: img.alt,
          loaded: img.complete && img.naturalWidth > 0
        })),
        visibleImages: Array.from(images || []).filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
        loadedImages: Array.from(images || []).filter(img => img.complete && img.naturalWidth > 0).length
      };
    });

    console.log('\n📊 Gallery Info (Mobile Arabic):');
    console.log(`  Total images found: ${galleryInfo.totalImages}`);
    console.log(`  Carousel items: ${galleryInfo.carouselItems}`);
    console.log(`  Visible images: ${galleryInfo.visibleImages}`);
    console.log(`  Loaded images: ${galleryInfo.loadedImages}`);
    console.log(`  Complete images: ${galleryInfo.imageSources.filter(img => img.complete).length}`);
    console.log(`  Images with dimensions: ${galleryInfo.imageSources.filter(img => img.naturalWidth > 0).length}`);
    
    // Log each image status
    console.log('\n📸 Image Loading Status:');
    galleryInfo.imageSources.forEach((img, idx) => {
      const status = img.loaded ? '✅' : img.complete ? '⚠️' : '⏳';
      console.log(`  ${status} Image ${idx + 1}: ${img.loaded ? 'Loaded' : img.complete ? 'Complete but no dimensions' : 'Loading...'} (${img.naturalWidth}x${img.naturalHeight})`);
    });
    
    // Check for issues
    const issues = [];
    if (galleryInfo.totalImages === 0) {
      issues.push('❌ No images found in gallery');
    }
    if (galleryInfo.loadedImages < galleryInfo.totalImages && galleryInfo.totalImages > 0) {
      issues.push(`⚠️  Only ${galleryInfo.loadedImages}/${galleryInfo.totalImages} images are fully loaded`);
    }
    if (galleryInfo.carouselItems === 0 && galleryInfo.totalImages > 0) {
      issues.push('⚠️  No carousel items found (carousel may not be initialized)');
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else if (galleryInfo.totalImages > 0) {
      console.log('\n✅ All images loaded successfully!');
    }

    // Check for errors
    const errors = await page.evaluate(() => {
      const gallerySection = document.querySelector('#gallery');
      const errorElement = gallerySection?.querySelector('[data-gallery-error="true"]');
      const loadingElement = gallerySection?.querySelector('[class*="loader"], [class*="spinner"]');
      
      return {
        hasError: !!errorElement,
        errorText: errorElement?.textContent || null,
        isLoading: !!loadingElement
      };
    });

    if (errors.hasError) {
      console.log(`\n⚠️  Error detected: ${errors.errorText}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'arabic-mobile-gallery.png', fullPage: true });
    console.log('\n✅ Screenshot saved: arabic-mobile-gallery.png');

    // Test Desktop Arabic
    console.log('\n\n💻 Testing Desktop Arabic view (1920x1080)...');
    await page.setViewport(DESKTOP_VIEWPORT);
    await page.goto('http://localhost:8080/our-special-day/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Switch to Arabic again
    const langButtonDesktop = await page.$('button:has(svg[class*="Globe"])');
    if (langButtonDesktop) {
      await langButtonDesktop.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const menuItems = await page.$$('[role="menuitem"], [class*="dropdown-menu-item"]');
      for (const item of menuItems) {
        const text = await page.evaluate(el => el.textContent, item);
        if (text && text.includes('العربية')) {
          await item.click();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Scroll to gallery
    await page.evaluate(() => {
      document.querySelector('#gallery')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check gallery images on desktop
    const galleryInfoDesktop = await page.evaluate(() => {
      const gallerySection = document.querySelector('#gallery');
      const images = gallerySection?.querySelectorAll('img');
      const carouselItems = gallerySection?.querySelectorAll('[class*="carousel-item"]');
      
      return {
        totalImages: images?.length || 0,
        carouselItems: carouselItems?.length || 0,
        imageSources: Array.from(images || []).map(img => ({
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          alt: img.alt
        })),
        visibleImages: Array.from(images || []).filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length
      };
    });

    console.log('\n📊 Gallery Info (Desktop Arabic):');
    console.log(`  Total images found: ${galleryInfoDesktop.totalImages}`);
    console.log(`  Carousel items: ${galleryInfoDesktop.carouselItems}`);
    console.log(`  Visible images: ${galleryInfoDesktop.visibleImages}`);
    console.log(`  Loaded images: ${galleryInfoDesktop.imageSources.filter(img => img.complete).length}`);
    console.log(`  Images with dimensions: ${galleryInfoDesktop.imageSources.filter(img => img.naturalWidth > 0).length}`);

    // Log image sources for debugging
    console.log('\n🔍 Image Sources (Desktop):');
    galleryInfoDesktop.imageSources.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.src.substring(0, 80)}...`);
      console.log(`     Complete: ${img.complete}, Dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
    });

    // Take screenshot
    await page.screenshot({ path: 'arabic-desktop-gallery.png', fullPage: true });
    console.log('\n✅ Screenshot saved: arabic-desktop-gallery.png');

    // Compare with English
    console.log('\n\n🇬🇧 Testing English view for comparison...');
    const langButtonEn = await page.$('button:has(svg[class*="Globe"])');
    if (langButtonEn) {
      await langButtonEn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const menuItems = await page.$$('[role="menuitem"], [class*="dropdown-menu-item"]');
      for (const item of menuItems) {
        const text = await page.evaluate(el => el.textContent, item);
        if (text && text.includes('English')) {
          await item.click();
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await page.evaluate(() => {
      document.querySelector('#gallery')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const galleryInfoEnglish = await page.evaluate(() => {
      const gallerySection = document.querySelector('#gallery');
      const images = gallerySection?.querySelectorAll('img');
      
      return {
        totalImages: images?.length || 0,
        imageSources: Array.from(images || []).map(img => ({
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        }))
      };
    });

    console.log('\n📊 Gallery Info (English):');
    console.log(`  Total images: ${galleryInfoEnglish.totalImages}`);
    console.log(`  Loaded images: ${galleryInfoEnglish.imageSources.filter(img => img.complete).length}`);

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testArabicGallery().catch(console.error);

