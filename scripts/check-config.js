import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080/our-special-day/';

async function checkConfig() {
  console.log('🔍 Checking Configuration Status...\n');
  console.log(`Testing URL: ${BASE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        console.log(`[Console] ${text}`);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check config status
    const configStatus = await page.evaluate(() => {
      // Try to access config from React DevTools or check network requests
      return {
        url: window.location.href,
        supabaseUrl: window.location.origin,
      };
    });

    console.log('📊 Configuration Check Results:\n');
    
    // Check for config errors in console
    const configErrors = consoleMessages.filter(msg => 
      msg.includes('Error fetching config') || 
      msg.includes('Failed to load configuration') ||
      msg.includes('401') ||
      msg.includes('404')
    );

    if (configErrors.length > 0) {
      console.log('❌ Configuration Issues Found:\n');
      configErrors.forEach(err => console.log(`   - ${err}`));
      console.log('\n');
    }

    // Check gallery status
    await page.evaluate(() => {
      const gallery = document.querySelector('#gallery');
      if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const galleryStatus = await page.evaluate(() => {
      const errorElement = document.querySelector('#gallery [data-gallery-error="true"]');
      const emptyElement = document.querySelector('#gallery [data-gallery-empty="true"]');
      const images = document.querySelectorAll('#gallery img[src]');
      
      return {
        hasError: errorElement !== null,
        isEmpty: emptyElement !== null,
        imageCount: images.length,
        errorText: errorElement ? errorElement.textContent.trim() : null,
      };
    });

    console.log('🖼️  Gallery Status:');
    console.log(`   - Has Error: ${galleryStatus.hasError}`);
    console.log(`   - Is Empty: ${galleryStatus.isEmpty}`);
    console.log(`   - Images Found: ${galleryStatus.imageCount}`);
    if (galleryStatus.errorText) {
      console.log(`   - Error: ${galleryStatus.errorText}`);
    }
    console.log('');

    // Check upload status
    await page.evaluate(() => {
      const upload = document.querySelector('#upload');
      if (upload) upload.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const uploadStatus = await page.evaluate(() => {
      const uploadSection = document.querySelector('#upload');
      const input = document.querySelector('#upload input[type="file"]');
      return {
        exists: uploadSection !== null,
        hasInput: input !== null,
      };
    });

    console.log('📤 Upload Section Status:');
    console.log(`   - Section Exists: ${uploadStatus.exists}`);
    console.log(`   - Has File Input: ${uploadStatus.hasInput}`);
    console.log('');

    // Summary and recommendations
    console.log('📋 Summary:\n');
    
    if (galleryStatus.hasError && galleryStatus.errorText?.includes('Unable to load gallery')) {
      console.log('❌ Gallery is not configured properly.');
      console.log('   → Missing GALLERY_FOLDER_ID in Supabase secrets\n');
    }
    
    if (configErrors.length > 0) {
      console.log('❌ Configuration is not loading from Supabase.');
      console.log('   → Check if get-config function is deployed');
      console.log('   → Check if secrets are set in Supabase Dashboard\n');
    }

    console.log('🔧 To Fix These Issues:\n');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to: Project Settings → Edge Functions → Secrets');
    console.log('3. Add these secrets:');
    console.log('   - GUEST_SHEET_ID: Your Google Sheet ID');
    console.log('   - UPLOAD_FOLDER_ID: Your Google Drive upload folder ID');
    console.log('   - GALLERY_FOLDER_ID: Your Google Drive gallery folder ID');
    console.log('4. Deploy the get-config function:');
    console.log('   supabase functions deploy get-config');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkConfig().catch(console.error);

