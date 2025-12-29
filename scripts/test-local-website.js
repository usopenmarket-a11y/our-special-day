import puppeteer from 'puppeteer';

const DEV_URL = 'http://localhost:8080/';

async function testLocalWebsite() {
  console.log('🧪 Testing Local Website...\n');
  console.log(`📍 URL: ${DEV_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();

    // Listen for console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error(`❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        console.warn(`⚠️  Console Warning: ${text}`);
      } else {
        console.log(`ℹ️  Console ${type}: ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error(`❌ Page Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    });

    // Listen for request failures
    page.on('requestfailed', (request) => {
      console.error(`❌ Request Failed: ${request.url()}`);
      console.error(`   Failure: ${request.failure()?.errorText}`);
    });

    console.log('🌐 Navigating to page...');
    await page.goto(DEV_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if page is white/empty
    const bodyText = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });

    const bodyHTML = await page.evaluate(() => {
      return document.body.innerHTML || '';
    });

    const rootElement = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML : null;
    });

    console.log('\n📊 Page Analysis:');
    console.log(`   Body Text Length: ${bodyText.length}`);
    console.log(`   Body HTML Length: ${bodyHTML.length}`);
    console.log(`   Root Element: ${rootElement ? 'Found' : 'NOT FOUND'}`);
    console.log(`   Root Content Length: ${rootElement ? rootElement.length : 0}`);

    if (bodyText.length === 0 && (!rootElement || rootElement.length < 100)) {
      console.error('\n❌ WHITE PAGE DETECTED!');
      console.log('\n🔍 Checking for errors...');

      // Check for React errors
      const reactError = await page.evaluate(() => {
        const errorDiv = document.querySelector('[data-react-error]');
        return errorDiv ? errorDiv.innerText : null;
      });

      if (reactError) {
        console.error(`   React Error: ${reactError}`);
      }

      // Check for error boundary
      const errorBoundary = await page.evaluate(() => {
        const errorDiv = document.querySelector('h1');
        if (errorDiv && errorDiv.textContent?.includes('Something went wrong')) {
          return errorDiv.parentElement?.innerText || null;
        }
        return null;
      });

      if (errorBoundary) {
        console.error(`   Error Boundary: ${errorBoundary}`);
      }

      // Take screenshot
      await page.screenshot({ path: 'white-page-debug.png', fullPage: true });
      console.log('   📸 Screenshot saved: white-page-debug.png');
    } else {
      console.log('\n✅ Page appears to have content!');
      console.log(`   Preview: ${bodyText.substring(0, 200)}...`);
    }

    // Check for specific elements
    console.log('\n🔍 Checking for key elements:');
    const checks = await page.evaluate(() => {
      return {
        root: !!document.getElementById('root'),
        hasContent: document.body.children.length > 0,
        hasScripts: document.querySelectorAll('script').length,
        hasStyles: document.querySelectorAll('style, link[rel="stylesheet"]').length,
        title: document.title,
      };
    });

    console.log(`   Root element: ${checks.root ? '✅' : '❌'}`);
    console.log(`   Has content: ${checks.hasContent ? '✅' : '❌'}`);
    console.log(`   Scripts: ${checks.hasScripts}`);
    console.log(`   Styles: ${checks.hasStyles}`);
    console.log(`   Title: ${checks.title}`);

    // Check console errors
    const consoleErrors = await page.evaluate(() => {
      // This won't capture all errors, but we're listening via page.on('console')
      return window.console.error.toString();
    });

    console.log('\n✅ Test complete!');
    console.log('\n💡 Tips:');
    console.log('   - Check the browser console for errors');
    console.log('   - Verify environment variables are set');
    console.log('   - Check if the dev server is running on port 8080');
    console.log('   - Try accessing: http://localhost:8080/our-special-day/');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error('\n💡 The dev server is not running!');
      console.error('   Please run: npm run dev');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testLocalWebsite().catch(console.error);

