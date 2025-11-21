#!/usr/bin/env node

/**
 * Accessibility Scanner using axe-core
 * Automated WCAG 2.2 AA compliance scanning with Evidence Vault integration
 * 
 * Usage:
 *   node scripts/accessibility-scan.js <url>
 *   node scripts/accessibility-scan.js <url> --save-evidence
 *   node scripts/accessibility-scan.js <url> --output json
 * 
 * Requirements:
 *   npm install axe-core puppeteer node-fetch
 */

const puppeteer = require('puppeteer');
const axeCore = require('axe-core');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  outputDir: process.env.OUTPUT_DIR || './accessibility-reports',
  saveEvidence: process.argv.includes('--save-evidence'),
  outputFormat: getOutputFormat(),
  headless: !process.argv.includes('--no-headless'),
};

function getOutputFormat() {
  const formatIndex = process.argv.indexOf('--output');
  if (formatIndex !== -1 && process.argv[formatIndex + 1]) {
    return process.argv[formatIndex + 1];
  }
  return 'console';
}

/**
 * Main scan function
 */
async function scanAccessibility(url) {
  console.log('🔍 Starting accessibility scan...');
  console.log(`📍 Target URL: ${url}`);
  console.log(`⚙️  Configuration: ${JSON.stringify(CONFIG, null, 2)}\n`);

  const browser = await puppeteer.launch({ 
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to page
    console.log('📄 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inject axe-core
    console.log('🔧 Injecting axe-core...');
    await page.addScriptTag({
      content: axeCore.source
    });
    
    // Run axe scan
    console.log('🎯 Running accessibility scan...\n');
    const startTime = Date.now();
    
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
          }
        }, (err, results) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });
    
    const scanDuration = Date.now() - startTime;
    
    // Process results
    const violations = processViolations(results.violations);
    const complianceScore = calculateComplianceScore(violations);
    const passed = violations.filter(v => v.severity === 'critical').length === 0;
    
    // Create scan report
    const scanReport = {
      url,
      timestamp: new Date().toISOString(),
      complianceScore,
      passed,
      scanDurationMs: scanDuration,
      tool: 'axe-core',
      violations,
      summary: {
        total: violations.length,
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length,
      }
    };
    
    // Output results
    await outputResults(scanReport);
    
    // Save to Evidence Vault if requested
    if (CONFIG.saveEvidence) {
      await saveToEvidenceVault(scanReport);
    }
    
    await browser.close();
    
    // Exit with code 1 if critical issues found
    if (!passed) {
      console.error('\n❌ Scan failed: Critical accessibility issues found!');
      process.exit(1);
    }
    
    console.log('\n✅ Scan completed successfully!');
    return scanReport;
    
  } catch (error) {
    await browser.close();
    console.error('❌ Scan error:', error.message);
    throw error;
  }
}

/**
 * Process axe violations into standardized format
 */
function processViolations(axeViolations) {
  const violations = [];
  
  axeViolations.forEach(violation => {
    violation.nodes.forEach((node, index) => {
      const severity = mapImpactToSeverity(violation.impact);
      
      violations.push({
        id: `${violation.id}-${index}`,
        url: node.target.join(' > '),
        pageTitle: 'Scanned Page',
        element: node.html,
        wcagCriteria: violation.tags.filter(t => t.startsWith('wcag')).join(', ').toUpperCase(),
        wcagLevel: extractWcagLevel(violation.tags),
        severity,
        description: violation.description,
        recommendation: `${violation.help} - ${node.failureSummary || ''}`,
        technicalDetails: violation.helpUrl,
        codeSnippet: node.html,
        affectedUsers: describeImpact(violation.impact),
        priority: getPriority(severity),
      });
    });
  });
  
  return violations.sort((a, b) => a.priority - b.priority);
}

/**
 * Map axe impact to severity level
 */
function mapImpactToSeverity(impact) {
  const mapping = {
    'critical': 'critical',
    'serious': 'high',
    'moderate': 'medium',
    'minor': 'low'
  };
  return mapping[impact] || 'medium';
}

