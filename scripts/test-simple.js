/**
 * Simple test - just check if the logic works
 * Run this while the dev server is running on any port
 */

import puppeteer from 'puppeteer';

// Try to find the server on common ports
async function findServer() {
  const ports = [5173, 8080, 8081, 3000];
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) {
        return `http://localhost:${port}`;
      }
    } catch (e) {
      // Try next port
    }
  }
  return null;
}

async function quickTest() {
  console.log('🔍 Quick RSVP Test\n');
  
  const url = await findServer();
  if (!url) {
    console.log('❌ Dev server not found. Please run: npm run dev');
    console.log('   Then run this test again.');
    process.exit(1);
  }

  console.log(`✅ Found server at: ${url}\n`);

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

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
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to RSVP
    await page.evaluate(() => {
      document.querySelector('#rsvp')?.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 1500));

    // Search
    const input = await page.$('input[placeholder*="Search"], input[placeholder*="search"]');
    if (!input) {
      throw new Error('Search input not found');
    }

    await input.click({ clickCount: 3 });
    await input.type('Leo Hany');
    console.log('⌨️  Typed "Leo Hany"');
    
    await new Promise(r => setTimeout(r, 5000));

    // Check results
    if (apiResponses.length > 0) {
      const last = apiResponses[apiResponses.length - 1];
      const guests = last.guests || [];
      
      console.log(`\n📊 API returned ${guests.length} guests:\n`);
      guests.forEach((g, i) => {
        console.log(`   ${i + 1}. ${g.name} (Family: "${g.familyGroup || 'None'}")`);
      });

      const hasBoth = guests.some(g => g.name.includes('Leo') && g.name.includes('Hany')) &&
                     guests.some(g => g.name.includes('Monica') && g.name.includes('Atef'));

      if (hasBoth) {
        console.log('\n🎉 SUCCESS: Both Leo Hany and Monica Atef found!');
      } else {
        console.log('\n❌ ISSUE: Missing family member');
      }
    } else {
      console.log('\n⚠️  No API response captured');
    }

    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

quickTest().catch(console.error);

