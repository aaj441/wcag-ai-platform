#!/bin/bash
#
# Music Sites WCAG Testing Suite
# Tests popular music streaming sites for accessibility compliance
#

set -e

API_URL="${1:-http://localhost:8080}"
OUTPUT_DIR="/tmp/music-sites-wcag-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🎵 Music Sites WCAG Testing Suite"
echo "=================================="
echo "API: $API_URL"
echo "Output: $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"

# Load test configuration
MUSIC_SITES_JSON="deployment/tests/music-sites.json"

if [ ! -f "$MUSIC_SITES_JSON" ]; then
  echo "❌ Music sites configuration not found: $MUSIC_SITES_JSON"
  exit 1
fi

TOTAL_SITES=$(jq '.musicSites | length' "$MUSIC_SITES_JSON")
echo "Testing $TOTAL_SITES music sites..."
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# ========================================
# Test Each Music Site
# ========================================

for i in $(seq 0 $((TOTAL_SITES - 1))); do
  SITE_NAME=$(jq -r ".musicSites[$i].name" "$MUSIC_SITES_JSON")
  SITE_URL=$(jq -r ".musicSites[$i].url" "$MUSIC_SITES_JSON")
  CATEGORY=$(jq -r ".musicSites[$i].category" "$MUSIC_SITES_JSON")
  WCAG_LEVEL=$(jq -r ".musicSites[$i].wcagLevel" "$MUSIC_SITES_JSON")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎵 Testing: $SITE_NAME"
  echo "   URL: $SITE_URL"
  echo "   Category: $CATEGORY"
  echo "   Target: WCAG $WCAG_LEVEL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Create site-specific output directory
  SITE_DIR="$OUTPUT_DIR/$(echo "$SITE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
  mkdir -p "$SITE_DIR"

  # Run WCAG scan
  echo "Running accessibility scan..."

  SCAN_RESULT=$(curl -s -X POST "$API_URL/api/scan" \
    -H "Content-Type: application/json" \
    -d "{
      \"url\": \"$SITE_URL\",
      \"wcagLevel\": \"$WCAG_LEVEL\",
      \"includeWarnings\": true,
      \"timeout\": 60000
    }" 2>/dev/null || echo '{"error":"API call failed"}')

  # Check if scan succeeded
  if echo "$SCAN_RESULT" | jq -e '.scanId' > /dev/null 2>&1; then
    SCAN_ID=$(echo "$SCAN_RESULT" | jq -r '.scanId')
    echo "✅ Scan initiated: $SCAN_ID"

    # Wait for scan to complete (polling)
    echo "Waiting for scan to complete..."
    ATTEMPTS=0
    MAX_ATTEMPTS=20

    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
      sleep 5
      SCAN_STATUS=$(curl -s "$API_URL/api/scans/$SCAN_ID" 2>/dev/null || echo '{}')

      if echo "$SCAN_STATUS" | jq -e '.status == "completed"' > /dev/null 2>&1; then
        echo "✅ Scan completed"

        # Save full results
        echo "$SCAN_STATUS" | jq '.' > "$SITE_DIR/full-results.json"

        # Extract key metrics
        VIOLATIONS=$(echo "$SCAN_STATUS" | jq '.violations | length')
        WARNINGS=$(echo "$SCAN_STATUS" | jq '.warnings | length // 0')
        COMPLIANCE_SCORE=$(echo "$SCAN_STATUS" | jq -r '.complianceScore // 0')

        echo ""
        echo "📊 Results:"
        echo "   Violations: $VIOLATIONS"
        echo "   Warnings: $WARNINGS"
        echo "   Compliance Score: ${COMPLIANCE_SCORE}%"

        # Categorize violations
        if [ "$VIOLATIONS" -eq 0 ]; then
          echo "   Status: ✅ PASSED"
          PASSED=$((PASSED + 1))
        elif [ "$VIOLATIONS" -lt 5 ]; then
          echo "   Status: ⚠️  MINOR ISSUES"
          WARNINGS=$((WARNINGS + 1))
        else
          echo "   Status: ❌ FAILED"
          FAILED=$((FAILED + 1))
        fi

        # Generate violation breakdown
        if [ "$VIOLATIONS" -gt 0 ]; then
          echo ""
          echo "Top Violations:"
          echo "$SCAN_STATUS" | jq -r '.violations[:5] | .[] | "   • \(.rule): \(.message)"' 2>/dev/null || true
        fi

        break
      elif echo "$SCAN_STATUS" | jq -e '.status == "failed"' > /dev/null 2>&1; then
        echo "❌ Scan failed"
        ERROR=$(echo "$SCAN_STATUS" | jq -r '.error // "Unknown error"')
        echo "   Error: $ERROR"
        FAILED=$((FAILED + 1))
        break
      fi

      ATTEMPTS=$((ATTEMPTS + 1))
      echo "   Still scanning... ($ATTEMPTS/$MAX_ATTEMPTS)"
    done

    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
      echo "⏱️  Scan timeout"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "❌ Scan initiation failed"
    ERROR=$(echo "$SCAN_RESULT" | jq -r '.error // "API error"')
    echo "   Error: $ERROR"
    FAILED=$((FAILED + 1))
  fi

  echo ""
  sleep 2
