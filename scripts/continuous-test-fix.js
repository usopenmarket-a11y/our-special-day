import puppeteer from 'puppeteer';

const WEBSITE_URL = process.env.TEST_URL || 'http://localhost:8080';
const MAX_ITERATIONS = 5;

async function continuousTestFix() {
  console.log('🔄 Starting Continuous Test-Fix Loop...\n');
  
  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log('\n' + '='.repeat(70));
    console.log(`ITERATION ${iteration}/${MAX_ITERATIONS}`);
    console.log('='.repeat(70));
    
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--autoplay-policy=no-user-gesture-required'],
    });

    try {
      const page = await browser.newPage();
      page.setViewport({ width: 1280, height: 720 });

      const apiCalls = [];
      const consoleLogs = [];
      const errors = [];

      // Capture API calls
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('get-guests') || url.includes('save-rsvp')) {
          const postData = request.postData();
          if (postData) {
            try {
              apiCalls.push({
                type: 'request',
                url: url.substring(0, 100),
                method: request.method(),
                body: JSON.parse(postData),
                timestamp: new Date().toISOString()
              });
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('get-guests') || url.includes('save-rsvp')) {
          try {
            const data = await response.json();
            apiCalls.push({
              type: 'response',
              url: url.substring(0, 100),
              status: response.status(),
              data: data,
              timestamp: new Date().toISOString()
            });
            console.log(`📡 API ${url.includes('get-guests') ? 'get-guests' : 'save-rsvp'}: Status ${response.status()}`);
          } catch (e) {
            // Try text
            try {
              const text = await response.text();
              apiCalls.push({
                type: 'response',
                url: url.substring(0, 100),
                status: response.status(),
                error: text.substring(0, 200),
                timestamp: new Date().toISOString()
              });
            } catch (e2) {
              // Ignore
            }
          }
        }
      });

      // Capture console
      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('Fetched') || text.includes('getDisplayName') || text.includes('Table') || 
            text.includes('English') || text.includes('Arabic') || text.includes('Error') || 
            text.includes('Sarah') || text.includes('Hossni')) {
          consoleLogs.push(text);
        }
        if (msg.type() === 'error') {
          errors.push(text);
        }
      });

      page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });

      // Navigate
      console.log('📱 Navigating to website...');
      await page.goto(WEBSITE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Scroll to RSVP
      await page.evaluate(() => {
        const rsvpSection = document.querySelector('#rsvp');
        if (rsvpSection) {
          rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Test 1: Search "Sarah abdelrahman"
      console.log('\n🔍 Test 1: Search "Sarah abdelrahman"');
      const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 300));
        await searchInput.type('Sarah abdelrahman', { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Click search
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const searchBtn = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('search') || text.includes('بحث');
          });
          if (searchBtn) searchBtn.click();
        });

        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      // Get results
      const results = await page.evaluate(() => {
        const rsvpSection = document.querySelector('#rsvp');
        if (!rsvpSection) return null;

        const containers = Array.from(rsvpSection.querySelectorAll('div')).filter(el => {
          return el.querySelector('input[type="checkbox"]') !== null;
        });

        if (containers.length === 0) return { found: false };

        const container = containers[0];
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
        const guestLabels = Array.from(container.querySelectorAll('label')).filter(label => {
          return label.querySelector('input[type="checkbox"]') !== null;
        });

        const guestNames = guestLabels.map(label => {
          const nameSpan = label.querySelector('span.font-body, span.text-foreground');
          return nameSpan ? nameSpan.textContent?.trim() : label.textContent?.trim();
        }).filter(Boolean);

        const familyGroups = Array.from(container.querySelectorAll('*')).filter(el => {
          const hasUsersIcon = el.querySelector('svg') !== null;
          const text = el.textContent?.trim() || '';
          return hasUsersIcon && text.length > 0 && text.length < 100;
        }).map(el => el.textContent?.trim()).filter(Boolean);

        return {
          found: true,
          checkboxCount: checkboxes.length,
          guestNames: guestNames,
          familyGroups: familyGroups
        };
      });

      // Analyze results
      console.log('\n📊 Analysis:');
      
      const getGuestsResponse = apiCalls.find(call => call.type === 'response' && call.url.includes('get-guests'));
      if (getGuestsResponse) {
        console.log(`   API Status: ${getGuestsResponse.status}`);
        if (getGuestsResponse.status === 200 && getGuestsResponse.data) {
          console.log(`   ✅ API Working`);
          console.log(`   Guests returned: ${getGuestsResponse.data.guests?.length || 0}`);
          
          if (getGuestsResponse.data.guests && getGuestsResponse.data.guests.length > 0) {
            const guest = getGuestsResponse.data.guests[0];
            console.log(`   First guest structure:`);
            console.log(`     - Has englishName: ${!!guest.englishName}`);
            console.log(`     - Has arabicName: ${!!guest.arabicName}`);
            console.log(`     - Has familyGroup: ${!!guest.familyGroup}`);
            console.log(`     - Has tableNumber: ${!!guest.tableNumber}`);
            console.log(`     - Has old 'name' field: ${!!guest.name} ${guest.name ? '⚠️ OLD FORMAT!' : ''}`);
            
            if (guest.name && !guest.englishName) {
              console.log(`   ❌ ISSUE: API returning old format (name instead of englishName)`);
            }
          }
          
          console.log(`   Search Language: ${getGuestsResponse.data.searchLanguage || 'N/A'}`);
        } else if (getGuestsResponse.status === 503) {
          console.log(`   ❌ ISSUE: Function failed to start (503 error)`);
          console.log(`   Error: ${getGuestsResponse.error || 'Check Supabase logs'}`);
        } else {
          console.log(`   ❌ ISSUE: API returned error status ${getGuestsResponse.status}`);
        }
      } else {
        console.log(`   ⚠️  No API response captured`);
      }

      if (results && results.found) {
        console.log(`   UI Results: ${results.checkboxCount} checkboxes, ${results.guestNames.length} names`);
        console.log(`   Guest Names: ${JSON.stringify(results.guestNames)}`);
        
        const hasEnglishName = results.guestNames.some(name => 
          name.toLowerCase().includes('sarah') && name.toLowerCase().includes('abdelrahman')
        );
        const hasArabicName = results.guestNames.some(name => 
          name.includes('سارة') || name.includes('عبد الرحمان')
        );
        
        if (hasEnglishName) {
          console.log(`   ✅ English name displayed correctly`);
        } else if (hasArabicName) {
          console.log(`   ❌ ISSUE: Arabic name shown when searching in English`);
        } else {
          console.log(`   ❌ ISSUE: No matching names found in UI`);
        }
      } else {
        console.log(`   ❌ ISSUE: No results displayed in UI`);
      }

      // Show errors with full details
      if (errors.length > 0) {
        console.log(`\n   ⚠️  Errors found: ${errors.length}`);
        errors.slice(0, 5).forEach((err, i) => {
          const errorStr = typeof err === 'string' ? err : JSON.stringify(err);
          console.log(`     ${i + 1}. ${errorStr.substring(0, 200)}`);
        });
      }
      
      // Try to get actual error from page
      const pageErrors = await page.evaluate(() => {
        const errors = [];
        // Check for any error messages in the DOM
        const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('error') || text.includes('failed') || text.includes('503');
        });
        errorElements.slice(0, 3).forEach(el => {
          errors.push(el.textContent?.trim().substring(0, 150));
        });
        return errors;
      });
      
      if (pageErrors.length > 0) {
        console.log(`\n   📄 Page Error Messages:`);
        pageErrors.forEach((err, i) => {
          console.log(`     ${i + 1}. ${err}`);
        });
      }

      // Show relevant console logs
      if (consoleLogs.length > 0) {
        console.log(`\n   📝 Relevant Logs:`);
        consoleLogs.slice(0, 5).forEach((log, i) => {
          console.log(`     ${i + 1}. ${log.substring(0, 150)}`);
        });
      }

      // Determine if we should continue
      const apiWorking = getGuestsResponse && getGuestsResponse.status === 200;
      const uiWorking = results && results.found && results.guestNames.length > 0;
      const correctFormat = getGuestsResponse?.data?.guests?.[0]?.englishName && !getGuestsResponse?.data?.guests?.[0]?.name;

      if (apiWorking && uiWorking && correctFormat) {
        console.log(`\n✅ SUCCESS! All tests passing. Breaking loop.`);
        break;
      } else {
        console.log(`\n⚠️  Issues found. Will continue to next iteration...`);
        if (iteration < MAX_ITERATIONS) {
          console.log(`   Waiting 3 seconds before next iteration...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      await browser.close();
    } catch (error) {
      console.error(`❌ Iteration ${iteration} failed:`, error.message);
      await browser.close();
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 Continuous Test Loop Complete');
  console.log('='.repeat(70));
}

continuousTestFix().catch(console.error);

