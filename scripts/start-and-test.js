import { spawn } from 'child_process';
import puppeteer from 'puppeteer';

// Try multiple ports - Vite might use different ports
const POSSIBLE_PORTS = [5173, 8080, 8081, 3000];
let WEBSITE_URL = 'http://localhost:5173';

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function testRSVP() {
  console.log('🚀 Starting dev server and testing...\n');
  
  // Start dev server
  console.log('📦 Starting npm run dev...');
  const devServer = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'pipe'
  });

  let serverReady = false;
  
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    // Extract port from Vite output
    const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
    if (portMatch) {
      WEBSITE_URL = `http://localhost:${portMatch[1]}`;
      console.log(`\n✅ Detected server URL: ${WEBSITE_URL}`);
      serverReady = true;
    }
    if (output.includes('Local:') || output.includes('localhost')) {
      serverReady = true;
    }
  });

  devServer.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Wait for server to be ready
  console.log('\n⏳ Waiting for dev server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const isReady = await waitForServer(WEBSITE_URL);
  if (!isReady) {
    console.error('❌ Dev server did not start in time');
    devServer.kill();
    process.exit(1);
  }

  console.log('✅ Dev server is ready!\n');

  // Run test
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 720 });

    const apiCalls = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('get-guests')) {
        try {
          const body = await response.json();
          apiCalls.push({ status: response.status(), body });
        } catch (e) {
          // Ignore
        }
      }
    });

    console.log('📱 Navigating to local dev server...');
    await page.goto(WEBSITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page loaded\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to RSVP
    await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Search
    console.log('='.repeat(60));
    console.log('🔍 Searching for "Leo Hany"');
    console.log('='.repeat(60));

    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
    if (!searchInput) {
      throw new Error('Search input not found');
    }

    await searchInput.click({ clickCount: 3 });
    await searchInput.type('Leo Hany', { delay: 100 });
    console.log('⌨️  Typed "Leo Hany"');
    
    console.log('⏳ Waiting for API response (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check API response
    if (apiCalls.length > 0) {
      const lastCall = apiCalls[apiCalls.length - 1];
      const guests = lastCall.body?.guests || [];
      
      console.log(`\n📊 API Response:`);
      console.log(`   Status: ${lastCall.status}`);
      console.log(`   Guests returned: ${guests.length}\n`);
      
      guests.forEach((g, i) => {
        console.log(`   ${i + 1}. ${g.name} (Family: "${g.familyGroup || 'None'}", rowIndex: ${g.rowIndex})`);
      });

      const hasLeoHany = guests.some(g => 
        g.name.toLowerCase().includes('leo') && g.name.toLowerCase().includes('hany')
      );
      const hasMonicaAtef = guests.some(g => 
        g.name.toLowerCase().includes('monica') && g.name.toLowerCase().includes('atef')
      );

      console.log(`\n✅ Leo Hany: ${hasLeoHany ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`✅ Monica Atef: ${hasMonicaAtef ? 'FOUND' : 'NOT FOUND'}`);

      if (hasLeoHany && hasMonicaAtef) {
        console.log('\n🎉 SUCCESS: Both names in API response!');
      } else {
        console.log('\n❌ ISSUE: Missing family member in API response');
      }
    } else {
      console.log('⚠️  No API calls detected');
    }

    // Check UI
    const uiCheck = await page.evaluate(() => {
      const allText = document.body.innerText || '';
      const hasLeoHany = allText.toLowerCase().includes('leo') && allText.toLowerCase().includes('hany');
      const hasMonicaAtef = allText.toLowerCase().includes('monica') && allText.toLowerCase().includes('atef');
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      return { hasLeoHany, hasMonicaAtef, checkboxCount: checkboxes.length };
    });

    console.log(`\n📱 UI Check:`);
    console.log(`   Leo Hany visible: ${uiCheck.hasLeoHany ? '✅' : '❌'}`);
    console.log(`   Monica Atef visible: ${uiCheck.hasMonicaAtef ? '✅' : '❌'}`);
    console.log(`   Checkboxes: ${uiCheck.checkboxCount}`);

    if (uiCheck.hasLeoHany && uiCheck.hasMonicaAtef) {
      console.log('\n🎉🎉🎉 COMPLETE SUCCESS: Both names appear in dropdown!');
    }

    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
    devServer.kill();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    devServer.kill();
    process.exit(1);
  }
}

testRSVP().catch(console.error);

