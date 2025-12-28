import puppeteer from 'puppeteer';

// Use local dev server if available, otherwise use production URL
const WEBSITE_URL = process.env.TEST_URL || 'https://fadyandsandra-specialday.github.io/our-special-day/';

async function testRSVPFunctionality() {
  console.log('🔍 Starting RSVP Family Multi-Select Test...\n');
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
          url: url.substring(0, 100),
          status: response.status(),
          ok: response.ok(),
        });
      }
    });

    // Navigate to the website
    console.log('📱 Navigating to website...');
    await page.goto(WEBSITE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded successfully\n');

    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 1: Navigate to RSVP Section
    console.log('='.repeat(60));
    console.log('TEST 1: Navigate to RSVP Section');
    console.log('='.repeat(60));

    // Scroll to RSVP section
    console.log('📜 Scrolling to RSVP section...');
    await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      if (rsvpSection) {
        rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const rsvpSectionFound = await page.evaluate(() => {
      const rsvpSection = document.querySelector('#rsvp');
      return !!rsvpSection;
    });

    if (!rsvpSectionFound) {
      console.log('❌ RSVP section not found');
      throw new Error('RSVP section not found on page');
    }

    console.log('✅ RSVP section found\n');

    // Test 2: Test Search Functionality
    console.log('='.repeat(60));
    console.log('TEST 2: Search Functionality');
    console.log('='.repeat(60));

    // Find the search input
    console.log('🔍 Looking for search input...');
    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
    
    if (!searchInput) {
      console.log('❌ Search input not found');
      throw new Error('Search input not found');
    }

    console.log('✅ Search input found');

    // Type a search query - testing "Leo Hany" to find family members
    const testSearchQuery = 'Leo Hany';
    console.log(`\n⌨️  Typing search query: "${testSearchQuery}"...`);
    console.log(`   Expected: Should show "Leo Hany" and "Monica Atef" (same family group)`);
    await searchInput.type(testSearchQuery, { delay: 100 });

    // Wait for search results to appear (with retries)
    console.log('⏳ Waiting for search results...');
    let searchResults = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if results appeared
      searchResults = await page.evaluate(() => {
        // Look for guest list container - check multiple possible selectors
        const possibleContainers = [
          // Check for containers with checkboxes
          ...Array.from(document.querySelectorAll('[class*="space-y"]')),
          ...Array.from(document.querySelectorAll('[class*="border"]')),
          ...Array.from(document.querySelectorAll('div')),
        ].filter(el => {
          const hasCheckboxes = el.querySelector('input[type="checkbox"]');
          const hasGuestContent = Array.from(el.querySelectorAll('label, button, span'))
            .some(btn => {
              const text = btn.textContent?.trim() || '';
              return text.length > 0 && text.length < 100 && 
                     !text.includes('Select') && 
                     !text.includes('Attending') &&
                     !text.includes('Submit');
            });
          return hasCheckboxes || hasGuestContent;
        });

      const resultsContainer = possibleContainers[0];

      if (!resultsContainer) return null;

      // Get all checkboxes
      const checkboxes = Array.from(resultsContainer.querySelectorAll('input[type="checkbox"]'));
      
      // Get all guest names (more specific)
      const guestLabels = Array.from(resultsContainer.querySelectorAll('label, button, span'))
        .map(el => {
          const text = el.textContent?.trim() || '';
          // Filter out UI elements
          if (text.includes('Select') || text.includes('Attending') || 
              text.includes('Submit') || text.includes('Search') ||
              text.length === 0 || text.length > 100) {
            return null;
          }
          return text;
        })
        .filter(Boolean)
        .filter((text, index, self) => self.indexOf(text) === index); // Remove duplicates

      // Check for family group headers (with Users icon)
      const familyHeaders = Array.from(resultsContainer.querySelectorAll('*'))
        .filter(el => {
          const text = el.textContent?.trim() || '';
          const hasUsersIcon = el.querySelector('svg') !== null;
          return text.length > 0 && 
                 text.length < 50 && 
                 hasUsersIcon &&
                 !text.includes('Select') && 
                 !text.includes('اختر') &&
                 !text.includes('Attending');
        })
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .filter((text, index, self) => self.indexOf(text) === index);

      return {
        found: true,
        checkboxCount: checkboxes.length,
        guestNames: guestLabels.slice(0, 10), // First 10
        familyHeaders: familyHeaders,
        hasSelectAllButtons: Array.from(resultsContainer.querySelectorAll('button, a'))
          .some(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('select all') || text.includes('اختر الكل') || text.includes('deselect all');
          }),
      };
    });

      if (searchResults && searchResults.checkboxCount > 0) {
        console.log(`   Results found on attempt ${attempt + 1}`);
        break;
      }
    }

    // Check if results appeared (fallback if not found in retry loop)
    if (!searchResults) {
      searchResults = await page.evaluate(() => {
        // Look for guest list container
        const resultsContainer = Array.from(document.querySelectorAll('*'))
          .find(el => {
          const text = el.textContent || '';
          const hasCheckboxes = el.querySelector('input[type="checkbox"]');
          const hasGuestButtons = Array.from(el.querySelectorAll('button, label'))
            .some(btn => btn.textContent && btn.textContent.trim().length > 0);
          return hasCheckboxes || hasGuestButtons;
        });

        if (!resultsContainer) return null;

      // Get all checkboxes
      const checkboxes = Array.from(resultsContainer.querySelectorAll('input[type="checkbox"]'));
      
        // Get all guest names
        const guestLabels = Array.from(resultsContainer.querySelectorAll('label, button'))
        .map(el => {
          const text = el.textContent?.trim() || '';
          return text.length > 0 && text.length < 100 ? text : null;
        })
        .filter(Boolean);

      // Check for family group headers
      const familyHeaders = Array.from(resultsContainer.querySelectorAll('*'))
        .filter(el => {
          const text = el.textContent?.trim() || '';
          return text.length > 0 && 
                 text.length < 50 && 
                 !text.includes('Select') && 
                 !text.includes('اختر') &&
                 el.querySelector('svg') !== null; // Has icon (Users icon)
        })
        .map(el => el.textContent?.trim())
        .filter(Boolean);

        return {
          found: true,
          checkboxCount: checkboxes.length,
          guestNames: guestLabels.slice(0, 10), // First 10
          familyHeaders: familyHeaders,
          hasSelectAllButtons: Array.from(resultsContainer.querySelectorAll('button, a'))
            .some(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              return text.includes('select all') || text.includes('اختر الكل');
            }),
        };
      });

    if (!searchResults) {
      console.log('❌ Search results not found');
      console.log('   This might mean:');
      console.log('   - No guests match the search query');
      console.log('   - The search API is not working');
      console.log('   - The UI structure has changed');
    } else {
      console.log('✅ Search results found!');
      console.log(`   Checkboxes found: ${searchResults.checkboxCount}`);
      console.log(`   Family headers found: ${searchResults.familyHeaders.length}`);
      if (searchResults.familyHeaders.length > 0) {
        console.log(`   Family groups:`);
        searchResults.familyHeaders.forEach((header, i) => {
          console.log(`     ${i + 1}. ${header}`);
        });
      }
      console.log(`   Guest names found: ${searchResults.guestNames.length}`);
      if (searchResults.guestNames.length > 0) {
        console.log(`   All guests in results:`);
        searchResults.guestNames.forEach((name, i) => {
          console.log(`     ${i + 1}. ${name}`);
        });
      }
      console.log(`   Select All buttons: ${searchResults.hasSelectAllButtons ? 'Yes' : 'No'}`);
      
      // Specific test for "Leo Hany" and "Monica Atef"
      console.log('\n   🎯 Family Group Test:');
      const hasLeoHany = searchResults.guestNames.some(name => 
        name.toLowerCase().includes('leo') && name.toLowerCase().includes('hany')
      );
      const hasMonicaAtef = searchResults.guestNames.some(name => 
        name.toLowerCase().includes('monica') && name.toLowerCase().includes('atef')
      );
      
      console.log(`     Leo Hany found: ${hasLeoHany ? '✅' : '❌'}`);
      console.log(`     Monica Atef found: ${hasMonicaAtef ? '✅' : '❌'}`);
      
      if (hasLeoHany && hasMonicaAtef) {
        console.log('\n   🎉 SUCCESS: Both family members found!');
        console.log('      When searching for "Leo Hany", both "Leo Hany" and "Monica Atef"');
        console.log('      appear in the dropdown because they share the same Family Group.');
      } else if (hasLeoHany && !hasMonicaAtef) {
        console.log('\n   ⚠️  PARTIAL: Leo Hany found but Monica Atef not found');
        console.log('      This might mean:');
        console.log('      - Monica Atef is not in the same Family Group in Google Sheets');
        console.log('      - The Family Group column is not set correctly');
        console.log('      - Monica Atef\'s name is spelled differently');
      } else if (!hasLeoHany) {
        console.log('\n   ⚠️  Leo Hany not found in results');
        console.log('      This might mean:');
        console.log('      - "Leo Hany" is not in the guest list');
        console.log('      - The name is spelled differently in Google Sheets');
      }
    }

    // Test 3: Test Multi-Select Functionality
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Multi-Select Functionality');
    console.log('='.repeat(60));

    if (searchResults && searchResults.checkboxCount > 0) {
      console.log('✅ Checkboxes are present - testing selection...');

      // Click first checkbox
      const firstCheckbox = await page.$('input[type="checkbox"]');
      if (firstCheckbox) {
        console.log('   Clicking first checkbox...');
        await firstCheckbox.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        const isChecked = await page.evaluate((checkbox) => {
          return checkbox.checked;
        }, firstCheckbox);

        if (isChecked) {
          console.log('   ✅ First checkbox selected successfully');
        } else {
          console.log('   ❌ First checkbox did not get selected');
        }

        // Check if selected guests section appeared
        const selectedSection = await page.evaluate(() => {
          const section = Array.from(document.querySelectorAll('*'))
            .find(el => {
              const text = el.textContent?.toLowerCase() || '';
              return (text.includes('selected') || text.includes('مختار')) &&
                     el.querySelector('svg') !== null; // Has Heart icon
            });
          return !!section;
        });

        if (selectedSection) {
          console.log('   ✅ Selected guests section appeared');
        } else {
          console.log('   ⚠️  Selected guests section not found (might appear after more selections)');
        }

        // Try to select another checkbox
        const allCheckboxes = await page.$$('input[type="checkbox"]');
        if (allCheckboxes.length > 1) {
          console.log(`   Clicking second checkbox (${allCheckboxes.length} total)...`);
          await allCheckboxes[1].click();
          await new Promise(resolve => setTimeout(resolve, 500));

          const secondChecked = await page.evaluate((checkbox) => {
            return checkbox.checked;
          }, allCheckboxes[1]);

          if (secondChecked) {
            console.log('   ✅ Second checkbox selected successfully');
            console.log('   ✅ Multi-select is working!');
          } else {
            console.log('   ❌ Second checkbox did not get selected');
          }
        }
      } else {
        console.log('   ❌ No checkboxes found to test');
      }
    } else {
      console.log('⚠️  Cannot test multi-select - no checkboxes found');
      console.log('   This might be because:');
      console.log('   - No guests match the search query');
      console.log('   - The search hasn\'t completed yet');
    }

    // Test 4: Test Select All Functionality
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Select All Functionality');
    console.log('='.repeat(60));

    const selectAllButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('select all') || text.includes('اختر الكل');
      });
    });

    if (selectAllButton) {
      console.log('✅ Select All button found');
      console.log('   Testing Select All...');
      
      // Get checkbox count before
      const beforeCount = await page.$$eval('input[type="checkbox"]:checked', checkboxes => checkboxes.length);
      console.log(`   Checked checkboxes before: ${beforeCount}`);

      // Click Select All (we need to find it again in the page context)
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const selectAllBtn = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('select all') || text.includes('اختر الكل');
        });
        if (selectAllBtn) {
          selectAllBtn.click();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get checkbox count after
      const afterCount = await page.$$eval('input[type="checkbox"]:checked', checkboxes => checkboxes.length);
      console.log(`   Checked checkboxes after: ${afterCount}`);

      if (afterCount > beforeCount) {
        console.log('   ✅ Select All is working!');
      } else {
        console.log('   ⚠️  Select All may not have worked (or all were already selected)');
      }
    } else {
      console.log('⚠️  Select All button not found');
      console.log('   This might be because:');
      console.log('   - No family groups are displayed');
      console.log('   - The search results don\'t contain family groups');
    }

    // Test 5: Test Attendance Selection
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Attendance Selection');
    console.log('='.repeat(60));

    // Find attendance radio buttons
    const attendanceButtons = await page.$$('input[type="radio"]');
    console.log(`   Found ${attendanceButtons.length} attendance radio buttons`);

    if (attendanceButtons.length >= 2) {
      console.log('   ✅ Attendance selection found');
      console.log('   Clicking "Attending" option...');
      
      await attendanceButtons[0].click();
      await new Promise(resolve => setTimeout(resolve, 500));

      const isAttendingSelected = await page.evaluate((radio) => {
        return radio.checked;
      }, attendanceButtons[0]);

      if (isAttendingSelected) {
        console.log('   ✅ Attendance selection is working!');
      } else {
        console.log('   ❌ Attendance selection did not work');
      }
    } else {
      console.log('   ⚠️  Attendance buttons not found');
    }

    // Test 6: Test Submit Button State
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Submit Button State');
    console.log('='.repeat(60));

    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      const isDisabled = await page.evaluate((btn) => {
        return btn.disabled;
      }, submitButton);

      const buttonText = await page.evaluate((btn) => {
        return btn.textContent?.trim();
      }, submitButton);

      console.log(`   Submit button text: "${buttonText}"`);
      console.log(`   Button disabled: ${isDisabled ? 'Yes' : 'No'}`);

      if (isDisabled) {
        console.log('   ℹ️  Button is disabled (expected if no guests selected or no attendance selected)');
      } else {
        console.log('   ✅ Button is enabled and ready to submit');
      }
    } else {
      console.log('   ❌ Submit button not found');
    }

    // Test 7: Network Requests
    console.log('\n' + '='.repeat(60));
    console.log('TEST 7: Network Requests');
    console.log('='.repeat(60));

    if (networkRequests.length > 0) {
      console.log(`📡 Found ${networkRequests.length} RSVP-related network requests:\n`);
      networkRequests.forEach((req, i) => {
        const icon = req.ok ? '✅' : '❌';
        console.log(`   ${i + 1}. ${icon} ${req.type}: ${req.url} - Status: ${req.status}`);
      });

      const getGuestsRequests = networkRequests.filter(req => req.url.includes('get-guests'));
      if (getGuestsRequests.length > 0) {
        console.log('\n   ✅ get-guests API is being called');
      } else {
        console.log('\n   ⚠️  get-guests API was not called (might be cached or not triggered)');
      }
    } else {
      console.log('⚠️  No RSVP-related network requests found');
      console.log('   This might mean:');
      console.log('   - Requests were made before monitoring started');
      console.log('   - The search hasn\'t triggered an API call yet');
    }

    // Test 8: Check for Errors
    console.log('\n' + '='.repeat(60));
    console.log('TEST 8: Error Check');
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

    const hasSearchResults = searchResults && searchResults.checkboxCount > 0;
    const hasMultiSelect = searchResults && searchResults.checkboxCount > 1;
    const hasFamilyGroups = searchResults && searchResults.familyHeaders.length > 0;
    const hasSelectAll = searchResults && searchResults.hasSelectAllButtons;
    const hasNoErrors = rsvpErrors.length === 0;

    if (hasSearchResults && hasMultiSelect && hasNoErrors) {
      console.log('✅ PASSED: RSVP functionality is working correctly!');
      console.log('   - Search: ✅ Working');
      console.log('   - Multi-select: ✅ Working');
      if (hasFamilyGroups) {
        console.log('   - Family groups: ✅ Displayed');
        if (hasSelectAll) {
          console.log('   - Select All: ✅ Available');
        }
      }
      console.log('   - Errors: ✅ None detected');
    } else if (hasSearchResults && hasNoErrors) {
      console.log('⚠️  PARTIAL: Basic RSVP functionality works');
      console.log('   - Search: ✅ Working');
      if (!hasMultiSelect) {
        console.log('   - Multi-select: ⚠️  Only one guest found (might be expected)');
      }
      if (!hasFamilyGroups) {
        console.log('   - Family groups: ⚠️  Not displayed (might be expected if no family groups)');
      }
    } else if (!hasSearchResults) {
      console.log('❌ FAILED: Search functionality not working');
      console.log('   - Check get-guests Edge Function is deployed');
      console.log('   - Check Google Sheets is accessible');
      console.log('   - Check search query matches guest names');
    } else {
      console.log('❌ FAILED: Multiple issues detected');
      console.log('   - Check all error messages above');
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
testRSVPFunctionality().catch(console.error);