done

# ========================================
# Generate Summary Report
# ========================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Music Sites WCAG Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Sites Tested: $TOTAL_SITES"
echo "Passed: $PASSED"
echo "Minor Issues: $WARNINGS"
echo "Failed: $FAILED"
echo ""

PASS_RATE=$(echo "scale=1; ($PASSED / $TOTAL_SITES) * 100" | bc)
echo "Pass Rate: ${PASS_RATE}%"
echo ""

# Generate detailed HTML report
cat > "$OUTPUT_DIR/summary.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Music Sites WCAG Test Results</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 10px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat {
      display: inline-block;
      margin-right: 30px;
      font-size: 18px;
    }
    .stat strong {
      font-size: 24px;
      display: block;
    }
    .passed { color: #28a745; }
    .warning { color: #ffc107; }
    .failed { color: #dc3545; }
    table {
      width: 100%;
      background: white;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }
    th {
      background: #0066cc;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.passed {
      background: #d4edda;
      color: #155724;
    }
    .badge.warning {
      background: #fff3cd;
      color: #856404;
    }
    .badge.failed {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <h1>🎵 Music Sites WCAG Test Results</h1>

  <div class="summary">
    <h2>Summary</h2>
    <div class="stat">
      <strong class="passed">$PASSED</strong>
      Passed
    </div>
    <div class="stat">
      <strong class="warning">$WARNINGS</strong>
      Minor Issues
    </div>
    <div class="stat">
      <strong class="failed">$FAILED</strong>
      Failed
    </div>
    <div class="stat">
      <strong>${PASS_RATE}%</strong>
      Pass Rate
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Site Name</th>
        <th>Category</th>
        <th>Violations</th>
        <th>Compliance Score</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
EOF

# Add results for each site
for i in $(seq 0 $((TOTAL_SITES - 1))); do
  SITE_NAME=$(jq -r ".musicSites[$i].name" "$MUSIC_SITES_JSON")
  CATEGORY=$(jq -r ".musicSites[$i].category" "$MUSIC_SITES_JSON")
  SITE_DIR="$OUTPUT_DIR/$(echo "$SITE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"

  if [ -f "$SITE_DIR/full-results.json" ]; then
    VIOLATIONS=$(jq '.violations | length' "$SITE_DIR/full-results.json")
    SCORE=$(jq -r '.complianceScore // 0' "$SITE_DIR/full-results.json")

    if [ "$VIOLATIONS" -eq 0 ]; then
      STATUS="<span class='badge passed'>✅ PASSED</span>"
    elif [ "$VIOLATIONS" -lt 5 ]; then
      STATUS="<span class='badge warning'>⚠️  MINOR</span>"
    else
      STATUS="<span class='badge failed'>❌ FAILED</span>"
    fi

    cat >> "$OUTPUT_DIR/summary.html" <<EOF
      <tr>
        <td>$SITE_NAME</td>
        <td>$CATEGORY</td>
        <td>$VIOLATIONS</td>
        <td>${SCORE}%</td>
        <td>$STATUS</td>
      </tr>
EOF
  fi
done

cat >> "$OUTPUT_DIR/summary.html" <<EOF
    </tbody>
  </table>

  <p style="margin-top: 30px; color: #666; font-size: 14px;">
    Generated: $(date -Iseconds) | Test Suite: Music Sites WCAG v1.0
  </p>
</body>
</html>
EOF

echo "📄 HTML report generated: $OUTPUT_DIR/summary.html"
echo ""

# ========================================
# Exit Code
# ========================================

if [ $FAILED -eq 0 ]; then
  echo "✅ All music sites passed or have only minor issues!"
  exit 0
else
  echo "❌ $FAILED site(s) failed accessibility tests"
  echo "Review detailed results in: $OUTPUT_DIR"
  exit 1
fi
