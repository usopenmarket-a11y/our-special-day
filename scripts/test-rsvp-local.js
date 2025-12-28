import puppeteer from 'puppeteer';

const WEBSITE_URL = 'http://localhost:5173';

async function testRSVPLocal() {
  console.log('🔍 Testing RSVP Family Search Locally...\n');
  console.log(`🌐 Opening: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 720 });

    // Capture console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('Fetched') || text.includes('guests') || text.includes('Family') || text.includes('Search')) {
        console.log(`   [CONSOLE] ${text}`);
      }
    });

    // Capture network requests
    const apiCalls = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('get-guests')) {
        const status = response.status();
        let body = null;
        try {
          body = await response.json();
        } catch (e) {
          body = await response.text();
        }
        apiCalls.push({ url, status, body });
        console.log(`\n   [API] get-guests called - Status: ${status}`);
        if (body && body.guests) {
          console.log(`   [API] Returned ${body.guests.length} guests:`);
          body.guests.forEach((g, i) => {
            console.log(`      ${i + 1}. ${g.name} (Family: ${g.familyGroup || 'None'}, rowIndex: ${g.rowIndex})`);
          });
        }
      }
    });

    console.log('📱 Navigating to local dev server...');
    try {
      await page.goto(WEBSITE_URL, {
        waitUntil: 'networkidle2',
        timeout: 10000,
      });
    } catch (error) {
      console.error('❌ Failed to connect to local server. Is it running?');
      console.error('   Run: npm run dev');
      throw error;
    }

    console.log('✅ Page loaded\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to RSVP
    console.log('='.repeat(60));
    console.log('STEP 1: Navigate to RSVP Section');
    console.log('='.repeat(60));

    await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Search for "Leo Hany"
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Search for "Leo Hany"');
    console.log('='.repeat(60));

    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
    
    if (!searchInput) {
      throw new Error('Search input not found');
    }

    console.log('✅ Search input found');
    console.log('⌨️  Typing "Leo Hany"...');
    
    await searchInput.click({ clickCount: 3 });
    await searchInput.type('Leo Hany', { delay: 100 });

    console.log('⏳ Waiting for search results (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check what was returned from API
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Check API Response');
    console.log('='.repeat(60));

    if (apiCalls.length > 0) {
      const lastCall = apiCalls[apiCalls.length - 1];
      if (lastCall.body && lastCall.body.guests) {
        const guests = lastCall.body.guests;
        const hasLeoHany = guests.some(g => g.name.toLowerCase().includes('leo') && g.name.toLowerCase().includes('hany'));
        const hasMonicaAtef = guests.some(g => g.name.toLowerCase().includes('monica') && g.name.toLowerCase().includes('atef'));
        
        console.log(`\n📊 API returned ${guests.length} guests:`);
        guests.forEach((g, i) => {
          console.log(`   ${i + 1}. ${g.name} (Family: "${g.familyGroup || 'None'}", rowIndex: ${g.rowIndex})`);
        });

        console.log(`\n✅ Leo Hany in API response: ${hasLeoHany ? 'YES' : 'NO'}`);
        console.log(`✅ Monica Atef in API response: ${hasMonicaAtef ? 'YES' : 'NO'}`);

        if (!hasMonicaAtef) {
          console.log('\n❌ ISSUE: Monica Atef not in API response!');
          console.log('   This means the backend is not finding family members correctly.');
          console.log('   Checking family groups...');
          
          const leoGuest = guests.find(g => g.name.toLowerCase().includes('leo') && g.name.toLowerCase().includes('hany'));
          if (leoGuest && leoGuest.familyGroup) {
            console.log(`   Leo Hany's Family Group: "${leoGuest.familyGroup}"`);
            console.log('   All guests with this family group should be included.');
          }
        }
      }
    } else {
      console.log('⚠️  No API calls detected');
    }

    // Check UI
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: Check UI Display');
    console.log('='.repeat(60));

    const uiCheck = await page.evaluate(() => {
      const allText = document.body.innerText || '';
      const hasLeoHany = allText.toLowerCase().includes('leo') && allText.toLowerCase().includes('hany');
      const hasMonicaAtef = allText.toLowerCase().includes('monica') && allText.toLowerCase().includes('atef');
      
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const labels = Array.from(document.querySelectorAll('label'));
      const guestNames = labels
        .map(l => l.textContent?.trim())
        .filter(text => text && text.length > 0 && text.length < 100)
        .filter(text => !text.includes('Select') && !text.includes('Attending') && !text.includes('Confirm'));

      return {
        hasLeoHany,
        hasMonicaAtef,
        checkboxCount: checkboxes.length,
        guestNames,
      };
    });

    console.log(`\n📊 UI Check:`);
    console.log(`   Leo Hany visible: ${uiCheck.hasLeoHany ? '✅ YES' : '❌ NO'}`);
    console.log(`   Monica Atef visible: ${uiCheck.hasMonicaAtef ? '✅ YES' : '❌ NO'}`);
    console.log(`   Checkboxes: ${uiCheck.checkboxCount}`);
    console.log(`   Guest names in UI: ${uiCheck.guestNames.length}`);
    if (uiCheck.guestNames.length > 0) {
      console.log(`   Names found:`);
      uiCheck.guestNames.forEach((name, i) => {
        console.log(`      ${i + 1}. ${name}`);
      });
    }

    // Final verdict
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULT');
    console.log('='.repeat(60));

    const apiHasBoth = apiCalls.length > 0 && 
      apiCalls[apiCalls.length - 1].body?.guests?.some(g => 
        g.name.toLowerCase().includes('monica') && g.name.toLowerCase().includes('atef')
      );

    if (uiCheck.hasLeoHany && uiCheck.hasMonicaAtef) {
      console.log('🎉 SUCCESS: Both names appear in the dropdown!');
      console.log('   ✅ Family group search is working correctly');
    } else if (apiHasBoth && !uiCheck.hasMonicaAtef) {
      console.log('⚠️  PARTIAL: API returns both names, but UI only shows one');
      console.log('   Issue is in the frontend display logic');
    } else if (!apiHasBoth) {
      console.log('❌ FAILED: API is not returning Monica Atef');
      console.log('   Issue is in the backend get-guests function');
      console.log('   Need to check:');
      console.log('   1. CSV parsing is reading Column B correctly');
      console.log('   2. Family group matching logic');
      console.log('   3. Google Sheets data structure');
    } else {
      console.log('❌ FAILED: Neither name appears');
    }

    console.log('\n🔍 Keeping browser open for 15 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testRSVPLocal().catch(console.error);

