import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Get the port from vite.config.ts
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

const VIEWPORTS = {
  web: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 667 }
};

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

function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

function isVideoFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
}

function isImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif'].includes(ext);
}

async function testUploads(viewport, viewportName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing File Uploads - ${viewportName.toUpperCase()} View`);
  console.log(`${'='.repeat(60)}\n`);

  // Check if test-uploads directory exists
  if (!fs.existsSync(TEST_UPLOADS_DIR)) {
    console.error(`❌ Test uploads directory not found: ${TEST_UPLOADS_DIR}`);
    return { success: false, error: 'Test uploads directory not found' };
  }

  // Get all files from test-uploads directory
  const files = fs.readdirSync(TEST_UPLOADS_DIR)
    .filter(file => {
      const filePath = path.join(TEST_UPLOADS_DIR, file);
      return fs.statSync(filePath).isFile();
    })
    .map(file => {
      const filePath = path.join(TEST_UPLOADS_DIR, file);
      const sizeMB = getFileSizeMB(filePath);
      return {
        name: file,
        path: filePath,
        sizeMB: parseFloat(sizeMB),
        isVideo: isVideoFile(file),
        isImage: isImageFile(file)
      };
    })
    .sort((a, b) => a.sizeMB - b.sizeMB); // Sort by size

  if (files.length === 0) {
    console.error(`❌ No files found in test-uploads directory: ${TEST_UPLOADS_DIR}`);
    return { success: false, error: 'No test files found' };
  }

  console.log(`📁 Found ${files.length} test files:`);
  files.forEach(file => {
    const type = file.isVideo ? '🎥 VIDEO' : file.isImage ? '🖼️  IMAGE' : '📄 FILE';
    console.log(`   ${type}: ${file.name} (${file.sizeMB}MB)`);
  });
  console.log();

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Enable console logging
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text, timestamp: Date.now() });
      if (text.includes('Compressing') || text.includes('compressed') || text.includes('Uploading') || text.includes('Upload successful')) {
        console.log(`[Browser log]: ${text}`);
      }
    });

    // Capture network requests
    const networkRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('upload-photo') || url.includes('functions/v1')) {
        networkRequests.push({
          type: 'request',
          url,
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // Capture network responses
    const networkResponses = [];
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('upload-photo') || url.includes('functions/v1')) {
        let body = null;
        try {
          body = await response.text();
        } catch (e) {
          body = 'Could not read response body';
        }
        networkResponses.push({
          type: 'response',
          url,
          status: response.status(),
          body,
          timestamp: Date.now()
        });
      }
    });

    console.log(`📱 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`🌐 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    await waitFor(2000);

    // Scroll to upload section
    console.log('\n1. Scrolling to upload section...');
    await page.evaluate(() => {
      const uploadSection = document.querySelector('#upload');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await waitFor(1000);

    // Find the file input
    console.log('2. Looking for file input...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }
    console.log('✅ File input found');

    const results = {
      total: files.length,
      successful: 0,
      failed: 0,
      details: []
    };

    // Test each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📤 Testing file ${i + 1}/${files.length}: ${file.name}`);
      console.log(`   Type: ${file.isVideo ? 'Video' : file.isImage ? 'Image' : 'Other'}`);
      console.log(`   Size: ${file.sizeMB}MB`);

      try {
        // Clear previous file input
        await page.evaluate(() => {
          const input = document.querySelector('input[type="file"]');
          if (input) {
            input.value = '';
          }
        });

        // Upload file
        await fileInput.uploadFile(file.path);
        console.log(`   ✅ File selected`);

        // Wait for file to be processed
        await waitFor(2000);

        // Check for compression logs (for images)
        if (file.isImage) {
          const compressionLogs = consoleLogs.filter(log => 
            log.text.includes('Compressing') || 
            log.text.includes('compressed') ||
            log.text.includes(file.name)
          );
          if (compressionLogs.length > 0) {
            const compressionLog = compressionLogs[compressionLogs.length - 1];
            console.log(`   📊 Compression: ${compressionLog.text}`);
          }
        }

        // Find and click upload button
        console.log('   🔍 Looking for upload button...');
        const uploadButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => {
            const text = btn.textContent || '';
            return text.includes('Upload') || text.includes('رفع');
          });
        });

        if (uploadButton && uploadButton.asElement()) {
          await uploadButton.asElement().click();
          console.log('   ✅ Upload button clicked');
        } else {
          // Try to find by aria-label or other attributes
          const uploadButtonAlt = await page.$('button[aria-label*="Upload"], button[aria-label*="رفع"]');
          if (uploadButtonAlt) {
            await uploadButtonAlt.click();
            console.log('   ✅ Upload button clicked (alternative method)');
          } else {
            throw new Error('Upload button not found');
          }
        }

        // Wait for upload to complete
        console.log('   ⏳ Waiting for upload to complete...');
        const uploadStartTime = Date.now();
        const maxWaitTime = file.isVideo ? 300000 : 120000; // 5 min for videos, 2 min for images
        let uploadComplete = false;

        // Wait for success indicator or error
        while (Date.now() - uploadStartTime < maxWaitTime && !uploadComplete) {
          await waitFor(2000);

          // Check for success in network responses
          const successResponse = networkResponses.find(resp => 
            resp.status === 200 && 
            resp.body && 
            (resp.body.includes('"success":true') || resp.body.includes('"id"'))
          );

          if (successResponse) {
            let responseData;
            try {
              responseData = JSON.parse(successResponse.body);
            } catch (e) {
              responseData = { success: true };
            }
            console.log('   ✅ Upload successful!');
            if (responseData.id) {
              console.log(`   📁 File ID: ${responseData.id}`);
              console.log(`   🔗 URL: ${responseData.url || 'N/A'}`);
            }
            uploadComplete = true;
            results.successful++;
            results.details.push({
              file: file.name,
              status: 'success',
              sizeMB: file.sizeMB,
              type: file.isVideo ? 'video' : 'image',
              uploadTime: Date.now() - uploadStartTime,
              fileId: responseData.id,
              url: responseData.url
            });
            break;
          }

          // Check for error in network responses
          const errorResponse = networkResponses.find(resp => 
            resp.status >= 400 || 
            (resp.body && (resp.body.includes('"success":false') || resp.body.includes('"error"')))
          );

          if (errorResponse && !successResponse) {
            let errorMessage = 'Unknown error';
            try {
              const errorData = JSON.parse(errorResponse.body);
              errorMessage = errorData.error || errorData.message || errorResponse.body?.substring(0, 300);
            } catch (e) {
              errorMessage = errorResponse.body?.substring(0, 300) || `HTTP ${errorResponse.status}`;
            }
            console.log(`   ❌ Upload failed (Status: ${errorResponse.status}):`);
            console.log(`   Error: ${errorMessage}`);
            uploadComplete = true;
            results.failed++;
            results.details.push({
              file: file.name,
              status: 'failed',
              sizeMB: file.sizeMB,
              type: file.isVideo ? 'video' : 'image',
              error: errorMessage,
              statusCode: errorResponse.status
            });
            break;
          }

          // Check console for errors
          const errorLogs = consoleLogs.filter(log => 
            log.type === 'error' || 
            log.text.toLowerCase().includes('error') ||
            log.text.toLowerCase().includes('failed')
          );
          if (errorLogs.length > 0 && !successResponse) {
            const lastError = errorLogs[errorLogs.length - 1];
            console.log(`   ⚠️  Error detected: ${lastError.text.substring(0, 200)}`);
          }
        }

        if (!uploadComplete) {
          console.log('   ⏱️  Upload timeout - taking too long');
          results.failed++;
          results.details.push({
            file: file.name,
            status: 'timeout',
            sizeMB: file.sizeMB,
            type: file.isVideo ? 'video' : 'image'
          });
        }

        // Wait before next upload
        await waitFor(3000);

      } catch (error) {
        console.error(`   ❌ Error uploading ${file.name}:`, error.message);
        results.failed++;
        results.details.push({
          file: file.name,
          status: 'error',
          sizeMB: file.sizeMB,
          type: file.isVideo ? 'video' : 'image',
          error: error.message
        });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Summary - ${viewportName.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total files tested: ${results.total}`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success rate: ${((results.successful / results.total) * 100).toFixed(1)}%`);

    return results;

  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('\n🧪 File Upload Test Suite');
  console.log('='.repeat(60));
  console.log('This script tests file uploads using files from test-uploads/');
  console.log('Tests both web and mobile viewports');
  console.log('='.repeat(60));

  // Check if server is running
  const isRunning = await checkServerStatus(PORT);
  if (!isRunning) {
    console.error(`\n❌ Dev server is not running on port ${PORT}!`);
    console.log(`\nPlease start the dev server first:`);
    console.log(`   npm run dev`);
    console.log(`\nOr specify a different port:`);
    console.log(`   TEST_URL=http://localhost:3000 npm run test-upload-files`);
    process.exit(1);
  }

  console.log(`\n✅ Dev server is running on port ${PORT}!`);

  const results = {
    web: null,
    mobile: null
  };

  // Test web viewport
  try {
    results.web = await testUploads(VIEWPORTS.web, 'WEB');
  } catch (error) {
    console.error('\n❌ Web viewport test failed:', error);
    results.web = { success: false, error: error.message };
  }

  // Test mobile viewport
  try {
    results.mobile = await testUploads(VIEWPORTS.mobile, 'MOBILE');
  } catch (error) {
    console.error('\n❌ Mobile viewport test failed:', error);
    results.mobile = { success: false, error: error.message };
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Final Test Summary');
  console.log(`${'='.repeat(60)}`);

  if (results.web) {
    console.log(`\n📊 WEB Viewport:`);
    console.log(`   Total: ${results.web.total || 0}`);
    console.log(`   ✅ Successful: ${results.web.successful || 0}`);
    console.log(`   ❌ Failed: ${results.web.failed || 0}`);
    if (results.web.total > 0) {
      console.log(`   Success rate: ${((results.web.successful / results.web.total) * 100).toFixed(1)}%`);
    }
  }

  if (results.mobile) {
    console.log(`\n📱 MOBILE Viewport:`);
    console.log(`   Total: ${results.mobile.total || 0}`);
    console.log(`   ✅ Successful: ${results.mobile.successful || 0}`);
    console.log(`   ❌ Failed: ${results.mobile.failed || 0}`);
    if (results.mobile.total > 0) {
      console.log(`   Success rate: ${((results.mobile.successful / results.mobile.total) * 100).toFixed(1)}%`);
    }
  }

  const totalSuccessful = (results.web?.successful || 0) + (results.mobile?.successful || 0);
  const totalFailed = (results.web?.failed || 0) + (results.mobile?.failed || 0);
  const totalTests = totalSuccessful + totalFailed;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Overall Results:`);
  console.log(`   Total uploads tested: ${totalTests}`);
  console.log(`   ✅ Successful: ${totalSuccessful}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  if (totalTests > 0) {
    console.log(`   Success rate: ${((totalSuccessful / totalTests) * 100).toFixed(1)}%`);
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