/**
 * Extract WCAG level from tags
 */
function extractWcagLevel(tags) {
  if (tags.some(t => t.includes('wcag2aaa'))) return 'AAA';
  if (tags.some(t => t.includes('wcag2aa'))) return 'AA';
  return 'A';
}

/**
 * Describe impact for users
 */
function describeImpact(impact) {
  const descriptions = {
    'critical': 'Blocks users with disabilities from accessing content',
    'serious': 'Significantly impacts users with disabilities',
    'moderate': 'Moderately impacts some users with disabilities',
    'minor': 'Minimal impact on users with disabilities'
  };
  return descriptions[impact] || 'Impact not specified';
}

/**
 * Get priority number for sorting
 */
function getPriority(severity) {
  const priorities = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
  return priorities[severity] || 5;
}

/**
 * Calculate compliance score
 */
function calculateComplianceScore(violations) {
  if (violations.length === 0) return 100;
  
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;
  const lowCount = violations.filter(v => v.severity === 'low').length;
  
  const penalty = (criticalCount * 15) + (highCount * 8) + (mediumCount * 4) + (lowCount * 2);
  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Output scan results
 */
async function outputResults(report) {
  if (CONFIG.outputFormat === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (CONFIG.outputFormat === 'file') {
    await saveToFile(report);
  } else {
    printConsoleReport(report);
  }
}

/**
 * Print console report
 */
function printConsoleReport(report) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ACCESSIBILITY SCAN RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`URL: ${report.url}`);
  console.log(`Compliance Score: ${report.complianceScore}%`);
  console.log(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Scan Duration: ${report.scanDurationMs}ms`);
  console.log('');
  console.log('📈 Violations Summary:');
  console.log(`  🔴 Critical: ${report.summary.critical}`);
  console.log(`  🟠 High: ${report.summary.high}`);
  console.log(`  🟡 Medium: ${report.summary.medium}`);
  console.log(`  🟢 Low: ${report.summary.low}`);
  console.log(`  📊 Total: ${report.summary.total}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (report.violations.length > 0) {
    console.log('\n🔍 Top 5 Violations:\n');
    report.violations.slice(0, 5).forEach((v, i) => {
      const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[v.severity];
      console.log(`${i + 1}. ${icon} ${v.wcagCriteria} - ${v.severity.toUpperCase()}`);
      console.log(`   ${v.description}`);
      console.log(`   Element: ${v.element.substring(0, 80)}...`);
      console.log('');
    });
  }
}

/**
 * Save report to file
 */
async function saveToFile(report) {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scan-${timestamp}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${filepath}`);
}

/**
 * Save to Evidence Vault via API
 */
async function saveToEvidenceVault(report) {
  try {
    console.log('\n📦 Saving to Evidence Vault...');
    
    const fetch = require('node-fetch');
    const response = await fetch(`${CONFIG.apiUrl}/api/evidence/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scanId: `scan-${Date.now()}`,
        url: report.url,
        complianceScore: report.complianceScore,
        violations: report.violations,
        scanType: 'automated',
        scanTool: report.tool,
        retentionDays: 90,
        tags: ['automated-scan', 'axe-core'],
        metadata: {
          scanDurationMs: report.scanDurationMs,
          timestamp: report.timestamp
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ Evidence saved with ID: ${result.data.id}`);
  } catch (error) {
    console.error('⚠️  Failed to save to Evidence Vault:', error.message);
  }
}

// Main execution
if (require.main === module) {
  const url = process.argv[2];
  
  if (!url) {
    console.error('❌ Error: URL is required');
    console.log('\nUsage:');
    console.log('  node scripts/accessibility-scan.js <url>');
    console.log('  node scripts/accessibility-scan.js <url> --save-evidence');
    console.log('  node scripts/accessibility-scan.js <url> --output json');
    console.log('  node scripts/accessibility-scan.js <url> --output file');
    process.exit(1);
  }
  
  scanAccessibility(url).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { scanAccessibility };
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
