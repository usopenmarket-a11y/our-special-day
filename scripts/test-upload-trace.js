import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Get the port from vite.config.ts
let PORT = 5173;
try {
  const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  const portMatch = viteConfig.match(/port:\s*(\d+)/);
  if (portMatch) {
    PORT = parseInt(portMatch[1], 10);
  }
} catch (error) {
  console.log('⚠️  Could not read vite.config.ts, using default port 5173');
}

const BASE_URL = process.env.TEST_URL || `http://localhost:${PORT}`;
const TEST_UPLOADS_DIR = path.join(projectRoot, 'test-uploads');

// Detailed trace data
const traceData = {
  consoleLogs: [],
  networkRequests: [],
  networkResponses: [],
  errors: [],
  pageErrors: [],
  configState: null,
  uploadAttempts: [],
  timestamps: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, type, message };
  traceData.timestamps.push(logEntry);
  console.log(`[${timestamp}] ${message}`);
}

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

async function testUploadTrace() {
  console.log('\n🔍 Upload Issue Tracer & Debugger');
  console.log('='.repeat(70));
  console.log(`🌐 Testing URL: ${BASE_URL}`);
  console.log('='.repeat(70) + '\n');

  // Check if server is running
  const isRunning = await checkServerStatus(PORT);
  if (!isRunning) {
    console.error(`\n❌ Dev server is not running on port ${PORT}!`);
    console.log(`\nPlease start the dev server first:`);
    console.log(`   npm run dev`);
    process.exit(1);
  }

  log('✅ Dev server is running', 'success');

  // Check for test files
  if (!fs.existsSync(TEST_UPLOADS_DIR)) {
    log(`❌ Test uploads directory not found: ${TEST_UPLOADS_DIR}`, 'error');
    process.exit(1);
  }

  const testFiles = fs.readdirSync(TEST_UPLOADS_DIR)
    .filter(file => {
      const filePath = path.join(TEST_UPLOADS_DIR, file);
      return fs.statSync(filePath).isFile();
    })
    .slice(0, 3); // Test with first 3 files

  if (testFiles.length === 0) {
    log('❌ No test files found', 'error');
    process.exit(1);
  }

  log(`Found ${testFiles.length} test files to upload`, 'info');

  const browser = await puppeteer.launch({
    headless: false, // Keep visible for debugging
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security', // For CORS debugging
    ],
    devtools: true, // Open DevTools automatically
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Enable request interception to capture all network traffic
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      const headers = request.headers();
      
      traceData.networkRequests.push({
        timestamp: Date.now(),
        url,
        method,
        headers: Object.keys(headers).reduce((acc, key) => {
          // Don't log sensitive headers
          if (!['authorization', 'apikey', 'cookie'].includes(key.toLowerCase())) {
            acc[key] = headers[key];
          } else {
            acc[key] = '[REDACTED]';
          }
          return acc;
        }, {}),
        postData: request.postData(),
      });

      // Log important requests
      if (url.includes('upload-photo') || url.includes('get-config') || url.includes('functions/v1')) {
        log(`📤 REQUEST: ${method} ${url}`, 'network');
        if (request.postData()) {
          log(`   Post data length: ${request.postData().length} bytes`, 'network');
        }
      }

      request.continue();
    });

    // Capture all console messages
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      const location = msg.location();
      
      traceData.consoleLogs.push({
        timestamp: Date.now(),
        type,
        text,
        location: location ? `${location.url}:${location.lineNumber}` : 'unknown',
      });

      // Log important console messages
      if (
        text.includes('upload') ||
        text.includes('Upload') ||
        text.includes('config') ||
        text.includes('Config') ||
        text.includes('error') ||
        text.includes('Error') ||
        text.includes('failed') ||
        text.includes('Failed') ||
        type === 'error'
      ) {
        const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝';
        log(`${icon} CONSOLE [${type}]: ${text}`, type);
        if (location) {
          log(`   Location: ${location.url}:${location.lineNumber}`, type);
        }
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      traceData.pageErrors.push({
        timestamp: Date.now(),
        message: error.message,
        stack: error.stack,
      });
      log(`💥 PAGE ERROR: ${error.message}`, 'error');
      if (error.stack) {
        log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`, 'error');
      }
    });

    // Capture network responses with detailed info
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const statusText = response.statusText();
      const headers = response.headers();

      let body = null;
      let bodyText = null;
      try {
        bodyText = await response.text();
        try {
          body = JSON.parse(bodyText);
        } catch {
          body = bodyText;
        }
      } catch (e) {
        bodyText = `Could not read response: ${e.message}`;
      }

      const responseData = {
        timestamp: Date.now(),
        url,
        status,
        statusText,
        headers: Object.keys(headers).reduce((acc, key) => {
          if (!['set-cookie'].includes(key.toLowerCase())) {
            acc[key] = headers[key];
          }
          return acc;
        }, {}),
        body,
        bodyText: bodyText?.substring(0, 2000), // Limit body text length
      };

      traceData.networkResponses.push(responseData);

      // Log important responses
      if (url.includes('upload-photo') || url.includes('get-config') || url.includes('functions/v1')) {
        const icon = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
        log(`${icon} RESPONSE: ${status} ${statusText} - ${url}`, status >= 400 ? 'error' : 'network');
        
        if (body && typeof body === 'object') {
          log(`   Response body: ${JSON.stringify(body, null, 2).substring(0, 500)}`, 'network');
        } else if (bodyText) {
          log(`   Response body: ${bodyText.substring(0, 500)}`, 'network');
        }

        if (status >= 400) {
          log(`   ❌ ERROR RESPONSE DETECTED`, 'error');
        }
      }
    });

    log('📱 Navigating to page...', 'info');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await waitFor(3000);

    log('✅ Page loaded', 'success');

    // Check config state
    log('\n📋 Checking configuration state...', 'info');
    const configState = await page.evaluate(() => {
      // Try to access config from window or React DevTools
      // This is a best-effort check
      return {
        hasConfigProvider: !!document.querySelector('[data-config]'),
        hasUploadSection: !!document.querySelector('#upload'),
      };
    });
    traceData.configState = configState;
    log(`   Config provider: ${configState.hasConfigProvider ? '✅' : '❌'}`, 'info');
    log(`   Upload section: ${configState.hasUploadSection ? '✅' : '❌'}`, 'info');

    // Wait for config to load by checking for get-config network call
    log('\n⏳ Waiting for config to load...', 'info');
    await waitFor(5000);

    // Check if config loaded by looking for uploadFolderId in console or network
    const configResponse = traceData.networkResponses.find(r => r.url.includes('get-config'));
    if (configResponse) {
      log('✅ Config API called', 'success');
      if (configResponse.body && configResponse.body.uploadFolderId) {
        log(`   uploadFolderId: ${configResponse.body.uploadFolderId ? '✅ Set' : '❌ Missing'}`, 
            configResponse.body.uploadFolderId ? 'success' : 'error');
        traceData.configState.uploadFolderId = configResponse.body.uploadFolderId;
      } else {
        log('   ❌ uploadFolderId is missing in config response', 'error');
      }
    } else {
      log('⚠️  Config API not called yet', 'warning');
    }

    // Scroll to upload section
    log('\n📜 Scrolling to upload section...', 'info');
    await page.evaluate(() => {
      const uploadSection = document.querySelector('#upload');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await waitFor(2000);

    // Check if upload section is visible
    const uploadSectionVisible = await page.evaluate(() => {
      const section = document.querySelector('#upload');
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    log(`   Upload section visible: ${uploadSectionVisible ? '✅' : '❌'}`, uploadSectionVisible ? 'success' : 'error');

    // Find file input
    log('\n🔍 Looking for file input...', 'info');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      log('❌ File input not found!', 'error');
      throw new Error('File input not found');
    }
    log('✅ File input found', 'success');

    // Check upload button state
    const uploadButtonState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const uploadButton = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Upload') || text.includes('رفع');
      });
      if (!uploadButton) return null;
      return {
        exists: true,
        disabled: uploadButton.disabled,
        text: uploadButton.textContent?.trim(),
      };
    });

    if (uploadButtonState) {
      log(`   Upload button: ${uploadButtonState.disabled ? '❌ Disabled' : '✅ Enabled'}`, 
          uploadButtonState.disabled ? 'error' : 'success');
      log(`   Button text: "${uploadButtonState.text}"`, 'info');
      if (uploadButtonState.disabled) {
        log('   ⚠️  Upload button is disabled - this might indicate config is not loaded', 'warning');
      }
    } else {
      log('   ⚠️  Upload button not found (might appear after files are selected)', 'warning');
    }

    // Test uploading files
    log('\n📤 Starting upload tests...', 'info');
    for (let i = 0; i < testFiles.length; i++) {
      const fileName = testFiles[i];
      const filePath = path.join(TEST_UPLOADS_DIR, fileName);
      const fileSize = fs.statSync(filePath).size;
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

      log(`\n${'─'.repeat(70)}`, 'info');
      log(`📁 Test ${i + 1}/${testFiles.length}: ${fileName} (${fileSizeMB}MB)`, 'info');
      log(`${'─'.repeat(70)}`, 'info');

      const uploadAttempt = {
        fileName,
        fileSize,
        fileSizeMB,
        startTime: Date.now(),
        endTime: null,
        success: false,
        error: null,
        networkRequest: null,
        networkResponse: null,
      };

      try {
        // Clear previous file input
        await page.evaluate(() => {
          const input = document.querySelector('input[type="file"]');
          if (input) {
            input.value = '';
          }
        });

        // Upload file
        log('   📎 Selecting file...', 'info');
        await fileInput.uploadFile(filePath);
        log('   ✅ File selected', 'success');
        await waitFor(2000);

        // Check if file preview appeared
        const previewCount = await page.evaluate(() => {
          const uploadSection = document.querySelector('#upload');
          if (!uploadSection) return 0;
          // Look for image/video previews
          const previews = uploadSection.querySelectorAll('img, video');
          return previews.length;
        });
        log(`   Preview count: ${previewCount}`, previewCount > 0 ? 'success' : 'warning');

        // Check upload button again
        const uploadButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => {
            const text = btn.textContent || '';
            return (text.includes('Upload') || text.includes('رفع')) && !btn.disabled;
          });
        });

        if (!uploadButton || !uploadButton.asElement()) {
          log('   ❌ Upload button not found or disabled', 'error');
          uploadAttempt.error = 'Upload button not available';
          uploadAttempt.success = false;
          traceData.uploadAttempts.push(uploadAttempt);
          continue;
        }

        log('   🔘 Clicking upload button...', 'info');
        const requestCountBefore = traceData.networkRequests.filter(r => r.url.includes('upload-photo')).length;
        await uploadButton.asElement().click();
        log('   ✅ Upload button clicked', 'success');

        // Wait for network request
        log('   ⏳ Waiting for upload request...', 'info');
        let requestFound = false;
        for (let wait = 0; wait < 30; wait++) {
          await waitFor(1000);
          const requestCountAfter = traceData.networkRequests.filter(r => r.url.includes('upload-photo')).length;
          if (requestCountAfter > requestCountBefore) {
            requestFound = true;
            const uploadRequest = traceData.networkRequests
              .filter(r => r.url.includes('upload-photo'))
              .slice(-1)[0];
            uploadAttempt.networkRequest = uploadRequest;
            log('   ✅ Upload request sent', 'success');
            log(`      URL: ${uploadRequest.url}`, 'info');
            log(`      Method: ${uploadRequest.method}`, 'info');
            break;
          }
        }

        if (!requestFound) {
          log('   ❌ Upload request not sent!', 'error');
          uploadAttempt.error = 'No network request was made';
          uploadAttempt.success = false;
          traceData.uploadAttempts.push(uploadAttempt);
          continue;
        }

        // Wait for response
        log('   ⏳ Waiting for upload response...', 'info');
        const maxWaitTime = 120000; // 2 minutes
        const startWait = Date.now();
        let responseFound = false;

        while (Date.now() - startWait < maxWaitTime && !responseFound) {
          await waitFor(2000);
          const uploadResponse = traceData.networkResponses
            .filter(r => r.url.includes('upload-photo'))
            .slice(-1)[0];

          if (uploadResponse && uploadResponse.timestamp > uploadAttempt.startTime) {
            responseFound = true;
            uploadAttempt.networkResponse = uploadResponse;
            uploadAttempt.endTime = Date.now();
            const duration = ((uploadAttempt.endTime - uploadAttempt.startTime) / 1000).toFixed(2);

            log(`   📥 Response received (${duration}s)`, 'info');
            log(`      Status: ${uploadResponse.status} ${uploadResponse.statusText}`, 
                uploadResponse.status >= 200 && uploadResponse.status < 300 ? 'success' : 'error');

            if (uploadResponse.body) {
              if (typeof uploadResponse.body === 'object') {
                if (uploadResponse.body.success) {
                  log('   ✅ Upload successful!', 'success');
                  log(`      File ID: ${uploadResponse.body.id || 'N/A'}`, 'success');
                  uploadAttempt.success = true;
                } else {
                  log('   ❌ Upload failed (success: false)', 'error');
                  log(`      Error: ${uploadResponse.body.error || uploadResponse.body.message || 'Unknown error'}`, 'error');
                  uploadAttempt.error = uploadResponse.body.error || uploadResponse.body.message || 'Unknown error';
                  uploadAttempt.success = false;
                }
              } else {
                log(`   Response body: ${String(uploadResponse.body).substring(0, 200)}`, 'info');
              }
            } else {
              log('   ⚠️  No response body', 'warning');
            }
            break;
          }
        }

        if (!responseFound) {
          log('   ⏱️  Timeout waiting for response', 'error');
          uploadAttempt.error = 'Timeout waiting for response';
          uploadAttempt.success = false;
        }

      } catch (error) {
        log(`   ❌ Error during upload: ${error.message}`, 'error');
        uploadAttempt.error = error.message;
        uploadAttempt.success = false;
      }

      traceData.uploadAttempts.push(uploadAttempt);
      await waitFor(3000); // Wait before next upload
    }

    // Generate summary report
    log('\n' + '='.repeat(70), 'info');
    log('📊 TRACE SUMMARY', 'info');
    log('='.repeat(70), 'info');

    log(`\n📋 Configuration:`, 'info');
    log(`   uploadFolderId: ${traceData.configState?.uploadFolderId ? '✅ Set' : '❌ Missing'}`, 
        traceData.configState?.uploadFolderId ? 'success' : 'error');

    log(`\n📤 Upload Attempts: ${traceData.uploadAttempts.length}`, 'info');
    const successful = traceData.uploadAttempts.filter(a => a.success).length;
    const failed = traceData.uploadAttempts.filter(a => !a.success).length;
    log(`   ✅ Successful: ${successful}`, successful > 0 ? 'success' : 'info');
    log(`   ❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');

    if (failed > 0) {
      log(`\n❌ Failed Uploads:`, 'error');
      traceData.uploadAttempts
        .filter(a => !a.success)
        .forEach((attempt, i) => {
          console.log(`   ${i + 1}. ${attempt.fileName}`);
          console.log(`      Error: ${attempt.error || 'Unknown'}`);
          if (attempt.networkResponse) {
            console.log(`      Status: ${attempt.networkResponse.status}`);
            if (attempt.networkResponse.body && typeof attempt.networkResponse.body === 'object') {
              console.log(`      Response: ${JSON.stringify(attempt.networkResponse.body)}`);
            }
          }
        });
    }

    log(`\n🌐 Network Requests: ${traceData.networkRequests.length}`, 'info');
    log(`   upload-photo: ${traceData.networkRequests.filter(r => r.url.includes('upload-photo')).length}`, 'info');
    log(`   get-config: ${traceData.networkRequests.filter(r => r.url.includes('get-config')).length}`, 'info');

    log(`\n📥 Network Responses: ${traceData.networkResponses.length}`, 'info');
    const errorResponses = traceData.networkResponses.filter(r => r.status >= 400);
    if (errorResponses.length > 0) {
      log(`   ❌ Error responses: ${errorResponses.length}`, 'error');
      errorResponses.forEach((resp, i) => {
        log(`      ${i + 1}. ${resp.status} ${resp.url}`, 'error');
        if (resp.body && typeof resp.body === 'object' && resp.body.error) {
          log(`         Error: ${resp.body.error}`, 'error');
        }
      });
    }

    log(`\n💥 Errors: ${traceData.pageErrors.length}`, traceData.pageErrors.length > 0 ? 'error' : 'info');
    traceData.pageErrors.forEach((error, i) => {
      log(`   ${i + 1}. ${error.message}`, 'error');
    });

    log(`\n📝 Console Logs: ${traceData.consoleLogs.length}`, 'info');
    const errorLogs = traceData.consoleLogs.filter(l => l.type === 'error');
    if (errorLogs.length > 0) {
      log(`   ❌ Error logs: ${errorLogs.length}`, 'error');
      errorLogs.slice(-5).forEach((logEntry, i) => {
        console.log(`      ${i + 1}. ${logEntry.text.substring(0, 200)}`);
      });
    }

    // Save trace data to file
    const traceFilePath = path.join(projectRoot, 'upload-trace-data.json');
    fs.writeFileSync(traceFilePath, JSON.stringify(traceData, null, 2));
    log(`\n💾 Trace data saved to: ${traceFilePath}`, 'success');

    // Keep browser open for observation
    log('\n🔍 Keeping browser open for 15 seconds for observation...', 'info');
    await waitFor(15000);

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'error');
    if (error.stack) {
      log(`   Stack: ${error.stack}`, 'error');
    }
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testUploadTrace().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

