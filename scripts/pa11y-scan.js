#!/usr/bin/env node
const pa11y = require('pa11y');
const fs = require('fs');
const path = require('path');

async function runPa11yScan(url) {
  console.log(`\n🔍 Starting Pa11y accessibility scan for: ${url}\n`);
  
  try {
    console.log('⏳ Running Pa11y analysis (WCAG 2.1 AA standard)...\n');
    
    const results = await pa11y(url, {
      standard: 'WCAG2AA',
      timeout: 30000,
      wait: 1000,
      includeNotices: true,
      includeWarnings: true
    });
    
    // Save results to Evidence Vault
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportPath = path.join(__dirname, '../evidence-vault/scans', `pa11y-${timestamp}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate summary
    const errors = results.issues.filter(i => i.type === 'error').length;
    const warnings = results.issues.filter(i => i.type === 'warning').length;
    const notices = results.issues.filter(i => i.type === 'notice').length;
    
    console.log(`\n=== 🎯 Pa11y Scan Results ===`);
    console.log(`📊 Total Issues: ${results.issues.length}`);
    console.log(`🔴 Errors: ${errors}`);
    console.log(`🟠 Warnings: ${warnings}`);
    console.log(`🔵 Notices: ${notices}`);
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    // Print detailed issues
    if (results.issues.length > 0) {
      console.log('=== 📋 Issue Details ===\n');
      results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.type.toUpperCase()}] ${issue.code}`);
        console.log(`   Message: ${issue.message}`);
        console.log(`   Context: ${issue.context}`);
        console.log(`   Selector: ${issue.selector}\n`);
      });
    }
    
    if (errors > 0) {
      console.error(`❌ FAIL: ${errors} accessibility errors found!`);
      console.error('   Errors must be fixed before merging.\n');
      process.exit(1);
    }
    
    console.log('✅ PASS: No accessibility errors detected\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Pa11y scan:', error.message);
    process.exit(1);
  }
}

const url = process.argv[2] || 'http://localhost:3000';
runPa11yScan(url).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
