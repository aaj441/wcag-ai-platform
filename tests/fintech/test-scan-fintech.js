// test-scan-fintech.js
// Test script for WCAG scanning of fintech prospects

const { scanFintechProspects } = require('../../server/agents/scanScheduler');

/**
 * Test the fintech WCAG scanning workflow
 * 
 * This script:
 * 1. Retrieves fintech prospects from database
 * 2. Runs WCAG 2.1 AA scans using Fellou/Axe-core
 * 3. Stores violation results per URL
 * 
 * Requirements:
 * - FELLOU_TOKEN environment variable (or local Axe-core)
 * - Prospects must exist in database (run test-discover-fintech.js first)
 * 
 * Expected output:
 * - Scan results for each prospect
 * - Total violation count
 * - Database updated with scan data
 */
async function testScanFintech() {
  console.log('🕵️‍♂️ Starting fintech WCAG scan test...');
  console.log('━'.repeat(50));
  
  try {
    // Run scans
    console.log('🔍 Scanning fintech prospects for WCAG violations...');
    const results = await scanFintechProspects();
    
    // Validate results
    if (!results) {
      console.error('❌ Scan failed. Check FELLOU_TOKEN and database.');
      process.exit(1);
    }
    
    // Calculate statistics
    const totalUrls = results.scanned || 0;
    const totalViolations = results.violations || 0;
    const avgViolationsPerUrl = totalUrls > 0 ? (totalViolations / totalUrls).toFixed(1) : 0;
    
    // Display results
    console.log('✅ Fintech WCAG scan complete!');
    console.log('');
    console.log('📊 Scan Statistics:');
    console.log(`   URLs scanned: ${totalUrls}`);
    console.log(`   Total violations: ${totalViolations}`);
    console.log(`   Avg violations/URL: ${avgViolationsPerUrl}`);
    console.log('');
    
    // Display violation breakdown by severity
    if (results.bySeverity) {
      console.log('⚠️  Violations by Severity:');
      console.log(`   Critical: ${results.bySeverity.critical || 0}`);
      console.log(`   High: ${results.bySeverity.high || 0}`);
      console.log(`   Medium: ${results.bySeverity.medium || 0}`);
      console.log(`   Low: ${results.bySeverity.low || 0}`);
      console.log('');
    }
    
    console.log('━'.repeat(50));
    console.log('✅ Scan test complete!');
    console.log('💾 Scan results stored in database');
    console.log('🔄 Next step: Run test-outreach-fintech.js to send reports');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Scan test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testScanFintech();
}

module.exports = { testScanFintech };
