import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = 'http://localhost:8080/';

// Helper function to create a test image file
function createTestImage(sizeMB, format = 'jpeg') {
  const testDir = path.join(__dirname, '../test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const size = Math.floor(sizeMB * 1024 * 1024);
  const ext = format === 'jpeg' ? 'jpg' : format;
  const fileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
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
  } else if (format === 'gif') {
    const gifHeader = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3B
    ]);
    const padding = Buffer.alloc(Math.max(0, size - gifHeader.length), 0x00);
    const fileBuffer = Buffer.concat([gifHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  } else if (format === 'heic') {
    // HEIC files are more complex, but we can create a minimal valid one
    // For testing purposes, we'll create a file with HEIC-like header
    const heicHeader = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31,
      0x00, 0x00, 0x00, 0x00, 0x6D, 0x69, 0x66, 0x31, 0x6D, 0x69, 0x61, 0x66,
      0x6D, 0x69, 0x61, 0x66, 0x4D, 0x41, 0x31, 0x41
    ]);
    const padding = Buffer.alloc(Math.max(0, size - heicHeader.length), 0x00);
    const fileBuffer = Buffer.concat([heicHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  }

  return { filePath, fileName, size };
}

// Helper function to create a test video file
function createTestVideo(sizeMB, format = 'mp4') {
  const testDir = path.join(__dirname, '../test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const size = Math.floor(sizeMB * 1024 * 1024);
  const fileName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${format}`;
  const filePath = path.join(testDir, fileName);

  if (format === 'mp4') {
    // MP4 file header (ftyp box)
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
    ]);
    const padding = Buffer.alloc(Math.max(0, size - mp4Header.length), 0x00);
    const fileBuffer = Buffer.concat([mp4Header, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  } else if (format === 'mov') {
    // QuickTime MOV file header
    const movHeader = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      0x00, 0x00, 0x02, 0x00, 0x71, 0x74, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
      0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32
    ]);
    const padding = Buffer.alloc(Math.max(0, size - movHeader.length), 0x00);
    const fileBuffer = Buffer.concat([movHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  } else if (format === 'avi') {
    // AVI file header
    const aviHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
      0x4C, 0x49, 0x53, 0x54, 0x00, 0x00, 0x00, 0x00, 0x68, 0x64, 0x72, 0x6C,
      0x61, 0x76, 0x69, 0x68, 0x38, 0x00, 0x00, 0x00
    ]);
    const padding = Buffer.alloc(Math.max(0, size - aviHeader.length), 0x00);
    const fileBuffer = Buffer.concat([aviHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  } else if (format === 'webm') {
    // WebM file header
    const webmHeader = Buffer.from([
      0x1A, 0x45, 0xDF, 0xA3, 0x9B, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81,
      0x01, 0x42, 0xF2, 0x81, 0x04, 0x42, 0xF3, 0x81, 0x08, 0x42, 0x82, 0x84,
      0x77, 0x65, 0x62, 0x6D, 0x42, 0x87, 0x81, 0x04
    ]);
    const padding = Buffer.alloc(Math.max(0, size - webmHeader.length), 0x00);
    const fileBuffer = Buffer.concat([webmHeader, padding]);
    fs.writeFileSync(filePath, fileBuffer);
  }

  return { filePath, fileName, size };
}

async function testAllExtensionsAndSizes() {
  console.log('🧪 Testing All Extensions and Sizes\n');

  // Create test files
  const testFiles = [];

  // Image files - different sizes
  console.log('📁 Creating test image files...');
  testFiles.push({ ...createTestImage(0.5, 'jpeg'), type: 'image', format: 'JPEG', sizeLabel: 'Small (0.5MB)' });
  testFiles.push({ ...createTestImage(2, 'jpeg'), type: 'image', format: 'JPEG', sizeLabel: 'Medium (2MB)' });
  testFiles.push({ ...createTestImage(5, 'jpeg'), type: 'image', format: 'JPEG', sizeLabel: 'Large (5MB)' });
  testFiles.push({ ...createTestImage(9.5, 'jpeg'), type: 'image', format: 'JPEG', sizeLabel: 'Very Large (9.5MB)' });
  
  testFiles.push({ ...createTestImage(1, 'png'), type: 'image', format: 'PNG', sizeLabel: 'Small (1MB)' });
  testFiles.push({ ...createTestImage(3, 'png'), type: 'image', format: 'PNG', sizeLabel: 'Medium (3MB)' });
  
  testFiles.push({ ...createTestImage(0.8, 'gif'), type: 'image', format: 'GIF', sizeLabel: 'Small (0.8MB)' });
  testFiles.push({ ...createTestImage(2.5, 'gif'), type: 'image', format: 'GIF', sizeLabel: 'Medium (2.5MB)' });
  
  testFiles.push({ ...createTestImage(1.5, 'heic'), type: 'image', format: 'HEIC', sizeLabel: 'Small (1.5MB)' });
  testFiles.push({ ...createTestImage(4, 'heic'), type: 'image', format: 'HEIC', sizeLabel: 'Medium (4MB)' });

  // Video files - different sizes
  console.log('📁 Creating test video files...');
  testFiles.push({ ...createTestVideo(5, 'mp4'), type: 'video', format: 'MP4', sizeLabel: 'Small (5MB)' });
  testFiles.push({ ...createTestVideo(25, 'mp4'), type: 'video', format: 'MP4', sizeLabel: 'Medium (25MB)' });
  testFiles.push({ ...createTestVideo(50, 'mp4'), type: 'video', format: 'MP4', sizeLabel: 'Large (50MB)' });
  testFiles.push({ ...createTestVideo(95, 'mp4'), type: 'video', format: 'MP4', sizeLabel: 'Very Large (95MB)' });
  
  testFiles.push({ ...createTestVideo(10, 'mov'), type: 'video', format: 'MOV', sizeLabel: 'Small (10MB)' });
  testFiles.push({ ...createTestVideo(30, 'mov'), type: 'video', format: 'MOV', sizeLabel: 'Medium (30MB)' });
  
  testFiles.push({ ...createTestVideo(8, 'avi'), type: 'video', format: 'AVI', sizeLabel: 'Small (8MB)' });
  testFiles.push({ ...createTestVideo(20, 'avi'), type: 'video', format: 'AVI', sizeLabel: 'Medium (20MB)' });
  
  testFiles.push({ ...createTestVideo(6, 'webm'), type: 'video', format: 'WebM', sizeLabel: 'Small (6MB)' });
  testFiles.push({ ...createTestVideo(15, 'webm'), type: 'video', format: 'WebM', sizeLabel: 'Medium (15MB)' });

  console.log(`✅ Created ${testFiles.length} test files\n`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();

  // Capture network requests
  const networkRequests = [];
  const uploadResults = [];

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
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('upload-photo')) {
      const status = response.status();
      let body = null;
      try {
        body = await response.text();
      } catch (e) {
        body = 'Could not read response body';
      }

      if (status === 200 || status === 201) {
        try {
          const jsonBody = JSON.parse(body);
          if (jsonBody.success && jsonBody.id) {
            uploadResults.push({
              success: true,
              fileId: jsonBody.id,
              fileName: jsonBody.name,
              url: jsonBody.url,
            });
            console.log(`   ✅ Uploaded: ${jsonBody.name} (ID: ${jsonBody.id})`);
          } else if (jsonBody.error) {
            uploadResults.push({
              success: false,
              error: jsonBody.error,
            });
            console.log(`   ❌ Error: ${jsonBody.error}`);
          }
        } catch (e) {
          // Not JSON
        }
      }
    }
  });

  try {
    console.log(`📍 Navigating to ${DEV_URL}...`);
    await page.goto(DEV_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to upload section
    console.log('📜 Scrolling to upload section...');
    const uploadSection = await page.$('[id*="upload"], [class*="upload"], [class*="photo"]');
    if (uploadSection) {
      await uploadSection.scrollIntoView();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Find file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }

    console.log('✅ File input found\n');

    // Upload files in batches to avoid overwhelming the system
    const batchSize = 5;
    let totalUploaded = 0;
    let totalFailed = 0;

    for (let i = 0; i < testFiles.length; i += batchSize) {
      const batch = testFiles.slice(i, i + batchSize);
      console.log(`\n📤 Uploading batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)...`);

      // Upload files in this batch
      const filePaths = batch.map(f => f.filePath);
      await fileInput.uploadFile(...filePaths);

      console.log(`   Files added to preview, waiting for processing...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Find and click upload button
      const uploadButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return (text.includes('upload all') || text.includes('رفع الكل'));
        });
      });

      if (uploadButton && uploadButton.asElement()) {
        console.log('   🔘 Clicking upload button...');
        await uploadButton.asElement().click();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Wait for uploads to complete (max 2 minutes per batch)
        console.log('   ⏳ Waiting for uploads to complete...');
        const startTime = Date.now();
        const maxWaitTime = 120000; // 2 minutes

        while (Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Check upload status
          const status = await page.evaluate(() => {
            const previews = document.querySelectorAll('[class*="aspect-square"], [class*="preview"]');
            const statuses = [];
            for (const preview of previews) {
              const overlay = preview.querySelector('[class*="absolute"]');
              if (overlay) {
                const classes = overlay.classList.toString();
                const hasError = classes.includes('destructive');
                const hasSuccess = classes.includes('sage') || classes.includes('success');
                const hasLoading = !!overlay.querySelector('[class*="animate-spin"]');
                statuses.push({ hasError, hasSuccess, hasLoading });
              }
            }
            return statuses;
          });

          const completed = status.filter(s => s.hasSuccess || s.hasError).length;
          const inProgress = status.filter(s => s.hasLoading).length;

          if (completed >= batch.length && inProgress === 0) {
            console.log(`   ✅ Batch upload completed!`);
            break;
          } else {
            console.log(`   ⏳ Progress: ${completed}/${batch.length} completed, ${inProgress} in progress...`);
          }
        }

        // Count results
        const batchResults = uploadResults.slice(totalUploaded + totalFailed);
        const batchSuccess = batchResults.filter(r => r.success).length;
        const batchFailed = batchResults.filter(r => !r.success).length;
        
        totalUploaded += batchSuccess;
        totalFailed += batchFailed;

        console.log(`   📊 Batch results: ${batchSuccess} succeeded, ${batchFailed} failed`);
      } else {
        console.log('   ❌ Upload button not found');
        totalFailed += batch.length;
      }

      // Wait before next batch
      if (i + batchSize < testFiles.length) {
        console.log('   ⏸️  Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`\n📁 Total Files Tested: ${testFiles.length}`);
    console.log(`✅ Successful Uploads: ${totalUploaded}`);
    console.log(`❌ Failed Uploads: ${totalFailed}`);
    console.log(`📈 Success Rate: ${((totalUploaded / testFiles.length) * 100).toFixed(1)}%`);

    console.log('\n📋 File Type Breakdown:');
    const typeStats = {};
    testFiles.forEach(file => {
      const key = `${file.type}-${file.format}`;
      if (!typeStats[key]) {
        typeStats[key] = { total: 0, success: 0 };
      }
      typeStats[key].total++;
      const result = uploadResults.find(r => r.fileName === file.fileName);
      if (result && result.success) {
        typeStats[key].success++;
      }
    });

    Object.entries(typeStats).forEach(([key, stats]) => {
      const [type, format] = key.split('-');
      const rate = ((stats.success / stats.total) * 100).toFixed(1);
      console.log(`   ${type.toUpperCase()} ${format}: ${stats.success}/${stats.total} (${rate}%)`);
    });

    console.log('\n📋 Size Breakdown:');
    const sizeStats = {};
    testFiles.forEach(file => {
      const sizeKey = file.sizeLabel.split('(')[0].trim();
      if (!sizeStats[sizeKey]) {
        sizeStats[sizeKey] = { total: 0, success: 0 };
      }
      sizeStats[sizeKey].total++;
      const result = uploadResults.find(r => r.fileName === file.fileName);
      if (result && result.success) {
        sizeStats[sizeKey].success++;
      }
    });

    Object.entries(sizeStats).forEach(([key, stats]) => {
      const rate = ((stats.success / stats.total) * 100).toFixed(1);
      console.log(`   ${key}: ${stats.success}/${stats.total} (${rate}%)`);
    });

    if (uploadResults.length > 0) {
      console.log('\n✅ Successful Uploads:');
      uploadResults.filter(r => r.success).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.fileName}`);
        console.log(`      ID: ${result.fileId}`);
        console.log(`      URL: ${result.url || 'N/A'}`);
      });
    }

    if (uploadResults.filter(r => !r.success).length > 0) {
      console.log('\n❌ Failed Uploads:');
      uploadResults.filter(r => !r.success).forEach((result, index) => {
        console.log(`   ${index + 1}. Error: ${result.error || 'Unknown error'}`);
      });
    }

    // Take screenshot
    await page.screenshot({ path: 'upload-all-extensions-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: upload-all-extensions-test.png');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'upload-all-extensions-error.png', fullPage: true });
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    testFiles.forEach(file => {
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
          console.log(`   Deleted: ${file.fileName}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not delete: ${file.fileName}`);
      }
    });

    await browser.close();
    console.log('\n✅ Test complete!');
  }
}

testAllExtensionsAndSizes().catch(console.error);

