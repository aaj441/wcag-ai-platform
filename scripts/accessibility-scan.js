#!/usr/bin/env node
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runAccessibilityScan(url) {
  console.log(`\n🔍 Starting accessibility scan for: ${url}\n`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('⏳ Running axe-core analysis...\n');
    const results = await new AxePuppeteer(page).analyze();
    
    // Save results to Evidence Vault
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportPath = path.join(__dirname, '../evidence-vault/scans', `scan-${timestamp}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate summary
    const violations = results.violations.length;
    const critical = results.violations.filter(v => v.impact === 'critical').length;
    const serious = results.violations.filter(v => v.impact === 'serious').length;
    const moderate = results.violations.filter(v => v.impact === 'moderate').length;
    const minor = results.violations.filter(v => v.impact === 'minor').length;
    
    console.log(`\n=== 🎯 Accessibility Scan Results ===`);
    console.log(`📊 Total Violations: ${violations}`);
    console.log(`🔴 Critical: ${critical}`);
    console.log(`🟠 Serious: ${serious}`);
    console.log(`🟡 Moderate: ${moderate}`);
    console.log(`🟢 Minor: ${minor}`);
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    // Print detailed violation summary
    if (violations > 0) {
      console.log('=== 📋 Violation Details ===\n');
      results.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id} (${violation.impact})`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Help: ${violation.helpUrl}`);
        console.log(`   Nodes affected: ${violation.nodes.length}\n`);
      });
    }
    
    // Exit with error if critical violations found
    if (critical > 0) {
      console.error('❌ FAIL: Critical accessibility violations detected!');
      console.error('   Critical issues must be fixed before merging.\n');
      await browser.close();
      process.exit(1);
    }
    
    console.log('✅ PASS: No critical accessibility violations detected\n');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during accessibility scan:', error.message);
    await browser.close();
    process.exit(1);
  }
}

const url = process.argv[2] || 'http://localhost:3000';
runAccessibilityScan(url).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
