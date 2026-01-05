import puppeteer from 'puppeteer';

// Use local dev server if available, otherwise use production URL
// To test locally, first run: npm run dev
// Then run: npm run test-bilingual-rsvp
const WEBSITE_URL = process.env.TEST_URL || 'http://localhost:8080';

// Test data from the user
const testGuests = [
  {
    englishName: 'Sarah abdelrahman',
    arabicName: 'سارة عبد الرحمان',
    familyGroup: "Sarah And Hossni's Family",
    tableNumber: '1'
  },
  {
    englishName: 'Hossni',
    arabicName: 'حسني',
    familyGroup: "Sarah And Hossni's Family",
    tableNumber: '2'
  },
  {
    englishName: 'Timo Email',
    arabicName: 'تيموثاوس',
    familyGroup: "Timo and Mariam's Family",
    tableNumber: '5'
  },
  {
    englishName: 'Mariam rabea',
    arabicName: 'ماريم ربيع',
    familyGroup: "Timo and Mariam's Family",
    tableNumber: '6'
  }
];

async function testBilingualRSVP() {
  console.log('🔍 Starting Bilingual RSVP Test...\n');
  console.log(`🌐 Opening website: ${WEBSITE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD, false for local testing
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 720 });

    // Listen to console messages and network requests
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
          url: url.substring(0, 150),
          status: response.status(),
          ok: response.ok(),
        });
      }
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    console.log(`   URL: ${WEBSITE_URL}`);
    console.log('   Note: Make sure the dev server is running (npm run dev)');
    
    try {
      await page.goto(WEBSITE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      console.log('✅ Page loaded successfully\n');
    } catch (error) {
      if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.error('\n❌ Connection refused!');
        console.error('   Please start the dev server first:');
        console.error('   npm run dev');
        console.error('\n   Or set TEST_URL environment variable to test a different URL:');
        console.error('   TEST_URL=https://your-production-url.com npm run test-bilingual-rsvp\n');
        throw new Error('Dev server not running. Please start it with: npm run dev');
      }
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to RSVP section
    console.log('='.repeat(60));
    console.log('TEST 1: Navigate to RSVP Section');
    console.log('='.repeat(60));
    console.log('📜 Scrolling to RSVP section...');
    
    await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const rsvpSectionFound = await page.evaluate(() => {
      return !!document.querySelector('#rsvp');
    });

    if (!rsvpSectionFound) {
      throw new Error('RSVP section not found on page');
    }
    console.log('✅ RSVP section found\n');

    // Helper function to clear search and perform new search
    const performSearch = async (query, expectedLanguage) => {
      console.log(`\n🔍 Searching for: "${query}" (Expected language: ${expectedLanguage})`);
      
      // Find and clear search input
      const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
      if (!searchInput) {
        throw new Error('Search input not found');
      }

      // Clear input
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Type search query
      await searchInput.type(query, { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Click search button - find by text content
      const searchButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('search') || text.includes('بحث');
        });
      });

      if (searchButton && searchButton.asElement()) {
        await searchButton.asElement().click();
      } else {
        // Try pressing Enter
        await page.keyboard.press('Enter');
      }

      // Wait for results
      console.log('⏳ Waiting for search results...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get search results - look specifically in the RSVP section
      const results = await page.evaluate(() => {
        // Find the RSVP section
        const rsvpSection = document.querySelector('#rsvp');
        if (!rsvpSection) return null;

        // Find the guest list container - it should have checkboxes and be inside a card
        const guestContainers = Array.from(rsvpSection.querySelectorAll('div')).filter(el => {
          const hasCheckboxes = el.querySelector('input[type="checkbox"]');
          const hasLabels = el.querySelectorAll('label').length > 0;
          // Should be inside a card-like container (has border or bg-card class)
          const isInCard = el.closest('[class*="border"], [class*="card"], [class*="bg-card"]');
          return hasCheckboxes && hasLabels && isInCard;
        });

        if (guestContainers.length === 0) return null;

        const container = guestContainers[0];
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
        
        // Get guest names from labels that contain checkboxes
        const guestLabels = Array.from(container.querySelectorAll('label')).filter(label => {
          const hasCheckbox = label.querySelector('input[type="checkbox"]');
          return hasCheckbox;
        });

        const guestNames = guestLabels.map(label => {
          // Get the text from the span inside the label (the actual name)
          const nameSpan = label.querySelector('span.font-body, span.text-foreground');
          if (nameSpan) {
            return nameSpan.textContent?.trim() || '';
          }
          // Fallback: get all text and filter out checkbox-related text
          const allText = label.textContent?.trim() || '';
          // Remove common UI text
          if (allText.includes('Select') || allText.includes('Attending') || 
              allText.includes('Submit') || allText.includes('Search') ||
              allText.includes('اختر') || allText.includes('إرسال')) {
            return null;
          }
          return allText;
        }).filter(Boolean).filter(name => name.length > 0 && name.length < 100);

        // Get family group names (they have Users icon)
        const familyGroups = Array.from(container.querySelectorAll('*')).filter(el => {
          const hasUsersIcon = el.querySelector('svg') !== null;
          const text = el.textContent?.trim() || '';
          // Family groups are usually uppercase and have specific styling
          return hasUsersIcon && text.length > 0 && text.length < 100 && 
                 !text.includes('Select') && !text.includes('اختر');
        }).map(el => el.textContent?.trim()).filter(Boolean);

        return {
          found: true,
          checkboxCount: checkboxes.length,
          guestNames: [...new Set(guestNames)],
          familyGroups: [...new Set(familyGroups)],
        };
      });

      return results;
    };

    // Test 2: Search by English name - should show English name
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Search by English Name (Sarah abdelrahman)');
    console.log('='.repeat(60));
    
    const englishSearchResults = await performSearch('Sarah abdelrahman', 'English');
    
    if (englishSearchResults && englishSearchResults.guestNames.length > 0) {
      console.log(`✅ Found ${englishSearchResults.checkboxCount} checkbox(es) and ${englishSearchResults.guestNames.length} guest name(s):`);
      englishSearchResults.guestNames.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });
      if (englishSearchResults.familyGroups && englishSearchResults.familyGroups.length > 0) {
        console.log(`   Family groups found: ${englishSearchResults.familyGroups.join(', ')}`);
      }

      // Check if English name is displayed
      const hasEnglishName = englishSearchResults.guestNames.some(name => 
        name.toLowerCase().includes('sarah') && name.toLowerCase().includes('abdelrahman')
      );
      
      if (hasEnglishName) {
        console.log('✅ English name "Sarah abdelrahman" is displayed correctly');
      } else {
        console.log('❌ English name "Sarah abdelrahman" not found in results');
        console.log(`   Found names: ${englishSearchResults.guestNames.join(', ')}`);
      }

      // Check if Hossni is also shown (family member)
      const hasHossni = englishSearchResults.guestNames.some(name => 
        name.toLowerCase().includes('hossni')
      );
      
      if (hasHossni) {
        console.log('✅ Family member "Hossni" is also displayed');
      } else {
        console.log('⚠️  Family member "Hossni" not found (might not be in same family group)');
      }

      // Check if Arabic name is NOT displayed (when searching in English)
      const hasArabicName = englishSearchResults.guestNames.some(name => 
        name.includes('سارة') || name.includes('عبد الرحمان')
      );
      
      if (!hasArabicName) {
        console.log('✅ Arabic name correctly hidden when searching in English');
      } else {
        console.log('❌ Arabic name found in results when searching in English (should show English only)');
      }
    } else {
      console.log('❌ No results found for English search');
      console.log('   This might mean:');
      console.log('   - The search API is not returning results');
      console.log('   - The results are not being displayed');
      console.log('   - The guest name is not in the Google Sheet');
    }

    // Test 3: Search by Arabic name - should show Arabic name
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Search by Arabic Name (سارة عبد الرحمان)');
    console.log('='.repeat(60));
    
    const arabicSearchResults = await performSearch('سارة عبد الرحمان', 'Arabic');
    
    if (arabicSearchResults && arabicSearchResults.guestNames.length > 0) {
      console.log(`✅ Found ${arabicSearchResults.guestNames.length} result(s):`);
      arabicSearchResults.guestNames.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });

      // Check if Arabic name is displayed
      const hasArabicName = arabicSearchResults.guestNames.some(name => 
        name.includes('سارة') || name.includes('عبد الرحمان')
      );
      
      if (hasArabicName) {
        console.log('✅ Arabic name is displayed correctly');
      } else {
        console.log('❌ Arabic name not found in results');
      }
    } else {
      console.log('❌ No results found for Arabic search');
    }

    // Test 4: Search for Hossni (English)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Search by English Name (Hossni)');
    console.log('='.repeat(60));
    
    const hossniEnglishResults = await performSearch('Hossni', 'English');
    
    if (hossniEnglishResults && hossniEnglishResults.guestNames.length > 0) {
      console.log(`✅ Found ${hossniEnglishResults.guestNames.length} result(s):`);
      hossniEnglishResults.guestNames.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });

      const hasHossni = hossniEnglishResults.guestNames.some(name => 
        name.toLowerCase().includes('hossni')
      );
      
      if (hasHossni) {
        console.log('✅ English name "Hossni" is displayed correctly');
      } else {
        console.log('❌ English name "Hossni" not found');
      }
    } else {
      console.log('❌ No results found for "Hossni" search');
    }

    // Test 5: Search for حسني (Arabic)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Search by Arabic Name (حسني)');
    console.log('='.repeat(60));
    
    const hossniArabicResults = await performSearch('حسني', 'Arabic');
    
    if (hossniArabicResults && hossniArabicResults.guestNames.length > 0) {
      console.log(`✅ Found ${hossniArabicResults.guestNames.length} result(s):`);
      hossniArabicResults.guestNames.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });

      const hasHossniArabic = hossniArabicResults.guestNames.some(name => 
        name.includes('حسني')
      );
      
      if (hasHossniArabic) {
        console.log('✅ Arabic name "حسني" is displayed correctly');
      } else {
        console.log('❌ Arabic name "حسني" not found');
      }
    } else {
      console.log('❌ No results found for "حسني" search');
    }

    // Test 6: Test Family Group - Search for Sarah should show both Sarah and Hossni
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Family Group Test (Sarah should show both family members)');
    console.log('='.repeat(60));
    
    const familySearchResults = await performSearch('Sarah', 'English');
    
    if (familySearchResults && familySearchResults.guestNames.length > 0) {
      console.log(`✅ Found ${familySearchResults.guestNames.length} result(s):`);
      familySearchResults.guestNames.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });

      const hasSarah = familySearchResults.guestNames.some(name => 
        name.toLowerCase().includes('sarah')
      );
      const hasHossni = familySearchResults.guestNames.some(name => 
        name.toLowerCase().includes('hossni')
      );
      
      console.log(`   Sarah found: ${hasSarah ? '✅' : '❌'}`);
      console.log(`   Hossni found: ${hasHossni ? '✅' : '❌'}`);
      
      if (hasSarah && hasHossni) {
        console.log('✅ Family group functionality working - both members found!');
      } else if (hasSarah) {
        console.log('⚠️  Only Sarah found (Hossni might not be in same family group)');
      } else {
        console.log('❌ Sarah not found in results');
      }
    } else {
      console.log('❌ No results found for family search');
    }

    // Test 7: Test RSVP Submission with Table Number
    console.log('\n' + '='.repeat(60));
    console.log('TEST 7: RSVP Submission with Table Number');
    console.log('='.repeat(60));

    // First, search for Sarah
    await performSearch('Sarah abdelrahman', 'English');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Select the guest
    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      console.log('   Clicking first checkbox to select guest...');
      await checkboxes[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Select "Attending"
      const radioButtons = await page.$$('input[type="radio"]');
      if (radioButtons.length > 0) {
        console.log('   Selecting "Attending"...');
        await radioButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 500));

        // Submit RSVP
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          const isDisabled = await page.evaluate((btn) => btn.disabled, submitButton);
          
          if (!isDisabled) {
            console.log('   Submitting RSVP...');
            await submitButton.click();
            
            // Wait for success message
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check for success message and table number
            const successContent = await page.evaluate(() => {
              const successSection = document.querySelector('#rsvp');
              if (!successSection) return null;

              const text = successSection.textContent || '';
              const hasThankYou = text.includes('Thank you') || text.includes('شكراً');
              const hasTableNumber = text.includes('table') || text.includes('طاولة') || 
                                   text.includes('1') || text.includes('١');
              
              return {
                hasThankYou,
                hasTableNumber,
                fullText: text.substring(0, 500)
              };
            });

            if (successContent) {
              console.log('✅ Success message found');
              if (successContent.hasTableNumber) {
                console.log('✅ Table number displayed in thank you message!');
                console.log(`   Content preview: ${successContent.fullText.substring(0, 200)}...`);
              } else {
                console.log('⚠️  Table number not found in thank you message');
                console.log('   This might be because:');
                console.log('   - Table number is not assigned in Google Sheets');
                console.log('   - Guest is not attending');
              }
            } else {
              console.log('⚠️  Success message not found (might still be processing)');
            }
          } else {
            console.log('⚠️  Submit button is disabled (might need to select guest/attendance)');
          }
        } else {
          console.log('❌ Submit button not found');
        }
      } else {
        console.log('❌ Attendance radio buttons not found');
      }
    } else {
      console.log('⚠️  No checkboxes found to test submission');
    }

    // Test 8: Network Requests Check
    console.log('\n' + '='.repeat(60));
    console.log('TEST 8: Network Requests');
    console.log('='.repeat(60));

    if (networkRequests.length > 0) {
      console.log(`📡 Found ${networkRequests.length} RSVP-related network requests:\n`);
      networkRequests.forEach((req, i) => {
        const icon = req.ok ? '✅' : '❌';
        console.log(`   ${i + 1}. ${icon} ${req.type}: ${req.url.substring(0, 100)} - Status: ${req.status}`);
      });

      const getGuestsRequests = networkRequests.filter(req => req.url.includes('get-guests'));
      const saveRsvpRequests = networkRequests.filter(req => req.url.includes('save-rsvp'));

      console.log(`\n   get-guests requests: ${getGuestsRequests.length}`);
      console.log(`   save-rsvp requests: ${saveRsvpRequests.length}`);
    } else {
      console.log('⚠️  No RSVP-related network requests found');
    }

    // Test 9: Error Check
    console.log('\n' + '='.repeat(60));
    console.log('TEST 9: Error Check');
    console.log('='.repeat(60));

    const rsvpErrors = errors.filter(error => {
      const lowerError = error.toLowerCase();
      return lowerError.includes('rsvp') ||
             lowerError.includes('guest') ||
             lowerError.includes('get-guests') ||
             lowerError.includes('save-rsvp');
    });

    if (rsvpErrors.length > 0) {
      console.log(`❌ Found ${rsvpErrors.length} RSVP-related errors:\n`);
      rsvpErrors.forEach((error, i) => {
        const shortError = error.length > 150 ? error.substring(0, 150) + '...' : error;
        console.log(`   ${i + 1}. ${shortError}`);
      });
    } else {
      console.log('✅ No RSVP-related errors found');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const testsPassed = {
      englishSearch: englishSearchResults && englishSearchResults.guestNames.length > 0,
      arabicSearch: arabicSearchResults && arabicSearchResults.guestNames.length > 0,
      hossniEnglish: hossniEnglishResults && hossniEnglishResults.guestNames.length > 0,
      hossniArabic: hossniArabicResults && hossniArabicResults.guestNames.length > 0,
      familyGroup: familySearchResults && familySearchResults.guestNames.length > 0,
      noErrors: rsvpErrors.length === 0,
    };

    const passedCount = Object.values(testsPassed).filter(Boolean).length;
    const totalCount = Object.keys(testsPassed).length;

    console.log(`\n✅ Passed: ${passedCount}/${totalCount} tests\n`);

    Object.entries(testsPassed).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });

    if (passedCount === totalCount) {
      console.log('\n🎉 All tests passed! Bilingual RSVP functionality is working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the details above.');
    }

    console.log('\n');

    // Keep browser open for observation
    console.log('🔍 Keeping browser open for 10 seconds for observation...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testBilingualRSVP().catch(console.error);

