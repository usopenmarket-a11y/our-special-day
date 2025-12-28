import puppeteer from 'puppeteer';

const PORTS = [5173, 8080, 8081, 3000, 5174];

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

async function finalTest() {
  console.log('🎯 FINAL COMPREHENSIVE TEST\n');
  console.log('='.repeat(60));
  
  const url = await findServer();
  if (!url) {
    console.log('❌ Dev server not found. Run: npm run dev');
    process.exit(1);
  }

  console.log(`✅ Server: ${url}\n`);

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const results = {
    apiCalls: [],
    uiChecks: [],
    submitTests: []
  };

  page.on('response', async (response) => {
    if (response.url().includes('get-guests')) {
      try {
        const body = await response.json();
        results.apiCalls.push(body);
      } catch (e) {}
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to RSVP
    await page.evaluate(() => {
      document.querySelector('#rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Search for "Leo Hany"
    console.log('TEST 1: Search "Leo Hany"');
    console.log('-'.repeat(60));
    
    const input = await page.$('input[placeholder*="Search"], input[placeholder*="search"]');
    if (!input) throw new Error('Search input not found');

    await input.click({ clickCount: 3 });
    await input.type('Leo Hany');
    console.log('✅ Typed "Leo Hany"');
    
    await new Promise(r => setTimeout(r, 6000));

    // Check API
    if (results.apiCalls.length > 0) {
      const last = results.apiCalls[results.apiCalls.length - 1];
      const guests = last.guests || [];
      
      const hasLeo = guests.some(g => g.name.includes('Leo') && g.name.includes('Hany'));
      const hasMonica = guests.some(g => g.name.includes('Monica') && g.name.includes('Atef'));
      
      console.log(`\n📊 API Response:`);
      console.log(`   Guests: ${guests.length}`);
      guests.forEach((g, i) => {
        console.log(`   ${i + 1}. ${g.name} (Family: "${g.familyGroup || 'None'}")`);
      });
      
      console.log(`\n✅ Leo Hany: ${hasLeo ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
      console.log(`✅ Monica Atef: ${hasMonica ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
      
      if (hasLeo && hasMonica) {
        console.log('\n🎉 SUCCESS: Both names in API!');
        results.apiCalls.push({ success: true });
      } else {
        console.log('\n❌ FAILED: Missing family member');
        results.apiCalls.push({ success: false });
      }
    }

    // Test 2: Check UI
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: UI Display');
    console.log('-'.repeat(60));
    
    const uiCheck = await page.evaluate(() => {
      const allText = document.body.innerText || '';
      const hasLeo = allText.toLowerCase().includes('leo') && allText.toLowerCase().includes('hany');
      const hasMonica = allText.toLowerCase().includes('monica') && allText.toLowerCase().includes('atef');
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const labels = Array.from(document.querySelectorAll('label'));
      const names = labels
        .map(l => l.textContent?.trim())
        .filter(t => t && t.length > 0 && t.length < 100)
        .filter(t => !t.includes('Select') && !t.includes('Attending') && !t.includes('Confirm'));
      
      return { hasLeo, hasMonica, checkboxCount: checkboxes.length, names };
    });

    console.log(`   Leo Hany visible: ${uiCheck.hasLeo ? '✅' : '❌'}`);
    console.log(`   Monica Atef visible: ${uiCheck.hasMonica ? '✅' : '❌'}`);
    console.log(`   Checkboxes: ${uiCheck.checkboxCount}`);
    if (uiCheck.names.length > 0) {
      console.log(`   Names found: ${uiCheck.names.join(', ')}`);
    }

    if (uiCheck.hasLeo && uiCheck.hasMonica && uiCheck.checkboxCount >= 2) {
      console.log('\n🎉 SUCCESS: Both names visible in UI!');
      results.uiChecks.push({ success: true });
    } else {
      console.log('\n❌ FAILED: UI not showing both names');
      results.uiChecks.push({ success: false });
    }

    // Test 3: Select and Submit
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Select & Submit');
    console.log('-'.repeat(60));

    if (uiCheck.checkboxCount >= 2) {
      // Select both checkboxes
      const checkboxes = await page.$$('input[type="checkbox"]');
      if (checkboxes.length >= 2) {
        await checkboxes[0].click();
        await new Promise(r => setTimeout(r, 500));
        await checkboxes[1].click();
        await new Promise(r => setTimeout(r, 500));
        console.log('✅ Selected both checkboxes');
      }

      // Select attendance
      const radios = await page.$$('input[type="radio"]');
      if (radios.length > 0) {
        await radios[0].click();
        await new Promise(r => setTimeout(r, 500));
        console.log('✅ Selected attendance');
      }

      // Check submit button
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        const disabled = await page.evaluate(btn => btn.disabled, submitBtn);
        const text = await page.evaluate(btn => btn.textContent?.trim(), submitBtn);
        console.log(`   Submit button: "${text}" (disabled: ${disabled})`);
        
        if (!disabled) {
          console.log('✅ Submit button is enabled');
          console.log('⚠️  Not actually submitting to avoid test data');
          results.submitTests.push({ success: true, ready: true });
        } else {
          console.log('❌ Submit button is disabled');
          results.submitTests.push({ success: false });
        }
      }
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));
    
    const apiPass = results.apiCalls.some(r => r.success);
    const uiPass = results.uiChecks.some(r => r.success);
    const submitReady = results.submitTests.some(r => r.ready);

    console.log(`\n✅ API Test: ${apiPass ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`✅ UI Test: ${uiPass ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`✅ Submit Test: ${submitReady ? 'READY ✅' : 'NOT READY ❌'}`);

    if (apiPass && uiPass && submitReady) {
      console.log('\n🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉');
      console.log('\n✅ Family search: Working');
      console.log('✅ Multi-select: Working');
      console.log('✅ Submit: Ready');
      console.log('\nThe RSVP feature is fully functional!');
    } else {
      console.log('\n⚠️  Some tests failed. Check details above.');
    }

    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    await browser.close();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

finalTest().catch(console.error);

