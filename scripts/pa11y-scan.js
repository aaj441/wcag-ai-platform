#!/usr/bin/env node

/**
 * Accessibility Scanner using pa11y
 * Alternative WCAG 2.2 AA compliance scanning tool
 * 
 * Usage:
 *   node scripts/pa11y-scan.js <url>
 *   node scripts/pa11y-scan.js <url> --save-evidence
 *   node scripts/pa11y-scan.js <url> --standard WCAG2AAA
 * 
 * Requirements:
 *   npm install pa11y
 */

const pa11y = require('pa11y');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  outputDir: process.env.OUTPUT_DIR || './accessibility-reports',
  saveEvidence: process.argv.includes('--save-evidence'),
  standard: getStandard(),
  timeout: 30000,
};

function getStandard() {
  const standardIndex = process.argv.indexOf('--standard');
  if (standardIndex !== -1 && process.argv[standardIndex + 1]) {
    return process.argv[standardIndex + 1];
  }
  return 'WCAG2AA';
}

/**
 * Main scan function
 */
async function scanAccessibility(url) {
  console.log('🔍 Starting pa11y accessibility scan...');
  console.log(`📍 Target URL: ${url}`);
  console.log(`⚙️  Standard: ${CONFIG.standard}\n`);

  try {
    const startTime = Date.now();
    
    // Run pa11y scan
    console.log('🎯 Running scan...\n');
    const results = await pa11y(url, {
      standard: CONFIG.standard,
      timeout: CONFIG.timeout,
      wait: 1000,
      chromeLaunchConfig: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    const scanDuration = Date.now() - startTime;
    
    // Process results
    const violations = processViolations(results.issues);
    const complianceScore = calculateComplianceScore(violations);
    const passed = violations.filter(v => v.severity === 'critical').length === 0;
    
    // Create scan report
    const scanReport = {
      url,
      timestamp: new Date().toISOString(),
      complianceScore,
      passed,
      scanDurationMs: scanDuration,
      tool: 'pa11y',
      standard: CONFIG.standard,
      violations,
      summary: {
        total: violations.length,
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length,
        errors: results.issues.filter(i => i.type === 'error').length,
        warnings: results.issues.filter(i => i.type === 'warning').length,
        notices: results.issues.filter(i => i.type === 'notice').length,
      }
    };
    
    // Output results
    printConsoleReport(scanReport);
    
    // Save to Evidence Vault if requested
    if (CONFIG.saveEvidence) {
      await saveToEvidenceVault(scanReport);
    }
    
    // Exit with code 1 if critical issues found
    if (!passed) {
      console.error('\n❌ Scan failed: Critical accessibility issues found!');
      process.exit(1);
    }
    
    console.log('\n✅ Scan completed successfully!');
    return scanReport;
    
  } catch (error) {
    console.error('❌ Scan error:', error.message);
    throw error;
  }
}

/**
 * Process pa11y issues into standardized format
 */
function processViolations(issues) {
  const violations = [];
  
  issues.forEach((issue, index) => {
    const severity = mapTypeToSeverity(issue.type, issue.code);
    
    violations.push({
      id: `${issue.code}-${index}`,
      url: issue.selector || 'unknown',
      pageTitle: 'Scanned Page',
      element: issue.context || issue.selector,
      wcagCriteria: extractWcagCriteria(issue.code),
      wcagLevel: extractWcagLevel(issue.code),
      severity,
      description: issue.message,
      recommendation: `Fix ${issue.type}: ${issue.message}`,
      technicalDetails: `Code: ${issue.code}`,
      codeSnippet: issue.context || issue.selector,
      affectedUsers: describeImpact(severity),
      priority: getPriority(severity),
    });
  });
  
  return violations.sort((a, b) => a.priority - b.priority);
}

/**
 * Map pa11y issue type to severity
 */
function mapTypeToSeverity(type, code) {
  // Critical issues from WCAG codes
  const criticalCodes = ['WCAG2AA.Principle1', 'WCAG2AA.Principle4'];
  if (criticalCodes.some(c => code.startsWith(c))) {
    return 'critical';
  }
  
  const mapping = {
    'error': 'high',
    'warning': 'medium',
    'notice': 'low'
  };
  return mapping[type] || 'medium';
}

/**
 * Extract WCAG criteria from code
 */
function extractWcagCriteria(code) {
  // Extract WCAG criteria like "WCAG2AA.Principle1.Guideline1_1.1_1_1"
  const match = code.match(/WCAG2[A]{1,3}\.Principle\d\.Guideline\d_\d\.(\d_\d_\d)/);
  if (match) {
    return `WCAG ${match[1].replace(/_/g, '.')}`;
  }
  return code.split('.')[0] || 'WCAG';
}

/**
 * Extract WCAG level from code
 */
function extractWcagLevel(code) {
  if (code.includes('WCAG2AAA')) return 'AAA';
  if (code.includes('WCAG2AA')) return 'AA';
  return 'A';
}

/**
 * Describe impact for users
 */
function describeImpact(severity) {
  const descriptions = {
    'critical': 'Blocks users with disabilities from accessing content',
    'high': 'Significantly impacts users with disabilities',
    'medium': 'Moderately impacts some users with disabilities',
    'low': 'Minimal impact on users with disabilities'
  };
  return descriptions[severity] || 'Impact not specified';
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
 * Print console report
 */
function printConsoleReport(report) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PA11Y ACCESSIBILITY SCAN RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`URL: ${report.url}`);
  console.log(`Standard: ${report.standard}`);
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
  console.log('');
  console.log('📋 Issue Types:');
  console.log(`  ❌ Errors: ${report.summary.errors}`);
  console.log(`  ⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`  ℹ️  Notices: ${report.summary.notices}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (report.violations.length > 0) {
    console.log('\n🔍 Top 5 Violations:\n');
    report.violations.slice(0, 5).forEach((v, i) => {
      const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[v.severity];
      console.log(`${i + 1}. ${icon} ${v.wcagCriteria} - ${v.severity.toUpperCase()}`);
      console.log(`   ${v.description}`);
      console.log(`   Selector: ${v.url}`);
      console.log('');
    });
  }
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
        scanId: `pa11y-${Date.now()}`,
        url: report.url,
        complianceScore: report.complianceScore,
        violations: report.violations,
        scanType: 'automated',
        scanTool: report.tool,
        retentionDays: 90,
        tags: ['automated-scan', 'pa11y', report.standard],
        metadata: {
          scanDurationMs: report.scanDurationMs,
          timestamp: report.timestamp,
          standard: report.standard
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
    console.log('  node scripts/pa11y-scan.js <url>');
    console.log('  node scripts/pa11y-scan.js <url> --save-evidence');
    console.log('  node scripts/pa11y-scan.js <url> --standard WCAG2AAA');
    process.exit(1);
  }
  
  scanAccessibility(url).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { scanAccessibility };
