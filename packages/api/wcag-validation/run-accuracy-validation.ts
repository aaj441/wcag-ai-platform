#!/usr/bin/env tsx

/**
 * WCAG Accuracy Validation Framework
 * 
 * Runs axe-core scans on test cases and calculates accuracy metrics:
 * - Precision: TP / (TP + FP) - How many detected violations are real?
 * - Recall: TP / (TP + FN) - How many real violations did we detect?
 * - F1 Score: 2 * (Precision * Recall) / (Precision + Recall)
 * 
 * Usage: npx tsx wcag-validation/run-accuracy-validation.ts
 */

import fs from 'fs';
import path from 'path';
import { AxePuppeteer } from '@axe-core/puppeteer';
import puppeteer, { Browser, Page } from 'puppeteer';

interface TestManifest {
  testSuite: {
    name: string;
    version: string;
    totalTests: number;
  };
  testCases: {
    violations: TestCase[];
    compliant: TestCase[];
  };
  accuracyTargets: {
    precision: number;
    recall: number;
    f1Score: number;
  };
}

interface TestCase {
  id: string;
  file: string;
  name: string;
  wcagCriteria: string[];
  level: string;
  expectedViolations: number;
  violationTypes?: string[];
  description: string;
}

interface ScanResult {
  testId: string;
  testName: string;
  testFile: string;
  expectedViolations: number;
  detectedViolations: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  violationDetails: any[];
}

interface AccuracyMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
}

const TEST_CASES_DIR = path.join(__dirname, 'test-cases');
const MANIFEST_PATH = path.join(__dirname, 'test-manifest.json');
const REPORT_DIR = path.join(__dirname, 'reports');

/**
 * Load test manifest
 */
function loadManifest(): TestManifest {
  const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(content);
}

/**
 * Scan a single test HTML file
 */
async function scanTestCase(
  browser: Browser,
  testCase: TestCase,
  testCasesDir: string
): Promise<ScanResult> {
  const page: Page = await browser.newPage();

  try {
    // Load HTML file
    const filePath = path.join(testCasesDir, testCase.file);
    const fileUrl = `file://${filePath}`;

    console.log(`  📄 Scanning: ${testCase.name}`);
    console.log(`     File: ${testCase.file}`);

    await page.goto(fileUrl, { waitUntil: 'networkidle2' });

    // Run axe-core scan
    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
      .analyze();

    const detectedViolations = results.violations.length;

    // Calculate metrics
    // For violation test cases: we expect violations
    // For compliant test cases: we expect 0 violations
    const expected = testCase.expectedViolations;
    const detected = detectedViolations;

    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    if (expected > 0) {
      // This is a violation test case
      truePositives = Math.min(detected, expected);
      falsePositives = Math.max(0, detected - expected);
      falseNegatives = Math.max(0, expected - detected);
    } else {
      // This is a compliant test case
      truePositives = 0;
      falsePositives = detected; // Any detection is a false positive
      falseNegatives = 0;
    }

    console.log(`     Expected: ${expected}, Detected: ${detected}`);
    console.log(`     TP: ${truePositives}, FP: ${falsePositives}, FN: ${falseNegatives}`);

    return {
      testId: testCase.id,
      testName: testCase.name,
      testFile: testCase.file,
      expectedViolations: expected,
      detectedViolations: detected,
      truePositives,
      falsePositives,
      falseNegatives,
      violationDetails: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        help: v.help,
        helpUrl: v.helpUrl,
      })),
    };
  } finally {
    await page.close();
  }
}

/**
 * Calculate overall accuracy metrics
 */
function calculateMetrics(results: ScanResult[]): AccuracyMetrics {
  const tp = results.reduce((sum, r) => sum + r.truePositives, 0);
  const fp = results.reduce((sum, r) => sum + r.falsePositives, 0);
  const fn = results.reduce((sum, r) => sum + r.falseNegatives, 0);

  // For compliant test cases, each one is a true negative if no violations detected
  const tn = results.filter(r => r.expectedViolations === 0 && r.detectedViolations === 0).length;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = tp + tn + fp + fn > 0 ? (tp + tn) / (tp + tn + fp + fn) : 0;

  return {
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    trueNegatives: tn,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1Score: Math.round(f1Score * 10000) / 10000,
    accuracy: Math.round(accuracy * 10000) / 10000,
  };
}

