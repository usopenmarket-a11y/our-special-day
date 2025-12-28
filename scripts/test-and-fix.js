import puppeteer from 'puppeteer';

const PORTS = [5173, 8080, 8081, 3000, 5174];
let SERVER_URL = null;

async function findServer() {
  for (const port of PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(`http://localhost:${port}`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return `http://localhost:${port}`;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function testAndFix() {
  console.log('🔍 Testing RSVP Family Search\n');
  console.log('⏳ Waiting for dev server...');
  
  // Wait for server
  for (let i = 0; i < 30; i++) {
    SERVER_URL = await findServer();
    if (SERVER_URL) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (!SERVER_URL) {
    console.log('❌ Dev server not found. Please run: npm run dev');
    process.exit(1);
  }
  
  console.log(`✅ Found server: ${SERVER_URL}\n`);

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  let attempt = 1;
  const maxAttempts = 3;

  while (attempt <= maxAttempts) {
    console.log('='.repeat(60));
    console.log(`TEST ATTEMPT ${attempt}/${maxAttempts}`);
    console.log('='.repeat(60));

    const apiResponses = [];
    page.on('response', async (response) => {
      if (response.url().includes('get-guests')) {
        try {
          const body = await response.json();
          apiResponses.push(body);
        } catch (e) {}
      }
    });

    try {
      await page.goto(SERVER_URL, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      // Scroll to RSVP
      await page.evaluate(() => {
        document.querySelector('#rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await new Promise(r => setTimeout(r, 2000));

      // Clear and search
      const input = await page.$('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="ابحث"]');
      if (!input) {
        throw new Error('Search input not found');
      }

      await input.click({ clickCount: 3 });
      await input.type('Leo Hany', { delay: 100 });
      console.log('⌨️  Typed "Leo Hany"');
      
      await new Promise(r => setTimeout(r, 6000));

      // Check API response
      if (apiResponses.length > 0) {
        const last = apiResponses[apiResponses.length - 1];
        const guests = last.guests || [];
        
        console.log(`\n📊 API Response:`);
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

        console.log(`\n✅ Leo Hany: ${hasLeoHany ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
        console.log(`✅ Monica Atef: ${hasMonicaAtef ? 'FOUND ✅' : 'NOT FOUND ❌'}`);

        if (hasLeoHany && hasMonicaAtef) {
          console.log('\n🎉🎉🎉 SUCCESS: Both names found in API response!');
          
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
            console.log('\n✅ TEST PASSED - Keeping browser open for 10 seconds...');
            await new Promise(r => setTimeout(r, 10000));
            await browser.close();
            process.exit(0);
          } else {
            console.log('\n⚠️  API has both, but UI missing one - checking frontend...');
          }
        } else {
          console.log('\n❌ ISSUE: Missing family member in API response');
          console.log('   This means the backend get-guests function needs fixing.');
          
          if (!hasMonicaAtef) {
            const leoGuest = guests.find(g => g.name.toLowerCase().includes('leo') && g.name.toLowerCase().includes('hany'));
            if (leoGuest) {
              console.log(`\n   Leo Hany's Family Group: "${leoGuest.familyGroup || 'None'}"`);
              console.log('   All guests with this exact family group should be included.');
              console.log('   Possible issues:');
              console.log('   1. CSV parsing not reading Column B correctly');
              console.log('   2. Family group values don\'t match exactly (spaces, case)');
              console.log('   3. Monica Atef not in Google Sheets or different family group');
            }
          }
        }
      } else {
        console.log('⚠️  No API response captured');
      }

      attempt++;
      if (attempt <= maxAttempts) {
        console.log(`\n🔄 Retrying in 3 seconds...\n`);
        await new Promise(r => setTimeout(r, 3000));
      }

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error.message);
      attempt++;
      if (attempt <= maxAttempts) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  console.log('\n❌ Test failed after all attempts');
  console.log('🔍 Keeping browser open for inspection...');
  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
  process.exit(1);
}

testAndFix().catch(console.error);

