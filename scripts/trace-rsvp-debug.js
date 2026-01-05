import puppeteer from 'puppeteer';

const WEBSITE_URL = process.env.TEST_URL || 'http://localhost:8080';

async function traceRSVPDebug() {
  console.log('🔍 Starting RSVP Debug Trace...\n');
  console.log(`🌐 Opening website: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 720 });

    // Capture all network requests and responses - set up BEFORE navigation
    const apiCalls = [];
    const requestBodies = new Map();

    // Capture request bodies
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('get-guests') || url.includes('save-rsvp')) {
        const postData = request.postData();
        if (postData) {
          requestBodies.set(url, postData);
        }
      }
    });

    // Capture responses
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('get-guests') || url.includes('save-rsvp')) {
        try {
          // Clone the response to read it without consuming it
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          const requestBody = requestBodies.get(url);
          apiCalls.push({
            url: url.substring(0, 150),
            status: response.status(),
            method: response.request().method(),
            requestBody: requestBody ? (typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody) : null,
            responseData: data,
            timestamp: new Date().toISOString()
          });
          console.log(`📡 Captured API call: ${url.includes('get-guests') ? 'get-guests' : 'save-rsvp'}`);
        } catch (e) {
          // Try to get text instead
          try {
            const text = await response.text();
            console.log(`⚠️  Response text from ${url}: ${text.substring(0, 200)}`);
          } catch (e2) {
            console.log(`⚠️  Error reading response from ${url}: ${e.message}`);
          }
        }
      }
    });

    // Capture console logs
    const consoleLogs = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Fetched') || text.includes('getDisplayName') || text.includes('Table') || text.includes('English') || text.includes('Arabic')) {
        consoleLogs.push(text);
      }
    });

    // Navigate to website
    console.log('📱 Navigating to website...');
    await page.goto(WEBSITE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to RSVP section
    console.log('📜 Scrolling to RSVP section...');
    await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 1: Search for "Sarah abdelrahman"
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Search for "Sarah abdelrahman"');
    console.log('='.repeat(60));

    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
    if (!searchInput) {
      throw new Error('Search input not found');
    }

    // Clear and type search query
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(resolve => setTimeout(resolve, 300));

    await searchInput.type('Sarah abdelrahman', { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click search button - use page.evaluate to ensure it's clicked
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const searchBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('search') || text.includes('بحث');
      });
      if (searchBtn) {
        searchBtn.click();
        return true;
      }
      return false;
    });

    if (!buttonClicked) {
      console.log('⚠️  Search button not found, trying Enter key...');
      await page.keyboard.press('Enter');
    }

    // Wait for API call and results
    console.log('⏳ Waiting for search results...');
    console.log(`   Waiting for API call (current count: ${apiCalls.length})...`);
    
    // Wait up to 5 seconds for API call
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (apiCalls.length > 0) {
        console.log(`   ✅ API call received after ${(i + 1) * 0.5}s`);
        break;
      }
    }
    
    // Give a bit more time for UI to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get API response
    const getGuestsCall = apiCalls.find(call => call.url.includes('get-guests'));
    if (getGuestsCall) {
      console.log('\n📡 get-guests API Response:');
      console.log(JSON.stringify(getGuestsCall.responseData, null, 2));
      
      if (getGuestsCall.responseData.guests) {
        console.log(`\n✅ Found ${getGuestsCall.responseData.guests.length} guest(s) in API response:`);
        getGuestsCall.responseData.guests.forEach((guest, i) => {
          console.log(`  ${i + 1}. English: "${guest.englishName || 'N/A'}", Arabic: "${guest.arabicName || 'N/A'}", Family: "${guest.familyGroup || 'N/A'}", Table: "${guest.tableNumber || 'N/A'}"`);
        });
        console.log(`   Search Language: ${getGuestsCall.responseData.searchLanguage || 'N/A'}`);
      }
    } else {
      console.log('❌ No get-guests API call found');
    }

    // Get what's actually displayed on the page
    const displayedContent = await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (!rsvpSection) return null;

      // Find guest list container
      const containers = Array.from(rsvpSection.querySelectorAll('div')).filter(el => {
        return el.querySelector('input[type="checkbox"]') !== null;
      });

      if (containers.length === 0) return { found: false, message: 'No guest container found' };

      const container = containers[0];
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
      
      // Get all labels with checkboxes
      const guestLabels = Array.from(container.querySelectorAll('label')).filter(label => {
        return label.querySelector('input[type="checkbox"]') !== null;
      });

      const guestNames = guestLabels.map(label => {
        const nameSpan = label.querySelector('span.font-body, span.text-foreground');
        return nameSpan ? nameSpan.textContent?.trim() : label.textContent?.trim();
      }).filter(Boolean);

      // Get family groups
      const familyGroups = Array.from(container.querySelectorAll('*')).filter(el => {
        const hasUsersIcon = el.querySelector('svg') !== null;
        const text = el.textContent?.trim() || '';
        return hasUsersIcon && text.length > 0 && text.length < 100;
      }).map(el => el.textContent?.trim()).filter(Boolean);

      return {
        found: true,
        checkboxCount: checkboxes.length,
        guestNames: guestNames,
        familyGroups: familyGroups,
        rawHTML: container.innerHTML.substring(0, 1000) // First 1000 chars for debugging
      };
    });

    console.log('\n📺 Displayed Content on Page:');
    if (displayedContent && displayedContent.found) {
      console.log(`   Checkboxes: ${displayedContent.checkboxCount}`);
      console.log(`   Guest Names: ${JSON.stringify(displayedContent.guestNames)}`);
      console.log(`   Family Groups: ${JSON.stringify(displayedContent.familyGroups)}`);
    } else {
      console.log('   ❌ No guest results displayed');
      if (displayedContent) {
        console.log(`   Message: ${displayedContent.message}`);
      }
    }

    // Get console logs
    console.log('\n📝 Relevant Console Logs:');
    consoleLogs.forEach((log, i) => {
      console.log(`   ${i + 1}. ${log}`);
    });

    // Test 2: Try to submit RSVP and trace save-rsvp
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Submit RSVP and trace save-rsvp API');
    console.log('='.repeat(60));

    if (displayedContent && displayedContent.checkboxCount > 0) {
      // Click first checkbox
      const firstCheckbox = await page.$('input[type="checkbox"]');
      if (firstCheckbox) {
        await firstCheckbox.click();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Select "Attending"
        const radioButtons = await page.$$('input[type="radio"]');
        if (radioButtons.length > 0) {
          await radioButtons[0].click();
          await new Promise(resolve => setTimeout(resolve, 500));

          // Submit
          const submitButton = await page.$('button[type="submit"]');
          if (submitButton) {
            const isDisabled = await page.evaluate((btn) => btn.disabled, submitButton);
            if (!isDisabled) {
              console.log('   Submitting RSVP...');
              await submitButton.click();
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Get save-rsvp API call
              const saveRsvpCall = apiCalls.find(call => call.url.includes('save-rsvp'));
              if (saveRsvpCall) {
                console.log('\n📡 save-rsvp API Request:');
                console.log(`   Request Body: ${saveRsvpCall.requestBody || 'N/A'}`);
                console.log('\n📡 save-rsvp API Response:');
                console.log(JSON.stringify(saveRsvpCall.responseData, null, 2));
              } else {
                console.log('❌ No save-rsvp API call found');
              }

              // Check for table number in thank you message
              const thankYouContent = await page.evaluate(() => {
                const rsvpSection = document.querySelector('#rsvp');
                if (!rsvpSection) return null;
                const text = rsvpSection.textContent || '';
                return {
                  hasThankYou: text.includes('Thank you') || text.includes('شكراً'),
                  hasTableNumber: text.includes('table') || text.includes('طاولة') || /\d+/.test(text),
                  fullText: text.substring(0, 500)
                };
              });

              console.log('\n📺 Thank You Message:');
              if (thankYouContent) {
                console.log(`   Has Thank You: ${thankYouContent.hasThankYou}`);
                console.log(`   Has Table Number: ${thankYouContent.hasTableNumber}`);
                console.log(`   Content: ${thankYouContent.fullText.substring(0, 200)}...`);
              }
            }
          }
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRACE SUMMARY');
    console.log('='.repeat(60));
    console.log(`   API Calls Captured: ${apiCalls.length}`);
    console.log(`   Console Logs: ${consoleLogs.length}`);
    console.log(`   Results Displayed: ${displayedContent && displayedContent.found ? 'Yes' : 'No'}`);

    // Keep browser open
    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

traceRSVPDebug().catch(console.error);

