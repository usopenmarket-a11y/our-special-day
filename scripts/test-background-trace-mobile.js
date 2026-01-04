import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const LOCAL_URL = 'http://localhost:8083';

async function traceBackgroundChanges() {
  console.log('🔍 Starting background image trace test on mobile...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
    
    console.log(`🌐 Navigating to: ${LOCAL_URL}`);
    await page.goto(LOCAL_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Page loaded\n');

    // Wait for page to fully render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get initial background info
    const getBackgroundInfo = async (sectionName) => {
      return await page.evaluate((name) => {
        const body = document.body;
        const html = document.documentElement;
        const computedStyle = window.getComputedStyle(body);
        const htmlStyle = window.getComputedStyle(html);
        
        // Check which element has the background
        const bodyBg = computedStyle.backgroundImage;
        const htmlBg = htmlStyle.backgroundImage;
        
        const bgImage = bodyBg !== 'none' ? bodyBg : htmlBg;
        const bgSize = bodyBg !== 'none' ? computedStyle.backgroundSize : htmlStyle.backgroundSize;
        const bgPosition = bodyBg !== 'none' ? computedStyle.backgroundPosition : htmlStyle.backgroundPosition;
        const bgAttachment = bodyBg !== 'none' ? computedStyle.backgroundAttachment : htmlStyle.backgroundAttachment;
        
        // Get viewport dimensions
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
        };

        return {
          section: name,
          viewport,
          hasBackgroundImage: bgImage && bgImage !== 'none',
          backgroundImage: bgImage,
          backgroundSize: bgSize,
          backgroundPosition: bgPosition,
          backgroundAttachment: bgAttachment,
          bodyBackground: bodyBg,
          htmlBackground: htmlBg,
        };
      }, sectionName);
    };

    // Test sections
    const sections = [
      { name: 'Home (Top)', selector: '#home', scrollTo: 0 },
      { name: 'RSVP', selector: '#rsvp', scrollTo: null },
      { name: 'Details', selector: '#details', scrollTo: null },
      { name: 'Gallery', selector: '#gallery', scrollTo: null },
      { name: 'Upload', selector: '#upload', scrollTo: null },
    ];

    const results = [];

    for (const section of sections) {
      console.log(`\n📍 Testing section: ${section.name}`);
      
      // Scroll to section
      if (section.scrollTo === 0) {
        await page.evaluate(() => window.scrollTo(0, 0));
      } else if (section.selector) {
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, section.selector);
      }
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get background info
      const bgInfo = await getBackgroundInfo(section.name);
      results.push(bgInfo);
      
      console.log(`   Viewport: ${bgInfo.viewport.width}x${bgInfo.viewport.height}`);
      console.log(`   Scroll Y: ${bgInfo.viewport.scrollY}px`);
      console.log(`   Background Size: ${bgInfo.backgroundSize}`);
      console.log(`   Background Position: ${bgInfo.backgroundPosition}`);
      console.log(`   Background Attachment: ${bgInfo.backgroundAttachment}`);
      console.log(`   Body BG: ${bgInfo.bodyBackground !== 'none' ? 'Yes' : 'No'}`);
      console.log(`   HTML BG: ${bgInfo.htmlBackground !== 'none' ? 'Yes' : 'No'}`);
      
      // Take screenshot
      const screenshotPath = join(projectRoot, `background-trace-${section.name.toLowerCase().replace(/\s+/g, '-')}.png`);
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: false 
      });
      console.log(`   📸 Screenshot: ${screenshotPath}`);
    }

    // Analyze results
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKGROUND SIZE ANALYSIS');
    console.log('='.repeat(60));
    
    const sizes = results.map(r => r.backgroundSize);
    const uniqueSizes = [...new Set(sizes)];
    
    if (uniqueSizes.length === 1) {
      console.log('✅ PASSED: Background size is consistent across all sections');
      console.log(`   Size: ${uniqueSizes[0]}`);
    } else {
      console.log('❌ FAILED: Background size changes between sections!');
      console.log(`   Found ${uniqueSizes.length} different sizes:`);
      uniqueSizes.forEach((size, i) => {
        const sectionsWithSize = results.filter(r => r.backgroundSize === size).map(r => r.section);
        console.log(`   ${i + 1}. "${size}" - Sections: ${sectionsWithSize.join(', ')}`);
      });
    }

    // Check viewport changes
    console.log('\n' + '='.repeat(60));
    console.log('📏 VIEWPORT ANALYSIS');
    console.log('='.repeat(60));
    
    const viewportHeights = results.map(r => r.viewport.height);
    const uniqueHeights = [...new Set(viewportHeights)];
    
    if (uniqueHeights.length === 1) {
      console.log('✅ Viewport height is consistent');
      console.log(`   Height: ${uniqueHeights[0]}px`);
    } else {
      console.log('⚠️  Viewport height changes (this can cause background size changes)');
      console.log(`   Found ${uniqueHeights.length} different heights:`);
      uniqueHeights.forEach((height, i) => {
        const sectionsWithHeight = results.filter(r => r.viewport.height === height).map(r => r.section);
        console.log(`   ${i + 1}. ${height}px - Sections: ${sectionsWithHeight.join(', ')}`);
      });
    }

    // Check background attachment
    console.log('\n' + '='.repeat(60));
    console.log('🔗 BACKGROUND ATTACHMENT ANALYSIS');
    console.log('='.repeat(60));
    
    const attachments = results.map(r => r.backgroundAttachment);
    const uniqueAttachments = [...new Set(attachments)];
    
    if (uniqueAttachments.length === 1) {
      console.log(`✅ Background attachment is consistent: ${uniqueAttachments[0]}`);
    } else {
      console.log('⚠️  Background attachment changes');
      uniqueAttachments.forEach((att, i) => {
        const sectionsWithAtt = results.filter(r => r.backgroundAttachment === att).map(r => r.section);
        console.log(`   ${i + 1}. "${att}" - Sections: ${sectionsWithAtt.join(', ')}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    const hasSizeChange = uniqueSizes.length > 1;
    const hasViewportChange = uniqueHeights.length > 1;
    
    if (hasSizeChange) {
      console.log('❌ ISSUE DETECTED: Background size changes while scrolling');
      if (hasViewportChange) {
        console.log('   💡 Likely cause: Viewport height changes (mobile browser address bar)');
        console.log('   💡 Solution: Lock viewport height or use JavaScript to maintain consistent size');
      }
    } else {
      console.log('✅ Background size is stable across all sections');
    }

    console.log('\n📸 All screenshots saved in project root');
    console.log('   Check the screenshots to visually compare background appearance\n');

    // Keep browser open for observation
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
traceBackgroundChanges().catch(console.error);

