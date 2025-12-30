import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = 'http://localhost:8080/';

// Helper function to create a test video file that mimics mobile video
function createMobileVideo(sizeMB, device = 'android') {
  const testDir = path.join(__dirname, '../test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const size = Math.floor(sizeMB * 1024 * 1024);
  
  let fileName, filePath, header;
  
  if (device === 'iphone') {
    // iPhone typically uses MOV format (QuickTime)
    fileName = `iphone-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mov`;
    filePath = path.join(testDir, fileName);
    
    // QuickTime MOV file header (more realistic for iPhone)
    header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      0x00, 0x00, 0x02, 0x00, 0x71, 0x74, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
      0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D
    ]);
  } else {
    // Android typically uses MP4 format
    fileName = `android-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`;
    filePath = path.join(testDir, fileName);
    
    // MP4 file header (more realistic for Android)
    header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
    ]);
  }

  const padding = Buffer.alloc(Math.max(0, size - header.length), 0x00);
  const fileBuffer = Buffer.concat([header, padding]);
  fs.writeFileSync(filePath, fileBuffer);

  return { filePath, fileName, size, device };
}

async function testMobileVideoUpload() {
  console.log('📱 Testing Mobile Video Uploads (Android & iPhone)\n');

  // Create test videos that mimic mobile recordings
  const testVideos = [];

  console.log('📁 Creating test mobile video files...\n');

  // iPhone videos (MOV format) - typical sizes
  console.log('🍎 iPhone Videos (MOV):');
  testVideos.push({ 
    ...createMobileVideo(5, 'iphone'), 
    label: 'iPhone - Short video (5MB)',
    description: 'Typical 10-30 second iPhone video'
  });
  testVideos.push({ 
    ...createMobileVideo(15, 'iphone'), 
    label: 'iPhone - Medium video (15MB)',
    description: 'Typical 1-2 minute iPhone video'
  });
  testVideos.push({ 
    ...createMobileVideo(35, 'iphone'), 
    label: 'iPhone - Long video (35MB)',
    description: 'Typical 3-5 minute iPhone video'
  });
  testVideos.push({ 
    ...createMobileVideo(75, 'iphone'), 
    label: 'iPhone - Very long video (75MB)',
    description: 'Typical 5-10 minute iPhone video'
  });

  // Android videos (MP4 format) - typical sizes
  console.log('🤖 Android Videos (MP4):');
  testVideos.push({ 
    ...createMobileVideo(8, 'android'), 
    label: 'Android - Short video (8MB)',
    description: 'Typical 10-30 second Android video'
  });
  testVideos.push({ 
    ...createMobileVideo(20, 'android'), 
    label: 'Android - Medium video (20MB)',
    description: 'Typical 1-2 minute Android video'
  });
  testVideos.push({ 
    ...createMobileVideo(45, 'android'), 
    label: 'Android - Long video (45MB)',
    description: 'Typical 3-5 minute Android video'
  });
  testVideos.push({ 
    ...createMobileVideo(90, 'android'), 
    label: 'Android - Very long video (90MB)',
    description: 'Typical 5-10 minute Android video'
  });

  console.log(`✅ Created ${testVideos.length} test video files\n`);

  // Launch browser with mobile user agent
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 375, height: 812 }, // iPhone X dimensions
  });

  // Test both Android and iPhone user agents
  const userAgents = [
    {
      name: 'iPhone',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      device: 'iphone'
    },
    {
      name: 'Android',
      ua: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      device: 'android'
    }
  ];

  const allResults = [];

  for (const { name, ua, device } of userAgents) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📱 Testing ${name} Device`);
    console.log('='.repeat(60));

    const page = await browser.newPage();
    await page.setUserAgent(ua);
    await page.setViewport({ width: 375, height: 812 });

    // Capture network requests
    const networkRequests = [];
    const uploadResults = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('upload-photo')) {
        networkRequests.push({
          type: 'request',
          url: url,
          method: request.method(),
          timestamp: Date.now(),
        });
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
                device: name,
              });
              console.log(`   ✅ Uploaded: ${jsonBody.name} (ID: ${jsonBody.id})`);
            } else if (jsonBody.error) {
              uploadResults.push({
                success: false,
                error: jsonBody.error,
                device: name,
              });
              console.log(`   ❌ Error: ${jsonBody.error}`);
            }
          } catch (e) {
            // Not JSON
          }
        }
      }
    });

    // Capture console logs and track uploads
    const consoleUploads = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Upload') || text.includes('upload') || text.includes('Error') || text.includes('error')) {
        console.log(`   📝 Console: ${text}`);
        // Track successful uploads from console
        if (text.includes('Upload successful:')) {
          const match = text.match(/Upload successful: (\S+) (.+)/);
          if (match) {
            consoleUploads.push({
              fileId: match[1],
              fileName: match[2],
              device: name,
            });
          }
        }
      }
    });

    try {
      console.log(`\n📍 Navigating to ${DEV_URL} with ${name} user agent...`);
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

      // Filter videos for this device
      const deviceVideos = testVideos.filter(v => v.device === device);

      console.log(`📤 Uploading ${deviceVideos.length} ${name} videos...\n`);

      // Upload videos one by one to better track progress
      for (let i = 0; i < deviceVideos.length; i++) {
        const video = deviceVideos[i];
        console.log(`\n📹 ${i + 1}/${deviceVideos.length}: ${video.label}`);
        console.log(`   ${video.description}`);
        console.log(`   Size: ${(video.size / (1024 * 1024)).toFixed(2)}MB`);

        // Clear previous files
        await page.evaluate(() => {
          const input = document.querySelector('input[type="file"]');
          if (input) {
            input.value = '';
          }
        });

        // Upload single video
        await fileInput.uploadFile(video.filePath);

        console.log('   ⏳ File added to preview, waiting...');
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

          // Wait for upload to complete (max 5 minutes for very large videos)
          console.log('   ⏳ Waiting for upload to complete...');
          const startTime = Date.now();
          const maxWaitTime = 300000; // 5 minutes for very large files
          const fileName = video.fileName;

          let uploadCompleted = false;
          let lastConsoleCheck = Date.now();
          
          while (Date.now() - startTime < maxWaitTime && !uploadCompleted) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds

            // Check if this specific file was uploaded (from console or network)
            const wasUploaded = consoleUploads.some(cu => cu.fileName === fileName) ||
                               uploadResults.some(ur => ur.fileName === fileName && ur.success);

            if (wasUploaded) {
              console.log('   ✅ Upload completed successfully!');
              uploadCompleted = true;
              break;
            }

            // Check upload status in UI
            const status = await page.evaluate(() => {
              const previews = document.querySelectorAll('[class*="aspect-square"], [class*="preview"]');
              for (const preview of previews) {
                const overlay = preview.querySelector('[class*="absolute"]');
                if (overlay) {
                  const classes = overlay.classList.toString();
                  const hasError = classes.includes('destructive');
                  const hasSuccess = classes.includes('sage') || classes.includes('success');
                  const hasLoading = !!overlay.querySelector('[class*="animate-spin"]');
                  
                  if (hasSuccess) return 'success';
                  if (hasError) return 'error';
                  if (hasLoading) return 'loading';
                }
              }
              return 'unknown';
            });

            if (status === 'success') {
              console.log('   ✅ Upload completed successfully (UI confirmed)!');
              uploadCompleted = true;
            } else if (status === 'error') {
              console.log('   ❌ Upload failed!');
              uploadCompleted = true;
            } else {
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              const sizeMB = (video.size / (1024 * 1024)).toFixed(1);
              console.log(`   ⏳ Still uploading ${sizeMB}MB... (${elapsed}s elapsed)`);
            }
          }

          if (!uploadCompleted) {
            console.log(`   ⚠️  Upload timeout after ${Math.floor((Date.now() - startTime) / 1000)}s - file may still be processing in background`);
            // Check one more time if it completed
            await new Promise(resolve => setTimeout(resolve, 2000));
            const finalCheck = consoleUploads.some(cu => cu.fileName === fileName) ||
                              uploadResults.some(ur => ur.fileName === fileName && ur.success);
            if (finalCheck) {
              console.log('   ✅ Upload completed (detected after timeout)!');
            }
          }
        } else {
          console.log('   ❌ Upload button not found');
        }

        // Wait before next video
        if (i < deviceVideos.length - 1) {
          console.log('   ⏸️  Waiting before next video...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Collect results for this device (combine network and console results)
      const deviceResults = uploadResults.filter(r => r.device === name);
      
      // Also check console uploads that might not have been captured in network responses
      consoleUploads.forEach(consoleUpload => {
        if (!deviceResults.find(r => r.fileId === consoleUpload.fileId)) {
          deviceResults.push({
            success: true,
            fileId: consoleUpload.fileId,
            fileName: consoleUpload.fileName,
            url: `https://drive.google.com/uc?export=view&id=${consoleUpload.fileId}`,
            device: name,
            source: 'console',
          });
        }
      });
      
      allResults.push(...deviceResults);

      console.log(`\n📊 ${name} Results:`);
      const successful = deviceResults.filter(r => r.success).length;
      const failed = deviceResults.filter(r => !r.success).length;
      console.log(`   ✅ Successful: ${successful}/${deviceVideos.length}`);
      console.log(`   ❌ Failed: ${failed}`);
      
      if (successful > 0) {
        console.log(`   📋 Successful uploads:`);
        deviceResults.filter(r => r.success).forEach((result, idx) => {
          console.log(`      ${idx + 1}. ${result.fileName} (ID: ${result.fileId})`);
        });
      }

      await page.close();

    } catch (error) {
      console.error(`\n❌ Test failed for ${name}:`, error.message);
      await page.screenshot({ path: `mobile-video-upload-${device}-error.png`, fullPage: true });
      await page.close();
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL MOBILE VIDEO UPLOAD RESULTS');
  console.log('='.repeat(60));

  const totalSuccess = allResults.filter(r => r.success).length;
  const totalFailed = allResults.filter(r => !r.success).length;
  const totalTested = testVideos.length;

  console.log(`\n📁 Total Videos Tested: ${totalTested}`);
  console.log(`✅ Successful Uploads: ${totalSuccess}`);
  console.log(`❌ Failed Uploads: ${totalFailed}`);
  console.log(`📈 Success Rate: ${((totalSuccess / totalTested) * 100).toFixed(1)}%`);

  console.log('\n📋 Device Breakdown:');
  const deviceStats = {};
  userAgents.forEach(({ name }) => {
    const deviceResults = allResults.filter(r => r.device === name);
    const success = deviceResults.filter(r => r.success).length;
    const total = testVideos.filter(v => 
      (name === 'iPhone' && v.device === 'iphone') || 
      (name === 'Android' && v.device === 'android')
    ).length;
    deviceStats[name] = { success, total };
    console.log(`   ${name}: ${success}/${total} (${((success / total) * 100).toFixed(1)}%)`);
  });

  console.log('\n📋 Size Breakdown:');
  const sizeRanges = {
    'Small (5-8MB)': testVideos.filter(v => v.size <= 10 * 1024 * 1024),
    'Medium (15-20MB)': testVideos.filter(v => v.size > 10 * 1024 * 1024 && v.size <= 25 * 1024 * 1024),
    'Large (35-45MB)': testVideos.filter(v => v.size > 25 * 1024 * 1024 && v.size <= 50 * 1024 * 1024),
    'Very Large (75-90MB)': testVideos.filter(v => v.size > 50 * 1024 * 1024),
  };

  Object.entries(sizeRanges).forEach(([range, videos]) => {
    const success = videos.filter(v => {
      const result = allResults.find(r => r.fileName === v.fileName);
      return result && result.success;
    }).length;
    console.log(`   ${range}: ${success}/${videos.length} (${((success / videos.length) * 100).toFixed(1)}%)`);
  });

  if (allResults.filter(r => r.success).length > 0) {
    console.log('\n✅ Successful Uploads:');
    allResults.filter(r => r.success).forEach((result, index) => {
      console.log(`   ${index + 1}. [${result.device}] ${result.fileName}`);
      console.log(`      ID: ${result.fileId}`);
      console.log(`      URL: ${result.url || 'N/A'}`);
    });
  }

  if (allResults.filter(r => !r.success).length > 0) {
    console.log('\n❌ Failed Uploads:');
    allResults.filter(r => !r.success).forEach((result, index) => {
      console.log(`   ${index + 1}. [${result.device}] Error: ${result.error || 'Unknown error'}`);
    });
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  testVideos.forEach(video => {
    try {
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  await browser.close();
  console.log('\n✅ Mobile video upload test complete!');
}

testMobileVideoUpload().catch(console.error);

