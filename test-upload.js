import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
  console.log('🚀 Starting upload test...\n');
  
  // Check if dev server is running
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('error') || text.includes('Error')) {
        console.log(`[Browser ${type}]:`, text);
      }
    });
    
    // Monitor network requests
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('upload-photo')) {
        const status = response.status();
        console.log(`\n📡 Upload request: ${status} ${url}`);
        if (!response.ok()) {
          try {
            const text = await response.text();
            console.log('Response body:', text);
          } catch (e) {
            console.log('Could not read response body');
          }
        }
      }
    });
    
    // Navigate to the site
    console.log('📍 Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the upload section to be visible
    console.log('⏳ Waiting for upload section...');
    await page.waitForSelector('#upload', { timeout: 10000 });
    
    // Scroll to upload section
    await page.evaluate(() => {
      document.getElementById('upload').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if image file exists
    const imagePath = path.join(__dirname, 'Layer 1.png');
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    console.log('📸 Found test image:', imagePath);
    
    // Find the file input and trigger file selection
    console.log('📤 Uploading image...');
    const fileInput = await page.$('input[type="file"][accept="image/*"]');
    if (!fileInput) {
      throw new Error('File input not found!');
    }
    
    // Use the file input's uploadFile method or setInputFiles
    try {
      // Try newer API first
      if (typeof fileInput.setInputFiles === 'function') {
        await fileInput.setInputFiles(imagePath);
      } else if (typeof fileInput.uploadFile === 'function') {
        await fileInput.uploadFile(imagePath);
      } else {
        // Fallback: use evaluate to set files
        await page.evaluate((input, filePath) => {
          const inputElement = input;
          const dataTransfer = new DataTransfer();
          // Note: This won't work directly, we need to use the file chooser
        }, fileInput, imagePath);
        
        // Use file chooser API
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser(),
          fileInput.click()
        ]);
        await fileChooser.accept([imagePath]);
      }
    } catch (uploadError) {
      // Try file chooser approach
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click('input[type="file"]')
      ]);
      await fileChooser.accept([imagePath]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for preview to appear
    console.log('⏳ Waiting for image preview...');
    await page.waitForSelector('img[alt="Upload preview"]', { timeout: 5000 });
    
    // Click the upload button
    console.log('🔄 Clicking "Upload All" button...');
    // Try finding button by text content
    const buttons = await page.$$('button');
    let uploadButtonFound = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Upload All') || text.includes('Upload'))) {
        await btn.click();
        uploadButtonFound = true;
        break;
      }
    }
    if (!uploadButtonFound) {
      throw new Error('Upload button not found!');
    }
    
    // Wait for upload to complete (success or error)
    console.log('⏳ Waiting for upload to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for success indicator
    const successIndicator = await page.$('.text-sage, [class*="success"]');
    const errorIndicator = await page.$('.text-destructive, [class*="error"]');
    
    if (successIndicator) {
      console.log('\n✅ Upload appears successful!');
    } else if (errorIndicator) {
      console.log('\n❌ Upload appears to have failed (error indicator found)');
    }
    
    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'upload-test-result.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📷 Screenshot saved: ${screenshotPath}`);
    
    // Wait a bit more to see final state
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    try {
      const screenshotPath = path.join(__dirname, 'upload-test-error.png');
      const page = await browser.newPage();
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📷 Error screenshot saved: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error('Could not take error screenshot:', screenshotError.message);
    }
    throw error;
  } finally {
    await browser.close();
  }
}

testUpload().catch(console.error);

