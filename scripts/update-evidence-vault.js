#!/usr/bin/env node

/**
 * Update Evidence Vault Script
 *
 * Stores accessibility scan results as compliance evidence
 * Organizes reports by date and generates compliance summary
 *
 * Usage: node scripts/update-evidence-vault.js <scan-report-path>
 */

const fs = require('fs');
const path = require('path');

const VAULT_DIR = path.join(__dirname, '../evidence-vault');
const SCAN_REPORT = process.argv[2];

if (!SCAN_REPORT) {
  console.error('❌ Usage: node update-evidence-vault.js <scan-report-path>');
  process.exit(1);
}

if (!fs.existsSync(SCAN_REPORT)) {
  console.error(`❌ Scan report not found: ${SCAN_REPORT}`);
  process.exit(1);
}

console.log('📁 Updating Evidence Vault...');
console.log('');

// Create vault directory structure
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

const yearDir = path.join(VAULT_DIR, String(year));
const monthDir = path.join(yearDir, month);
const dayDir = path.join(monthDir, day);

// Create directories
[VAULT_DIR, yearDir, monthDir, dayDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Read scan report
const scanData = JSON.parse(fs.readFileSync(SCAN_REPORT, 'utf8'));

// Generate filename
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const reportFileName = `scan-${timestamp}.json`;
const reportPath = path.join(dayDir, reportFileName);

// Copy report to vault
fs.copyFileSync(SCAN_REPORT, reportPath);
console.log(`✅ Stored scan report: ${reportPath}`);

// Generate summary
const summary = {
  timestamp: now.toISOString(),
  url: scanData.url || 'unknown',
  violations: scanData.violations?.length || 0,
  passes: scanData.passes?.length || 0,
  incomplete: scanData.incomplete?.length || 0,
  severityCounts: {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
  },
  wcagLevel: scanData.testRunner?.wcagLevel || 'AA',
  reportPath: reportPath,
};

// Count violations by severity
if (scanData.violations) {
  scanData.violations.forEach(violation => {
    const severity = violation.impact || 'minor';
    summary.severityCounts[severity] = (summary.severityCounts[severity] || 0) + violation.nodes.length;
  });
}

// Update daily summary
const dailySummaryPath = path.join(dayDir, 'summary.json');
let dailySummary = { scans: [] };

if (fs.existsSync(dailySummaryPath)) {
  dailySummary = JSON.parse(fs.readFileSync(dailySummaryPath, 'utf8'));
}

dailySummary.scans.push(summary);
dailySummary.lastUpdated = now.toISOString();
dailySummary.totalScans = dailySummary.scans.length;

fs.writeFileSync(dailySummaryPath, JSON.stringify(dailySummary, null, 2));
console.log(`✅ Updated daily summary: ${dailySummaryPath}`);

// Update master index
const indexPath = path.join(VAULT_DIR, 'index.json');
let index = { scans: [], stats: {} };

if (fs.existsSync(indexPath)) {
  index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

index.scans.push({
  date: now.toISOString(),
  violations: summary.violations,
  passes: summary.passes,
  reportPath: path.relative(VAULT_DIR, reportPath),
});

// Calculate overall stats
index.stats = {
  totalScans: index.scans.length,
  lastScan: now.toISOString(),
  averageViolations: index.scans.reduce((sum, s) => sum + s.violations, 0) / index.scans.length,
  averagePasses: index.scans.reduce((sum, s) => sum + s.passes, 0) / index.scans.length,
};

fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`✅ Updated master index: ${indexPath}`);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SCAN SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`URL: ${summary.url}`);
console.log(`WCAG Level: ${summary.wcagLevel}`);
console.log(`Violations: ${summary.violations}`);
console.log(`Passes: ${summary.passes}`);
console.log(`Incomplete: ${summary.incomplete}`);
console.log('');
console.log('Violations by Severity:');
console.log(`  Critical: ${summary.severityCounts.critical}`);
console.log(`  Serious: ${summary.severityCounts.serious}`);
console.log(`  Moderate: ${summary.severityCounts.moderate}`);
console.log(`  Minor: ${summary.severityCounts.minor}`);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Generate compliance badge
const totalViolations = Object.values(summary.severityCounts).reduce((sum, count) => sum + count, 0);
const complianceStatus = totalViolations === 0 ? 'COMPLIANT' : totalViolations < 10 ? 'MOSTLY_COMPLIANT' : 'NON_COMPLIANT';

const badgePath = path.join(VAULT_DIR, 'compliance-badge.json');
const badge = {
  status: complianceStatus,
  lastScan: now.toISOString(),
  violations: totalViolations,
  level: summary.wcagLevel,
};

fs.writeFileSync(badgePath, JSON.stringify(badge, null, 2));
console.log(`✅ Evidence vault updated successfully`);
console.log(`📁 Total scans in vault: ${index.stats.totalScans}`);
console.log('');