/**
 * Generate accuracy report
 */
function generateReport(
  manifest: TestManifest,
  results: ScanResult[],
  metrics: AccuracyMetrics
): void {
  const timestamp = new Date().toISOString();
  const reportFile = path.join(REPORT_DIR, `accuracy-report-${Date.now()}.json`);

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const report = {
    timestamp,
    testSuite: manifest.testSuite,
    targets: manifest.accuracyTargets,
    results: {
      totalTests: results.length,
      passedTests: results.filter(r => r.falsePositives === 0 && r.falseNegatives === 0).length,
      failedTests: results.filter(r => r.falsePositives > 0 || r.falseNegatives > 0).length,
    },
    metrics,
    targetsMet: {
      precision: metrics.precision >= manifest.accuracyTargets.precision,
      recall: metrics.recall >= manifest.accuracyTargets.recall,
      f1Score: metrics.f1Score >= manifest.accuracyTargets.f1Score,
    },
    detailedResults: results,
  };

  // Save JSON report
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log('');
  console.log(`📄 Detailed report saved: ${reportFile}`);

  // Also save markdown summary
  const mdFile = path.join(REPORT_DIR, `accuracy-summary-${Date.now()}.md`);
  const markdown = generateMarkdownSummary(report);
  fs.writeFileSync(mdFile, markdown);

  console.log(`📄 Markdown summary saved: ${mdFile}`);
}

/**
 * Generate markdown summary
 */
function generateMarkdownSummary(report: any): string {
  const { metrics, targetsMet } = report;

  return `# WCAG Accuracy Validation Report

**Generated:** ${report.timestamp}

## Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Precision** | ${(metrics.precision * 100).toFixed(2)}% | ${(report.targets.precision * 100).toFixed(2)}% | ${targetsMet.precision ? '✅ PASS' : '❌ FAIL'} |
| **Recall** | ${(metrics.recall * 100).toFixed(2)}% | ${(report.targets.recall * 100).toFixed(2)}% | ${targetsMet.recall ? '✅ PASS' : '❌ FAIL'} |
| **F1 Score** | ${(metrics.f1Score * 100).toFixed(2)}% | ${(report.targets.f1Score * 100).toFixed(2)}% | ${targetsMet.f1Score ? '✅ PASS' : '❌ FAIL'} |
| **Accuracy** | ${(metrics.accuracy * 100).toFixed(2)}% | - | - |

## Confusion Matrix

|  | Predicted Positive | Predicted Negative |
|--|--------------------|--------------------|
| **Actual Positive** | TP: ${metrics.truePositives} | FN: ${metrics.falseNegatives} |
| **Actual Negative** | FP: ${metrics.falsePositives} | TN: ${metrics.trueNegatives} |

## Test Results

- **Total Tests:** ${report.results.totalTests}
- **Passed:** ${report.results.passedTests} (${((report.results.passedTests / report.results.totalTests) * 100).toFixed(1)}%)
- **Failed:** ${report.results.failedTests} (${((report.results.failedTests / report.results.totalTests) * 100).toFixed(1)}%)

## Detailed Results

${report.detailedResults.map((r: ScanResult) => `### ${r.testId}: ${r.testName}

- **File:** \`${r.testFile}\`
- **Expected Violations:** ${r.expectedViolations}
- **Detected Violations:** ${r.detectedViolations}
- **True Positives:** ${r.truePositives}
- **False Positives:** ${r.falsePositives}
- **False Negatives:** ${r.falseNegatives}
- **Status:** ${r.falsePositives === 0 && r.falseNegatives === 0 ? '✅ Perfect' : '⚠️ Needs Review'}

${r.violationDetails.length > 0 ? `**Detected Violations:**
${r.violationDetails.map(v => `- ${v.id}: ${v.description} (${v.nodes} instances, impact: ${v.impact})`).join('\n')}` : '*No violations detected*'}
`).join('\n')}

## Interpretation

