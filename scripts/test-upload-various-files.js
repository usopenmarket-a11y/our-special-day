import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = 'http://localhost:8080/';

// Create test images of different sizes
async function createTestImages() {
  const testDir = path.join(__dirname, '../test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFiles = [];

  // Create a simple 1x1 pixel PNG (very small)
  const smallPng = path.join(testDir, 'small-test.png');
  // We'll use a data URL approach since we can't easily create binary files in Node
  // Instead, we'll test with actual file selection simulation

  return testFiles;
}

async function testUploads() {
  console.log('🧪 Testing Upload Functionality with Various File Types & Sizes\n');
  console.log(`📍 URL: ${DEV_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();

    // Listen for console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text, timestamp: Date.now() });
      if (type === 'error') {
        console.error(`❌ Console Error: ${text}`);
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

    // Test cases: different file types and sizes
    const testCases = [
      {
        name: 'Small JPEG (1KB)',
        type: 'image/jpeg',
        size: 1024, // 1KB
        extension: '.jpg',
      },
      {
        name: 'Medium JPEG (500KB)',
        type: 'image/jpeg',
        size: 500 * 1024, // 500KB
        extension: '.jpg',
      },
      {
        name: 'Large JPEG (5MB)',
        type: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
        extension: '.jpg',
      },
      {
        name: 'Very Large JPEG (9.5MB)',
        type: 'image/jpeg',
        size: 9.5 * 1024 * 1024, // 9.5MB
        extension: '.jpg',
      },
      {
        name: 'PNG (2MB)',
        type: 'image/png',
        size: 2 * 1024 * 1024, // 2MB
        extension: '.png',
      },
      {
        name: 'GIF (1MB)',
        type: 'image/gif',
        size: 1 * 1024 * 1024, // 1MB
        extension: '.gif',
      },
      {
        name: 'Small MP4 Video (2MB)',
        type: 'video/mp4',
        size: 2 * 1024 * 1024, // 2MB
        extension: '.mp4',
      },
      {
        name: 'Large MP4 Video (50MB)',
        type: 'video/mp4',
        size: 50 * 1024 * 1024, // 50MB
        extension: '.mp4',
      },
      {
        name: 'Very Large Video (110MB) - Should Fail',
        type: 'video/mp4',
        size: 110 * 1024 * 1024, // 110MB - exceeds 100MB limit
        extension: '.mp4',
      },
      {
        name: 'Large Image (11MB) - Should Fail',
        type: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB - exceeds 10MB limit
        extension: '.jpg',
      },
    ];

    const results = [];

    for (const testCase of testCases) {
      console.log(`\n📤 Testing: ${testCase.name}`);
      console.log(`   Type: ${testCase.type}, Size: ${(testCase.size / 1024 / 1024).toFixed(2)}MB`);

      try {
        // Create a test file with the specified size
        const testFile = await createTestFile(testCase.size, testCase.type, testCase.extension);

        // Clear previous uploads
        await page.evaluate(() => {
          const input = document.querySelector('input[type="file"]');
          if (input) {
            input.value = '';
          }
        });

        // Get file size before upload
        const stats = fs.statSync(testFile);
        const actualFileSize = stats.size;
        console.log(`   Actual file size: ${(actualFileSize / 1024 / 1024).toFixed(2)}MB`);

        // Upload the file
        await fileInput.uploadFile(testFile);

        // Wait for file to be processed and validation to run
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Wait a bit for validation/error messages to appear
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for error messages and file count
        const validationResult = await page.evaluate(() => {
          // Check for toast notifications (multiple selectors for different toast libraries)
          const toastSelectors = [
            '[role="alert"]',
            '[data-sonner-toast]',
            '[data-radix-toast-viewport] [role="status"]',
            '.toast',
            '[class*="toast"]',
            'div[class*="fixed"][class*="top"]', // Common toast container
          ];
          
          let errorMessage = null;
          for (const selector of toastSelectors) {
            const toasts = document.querySelectorAll(selector);
            for (const toast of toasts) {
              const text = toast.textContent || '';
              if (text.includes('error') || text.includes('Error') || text.includes('failed') || text.includes('Failed') || 
                  text.includes('too large') || text.includes('invalid') || text.includes('exceeds') ||
                  text.includes('big') || text.includes('limit')) {
                errorMessage = text;
                break;
              }
            }
            if (errorMessage) break;
          }
          
          // Count files in preview
          const previews = document.querySelectorAll('[class*="aspect-square"]');
          const fileCount = previews.length;
          
          // Check console for errors (we can't access console.log directly, but we can check for visible errors)
          return {
            errorMessage,
            fileCount,
            hasFiles: fileCount > 0,
          };
        });

        const errorMessage = validationResult.errorMessage;
        const fileCount = validationResult.fileCount;
        const hasFiles = validationResult.hasFiles;
        
        console.log(`   Files in preview: ${fileCount}`);
        if (errorMessage) {
          console.log(`   Error detected: ${errorMessage.substring(0, 100)}...`);
        }

        // Check file status in preview
        const fileStatus = await page.evaluate(() => {
          const previews = document.querySelectorAll('[class*="aspect-square"]');
          const statuses = [];
          for (const preview of previews) {
            const overlay = preview.querySelector('[class*="absolute"]');
            if (overlay) {
              const classes = overlay.classList.toString();
              const hasError = classes.includes('destructive');
              const hasSuccess = classes.includes('sage');
              const hasLoading = !!overlay.querySelector('[class*="animate-spin"]');
              const hasCheck = !!overlay.querySelector('[class*="Check"]') || overlay.textContent?.includes('✓');
              const hasX = !!overlay.querySelector('[class*="X"]') || overlay.textContent?.includes('✗');
              
              statuses.push({
                hasError: hasError || hasX,
                hasSuccess: hasSuccess || hasCheck,
                hasLoading: hasLoading,
                classes: classes,
              });
            }
          }
          return statuses;
        });

        // Check if upload button is available (using XPath for text matching)
        const uploadButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => {
            const text = btn.textContent || '';
            return text.includes('Upload') || text.includes('رفع') || text.includes('Upload All');
          });
        });
        const canUpload = uploadButton && (await uploadButton.asElement()) !== null;

        // Determine if file was rejected (should have error and no files, or file count didn't increase)
        const wasRejected = !!errorMessage && (!hasFiles || fileCount === 0);
        const wasAccepted = hasFiles && !errorMessage;
        
        const result = {
          name: testCase.name,
          type: testCase.type,
          size: testCase.size,
          actualSize: actualFileSize,
          errorMessage: errorMessage || null,
          fileStatus,
          canUpload,
          fileCount,
          wasRejected,
          wasAccepted,
          success: !errorMessage && fileStatus.some(s => s.hasSuccess),
          failed: !!errorMessage || fileStatus.some(s => s.hasError),
        };

        results.push(result);

        if (wasRejected) {
          console.log(`   ❌ Rejected: ${errorMessage ? errorMessage.substring(0, 80) : 'File not added to preview'}`);
        } else if (wasAccepted) {
          console.log(`   ✅ Accepted: File added to preview (${fileCount} file(s))`);
        } else if (errorMessage) {
          console.log(`   ⚠️  Warning: ${errorMessage.substring(0, 80)}`);
        } else {
          console.log(`   ⏳ Pending: File in queue`);
        }

        // Clean up test file
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }

      } catch (error) {
        console.error(`   ❌ Test failed: ${error.message}`);
        results.push({
          name: testCase.name,
          type: testCase.type,
          size: testCase.size,
          error: error.message,
          success: false,
        });
      }
    }

    // Summary
    console.log('\n\n📊 Test Results Summary:');
    console.log('='.repeat(60));
    results.forEach((result, index) => {
      const status = result.success ? '✅' : result.failed ? '❌' : '⏳';
      const sizeMB = (result.size / 1024 / 1024).toFixed(2);
      console.log(`${status} ${result.name} (${sizeMB}MB)`);
      if (result.errorMessage) {
        console.log(`   Error: ${result.errorMessage}`);
      }
      if (result.error) {
        console.log(`   Exception: ${result.error}`);
      }
    });

    // Check for issues
    console.log('\n🔍 Issues Found:');
    const issues = [];
    
    // Check if large files are handled correctly
    const largeImageTest = results.find(r => r.name.includes('11MB'));
    if (largeImageTest) {
      if (!largeImageTest.wasRejected && largeImageTest.wasAccepted) {
        issues.push(`❌ Large image (11MB) should be rejected but was accepted (${largeImageTest.fileCount} files in preview)`);
      } else if (largeImageTest.wasRejected) {
        console.log(`✅ Large image (11MB) correctly rejected`);
      }
    }

    const largeVideoTest = results.find(r => r.name.includes('110MB'));
    if (largeVideoTest) {
      if (!largeVideoTest.wasRejected && largeVideoTest.wasAccepted) {
        issues.push(`❌ Large video (110MB) should be rejected but was accepted (${largeVideoTest.fileCount} files in preview)`);
      } else if (largeVideoTest.wasRejected) {
        console.log(`✅ Large video (110MB) correctly rejected`);
      }
    }

    // Check if valid files are accepted
    const validTests = results.filter(r => 
      !r.name.includes('Should Fail') && 
      (r.name.includes('Small') || r.name.includes('Medium') || r.name.includes('2MB') || r.name.includes('5MB') || r.name.includes('9.5MB'))
    );
    const rejectedValid = validTests.filter(r => r.wasRejected);
    if (rejectedValid.length > 0) {
      issues.push(`❌ ${rejectedValid.length} valid file(s) were incorrectly rejected: ${rejectedValid.map(r => r.name).join(', ')}`);
    } else {
      const acceptedValid = validTests.filter(r => r.wasAccepted);
      console.log(`✅ ${acceptedValid.length} valid file(s) correctly accepted`);
    }
    
    // Check file size accuracy
    const sizeMismatches = results.filter(r => {
      const expectedMB = r.size / 1024 / 1024;
      const actualMB = r.actualSize / 1024 / 1024;
      const difference = Math.abs(expectedMB - actualMB);
      return difference > 0.1; // More than 100KB difference
    });
    if (sizeMismatches.length > 0) {
      issues.push(`⚠️  ${sizeMismatches.length} file(s) have size mismatches (test files may not be created correctly)`);
    }

    if (issues.length === 0) {
      console.log('✅ No issues found! All tests passed as expected.');
    } else {
      issues.forEach(issue => console.log(issue));
    }

    // Take screenshot
    await page.screenshot({ path: 'upload-test-results.png', fullPage: true });
    console.log('\n📸 Screenshot saved: upload-test-results.png');

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

// Helper function to create a test file
async function createTestFile(size, mimeType, extension) {
  const testDir = path.join(__dirname, '../test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const fileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
  const filePath = path.join(testDir, fileName);

  // Create a file with the specified size
  // For images, we'll create a minimal valid file structure
  // For videos, we'll create a minimal MP4 structure
  
  if (mimeType.startsWith('image/')) {
    // Create a minimal valid image file
    // For JPEG: minimal JPEG header + data
    if (mimeType === 'image/jpeg' || extension === '.jpg') {
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
    } else if (mimeType === 'image/png' || extension === '.png') {
      // Minimal PNG
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
    } else if (mimeType === 'image/gif' || extension === '.gif') {
      // Minimal GIF
      const gifHeader = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x04\x01\x00;', 'binary');
      const padding = Buffer.alloc(Math.max(0, size - gifHeader.length), 0x00);
      const fileBuffer = Buffer.concat([gifHeader, padding]);
      fs.writeFileSync(filePath, fileBuffer);
    }
  } else if (mimeType.startsWith('video/')) {
    // Create a minimal MP4 file
    // MP4 header structure
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
    ]);
    const padding = Buffer.alloc(Math.max(0, size - mp4Header.length), 0x00);
    const fileBuffer = Buffer.concat([mp4Header, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  } else {
    // Generic binary file
    const fileBuffer = Buffer.alloc(size, 0x00);
    fs.writeFileSync(filePath, fileBuffer);
  }

  return filePath;
}

testUploads().catch(console.error);

