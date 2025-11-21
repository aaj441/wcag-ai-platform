// test-full-fintech-workflow.js
// Complete end-to-end test for fintech workflow

const { discoverFintechProspects } = require('../../server/agents/keywordDiscoveryAgent');
const { scanFintechProspects } = require('../../server/agents/scanScheduler');
const { outreachFintechProspects } = require('../../server/agents/emailer');

/**
 * Complete fintech workflow test
 * 
 * This script runs the entire pipeline:
 * 1. Discover fintech prospects (Bing API)
 * 2. Scan for WCAG violations (Fellou/Axe)
 * 3. Send compliance outreach (Resend)
 * 
 * Requirements:
 * - BING_API_KEY environment variable
 * - FELLOU_TOKEN environment variable
 * - RESEND_API_KEY environment variable
 * - Database connection configured
 * 
 * Usage:
 *   node test-full-fintech-workflow.js
 * 
 * This is the single-command test for the complete agentic workflow.
 */
async function runFullFintechWorkflow() {
  console.log('━'.repeat(60));
  console.log('🚀 WCAG AI Platform - Full Fintech Workflow Test');
  console.log('━'.repeat(60));
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // ========================================
    // STEP 1: Discover Prospects
    // ========================================
    console.log('📍 STEP 1/3: Discovering fintech prospects...');
    console.log('   Source: Bing Web Search API');
    console.log('   Keywords: fintech, payment processing, digital banking');
    console.log('');
    
    const prospects = await discoverFintechProspects();
    
    if (!prospects || prospects.length === 0) {
      throw new Error('No prospects discovered. Check BING_API_KEY.');
    }
    
    console.log(`✅ Discovered ${prospects.length} prospects`);
    console.log('');
    
    // Short delay between steps
    await sleep(2000);
    
    // ========================================
    // STEP 2: Scan for Violations
    // ========================================
    console.log('📍 STEP 2/3: Scanning prospects for WCAG compliance...');
    console.log('   Standard: WCAG 2.1 Level AA');
    console.log('   Engine: Fellou/Axe-core');
    console.log('');
    
    const scanResults = await scanFintechProspects();
    
    if (!scanResults) {
      throw new Error('Scan failed. Check FELLOU_TOKEN.');
    }
    
    console.log(`✅ Scanned ${scanResults.scanned} URLs`);
    console.log(`   Found ${scanResults.violations} violations`);
    console.log('');
    
    // Short delay between steps
    await sleep(2000);
    
    // ========================================
    // STEP 3: Send Outreach
    // ========================================
    console.log('📍 STEP 3/3: Sending outreach emails...');
    console.log('   Service: Resend API');
    console.log('   Template: Fintech compliance report');
    console.log('');
    
    const outreachResults = await outreachFintechProspects();
    
    if (!outreachResults || outreachResults.sent === 0) {
      console.warn('⚠️  No emails sent (may need valid contact info)');
    } else {
      console.log(`✅ Sent ${outreachResults.sent} emails`);
    }
    console.log('');
    
    // ========================================
    // Summary
    // ========================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('━'.repeat(60));
    console.log('🎉 Full fintech workflow complete!');
    console.log('━'.repeat(60));
    console.log('');
    console.log('📊 Workflow Summary:');
    console.log(`   Prospects discovered: ${prospects.length}`);
    console.log(`   URLs scanned: ${scanResults.scanned}`);
    console.log(`   Violations found: ${scanResults.violations}`);
    console.log(`   Emails sent: ${outreachResults.sent || 0}`);
    console.log(`   Total duration: ${duration}s`);
    console.log('');
    console.log('✅ Results stored in database');
    console.log('📊 View dashboard: /dashboard/finance');
    console.log('');
    console.log('━'.repeat(60));
    
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('━'.repeat(60));
    console.error('❌ Workflow failed');
    console.error('━'.repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Check all API keys are set (BING_API_KEY, FELLOU_TOKEN, RESEND_API_KEY)');
    console.error('  2. Verify database connection');
    console.error('  3. Check network connectivity');
    console.error('  4. Review error logs above');
    console.error('');
    
    process.exit(1);
  }
}

/**
 * Sleep utility for workflow pacing
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  runFullFintechWorkflow();
}

module.exports = { runFullFintechWorkflow };
