// Test Supabase connection and get-config function
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080/our-special-day/';

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Intercept network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('get-config')) {
        requests.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });

    const responses = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('supabase') || url.includes('get-config')) {
        responses.push({
          url: url,
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📡 Network Requests to Supabase:\n');
    requests.forEach(req => {
      console.log(`   ${req.method} ${req.url}`);
    });

    console.log('\n📥 Responses:\n');
    responses.forEach(res => {
      const statusIcon = res.status === 200 ? '✅' : res.status === 404 ? '❌' : res.status === 401 ? '🔒' : '⚠️';
      console.log(`   ${statusIcon} ${res.status} ${res.statusText} - ${res.url}`);
    });

    // Check what Supabase URL is being used
    const supabaseInfo = await page.evaluate(() => {
      // Try to get Supabase URL from window or localStorage
      return {
        location: window.location.href,
        // Check if there's any Supabase config in localStorage
        localStorage: Object.keys(localStorage).filter(key => key.includes('supabase')),
      };
    });

    console.log('\n🌐 Current Configuration:\n');
    console.log(`   Page URL: ${supabaseInfo.location}`);
    console.log(`   LocalStorage keys: ${supabaseInfo.localStorage.length > 0 ? supabaseInfo.localStorage.join(', ') : 'None'}`);

    // Check console for Supabase URL
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('VITE_SUPABASE') || text.includes('Supabase') || text.includes('supabase')) {
        consoleMessages.push(text);
      }
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (consoleMessages.length > 0) {
      console.log('\n💬 Console Messages:\n');
      consoleMessages.forEach(msg => console.log(`   ${msg}`));
    }

    // Check environment variables
    const envCheck = await page.evaluate(() => {
      // Check if we can access import.meta.env (Vite)
      try {
        // This won't work directly, but we can check the error messages
        return 'Cannot access env directly from page context';
      } catch (e) {
        return e.message;
      }
    });

    console.log('\n📋 Recommendations:\n');
    
    const has404 = responses.some(r => r.status === 404);
    const has401 = responses.some(r => r.status === 401);
    
    if (has404) {
      console.log('❌ 404 Error: get-config function not found');
      console.log('   → Deploy the function: supabase functions deploy get-config');
      console.log('   → Or create it in Supabase Dashboard\n');
    }
    
    if (has401) {
      console.log('🔒 401 Error: Authentication failed');
      console.log('   → Check your .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
      console.log('   → Restart dev server after changing .env\n');
    }

    if (!has404 && !has401 && responses.length === 0) {
      console.log('⚠️  No Supabase requests detected');
      console.log('   → Check if VITE_SUPABASE_URL is set in .env file');
      console.log('   → Make sure dev server is reading .env file\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testConnection().catch(console.error);

