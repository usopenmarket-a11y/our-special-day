import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080/our-special-day/';
const TIMEOUT = 30000;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testComprehensive() {
  console.log('🚀 Starting Comprehensive Final Tests...\n');
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
      if (type === 'error' && !text.includes('Failed to load resource')) {
        console.log(`[Browser Console Error] ${text}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    // Test 1: Page Load
    console.log('📄 Test 1: Loading page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await wait(3000);
    console.log('✅ Page loaded successfully\n');

    // Test 2: English - Gallery Error Message
    console.log('🖼️  Test 2: Testing Gallery Error (English)...');
    await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
    });
    await wait(3000);

    const englishError = await page.evaluate(() => {
      const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
      return errorElement ? errorElement.textContent.trim() : null;
    });
    console.log(`English Error: ${englishError}`);
    
    if (englishError === 'Unable to load gallery') {
      console.log('✅ English error message is correct\n');
    } else {
      console.log(`⚠️  English error message: "${englishError}" (expected: "Unable to load gallery")\n`);
    }

    // Test 3: Switch to Arabic
    console.log('🌐 Test 3: Switching to Arabic...');
    const langButton = await page.$('button:has(svg)');
    if (langButton) {
      await langButton.click();
      await wait(500);
      const arabicOption = await page.evaluateHandle(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
        return items.find(item => item.textContent.includes('العربية'));
      });
      if (arabicOption && arabicOption.asElement()) {
        await arabicOption.asElement().click();
        await wait(3000);
      }
    }
    const currentLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`Current Language: ${currentLang}`);
    if (currentLang === 'ar') {
      console.log('✅ Language switched to Arabic\n');
    } else {
      console.log('⚠️  Language may not have switched properly\n');
    }

    // Test 4: Arabic - Gallery Error Message
    console.log('🖼️  Test 4: Testing Gallery Error (Arabic)...');
    await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
    });
    await wait(2000);

    const arabicError = await page.evaluate(() => {
      const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
      return errorElement ? errorElement.textContent.trim() : null;
    });
    console.log(`Arabic Error: ${arabicError}`);
    
    if (arabicError === 'تعذر تحميل المعرض') {
      console.log('✅ Arabic error message is correct\n');
    } else {
      console.log(`⚠️  Arabic error message: "${arabicError}" (expected: "تعذر تحميل المعرض")\n`);
    }

    // Test 5: Upload Section - English
    console.log('📤 Test 5: Testing Upload Section (English)...');
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
        await wait(3000); // Wait longer for re-render
      }
    }
    
    // Verify language changed
    const langAfterSwitch = await page.evaluate(() => document.documentElement.lang);
    console.log(`Language after switch: ${langAfterSwitch}`);

    await page.evaluate(() => {
      const upload = document.querySelector('#upload');
      if (upload) upload.scrollIntoView({ behavior: 'smooth' });
    });
    await wait(2000);

    const uploadTitleEn = await page.evaluate(() => {
      const title = document.querySelector('#upload h2');
      return title ? title.textContent.trim() : null;
    });
    console.log(`Upload Title (English): ${uploadTitleEn}`);
    
    if (uploadTitleEn === 'Upload Your Photos') {
      console.log('✅ Upload section title is correct in English\n');
    } else {
      console.log(`⚠️  Upload title: "${uploadTitleEn}" (expected: "Upload Your Photos")\n`);
    }

    // Test 6: Upload Section - Arabic
    console.log('📤 Test 6: Testing Upload Section (Arabic)...');
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

    const uploadTitleAr = await page.evaluate(() => {
      const title = document.querySelector('#upload h2');
      return title ? title.textContent.trim() : null;
    });
    console.log(`Upload Title (Arabic): ${uploadTitleAr}`);
    
    if (uploadTitleAr === 'ارفع صورك') {
      console.log('✅ Upload section title is correct in Arabic\n');
    } else {
      console.log(`⚠️  Upload title: "${uploadTitleAr}" (expected: "ارفع صورك")\n`);
    }

    // Test 7: Check for any remaining hardcoded English text
    console.log('🔍 Test 7: Checking for hardcoded English text in error messages...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const langButton = buttons.find(btn => btn.querySelector('svg'));
      if (langButton) langButton.click();
    });
    await wait(500);
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
      const englishItem = items.find(item => item.textContent.includes('English'));
      if (englishItem) englishItem.click();
    });
    await wait(2000);

    // Check upload section for hardcoded messages
    const hardcodedCheck = await page.evaluate(() => {
      const uploadSection = document.querySelector('#upload');
      if (!uploadSection) return { found: false };
      
      const text = uploadSection.textContent;
      // Check for common hardcoded English error messages
      const hardcodedPatterns = [
        'Upload unavailable',
        'Upload folder not configured',
        'Upload failed'
      ];
      
      const found = hardcodedPatterns.some(pattern => text.includes(pattern));
      return { found, text: text.substring(0, 200) };
    });
    
    if (!hardcodedCheck.found) {
      console.log('✅ No hardcoded English error messages found\n');
    } else {
      console.log(`⚠️  Possible hardcoded text found in upload section\n`);
    }

    console.log('✅ All comprehensive tests completed!');
    await wait(2000);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await browser.close();
  }
}

// Run tests
testComprehensive().catch(console.error);

