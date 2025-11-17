#!/usr/bin/env node

/**
 * Accessibility Scan Script
 *
 * Scans local application for WCAG violations using axe-core
 * Generates detailed report and fails CI if violations found
 *
 * Usage: node scripts/accessibility-scan.js <url>
 */

const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const SCAN_URL = process.argv[2] || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../accessibility-reports');
const REPORT_FILE = path.join(OUTPUT_DIR, `scan-${Date.now()}.json`);

// WCAG Level to test
const WCAG_LEVEL = process.env.WCAG_LEVEL || 'AA'; // AA or AAA

// Severity thresholds (fail CI if exceeded)
const MAX_CRITICAL = 0;
const MAX_SERIOUS = 3;
const MAX_MODERATE = 10;

async function runAccessibilityScan() {
  console.log('♿ Starting Accessibility Scan');
  console.log(`   URL: ${SCAN_URL}`);
  console.log(`   WCAG Level: ${WCAG_LEVEL}`);
  console.log('');

  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    // Navigate to page
    console.log(`📄 Loading page: ${SCAN_URL}...`);
    await page.goto(SCAN_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    console.log('✅ Page loaded');
    console.log('');

    // Run axe scan
    console.log('🔍 Running axe-core scan...');
    const results = await new AxePuppeteer(page)
      .withTags([`wcag2${WCAG_LEVEL.toLowerCase()}`, 'best-practice'])
      .analyze();

    console.log('✅ Scan complete');
    console.log('');

    // Close browser
    await browser.close();

    // Analyze results
    const { violations, passes, incomplete } = results;

    // Count by severity
    const severityCounts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    };

    violations.forEach(violation => {
      const count = violation.nodes.length;
      severityCounts[violation.impact] = (severityCounts[violation.impact] || 0) + count;
    });

    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ACCESSIBILITY SCAN RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`✅ Passed Checks: ${passes.length}`);
    console.log(`❌ Violations: ${violations.length}`);
    console.log(`⚠️  Incomplete: ${incomplete.length}`);
    console.log('');

    if (violations.length > 0) {
      console.log('Violations by Severity:');
      console.log(`  🔴 Critical: ${severityCounts.critical}`);
      console.log(`  🟠 Serious: ${severityCounts.serious}`);
      console.log(`  🟡 Moderate: ${severityCounts.moderate}`);
      console.log(`  🟢 Minor: ${severityCounts.minor}`);
      console.log('');

      // Display top violations
      console.log('Top Violations:');
      violations.slice(0, 5).forEach((violation, index) => {
        console.log('');
        console.log(`${index + 1}. ${violation.help}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Instances: ${violation.nodes.length}`);
        console.log(`   WCAG: ${violation.tags.filter(t => t.startsWith('wcag')).join(', ')}`);
        console.log(`   Help: ${violation.helpUrl}`);

        // Show first affected element
        if (violation.nodes.length > 0) {
          const node = violation.nodes[0];
          console.log(`   Selector: ${node.target.join(' ')}`);
          if (node.html) {
            console.log(`   HTML: ${node.html.substring(0, 100)}...`);
          }
        }
      });

      if (violations.length > 5) {
        console.log('');
        console.log(`... and ${violations.length - 5} more violations`);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Save detailed report
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(
      REPORT_FILE,
      JSON.stringify(results, null, 2),
      'utf8'
    );

    console.log(`💾 Detailed report saved: ${REPORT_FILE}`);
    console.log('');

    // Determine pass/fail
    let exitCode = 0;
    const failures = [];

    if (severityCounts.critical > MAX_CRITICAL) {
      failures.push(`Critical violations: ${severityCounts.critical} (max: ${MAX_CRITICAL})`);
      exitCode = 1;
    }

    if (severityCounts.serious > MAX_SERIOUS) {
      failures.push(`Serious violations: ${severityCounts.serious} (max: ${MAX_SERIOUS})`);
      exitCode = 1;
    }

    if (severityCounts.moderate > MAX_MODERATE) {
      failures.push(`Moderate violations: ${severityCounts.moderate} (max: ${MAX_MODERATE})`);
      exitCode = 1;
    }

    if (exitCode === 0) {
      console.log('✅ ACCESSIBILITY SCAN PASSED');
      console.log('   All violations within acceptable thresholds');
      console.log('');
    } else {
      console.log('❌ ACCESSIBILITY SCAN FAILED');
      console.log('');
      failures.forEach(failure => {
        console.log(`   ❌ ${failure}`);
      });
      console.log('');
      console.log('💡 Recommendations:');
      console.log('   1. Fix critical violations immediately (block deployment)');
      console.log('   2. Address serious violations in this sprint');
      console.log('   3. Plan moderate violations for next sprint');
      console.log('   4. Review axe-core documentation: https://www.deque.com/axe/');
      console.log('');
    }

    process.exit(exitCode);

  } catch (error) {
    console.error('');
    console.error('❌ Accessibility scan failed with error:');
    console.error(error);
    console.error('');

    if (browser) {
      await browser.close();
    }

    process.exit(1);
  }
}

// Run scan
runAccessibilityScan();
