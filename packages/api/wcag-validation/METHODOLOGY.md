# WCAG Accuracy Validation Methodology

**Version:** 1.0.0  
**Last Updated:** November 17, 2025  
**WCAG Version:** 2.1  
**Conformance Level:** AA

---

## Table of Contents

- [Overview](#overview)
- [Test Suite Design](#test-suite-design)
- [Accuracy Metrics](#accuracy-metrics)
- [Running Validation](#running-validation)
- [Interpreting Results](#interpreting-results)
- [Expanding the Test Suite](#expanding-the-test-suite)
- [Continuous Validation](#continuous-validation)

---

## Overview

### Purpose

The WCAG Accuracy Validation Framework ensures that our accessibility scanner achieves production-quality accuracy by:1. Testing against known WCAG violations and compliant code
2. Calculating precision, recall, and F1 scores
3. Providing actionable reports for improvement
4. Blocking production deployments if accuracy targets not met

### Validation Strategy

We use **axe-core** as the reference scanner and measure our platform's performance against hand-curated test cases with known outcomes.

### Success Criteria

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Precision** | ≥90% | High precision = few false positives, users trust the results |
| **Recall** | ≥85% | High recall = catch most violations, comprehensive scanning |
| **F1 Score** | ≥87.5% | Balanced performance between precision and recall |

---

## Test Suite Design

### Test Case Categories

#### 1. Violation Test Cases (`test-cases/violations/`)

HTML files that **intentionally violate** WCAG success criteria:- Each file focuses on a specific violation type
- Contains multiple instances of the same violation
- Documented with expected violation count
- Tagged with WCAG criteria and conformance level

**Example Violation Tests:**
- `missing-alt-text.html` - Images without alt attributes (WCAG 1.1.1 Level A)
- `insufficient-color-contrast.html` - Low contrast text (WCAG 1.4.3 Level AA)
- `missing-form-labels.html` - Form controls without labels (WCAG 1.3.1 Level A)
- `broken-heading-hierarchy.html` - Improper heading structure (WCAG 1.3.1 Level A)
- `missing-keyboard-access.html` - Non-keyboard-accessible controls (WCAG 2.1.1 Level A)

#### 2. Compliant Test Cases (`test-cases/compliant/`)

HTML files that **correctly implement** WCAG success criteria:- Demonstrate proper accessibility implementation
- Expected violations: 0
- Serve as regression tests (should always pass)
- Show best practices for developers

**Example Compliant Tests:**
- `proper-alt-text.html` - Correct alt text usage
- `sufficient-color-contrast.html` - High contrast text
- `proper-form-labels.html` - Properly labeled forms

#### 3. Edge Cases (`test-cases/edge-cases/`) [Future]

Complex scenarios that test scanner robustness:
- Dynamic content (AJAX-loaded)
- Shadow DOM components
- ARIA overrides
- Complex nested structures

### Test Manifest (`test-manifest.json`)

Central registry of all test cases with metadata:

```json
{
  "testCases": {
    "violations": [
      {
        "id": "V001",
        "file": "violations/missing-alt-text.html",
        "name": "Missing Alt Text on Images",
        "wcagCriteria": ["1.1.1"],
        "level": "A",
        "expectedViolations": 5,
        "violationTypes": ["image-alt", "button-name"],
        "description": "..."
      }
    ]
  }
}
```

**Key Fields:**
- `expectedViolations` - Number of violations the scanner should detect
- `wcagCriteria` - Which WCAG success criteria apply
- `violationTypes` - axe-core rule IDs expected to trigger

---

## Accuracy Metrics

### Confusion Matrix

For each test case, we classify scanner results:

|  | Scanner Says: Violation | Scanner Says: Compliant |
|--|-------------------------|-------------------------|
| **Actually Has Violation** | True Positive (TP) | False Negative (FN) |
| **Actually Compliant** | False Positive (FP) | True Negative (TN) |

### Metrics Calculation

**Precision:**
```
Precision = TP / (TP + FP)
```
*Interpretation:* Of all violations detected, what percentage are real violations?  
*High precision (90%+):* Users can trust scan results, few false alarms

**Recall:**
```
Recall = TP / (TP + FN)
```
*Interpretation:* Of all actual violations, what percentage did we detect?  
*High recall (85%+):* Comprehensive scanning, catching most issues

**F1 Score:**
```
F1 = 2 × (Precision × Recall) / (Precision + Recall)
```
*Interpretation:* Harmonic mean balancing precision and recall  
*High F1 (87.5%+):* Well-balanced scanner performance

**Accuracy:**
```
Accuracy = (TP + TN) / (TP + TN + FP + FN)
```
*Interpretation:* Overall correctness across all test cases  
*Note:* Can be misleading with imbalanced test sets

### Example Calculation

Suppose we scan 5 violation test cases (25 expected violations) and 3 compliant test cases:

- **True Positives (TP):** 23 violations correctly detected
- **False Negatives (FN):** 2 violations missed
- **False Positives (FP):** 1 compliant case flagged as violation
- **True Negatives (TN):** 2 compliant cases passed correctly

```
Precision = 23 / (23 + 1) = 95.8%  ✅ Exceeds 90% target
Recall = 23 / (23 + 2) = 92.0%     ✅ Exceeds 85% target
F1 = 2 × (0.958 × 0.920) / (0.958 + 0.920) = 93.9%  ✅ Exceeds 87.5% target
```

**Verdict:** Production-ready ✅

---

## Running Validation

### Prerequisites

```bash
cd packages/api
npm install  # Ensure dependencies installed
```

### Run Full Validation Suite

```bash
npx tsx wcag-validation/run-accuracy-validation.ts
```

### What Happens

1. **Loads Test Manifest** - Reads `test-manifest.json`
2. **Launches Browser** - Headless Puppeteer instance
3. **Scans Violation Tests** - Runs axe-core on each violation HTML file
4. **Scans Compliant Tests** - Runs axe-core on compliant HTML files
5. **Calculates Metrics** - Computes precision, recall, F1
6. **Generates Reports** - Saves JSON and Markdown reports
7. **Exits** - Exit code 0 if passed, 1 if failed

### Output

**Console Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 WCAG ACCURACY VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Loading test manifest...
   Test Suite: WCAG Accuracy Validation Test Suite
   Version: 1.0.0
   Total Tests: 8

🔍 Scanning violation test cases...
  📄 Scanning: Missing Alt Text on Images
     File: violations/missing-alt-text.html
     Expected: 5, Detected: 5
     TP: 5, FP: 0, FN: 0

...

📈 ACCURACY METRICS
Precision:  95.00% (target: 90.00%)
Recall:     92.00% (target: 85.00%)
F1 Score:   93.48% (target: 87.50%)

✅ VALIDATION PASSED
   All accuracy targets met
   Scanner is production-ready
```

**Generated Reports:**
- `reports/accuracy-report-{timestamp}.json` - Detailed JSON results
- `reports/accuracy-summary-{timestamp}.md` - Human-readable markdown

### CI/CD Integration

Add to `.github/workflows/code-quality-checks.yml`:

```yaml
- name: Run WCAG Accuracy Validation
  working-directory: packages/api
  run: npx tsx wcag-validation/run-accuracy-validation.ts
```

---

## Interpreting Results

### Green Light ✅

**All targets met:**
- Precision ≥90%
- Recall ≥85%
- F1 Score ≥87.5%

**Action:** Safe to deploy to production

### Yellow Light ⚠️

**One metric slightly below target (within 5%):**

**If Low Precision (<90%):**
- **Problem:** Too many false positives
- **Impact:** Users see fake violations, lose trust
- **Fix:** Review axe-core rule configuration, tune thresholds

**If Low Recall (<85%):**
- **Problem:** Missing real violations
- **Impact:** Accessibility issues go undetected
- **Fix:** Expand axe-core rule coverage, review disabled rules

### Red Light ❌

**Multiple metrics below target or >10% gap:**

**Action:** Do NOT deploy to production

**Debugging Steps:**
1. Review `reports/accuracy-report-{timestamp}.json`
2. Identify which test cases are failing
3. Check `violationDetails` in report for unexpected detections
4. Compare expected vs detected violation counts
5. Update scanner configuration or test expectations

### Common Issues

**False Positives on Compliant Tests:**
```json
{
  "testId": "C001",
  "expectedViolations": 0,
  "detectedViolations": 3,  // ❌ False positives
  "falsePositives": 3
}
```
**Fix:** Review compliant test HTML, ensure it truly complies with WCAG

**False Negatives on Violation Tests:**
```json
{
  "testId": "V001",
  "expectedViolations": 5,
  "detectedViolations": 3,  // ❌ Missed 2 violations
  "falseNegatives": 2
}
```
**Fix:** Check if axe-core rules are enabled for that violation type

---

## Expanding the Test Suite

### Current Coverage

**8 test cases:**
- 5 violation tests (covering 5 WCAG criteria)
- 3 compliant tests (demonstrating proper implementation)

**Target:** 100+ test cases for comprehensive validation

### How to Add New Tests

#### 1. Create Test HTML File

**For Violations:**
```bash
cat > test-cases/violations/your-new-test.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <title>WCAG Violation: [Issue Name]</title>
</head>
<body>
    <h1>Test Page: [Issue Name]</h1>
    
    <!-- VIOLATION 1: Description -->
    <div>Violation code here</div>
    
    <!-- VIOLATION 2: Description -->
    ...
    
    <footer>
        <p>Expected violations: X</p>
        <p>WCAG Criteria: X.X.X (Level A/AA/AAA)</p>
    </footer>
</body>
</html>
HTML
```

**For Compliant Code:**
```bash
cat > test-cases/compliant/your-compliant-test.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <title>WCAG Compliant: [Feature Name]</title>
</head>
<body>
    <h1>Test Page: Proper [Feature] Implementation</h1>
    
    <!-- COMPLIANT: Description -->
    <div>Compliant code here</div>
    
    <footer>
        <p>Expected violations: 0</p>
        <p>WCAG Criteria: X.X.X (Level A/AA/AAA) - COMPLIANT</p>
    </footer>
</body>
</html>
HTML
```

#### 2. Update Test Manifest

Add entry to `test-manifest.json`:

```json
{
  "id": "V006",
  "file": "violations/your-new-test.html",
  "name": "Your New Test Name",
  "wcagCriteria": ["X.X.X"],
  "level": "A",
  "expectedViolations": 3,
  "violationTypes": ["axe-rule-id"],
  "description": "What this test validates"
}
```

#### 3. Run Validation

```bash
npx tsx wcag-validation/run-accuracy-validation.ts
```

#### 4. Review Results

Check if the new test behaves as expected:
- Detected violations match expected count
- No unexpected false positives/negatives

### Recommended Test Additions

**High Priority (WCAG 2.1 Level A/AA):**
- Focus visible (2.4.7)
- Language of page (3.1.1)
- Link purpose (2.4.4)
- Parsing errors (4.1.1)
- Name, role, value (4.1.2)
- Resize text (1.4.4)
- Images of text (1.4.5)

**Future (WCAG 2.2 / Level AAA):**
- Focus not obscured (2.4.11)
- Dragging movements (2.5.7)
- Target size (2.5.8)
- Consistent help (3.2.6)

---

## Continuous Validation

### Automated Testing

**Run on every PR:**
```yaml
# .github/workflows/code-quality-checks.yml
- name: WCAG Accuracy Validation
  run: npx tsx wcag-validation/run-accuracy-validation.ts
```

**Blocks deployment if failing**

### Monthly Validation

**Re-run full test suite monthly:**
- Detect axe-core updates that change behavior
- Validate after configuration changes
- Track accuracy trends over time

**Scheduled Workflow:**
```yaml
on:
  schedule:
    - cron: '0 9 1 * *'  # 1st of month, 9 AM UTC
```

### Accuracy Tracking

**Create dashboard to track:**
- Precision over time
- Recall over time
- F1 score over time
- Number of test cases
- Coverage of WCAG criteria

**Tools:** Grafana, Tableau, or custom dashboard

---

## Best Practices

### Test Design

1. **One Issue Per File** - Each test focuses on a single violation type
2. **Multiple Instances** - Include 3-5 instances per violation type
3. **Clear Documentation** - Comment every violation in HTML
4. **Realistic Code** - Use real-world code patterns, not contrived examples

### Accuracy Targets

1. **Start Conservative** - Begin with 80% targets, increase over time
2. **Balance Metrics** - Don't optimize for precision at the expense of recall
3. **Context Matters** - Higher precision for user-facing tools, higher recall for internal audits

### Test Maintenance

1. **Review Quarterly** - Ensure tests still represent current best practices
2. **Update with WCAG** - Add tests for new WCAG 2.2/3.0 criteria
3. **Remove Obsolete** - Retire tests for deprecated techniques

---

## Troubleshooting

### "Validation script not found"

**Error:** `Cannot find module 'wcag-validation/run-accuracy-validation.ts'`

**Fix:**
```bash
cd packages/api
ls wcag-validation/  # Verify directory exists
```

### "Browser launch failed"

**Error:** `Failed to launch the browser process`

**Fix:**
```bash
# Install missing browser dependencies
npx puppeteer browsers install chrome
```

### "Unexpected precision/recall"

**Issue:** Metrics don't match expectations

**Debug:**
1. Review `reports/accuracy-report-{timestamp}.json`
2. Check `detailedResults` for each test case
3. Compare `expectedViolations` vs `detectedViolations`
4. Inspect `violationDetails` for what axe-core detected

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core API Documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
- [axe-core Rule Descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Precision and Recall Explained](https://en.wikipedia.org/wiki/Precision_and_recall)
- [F1 Score](https://en.wikipedia.org/wiki/F-score)

---

## Support

**Questions about validation methodology?**
- Email: engineering@wcagai.com
- Create issue: [GitHub Issues](https://github.com/aaj441/wcag-ai-platform/issues)
- Review: [SECURITY.md](../../../SECURITY.md)

---

**Last Updated:** November 17, 2025  
**Next Review:** February 17, 2026