**Precision (${(metrics.precision * 100).toFixed(2)}%):** Of all violations detected, ${(metrics.precision * 100).toFixed(2)}% were actual violations.
${metrics.precision >= report.targets.precision ? '✅ Meets target - low false positive rate' : '❌ Below target - too many false positives'}

**Recall (${(metrics.recall * 100).toFixed(2)}%):** Of all actual violations, we detected ${(metrics.recall * 100).toFixed(2)}%.
${metrics.recall >= report.targets.recall ? '✅ Meets target - catching most violations' : '❌ Below target - missing too many violations'}

**F1 Score (${(metrics.f1Score * 100).toFixed(2)}%):** Harmonic mean of precision and recall.
${metrics.f1Score >= report.targets.f1Score ? '✅ Meets target - balanced performance' : '❌ Below target - needs improvement'}

## Recommendations

${targetsMet.precision && targetsMet.recall && targetsMet.f1Score ?
'✅ **PRODUCTION READY**: All accuracy targets met. Scanner is performing within acceptable parameters.' :
`⚠️ **NOT PRODUCTION READY**: Accuracy targets not met. Recommend:
1. Review false positives to improve precision
2. Expand test coverage to improve recall
3. Tune scanner configuration
4. Re-run validation after improvements`}
`;
}

/**
 * Main validation function
 */
async function runValidation(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 WCAG ACCURACY VALIDATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Load test manifest
  console.log('📋 Loading test manifest...');
  const manifest = loadManifest();
  console.log(`   Test Suite: ${manifest.testSuite.name}`);
  console.log(`   Version: ${manifest.testSuite.version}`);
  console.log(`   Total Tests: ${manifest.testSuite.totalTests}`);
  console.log('');

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const allResults: ScanResult[] = [];

  try {
    // Scan violation test cases
    console.log('🔍 Scanning violation test cases...');
    for (const testCase of manifest.testCases.violations) {
      const result = await scanTestCase(browser, testCase, TEST_CASES_DIR);
      allResults.push(result);
    }

    console.log('');

    // Scan compliant test cases
    console.log('✅ Scanning compliant test cases...');
    for (const testCase of manifest.testCases.compliant) {
      const result = await scanTestCase(browser, testCase, TEST_CASES_DIR);
      allResults.push(result);
    }

    console.log('');

    // Calculate metrics
    console.log('📊 Calculating accuracy metrics...');
    const metrics = calculateMetrics(allResults);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 ACCURACY METRICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`Precision:  ${(metrics.precision * 100).toFixed(2)}% (target: ${(manifest.accuracyTargets.precision * 100).toFixed(2)}%)`);
    console.log(`Recall:     ${(metrics.recall * 100).toFixed(2)}% (target: ${(manifest.accuracyTargets.recall * 100).toFixed(2)}%)`);
    console.log(`F1 Score:   ${(metrics.f1Score * 100).toFixed(2)}% (target: ${(manifest.accuracyTargets.f1Score * 100).toFixed(2)}%)`);
    console.log(`Accuracy:   ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log('');
    console.log('Confusion Matrix:');
    console.log(`  True Positives:  ${metrics.truePositives}`);
    console.log(`  False Positives: ${metrics.falsePositives}`);
    console.log(`  False Negatives: ${metrics.falseNegatives}`);
    console.log(`  True Negatives:  ${metrics.trueNegatives}`);
    console.log('');

    // Generate report
    generateReport(manifest, allResults, metrics);

    // Determine pass/fail
    const passed = metrics.precision >= manifest.accuracyTargets.precision &&
                   metrics.recall >= manifest.accuracyTargets.recall &&
                   metrics.f1Score >= manifest.accuracyTargets.f1Score;

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (passed) {
      console.log('✅ VALIDATION PASSED');
      console.log('   All accuracy targets met');
      console.log('   Scanner is production-ready');
    } else {
      console.log('❌ VALIDATION FAILED');
      console.log('   Accuracy targets not met');
      console.log('   Review report for details');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    process.exit(passed ? 0 : 1);

  } finally {
    await browser.close();
  }
}

// Run validation
runValidation().catch(error => {
  console.error('❌ Validation failed with error:');
  console.error(error);
  process.exit(1);
});
