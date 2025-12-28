import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080/our-special-day/';
const TIMEOUT = 30000;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUploadAndGallery() {
  console.log('🚀 Starting Upload and Gallery Tests...\n');
  console.log(`Testing URL: ${BASE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`[Browser Console Error] ${text}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    // Test 1: Page Load
    console.log('📄 Test 1: Loading page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await wait(2000);
    console.log('✅ Page loaded successfully\n');

    // Test 2: Check Gallery Section (English)
    console.log('🖼️  Test 2: Testing Gallery Section (English)...');
    try {
      // Scroll to gallery section
      await page.evaluate(() => {
        const gallery = document.querySelector('#gallery');
        if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
      });
      await wait(3000);

      // Check for gallery elements
      const galleryTitle = await page.evaluate(() => {
        const title = document.querySelector('#gallery h2');
        return title ? title.textContent.trim() : null;
      });
      console.log(`Gallery Title: ${galleryTitle}`);

      // Check for loading state
      const isLoading = await page.evaluate(() => {
        const loader = document.querySelector('#gallery .animate-spin');
        return loader !== null;
      });
      console.log(`Gallery Loading: ${isLoading}`);

      // Wait for gallery to load
      await wait(5000);

      // Check for error message (look for specific data attribute)
      const galleryError = await page.evaluate(() => {
        const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
        return errorElement ? errorElement.textContent.trim() : null;
      });
      
      if (galleryError) {
        console.log(`⚠️  Gallery Error: ${galleryError}`);
        if (galleryError.includes('Unable to load gallery') || galleryError.includes('تعذر تحميل المعرض')) {
          console.log('❌ Gallery failed to load - checking configuration...');
        }
      }

      // Check for images
      const imageCount = await page.evaluate(() => {
        const images = document.querySelectorAll('#gallery img[src]');
        return images.length;
      });
      console.log(`Gallery Images Found: ${imageCount}`);

      if (imageCount > 0) {
        console.log('✅ Gallery loaded successfully with images\n');
      } else if (galleryError && (galleryError.includes('Unable to load gallery') || galleryError.includes('تعذر تحميل المعرض'))) {
        console.log('❌ Gallery failed to load - configuration issue\n');
      } else {
        console.log('⚠️  Gallery loaded but no images found (may be empty)\n');
      }
    } catch (error) {
      console.log(`❌ Gallery test failed: ${error.message}\n`);
    }

    // Test 3: Test Language Switching
    console.log('🌐 Test 3: Testing Language Switching...');
    try {
      // Find and click language switcher dropdown
      const langButton = await page.$('button:has(svg)'); // Language switcher has Globe icon
      if (langButton) {
        await langButton.click();
        await wait(500);
        
        // Find and click Arabic option in dropdown
        const arabicOption = await page.evaluateHandle(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
          return items.find(item => item.textContent.includes('العربية'));
        });
        
        if (arabicOption && arabicOption.asElement()) {
          await arabicOption.asElement().click();
          await wait(2000);
          const currentLang = await page.evaluate(() => document.documentElement.lang);
          console.log(`Current Language: ${currentLang}`);
          console.log('✅ Language switched successfully\n');
        } else {
          console.log('⚠️  Arabic option not found in dropdown\n');
        }
      } else {
        console.log('⚠️  Language switcher button not found\n');
      }
    } catch (error) {
      console.log(`❌ Language switch test failed: ${error.message}\n`);
    }

    // Test 4: Check Gallery Section (Arabic)
    console.log('🖼️  Test 4: Testing Gallery Section (Arabic)...');
    try {
      await page.evaluate(() => {
        const gallery = document.querySelector('#gallery');
        if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
      });
      await wait(3000);

      const galleryErrorAr = await page.evaluate(() => {
        const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
        return errorElement ? errorElement.textContent.trim() : null;
      });
      
      if (galleryErrorAr) {
        console.log(`Gallery Error (Arabic): ${galleryErrorAr}`);
      }

      const imageCountAr = await page.evaluate(() => {
        const images = document.querySelectorAll('#gallery img[src]');
        return images.length;
      });
      console.log(`Gallery Images Found (Arabic): ${imageCountAr}\n`);
    } catch (error) {
      console.log(`❌ Arabic gallery test failed: ${error.message}\n`);
    }

    // Test 5: Test Photo Upload Section
    console.log('📤 Test 5: Testing Photo Upload Section...');
    try {
      // Scroll to upload section
      await page.evaluate(() => {
        const upload = document.querySelector('#upload');
        if (upload) upload.scrollIntoView({ behavior: 'smooth' });
      });
      await wait(2000);

      // Check upload section title
      const uploadTitle = await page.evaluate(() => {
        const title = document.querySelector('#upload h2');
        return title ? title.textContent.trim() : null;
      });
      console.log(`Upload Section Title: ${uploadTitle}`);

      // Check for upload input
      const uploadInput = await page.evaluate(() => {
        const input = document.querySelector('#upload input[type="file"]');
        return input !== null;
      });
      console.log(`Upload Input Found: ${uploadInput}`);

      // Check for error messages (if upload folder not configured)
      const uploadError = await page.evaluate(() => {
        // Look for any toast notifications or error messages
        const errorElements = document.querySelectorAll('[role="alert"], .destructive, [class*="error"]');
        return Array.from(errorElements).map(el => el.textContent.trim()).filter(Boolean);
      });
      
      if (uploadError.length > 0) {
        console.log(`⚠️  Upload Errors Found: ${uploadError.join(', ')}`);
      }

      console.log('✅ Upload section accessible\n');
    } catch (error) {
      console.log(`❌ Upload test failed: ${error.message}\n`);
    }

    // Test 6: Test Configuration Loading
    console.log('⚙️  Test 6: Testing Configuration Loading...');
    try {
      const configStatus = await page.evaluate(async () => {
        try {
          // Check if config is loaded by looking for error messages
          const galleryError = document.querySelector('#gallery [data-gallery-error="true"]');
          const uploadSection = document.querySelector('#upload');
          const galleryEmpty = document.querySelector('#gallery [data-gallery-empty="true"]');
          
          return {
            galleryHasError: galleryError !== null,
            galleryIsEmpty: galleryEmpty !== null,
            uploadSectionExists: uploadSection !== null,
            galleryErrorText: galleryError ? galleryError.textContent.trim() : null,
            galleryEmptyText: galleryEmpty ? galleryEmpty.textContent.trim() : null
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      console.log('Configuration Status:', JSON.stringify(configStatus, null, 2));
      console.log('✅ Configuration check completed\n');
    } catch (error) {
      console.log(`❌ Configuration test failed: ${error.message}\n`);
    }

    // Test 7: Test Error Messages in Both Languages
    console.log('💬 Test 7: Testing Error Messages Translation...');
    try {
      // Switch to English first
      const langButtonEn = await page.$('button:has(svg)');
      if (langButtonEn) {
        await langButtonEn.click();
        await wait(500);
        const englishOption = await page.evaluateHandle(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
          return items.find(item => item.textContent.includes('English'));
        });
        if (englishOption && englishOption.asElement()) {
          await englishOption.asElement().click();
          await wait(2000);
        }
      }

      const englishErrors = await page.evaluate(() => {
        const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
        return errorElement ? errorElement.textContent.trim() : null;
      });
      console.log(`English Error Message: ${englishErrors || 'None (gallery may be loading or empty)'}`);

      // Switch to Arabic
      const langButtonAr = await page.$('button:has(svg)');
      if (langButtonAr) {
        await langButtonAr.click();
        await wait(500);
        const arabicOption = await page.evaluateHandle(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
          return items.find(item => item.textContent.includes('العربية'));
        });
        if (arabicOption && arabicOption.asElement()) {
          await arabicOption.asElement().click();
          await wait(2000);
        }
      }

      const arabicErrors = await page.evaluate(() => {
        const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
        return errorElement ? errorElement.textContent.trim() : null;
      });
      console.log(`Arabic Error Message: ${arabicErrors || 'None (gallery may be loading or empty)'}`);

      if (englishErrors && arabicErrors && englishErrors !== arabicErrors) {
        console.log('✅ Error messages are properly translated\n');
      } else {
        console.log('⚠️  Error message translation may need verification\n');
      }
    } catch (error) {
      console.log(`❌ Error message test failed: ${error.message}\n`);
    }

    console.log('✅ All tests completed!');
    await wait(2000);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await browser.close();
  }
}

// Run tests
testUploadAndGallery().catch(console.error);

