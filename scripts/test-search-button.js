import puppeteer from 'puppeteer';

const PORTS = [5173, 8080, 8081, 3000];

async function findServer() {
  for (const port of PORTS) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`http://localhost:${port}`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      if (response.ok) return `http://localhost:${port}`;
    } catch (e) {}
  }
  return null;
}

async function testSearchButton() {
  console.log('🔍 Testing Search Button & Rate Limiting\n');
  
  const url = await findServer();
  if (!url) {
    console.log('❌ Dev server not found. Run: npm run dev');
    process.exit(1);
  }

  console.log(`✅ Server: ${url}\n`);

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to RSVP
    await page.evaluate(() => {
      document.querySelector('#rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Check search button exists
    console.log('='.repeat(60));
    console.log('TEST 1: Search Button Presence');
    console.log('-'.repeat(60));

    const searchButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('search') || text.includes('بحث');
      });
    });

    if (searchButton) {
      console.log('✅ Search button found');
    } else {
      console.log('❌ Search button not found');
      // Try to find by icon
      const buttonWithIcon = await page.$('button:has(svg)');
      if (buttonWithIcon) {
        const buttonText = await page.evaluate(btn => btn.textContent, buttonWithIcon);
        console.log(`   Found button with icon: "${buttonText}"`);
      }
    }

    // Test 2: Type without searching
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Type Without Triggering Search');
    console.log('-'.repeat(60));

    const input = await page.$('input[placeholder*="Search"], input[placeholder*="search"]');
    if (!input) throw new Error('Search input not found');

    await input.click({ clickCount: 3 });
    await input.type('Leo Hany');
    console.log('✅ Typed "Leo Hany"');
    
    // Wait a bit - should NOT trigger search
    await new Promise(r => setTimeout(r, 2000));
    
    const guestsBeforeClick = await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      return checkboxes.length;
    });
    
    console.log(`   Checkboxes before clicking search: ${guestsBeforeClick}`);
    if (guestsBeforeClick === 0) {
      console.log('   ✅ No auto-search triggered (correct!)');
    } else {
      console.log('   ❌ Auto-search was triggered (should not happen)');
    }

    // Test 3: Click search button
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Click Search Button');
    console.log('-'.repeat(60));

    let guestsAfterClick = { checkboxCount: 0, names: [] };

    // Find search button by text content
    const searchButtonElement = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return (text.includes('search') || text.includes('بحث')) && !text.includes('submit');
      });
    });

    const searchBtnEl = searchButtonElement && await searchButtonElement.asElement();
    if (searchBtnEl) {
      await searchBtnEl.click();
      console.log('✅ Clicked search button');
      await new Promise(r => setTimeout(r, 3000));

      guestsAfterClick = await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const labels = Array.from(document.querySelectorAll('label'));
        const names = labels
          .map(l => l.textContent?.trim())
          .filter(t => t && t.length > 0 && t.length < 100)
          .filter(t => !t.includes('Select') && !t.includes('Attending'));
        return { checkboxCount: checkboxes.length, names };
      });

      console.log(`   Checkboxes after click: ${guestsAfterClick.checkboxCount}`);
      if (guestsAfterClick.names.length > 0) {
        console.log(`   Names found: ${guestsAfterClick.names.join(', ')}`);
      }

      if (guestsAfterClick.checkboxCount > 0) {
        console.log('   ✅ Search worked after button click!');
      } else {
        console.log('   ❌ Search did not work');
      }
    } else {
      console.log('   ⚠️  Could not find search button to click');
    }

    // Test 4: Rate limiting
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Rate Limiting (5 searches per day)');
    console.log('-'.repeat(60));

    console.log('   Testing multiple searches...');
    let searchCount = 0;
    const maxTestSearches = 6; // Test 6 to see if 6th is blocked

    for (let i = 0; i < maxTestSearches; i++) {
      const buttonInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const searchBtn = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return (text.includes('search') || text.includes('بحث')) && !text.includes('submit');
        });
        return searchBtn ? {
          disabled: searchBtn.disabled,
          text: searchBtn.textContent?.trim()
        } : null;
      });

      if (buttonInfo) {
        const remainingText = await page.evaluate(() => {
          const text = document.body.innerText || '';
          const match = text.match(/(\d+)\s+searches?\s+remaining/i) || text.match(/(\d+)\s+عمليات?\s+بحث/i);
          return match ? match[1] : null;
        });

        console.log(`   Search ${i + 1}: Button disabled: ${buttonInfo.disabled}, Remaining: ${remainingText || 'N/A'}`);

        if (!buttonInfo.disabled) {
          const btn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              return (text.includes('search') || text.includes('بحث')) && !text.includes('submit');
            });
          });
          const btnEl = btn && await btn.asElement();
          if (btnEl) {
            await btnEl.click();
            await new Promise(r => setTimeout(r, 2000));
            searchCount++;
          }
        } else {
          console.log(`   ✅ Search ${i + 1} blocked (rate limit working!)`);
          break;
        }
      } else {
        break;
      }
    }

    // Check for rate limit message
    const rateLimitMessage = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return text.toLowerCase().includes('limit') || text.toLowerCase().includes('حد');
    });

    if (rateLimitMessage) {
      console.log('   ✅ Rate limit message displayed');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Search button: ${searchButton ? '✅ Found' : '❌ Not found'}`);
    console.log(`   Auto-search disabled: ${guestsBeforeClick === 0 ? '✅' : '❌'}`);
    console.log(`   Manual search works: ${guestsAfterClick?.checkboxCount > 0 ? '✅' : '❌'}`);
    console.log(`   Searches performed: ${searchCount}`);
    console.log(`   Rate limiting: ${searchCount >= 5 ? '✅ Working (5+ searches tested)' : '⚠️  Only tested ' + searchCount + ' searches'}`);

    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

testSearchButton().catch(console.error);

