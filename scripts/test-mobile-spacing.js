import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE size

// Helper to wait for server
async function waitForServer(url, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function testMobileSpacing() {
  console.log('🧪 Testing Mobile Spacing and Sizing...\n');
  
  // Wait for server if using localhost
  if (BASE_URL.includes('localhost')) {
    console.log('⏳ Waiting for dev server to start...');
    const serverReady = await waitForServer(BASE_URL);
    if (!serverReady) {
      console.error('❌ Dev server not responding. Please start it with: npm run dev');
      process.exit(1);
    }
    console.log('✅ Dev server is ready!\n');
  }
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: MOBILE_VIEWPORT,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(MOBILE_VIEWPORT);
    
    // Set mobile user agent
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    );

    console.log(`📱 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const issues = [];
    const warnings = [];
    const passed = [];

    // Test 1: Section Padding
    console.log('\n📋 Testing Section Padding...');
    try {
      const sections = await page.evaluate(() => {
        const sections = Array.from(document.querySelectorAll('section'));
        return sections.map(section => {
          const style = window.getComputedStyle(section);
          const paddingTop = parseFloat(style.paddingTop);
          const paddingBottom = parseFloat(style.paddingBottom);
          const paddingLeft = parseFloat(style.paddingLeft);
          const paddingRight = parseFloat(style.paddingRight);
          return {
            id: section.id || 'unnamed',
            paddingTop,
            paddingBottom,
            paddingLeft,
            paddingRight,
            minPadding: Math.min(paddingTop, paddingBottom, paddingLeft, paddingRight),
          };
        });
      });

      sections.forEach(section => {
        if (section.minPadding < 16) {
          issues.push(`Section "${section.id}": Padding too small (${section.minPadding}px, minimum 16px recommended)`);
        } else if (section.minPadding < 24) {
          warnings.push(`Section "${section.id}": Padding could be larger (${section.minPadding}px)`);
        } else {
          passed.push(`Section "${section.id}": Good padding (${section.minPadding}px)`);
        }
      });
      console.log(`   ✓ Checked ${sections.length} sections`);
    } catch (e) {
      issues.push(`Section padding test failed: ${e.message}`);
    }

    // Test 2: Card Padding
    console.log('\n📋 Testing Card Padding...');
    try {
      const cards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="Card"]'));
        return cards.map(card => {
          const style = window.getComputedStyle(card);
          const padding = parseFloat(style.padding);
          const paddingTop = parseFloat(style.paddingTop);
          const paddingBottom = parseFloat(style.paddingBottom);
          const paddingLeft = parseFloat(style.paddingLeft);
          const paddingRight = parseFloat(style.paddingRight);
          const minPadding = Math.min(paddingTop, paddingBottom, paddingLeft, paddingRight);
          return {
            minPadding,
            hasContent: card.innerText.trim().length > 0,
          };
        });
      });

      cards.forEach((card, i) => {
        if (card.hasContent && card.minPadding < 16) {
          issues.push(`Card ${i + 1}: Padding too small (${card.minPadding}px, minimum 16px recommended)`);
        } else if (card.hasContent && card.minPadding < 20) {
          warnings.push(`Card ${i + 1}: Padding could be larger (${card.minPadding}px)`);
        } else if (card.hasContent) {
          passed.push(`Card ${i + 1}: Good padding (${card.minPadding}px)`);
        }
      });
      console.log(`   ✓ Checked ${cards.length} cards`);
    } catch (e) {
      issues.push(`Card padding test failed: ${e.message}`);
    }

    // Test 3: Button Sizing
    console.log('\n📋 Testing Button Sizing...');
    try {
      const buttons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
        return buttons.map(btn => {
          const rect = btn.getBoundingClientRect();
          const style = window.getComputedStyle(btn);
          const paddingTop = parseFloat(style.paddingTop);
          const paddingBottom = parseFloat(style.paddingBottom);
          const paddingLeft = parseFloat(style.paddingLeft);
          const paddingRight = parseFloat(style.paddingRight);
          return {
            width: rect.width,
            height: rect.height,
            minPadding: Math.min(paddingTop, paddingBottom, paddingLeft, paddingRight),
            text: btn.innerText.substring(0, 20),
          };
        });
      });

      buttons.forEach((btn, i) => {
        if (btn.width < 44 || btn.height < 44) {
          issues.push(`Button "${btn.text}": Too small (${btn.width}x${btn.height}px, minimum 44x44px)`);
        } else if (btn.minPadding < 8) {
          warnings.push(`Button "${btn.text}": Padding could be larger (${btn.minPadding}px)`);
        } else {
          passed.push(`Button "${btn.text}": Good size (${btn.width}x${btn.height}px)`);
        }
      });
      console.log(`   ✓ Checked ${buttons.length} buttons`);
    } catch (e) {
      issues.push(`Button sizing test failed: ${e.message}`);
    }

    // Test 4: Input Field Sizing
    console.log('\n📋 Testing Input Field Sizing...');
    try {
      const inputs = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], textarea'));
        return inputs.map(input => {
          const rect = input.getBoundingClientRect();
          const style = window.getComputedStyle(input);
          const paddingTop = parseFloat(style.paddingTop);
          const paddingBottom = parseFloat(style.paddingBottom);
          const paddingLeft = parseFloat(style.paddingLeft);
          const paddingRight = parseFloat(style.paddingRight);
          return {
            height: rect.height,
            minPadding: Math.min(paddingTop, paddingBottom, paddingLeft, paddingRight),
            type: input.type || 'textarea',
          };
        });
      });

      inputs.forEach((input, i) => {
        if (input.height < 40) {
          issues.push(`Input ${i + 1} (${input.type}): Too small (${input.height}px, minimum 40px recommended)`);
        } else if (input.minPadding < 12) {
          warnings.push(`Input ${i + 1}: Padding could be larger (${input.minPadding}px)`);
        } else {
          passed.push(`Input ${i + 1}: Good size (${input.height}px)`);
        }
      });
      console.log(`   ✓ Checked ${inputs.length} inputs`);
    } catch (e) {
      issues.push(`Input sizing test failed: ${e.message}`);
    }

    // Test 5: Gap Between Elements
    console.log('\n📋 Testing Element Gaps...');
    try {
      const gaps = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('[class*="gap"], [class*="space"]'));
        return containers.map(container => {
          const style = window.getComputedStyle(container);
          const gap = parseFloat(style.gap) || 0;
          const children = container.children;
          if (children.length < 2) return null;
          
          // Check actual spacing between first two children
          const firstRect = children[0].getBoundingClientRect();
          const secondRect = children[1].getBoundingClientRect();
          const actualGap = Math.abs(secondRect.top - firstRect.bottom) || Math.abs(secondRect.left - firstRect.right);
          
          return {
            gap,
            actualGap,
            childrenCount: children.length,
          };
        }).filter(Boolean);
      });

      gaps.forEach((gap, i) => {
        if (gap.actualGap < 8) {
          issues.push(`Container ${i + 1}: Gap too small (${gap.actualGap}px, minimum 8px recommended)`);
        } else if (gap.actualGap < 12) {
          warnings.push(`Container ${i + 1}: Gap could be larger (${gap.actualGap}px)`);
        } else {
          passed.push(`Container ${i + 1}: Good gap (${gap.actualGap}px)`);
        }
      });
      console.log(`   ✓ Checked ${gaps.length} containers with gaps`);
    } catch (e) {
      warnings.push(`Gap test failed: ${e.message}`);
    }

    // Test 6: Text Line Height
    console.log('\n📋 Testing Text Line Height...');
    try {
      const textElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6'));
        return elements
          .filter(el => {
            const text = el.innerText.trim();
            return text.length > 10 && text.length < 200;
          })
          .slice(0, 20)
          .map(el => {
            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize);
            const lineHeight = parseFloat(style.lineHeight);
            const ratio = lineHeight / fontSize;
            return {
              fontSize,
              lineHeight,
              ratio,
              text: el.innerText.substring(0, 30),
            };
          });
      });

      textElements.forEach((text, i) => {
        if (text.ratio < 1.2) {
          warnings.push(`Text "${text.text}": Line height ratio too low (${text.ratio.toFixed(2)}, recommended 1.2-1.6)`);
        } else if (text.ratio > 2) {
          warnings.push(`Text "${text.text}": Line height ratio too high (${text.ratio.toFixed(2)})`);
        } else {
          passed.push(`Text ${i + 1}: Good line height (${text.ratio.toFixed(2)})`);
        }
      });
      console.log(`   ✓ Checked ${textElements.length} text elements`);
    } catch (e) {
      warnings.push(`Line height test failed: ${e.message}`);
    }

    // Test 7: Container Max Width
    console.log('\n📋 Testing Container Max Width...');
    try {
      const containers = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('[class*="max-w"], [class*="container"]'));
        return containers.map(container => {
          const style = window.getComputedStyle(container);
          const maxWidth = style.maxWidth;
          const width = container.getBoundingClientRect().width;
          const viewportWidth = window.innerWidth;
          const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
          return {
            maxWidth,
            width,
            viewportWidth,
            padding,
            effectiveWidth: width + padding,
          };
        });
      });

      containers.forEach((container, i) => {
        if (container.effectiveWidth > container.viewportWidth) {
          issues.push(`Container ${i + 1}: Content overflows viewport (${container.effectiveWidth}px > ${container.viewportWidth}px)`);
        } else if (container.padding < 16) {
          warnings.push(`Container ${i + 1}: Horizontal padding could be larger (${container.padding}px)`);
        } else {
          passed.push(`Container ${i + 1}: Good width (${container.width}px)`);
        }
      });
      console.log(`   ✓ Checked ${containers.length} containers`);
    } catch (e) {
      warnings.push(`Container width test failed: ${e.message}`);
    }

    // Test 8: Icon Sizing
    console.log('\n📋 Testing Icon Sizing...');
    try {
      const icons = await page.evaluate(() => {
        const icons = Array.from(document.querySelectorAll('svg'));
        return icons.map(icon => {
          const rect = icon.getBoundingClientRect();
          const parent = icon.closest('button, a');
          return {
            width: rect.width,
            height: rect.height,
            hasParent: !!parent,
            parentSize: parent ? {
              width: parent.getBoundingClientRect().width,
              height: parent.getBoundingClientRect().height,
            } : null,
          };
        });
      });

      icons.forEach((icon, i) => {
        if (icon.hasParent && icon.parentSize) {
          const iconRatio = icon.width / icon.parentSize.width;
          if (iconRatio > 0.5) {
            warnings.push(`Icon ${i + 1}: Icon too large relative to button (${(iconRatio * 100).toFixed(0)}%)`);
          } else if (icon.width < 16 && icon.height < 16) {
            warnings.push(`Icon ${i + 1}: Icon might be too small (${icon.width}x${icon.height}px)`);
          } else {
            passed.push(`Icon ${i + 1}: Good size (${icon.width}x${icon.height}px)`);
          }
        }
      });
      console.log(`   ✓ Checked ${icons.length} icons`);
    } catch (e) {
      warnings.push(`Icon sizing test failed: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SPACING AND SIZING TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Issues: ${issues.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES (Need Fixing):');
      issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Consider Fixing):');
      warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
    }

    // Take screenshot
    await page.screenshot({ path: 'mobile-spacing-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: mobile-spacing-test.png');

    return { issues, warnings, passed };

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run tests
testMobileSpacing()
  .then(({ issues, warnings }) => {
    if (issues.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


