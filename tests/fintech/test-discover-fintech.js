// test-discover-fintech.js
// Test script for fintech prospect discovery using keyword search

const { discoverFintechProspects } = require('../../server/agents/keywordDiscoveryAgent');

/**
 * Test the fintech prospect discovery workflow
 * 
 * This script:
 * 1. Searches for fintech companies using Bing API
 * 2. Filters and validates discovered URLs
 * 3. Stores prospects in database (prospects:finance)
 * 
 * Requirements:
 * - BING_API_KEY environment variable
 * - Database connection configured
 * 
 * Expected output:
 * - Array of fintech prospect URLs
 * - Database populated with prospect data
 */
async function testDiscoverFintech() {
  console.log('🔍 Starting fintech prospect discovery test...');
  console.log('━'.repeat(50));
  
  try {
    // Run discovery
    console.log('📡 Searching for fintech prospects...');
    const urls = await discoverFintechProspects();
    
    // Validate results
    if (!urls || urls.length === 0) {
      console.error('❌ No prospects discovered. Check your BING_API_KEY.');
      process.exit(1);
    }
    
    // Display results
    console.log('✅ Fintech prospects discovered:');
    console.log(`   Total found: ${urls.length}`);
    console.log('');
    
    urls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
    
    console.log('');
    console.log('━'.repeat(50));
    console.log('✅ Discovery test complete!');
    console.log(`💾 Stored ${urls.length} prospects in database`);
    console.log('🔄 Next step: Run test-scan-fintech.js to scan these URLs');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Discovery test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testDiscoverFintech();
}

module.exports = { testDiscoverFintech };
