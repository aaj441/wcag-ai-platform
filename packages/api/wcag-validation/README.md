# WCAG Accuracy Validation Suite

**Production-quality validation framework for WCAG accessibility scanners**

## Quick Start

```bash
# Run full validation suite
npx tsx wcag-validation/run-accuracy-validation.ts

# Expected output: Precision, Recall, F1 Score
# Target: ≥90% precision, ≥85% recall, ≥87.5% F1
```

## What This Does

1. **Scans test HTML files** with known WCAG violations and compliant code
2. **Compares results** to expected outcomes
3. **Calculates accuracy metrics:**
   - **Precision:** How many detected violations are real?
   - **Recall:** How many real violations did we catch?
   - **F1 Score:** Balanced performance metric
4. **Generates reports** with actionable recommendations
5. **Passes/fails** based on accuracy targets

## Directory Structure

```
wcag-validation/
├── test-cases/
│   ├── violations/          # HTML files with WCAG violations
│   │   ├── missing-alt-text.html
│   │   ├── insufficient-color-contrast.html
│   │   ├── missing-form-labels.html
│   │   ├── broken-heading-hierarchy.html
│   │   └── missing-keyboard-access.html
│   └── compliant/           # HTML files demonstrating compliance
│       ├── proper-alt-text.html
│       ├── sufficient-color-contrast.html
│       └── proper-form-labels.html
├── reports/                 # Generated accuracy reports
│   ├── accuracy-report-{timestamp}.json
│   └── accuracy-summary-{timestamp}.md
├── test-manifest.json       # Test case metadata and targets
├── run-accuracy-validation.ts  # Main validation framework
├── METHODOLOGY.md           # Comprehensive methodology documentation
└── README.md                # This file
```

## Test Cases

### Violations (5 test cases, 26 expected violations)

| Test ID | File | WCAG Criteria | Expected Violations |
|---------|------|---------------|---------------------|
| V001 | missing-alt-text.html | 1.1.1 (Level A) | 5 |
| V002 | insufficient-color-contrast.html | 1.4.3 (Level AA) | 5 |
| V003 | missing-form-labels.html | 1.3.1, 3.3.2 (Level A) | 6 |
| V004 | broken-heading-hierarchy.html | 1.3.1, 2.4.6 (Level AA) | 5 |
| V005 | missing-keyboard-access.html | 2.1.1, 2.1.2 (Level A) | 5 |

### Compliant (3 test cases, 0 expected violations)

| Test ID | File | WCAG Criteria | Expected Violations |
|---------|------|---------------|---------------------|
| C001 | proper-alt-text.html | 1.1.1 (Level A) | 0 |
| C002 | sufficient-color-contrast.html | 1.4.3 (Level AA) | 0 |
| C003 | proper-form-labels.html | 1.3.1, 3.3.2 (Level A) | 0 |

**Total:** 8 test cases covering 7 unique WCAG success criteria

## Accuracy Targets

| Metric | Target | Why? |
|--------|--------|------|
| **Precision** | ≥90% | High trust in results, few false positives |
| **Recall** | ≥85% | Comprehensive scanning, catch most violations |
| **F1 Score** | ≥87.5% | Balanced performance |

## Understanding Results

### Example Output

```
📈 ACCURACY METRICS
Precision:  95.00% (target: 90.00%)  ✅
Recall:     92.00% (target: 85.00%)  ✅
F1 Score:   93.48% (target: 87.50%)  ✅
Accuracy:   94.00%

Confusion Matrix:
  True Positives:  24
  False Positives: 1
  False Negatives: 2
  True Negatives:  3

✅ VALIDATION PASSED
   All accuracy targets met
   Scanner is production-ready
```

### Interpreting Metrics

**High Precision (95%):**
- Of 25 violations detected, 24 were real
- Only 1 false positive (compliant code flagged as violation)
- Users can trust scan results

**High Recall (92%):**
- Of 26 actual violations, we detected 24
- Missed only 2 violations
- Comprehensive coverage

**High F1 (93.48%):**
- Well-balanced performance
- No trade-off between precision and recall

## Adding New Tests

### 1. Create HTML Test File

```bash
# For violation tests
cat > test-cases/violations/your-test.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <title>WCAG Violation: [Issue Name]</title>
</head>
<body>
    <h1>Test: [Issue Name]</h1>
    
    <!-- VIOLATION 1: Description -->
    <div>Code with violation</div>
    
    <footer>
        <p>Expected violations: X</p>
        <p>WCAG Criteria: X.X.X (Level A/AA)</p>
    </footer>
</body>
</html>
HTML
```

### 2. Update test-manifest.json

```json
{
  "violations": [
    {
      "id": "V006",
      "file": "violations/your-test.html",
      "name": "Your Test Name",
      "wcagCriteria": ["X.X.X"],
      "level": "A",
      "expectedViolations": 3,
      "violationTypes": ["axe-rule-id"],
      "description": "What this validates"
    }
  ]
}
```

### 3. Run Validation

```bash
npx tsx wcag-validation/run-accuracy-validation.ts
```

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: WCAG Accuracy Validation
  working-directory: packages/api
  run: npx tsx wcag-validation/run-accuracy-validation.ts
```

Blocks deployment if accuracy targets not met.

## Roadmap

**Current:** 8 test cases  
**Target:** 100+ test cases covering all WCAG 2.1 Level A/AA criteria

**Upcoming Test Cases:**
- Focus visible (2.4.7)
- Language of page (3.1.1)
- Link purpose (2.4.4)
- Parsing (4.1.1)
- Name, role, value (4.1.2)
- Resize text (1.4.4)
- Images of text (1.4.5)
- Multiple ways (2.4.5)
- Consistent navigation (3.2.3)
- Error identification (3.3.1)

## Documentation

- **[METHODOLOGY.md](./METHODOLOGY.md)** - Complete validation methodology
- **[test-manifest.json](./test-manifest.json)** - Test case registry
- **[Test Cases](./test-cases/)** - HTML test files

## Support

**Questions?**
- Review: [METHODOLOGY.md](./METHODOLOGY.md)
- Email: engineering@wcagai.com
- Issues: [GitHub Issues](https://github.com/aaj441/wcag-ai-platform/issues)

---

**Version:** 1.0.0  
**Last Updated:** November 17, 2025  
**Accuracy Targets:** 90% precision, 85% recall, 87.5% F1
