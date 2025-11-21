// test-outreach-fintech.js
// Test script for fintech compliance outreach emails

const { outreachFintechProspects } = require('../../server/agents/emailer');

/**
 * Test the fintech email outreach workflow
 * 
 * This script:
 * 1. Retrieves fintech prospects with scan results
 * 2. Generates personalized compliance reports
 * 3. Sends outreach emails via Resend API
 * 
 * Requirements:
 * - RESEND_API_KEY environment variable
 * - Scan results must exist (run test-scan-fintech.js first)
 * - Valid contact emails for prospects
 * 
 * Expected output:
 * - Confirmation of emails sent
 * - Email delivery status
 * - Database updated with outreach metadata
 */
async function testOutreachFintech() {
  console.log('📧 Starting fintech outreach test...');
  console.log('━'.repeat(50));
  
  try {
    // Run outreach
    console.log('📨 Sending compliance reports to fintech prospects...');
    const results = await outreachFintechProspects();
    
    // Validate results
    if (!results || results.sent === 0) {
      console.warn('⚠️  No emails sent. Check RESEND_API_KEY and prospect contact info.');
      if (results && results.errors) {
        console.error('Errors:', results.errors);
      }
      process.exit(1);
    }
    
    // Display results
    console.log('✅ Fintech outreach emails sent!');
    console.log('');
    console.log('📊 Outreach Statistics:');
    console.log(`   Emails sent: ${results.sent}`);
    console.log(`   Failed: ${results.failed || 0}`);
    console.log(`   Pending: ${results.pending || 0}`);
    console.log('');
    
    // Display recipient details
    if (results.recipients && results.recipients.length > 0) {
      console.log('📬 Recipients:');
      results.recipients.forEach((recipient, index) => {
        console.log(`   ${index + 1}. ${recipient.company} (${recipient.email})`);
        console.log(`      Status: ${recipient.status}`);
        console.log(`      Violations: ${recipient.violationCount}`);
      });
      console.log('');
    }
    
    console.log('━'.repeat(50));
    console.log('✅ Outreach test complete!');
    console.log('💾 Email metadata stored in database');
    console.log('🎉 Full fintech workflow complete!');
    console.log('');
    console.log('📊 View results at /dashboard/finance');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Outreach test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testOutreachFintech();
}

module.exports = { testOutreachFintech };
