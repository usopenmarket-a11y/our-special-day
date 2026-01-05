import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

let PORT = 8080;
try {
  const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
  const viteConfig = readFileSync(viteConfigPath, 'utf-8');
  const portMatch = viteConfig.match(/port:\s*(\d+)/);
  if (portMatch) {
    PORT = parseInt(portMatch[1], 10);
  }
} catch (error) {
  console.log('⚠️  Could not read vite.config.ts, using default port 8080');
}

const BASE_URL = process.env.TEST_URL || `http://localhost:${PORT}`;
const TEST_UPLOADS_DIR = path.join(projectRoot, 'test-uploads');

async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerStatus(port) {
  try {
    const response = await fetch(`http://localhost:${port}/`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function testUpload() {
  console.log('\n🔍 Debug Upload Test');
  console.log('='.repeat(60));

  const isRunning = await checkServerStatus(PORT);
  if (!isRunning) {
    console.error(`\n❌ Dev server is not running on port ${PORT}!`);
    process.exit(1);
  }

  console.log(`✅ Server running on ${BASE_URL}\n`);

  // Get first test file
  const files = fs.readdirSync(TEST_UPLOADS_DIR)
    .filter(file => {
      const filePath = path.join(TEST_UPLOADS_DIR, file);
      return fs.statSync(filePath).isFile();
    })
    .slice(0, 1); // Just test one file

  if (files.length === 0) {
    console.error('❌ No test files found');
    process.exit(1);
  }

  const testFile = path.join(TEST_UPLOADS_DIR, files[0]);
  console.log(`📁 Testing with: ${files[0]}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture ALL console logs
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push({ type: msg.type(), text, timestamp: Date.now() });
      console.log(`[${msg.type().toUpperCase()}] ${text}`);
    });

    // Capture ALL network requests
    const requests = [];
    page.on('request', request => {
      const url = request.url();
      requests.push({
        type: 'request',
        url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: Date.now()
      });
      if (url.includes('upload-photo') || url.includes('functions')) {
        console.log(`\n🌐 REQUEST: ${request.method()} ${url}`);
        console.log('Headers:', JSON.stringify(request.headers(), null, 2));
        if (request.postData()) {
          console.log('Post Data (first 500 chars):', request.postData().substring(0, 500));
        }
      }
    });

    // Capture ALL network responses
    const responses = [];
    page.on('response', async response => {
      const url = response.url();
      let body = null;
      try {
        body = await response.text();
      } catch (e) {
        body = 'Could not read response';
      }
      
      responses.push({
        type: 'response',
        url,
        status: response.status(),
        headers: response.headers(),
        body,
        timestamp: Date.now()
      });

      if (url.includes('upload-photo') || url.includes('functions')) {
        console.log(`\n📥 RESPONSE: ${response.status()} ${url}`);
        console.log('Headers:', JSON.stringify(response.headers(), null, 2));
        console.log('Body:', body.substring(0, 1000));
      }
    });

    // Navigate to page
    console.log(`\n🌐 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitFor(2000);

    // Scroll to upload section
    await page.evaluate(() => {
      const uploadSection = document.querySelector('#upload');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await waitFor(2000);

    // Find file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }
    console.log('\n✅ File input found');

    // Upload file
    console.log(`\n📤 Uploading file: ${files[0]}...`);
    await fileInput.uploadFile(testFile);
    await waitFor(3000);

    // Find upload button
    const uploadButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Upload') || text.includes('رفع');
      });
    });

    if (uploadButton && uploadButton.asElement()) {
      console.log('\n🔘 Clicking upload button...');
      await uploadButton.asElement().click();
    } else {
      throw new Error('Upload button not found');
    }

    // Wait and monitor
    console.log('\n⏳ Waiting for upload (30 seconds)...');
    await waitFor(30000);

    // Check final state
    const uploadResponse = responses.find(r => 
      r.url.includes('upload-photo') || r.url.includes('functions')
    );

    console.log('\n' + '='.repeat(60));
    console.log('FINAL STATUS');
    console.log('='.repeat(60));

    if (uploadResponse) {
      console.log(`Status: ${uploadResponse.status}`);
      console.log(`Response Body: ${uploadResponse.body}`);
      
      if (uploadResponse.status === 200) {
        try {
          const data = JSON.parse(uploadResponse.body);
          if (data.success) {
            console.log('✅ UPLOAD SUCCESSFUL!');
            console.log(`File ID: ${data.id}`);
            console.log(`URL: ${data.url}`);
          } else {
            console.log('❌ UPLOAD FAILED (success: false)');
            console.log(`Error: ${data.error || 'Unknown error'}`);
          }
        } catch (e) {
          console.log('❌ Failed to parse response');
        }
      } else {
        console.log(`❌ HTTP ERROR: ${uploadResponse.status}`);
      }
    } else {
      console.log('❌ No upload response received');
    }

    // Show error logs
    const errorLogs = allLogs.filter(log => log.type === 'error');
    if (errorLogs.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('ERROR LOGS');
      console.log('='.repeat(60));
      errorLogs.forEach(log => {
        console.log(`[ERROR] ${log.text}`);
      });
    }

    // Save full logs
    const logData = {
      consoleLogs: allLogs,
      requests: requests.filter(r => r.url.includes('upload-photo') || r.url.includes('functions')),
      responses: responses.filter(r => r.url.includes('upload-photo') || r.url.includes('functions'))
    };

    fs.writeFileSync(
      path.join(projectRoot, 'upload-debug-logs.json'),
      JSON.stringify(logData, null, 2)
    );
    console.log('\n📝 Full logs saved to upload-debug-logs.json');

  } finally {
    await browser.close();
  }
}

testUpload().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});



