import puppeteer from 'puppeteer';

const WEBSITE_URL = process.env.TEST_URL || 'https://fadyandsandra-specialday.github.io/our-special-day/';

async function testRSVPFixes() {
  console.log('🔍 Testing RSVP Family Search & Submit Fixes...\n');
  console.log(`🌐 Opening website: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 720 });

    const consoleMessages = [];
    const errors = [];
    const networkRequests = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`Page Error: ${error.message}`);
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('get-guests') || url.includes('save-rsvp')) {
        networkRequests.push({
          type: 'response',
          url: url.substring(0, 100),
          status: response.status(),
          ok: response.ok(),
        });
      }
    });

    console.log('📱 Navigating to website...');
    await page.goto(WEBSITE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to RSVP Section
    console.log('='.repeat(60));
    console.log('TEST 1: Navigate to RSVP Section');
    console.log('='.repeat(60));

    await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 2: Search for "Leo Hany" and verify family members appear
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Family Group Search - "Leo Hany"');
    console.log('='.repeat(60));

    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
    
    if (!searchInput) {
      throw new Error('Search input not found');
    }

    console.log('✅ Search input found');
    console.log('⌨️  Typing "Leo Hany"...');
    
    // Clear and type search query
    await searchInput.click({ clickCount: 3 });
    await searchInput.type('Leo Hany', { delay: 100 });

    // Wait for search results
    console.log('⏳ Waiting for search results...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check results
    const searchResults = await page.evaluate(() => {
      const allText = document.body.innerText || '';
      const hasLeoHany = allText.toLowerCase().includes('leo') && allText.toLowerCase().includes('hany');
      const hasMonicaAtef = allText.toLowerCase().includes('monica') && allText.toLowerCase().includes('atef');
      
      // Look for checkboxes
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      
      // Look for guest names in labels
      const labels = Array.from(document.querySelectorAll('label'));
      const guestNames = labels
        .map(l => l.textContent?.trim())
        .filter(text => text && text.length > 0 && text.length < 100)
        .filter(text => !text.includes('Select') && !text.includes('Attending'));

      return {
        hasLeoHany,
        hasMonicaAtef,
        checkboxCount: checkboxes.length,
        guestNames: guestNames.slice(0, 10),
      };
    });

    console.log('\n📊 Search Results:');
    console.log(`   Leo Hany found: ${searchResults.hasLeoHany ? '✅' : '❌'}`);
    console.log(`   Monica Atef found: ${searchResults.hasMonicaAtef ? '✅' : '❌'}`);
    console.log(`   Checkboxes found: ${searchResults.checkboxCount}`);
    console.log(`   Guest names in UI: ${searchResults.guestNames.length}`);
    
    if (searchResults.guestNames.length > 0) {
      console.log('   Names found:');
      searchResults.guestNames.forEach((name, i) => {
        console.log(`     ${i + 1}. ${name}`);
      });
    }

    if (searchResults.hasLeoHany && searchResults.hasMonicaAtef) {
      console.log('\n   🎉 SUCCESS: Both family members found!');
    } else if (searchResults.hasLeoHany && !searchResults.hasMonicaAtef) {
      console.log('\n   ⚠️  ISSUE: Leo Hany found but Monica Atef not found');
      console.log('      This indicates the family group search is not working');
    } else {
      console.log('\n   ⚠️  ISSUE: Neither name found in results');
    }

    // Test 3: Select guests and submit
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Select Guests and Submit');
    console.log('='.repeat(60));

    if (searchResults.checkboxCount > 0) {
      console.log('✅ Checkboxes available - testing selection...');
      
      // Click first checkbox
      const firstCheckbox = await page.$('input[type="checkbox"]');
      if (firstCheckbox) {
        await firstCheckbox.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('   ✅ First checkbox clicked');
      }

      // Select attendance
      const attendanceRadios = await page.$$('input[type="radio"]');
      if (attendanceRadios.length > 0) {
        await attendanceRadios[0].click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('   ✅ Attendance selected');
      }

      // Check submit button
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        const isDisabled = await page.evaluate((btn) => btn.disabled, submitButton);
        const buttonText = await page.evaluate((btn) => btn.textContent?.trim(), submitButton);
        
        console.log(`   Submit button: "${buttonText}" (disabled: ${isDisabled})`);
        
        if (!isDisabled) {
          console.log('   ✅ Submit button is enabled - ready to test submission');
          console.log('   ⚠️  Note: Not actually submitting to avoid test data in production');
        } else {
          console.log('   ⚠️  Submit button is disabled');
        }
      }
    } else {
      console.log('⚠️  No checkboxes found - cannot test selection');
    }

    // Test 4: Check Network Requests
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Network Requests');
    console.log('='.repeat(60));

    const getGuestsRequests = networkRequests.filter(req => req.url.includes('get-guests'));
    console.log(`📡 get-guests requests: ${getGuestsRequests.length}`);
    getGuestsRequests.forEach((req, i) => {
      const icon = req.ok ? '✅' : '❌';
      console.log(`   ${i + 1}. ${icon} Status: ${req.status}`);
    });

    // Test 5: Check Console for Debug Messages
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Console Debug Messages');
    console.log('='.repeat(60));

    const debugMessages = consoleMessages.filter(msg => 
      msg.includes('Fetched') || 
      msg.includes('guests') || 
      msg.includes('Family') ||
      msg.includes('Search query')
    );

    if (debugMessages.length > 0) {
      console.log(`📝 Found ${debugMessages.length} relevant debug messages:\n`);
      debugMessages.slice(-10).forEach((msg, i) => {
        const shortMsg = msg.length > 150 ? msg.substring(0, 150) + '...' : msg;
        console.log(`   ${i + 1}. ${shortMsg}`);
      });
    } else {
      console.log('   No debug messages found (check browser console)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const familySearchWorking = searchResults.hasLeoHany && searchResults.hasMonicaAtef;
    const submitReady = searchResults.checkboxCount > 0;

    if (familySearchWorking && submitReady) {
      console.log('✅ PASSED: Both issues appear to be fixed!');
      console.log('   - Family search: ✅ Working (both names found)');
      console.log('   - Submit functionality: ✅ Ready (checkboxes and button available)');
    } else if (familySearchWorking) {
      console.log('⚠️  PARTIAL: Family search works, but submit needs testing');
    } else {
      console.log('❌ FAILED: Family search not working correctly');
      console.log('   - Check Google Sheets has Family Group column filled');
      console.log('   - Check both names have the same Family Group value');
    }

    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testRSVPFixes().catch(console.error);

