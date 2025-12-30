import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = 'http://localhost:8080/';

// Helper function to create a test image file
function createTestImage(size, format = 'jpeg') {
  const testDir = path.join(__dirname, '../test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const fileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${format === 'jpeg' ? 'jpg' : format}`;
  const filePath = path.join(testDir, fileName);

  if (format === 'jpeg' || format === 'jpg') {
    // Create a minimal valid JPEG
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x80, 0xFF, 0xD9
    ]);
    const padding = Buffer.alloc(Math.max(0, size - jpegHeader.length), 0xFF);
    const fileBuffer = Buffer.concat([jpegHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  } else if (format === 'png') {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    const padding = Buffer.alloc(Math.max(0, size - pngHeader.length), 0x00);
    const fileBuffer = Buffer.concat([pngHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  }

  return filePath;
}

async function testActualUpload() {
  console.log('🧪 Testing Actual Upload to Google Drive\n');
  console.log(`📍 URL: ${DEV_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();

    // Capture all network requests
    const networkRequests = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('upload-photo') || url.includes('supabase') || url.includes('functions')) {
        const requestData = {
          type: 'request',
          url: url,
          method: request.method(),
          timestamp: Date.now(),
        };
        if (request.method() === 'POST') {
          requestData.postData = request.postData();
        }
        networkRequests.push(requestData);
        console.log(`🌐 Network Request: ${request.method()} ${url}`);
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('upload-photo') || url.includes('supabase') || url.includes('functions')) {
        const status = response.status();
        let body = null;
        try {
          body = await response.text();
        } catch (e) {
          body = 'Could not read response body';
        }
        
        networkRequests.push({
          type: 'response',
          url,
          status,
          body: body ? (body.length > 500 ? body.substring(0, 500) + '...' : body) : null,
          timestamp: Date.now(),
        });

        console.log(`📥 Network Response: ${status} ${url}`);
        if (status !== 200 && status !== 201) {
          console.error(`   ❌ Error Response: ${body ? (body.length > 300 ? body.substring(0, 300) + '...' : body) : 'No body'}`);
        } else if (body) {
          try {
            const jsonBody = JSON.parse(body);
            if (jsonBody.success) {
              console.log(`   ✅ Success: File ID ${jsonBody.id || 'N/A'}`);
            } else if (jsonBody.error) {
              console.error(`   ❌ Error: ${jsonBody.error}`);
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
      }
    });

    // Listen for console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text, timestamp: Date.now() });
      
      if (type === 'error') {
        console.error(`❌ Console Error: ${text}`);
      } else if (text.includes('Upload') || text.includes('upload') || text.includes('Error') || text.includes('error')) {
        console.log(`ℹ️  Console ${type}: ${text}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error(`❌ Page Error: ${error.message}`);
    });

    console.log('🌐 Navigating to page...');
    await page.goto(DEV_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to upload section
    console.log('📜 Scrolling to upload section...');
    await page.evaluate(() => {
      const uploadSection = document.getElementById('upload');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find the file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      console.error('❌ File input not found!');
      return;
    }

    console.log('✅ File input found\n');

    // Create test files
    const testFiles = [
      { size: 500 * 1024, format: 'jpeg', name: 'Small JPEG (500KB)' },
      { size: 2 * 1024 * 1024, format: 'jpeg', name: 'Medium JPEG (2MB)' },
      { size: 1 * 1024 * 1024, format: 'png', name: 'PNG (1MB)' },
    ];

    const createdFiles = [];
    for (const testFile of testFiles) {
      const filePath = createTestImage(testFile.size, testFile.format);
      createdFiles.push({ ...testFile, path: filePath });
      console.log(`📁 Created: ${testFile.name} at ${filePath}`);
    }

    console.log('\n📤 Starting uploads...\n');

    // Upload first file
    const firstFile = createdFiles[0];
    console.log(`📤 Uploading: ${firstFile.name}`);
    
    await fileInput.uploadFile(firstFile.path);

    // Wait for file to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if file appears in preview
    const fileCount = await page.evaluate(() => {
      return document.querySelectorAll('[class*="aspect-square"]').length;
    });
    console.log(`   Files in preview: ${fileCount}`);

    // Find and click upload button
    console.log('🔘 Looking for upload button...');
    const uploadButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Upload') || text.includes('رفع') || text.includes('Upload All');
      });
    });

    const uploadButtonElement = await uploadButton.asElement();
    if (uploadButtonElement) {
      console.log('✅ Upload button found, clicking...\n');
      
      // Monitor upload progress
      let uploadStarted = false;
      const checkUploadStatus = setInterval(async () => {
        const status = await page.evaluate(() => {
          const previews = document.querySelectorAll('[class*="aspect-square"]');
          const statuses = [];
          for (const preview of previews) {
            const overlay = preview.querySelector('[class*="absolute"]');
            if (overlay) {
              const classes = overlay.classList.toString();
              const hasError = classes.includes('destructive');
              const hasSuccess = classes.includes('sage');
              const hasLoading = !!overlay.querySelector('[class*="animate-spin"]');
              statuses.push({ hasError, hasSuccess, hasLoading });
            }
          }
          return statuses;
        });

        const hasLoading = status.some(s => s.hasLoading);
        const hasSuccess = status.some(s => s.hasSuccess);
        const hasError = status.some(s => s.hasError);

        if (hasLoading && !uploadStarted) {
          console.log('⏳ Upload started...');
          uploadStarted = true;
        }

        if (hasSuccess) {
          console.log('✅ Upload successful!');
          clearInterval(checkUploadStatus);
        }

        if (hasError) {
          console.log('❌ Upload failed!');
          clearInterval(checkUploadStatus);
        }
      }, 1000);

      // Click upload button
      console.log('🖱️  Clicking upload button...');
      await uploadButtonElement.click();
      
      // Wait a moment for the click to register
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for upload to complete (max 60 seconds)
      console.log('⏳ Waiting for upload to complete...');
      
      // Wait for network activity or status changes
      let uploadCompleted = false;
      const maxWaitTime = 60000; // 60 seconds
      const startTime = Date.now();
      
      while (!uploadCompleted && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if upload requests were made
        const hasUploadRequest = networkRequests.some(r => 
          r.url.includes('upload-photo') && r.method === 'POST'
        );
        
        if (hasUploadRequest) {
          console.log('✅ Upload request detected!');
        }
        
        // Check status
        const currentStatus = await page.evaluate(() => {
          const previews = document.querySelectorAll('[class*="aspect-square"]');
          const statuses = [];
          for (const preview of previews) {
            const overlay = preview.querySelector('[class*="absolute"]');
            if (overlay) {
              const classes = overlay.classList.toString();
              const hasError = classes.includes('destructive');
              const hasSuccess = classes.includes('sage');
              const hasLoading = !!overlay.querySelector('[class*="animate-spin"]');
              statuses.push({ hasError, hasSuccess, hasLoading });
            }
          }
          return statuses;
        });
        
        const hasSuccess = currentStatus.some(s => s.hasSuccess);
        const hasError = currentStatus.some(s => s.hasError);
        const hasLoading = currentStatus.some(s => s.hasLoading);
        
        if (hasSuccess) {
          console.log('✅ Upload completed successfully!');
          uploadCompleted = true;
        } else if (hasError && !hasLoading) {
          console.log('❌ Upload failed with error');
          uploadCompleted = true;
        } else if (hasLoading) {
          console.log('⏳ Upload in progress...');
        }
      }

      clearInterval(checkUploadStatus);

      // Check final status
      const finalStatus = await page.evaluate(() => {
        const previews = document.querySelectorAll('[class*="aspect-square"]');
        const results = [];
        for (const preview of previews) {
          const overlay = preview.querySelector('[class*="absolute"]');
          if (overlay) {
            const classes = overlay.classList.toString();
            const hasError = classes.includes('destructive');
            const hasSuccess = classes.includes('sage');
            const hasLoading = !!overlay.querySelector('[class*="animate-spin"]');
            results.push({ hasError, hasSuccess, hasLoading });
          }
        }
        return results;
      });

      console.log('\n📊 Final Upload Status:');
      finalStatus.forEach((status, index) => {
        if (status.hasSuccess) {
          console.log(`   File ${index + 1}: ✅ Success`);
        } else if (status.hasError) {
          console.log(`   File ${index + 1}: ❌ Error`);
        } else if (status.hasLoading) {
          console.log(`   File ${index + 1}: ⏳ Still uploading...`);
        } else {
          console.log(`   File ${index + 1}: ⏳ Pending`);
        }
      });

    } else {
      console.log('❌ Upload button not found!');
    }

    // Check for error messages
    console.log('\n🔍 Checking for error messages...');
    const errorMessages = await page.evaluate(() => {
      const errors = [];
      const toastSelectors = [
        '[role="alert"]',
        '[data-sonner-toast]',
        '[data-radix-toast-viewport] [role="status"]',
        '.toast',
      ];
      
      for (const selector of toastSelectors) {
        const toasts = document.querySelectorAll(selector);
        for (const toast of toasts) {
          const text = toast.textContent || '';
          if (text.includes('error') || text.includes('Error') || text.includes('failed') || text.includes('Failed')) {
            errors.push(text);
          }
        }
      }
      return errors;
    });

    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:');
      errorMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg}`);
      });
    } else {
      console.log('✅ No error messages found');
    }

    // Network request analysis
    console.log('\n🌐 Network Request Analysis:');
    const uploadRequests = networkRequests.filter(r => 
      r.url.includes('upload-photo') || 
      (r.url.includes('functions') && r.url.includes('upload'))
    );
    
    if (uploadRequests.length > 0) {
      console.log(`   Found ${uploadRequests.length} upload-related request(s)`);
      uploadRequests.forEach((req, index) => {
        console.log(`\n   Request ${index + 1}:`);
        console.log(`     Type: ${req.type}`);
        console.log(`     Method: ${req.method || 'N/A'}`);
        console.log(`     URL: ${req.url}`);
        if (req.status) {
          console.log(`     Status: ${req.status}`);
          if (req.status === 200 || req.status === 201) {
            console.log(`     ✅ Success`);
          } else {
            console.log(`     ❌ Failed`);
          }
        }
        if (req.body) {
          try {
            const bodyJson = JSON.parse(req.body);
            if (bodyJson.error) {
              console.log(`     ❌ Error: ${bodyJson.error}`);
            }
            if (bodyJson.success) {
              console.log(`     ✅ Success: File ID: ${bodyJson.id || 'N/A'}`);
              if (bodyJson.url) {
                console.log(`     📎 Drive URL: ${bodyJson.url}`);
              }
              if (bodyJson.name) {
                console.log(`     📄 File Name: ${bodyJson.name}`);
              }
            }
          } catch (e) {
            if (req.body.length < 500) {
              console.log(`     Body: ${req.body}`);
            } else {
              console.log(`     Body: ${req.body.substring(0, 200)}...`);
            }
          }
        }
      });
    } else {
      console.log('   ⚠️  No upload requests detected');
      console.log('   This might indicate:');
      console.log('     - Upload button click did not trigger upload');
      console.log('     - Config missing (uploadFolderId)');
      console.log('     - JavaScript error preventing upload');
    }
    
    // Check all network requests for debugging
    if (networkRequests.length > 0) {
      console.log(`\n   Total network requests captured: ${networkRequests.length}`);
      const supabaseRequests = networkRequests.filter(r => r.url.includes('supabase'));
      console.log(`   Supabase requests: ${supabaseRequests.length}`);
    }

    // Console error analysis
    console.log('\n📝 Console Error Analysis:');
    const uploadErrors = consoleMessages.filter(m => 
      m.text.toLowerCase().includes('upload') || 
      m.text.toLowerCase().includes('error') ||
      m.text.toLowerCase().includes('failed')
    );
    
    if (uploadErrors.length > 0) {
      uploadErrors.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
      });
    } else {
      console.log('   ✅ No upload-related errors in console');
    }

    // Take screenshot
    await page.screenshot({ path: 'upload-test-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved: upload-test-final.png');

    // Clean up test files
    console.log('\n🧹 Cleaning up test files...');
    createdFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`   Deleted: ${file.path}`);
      }
    });

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error('\n💡 The dev server is not running!');
      console.error('   Please run: npm run dev');
    }
    console.error('\nStack trace:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testActualUpload().catch(console.error);

