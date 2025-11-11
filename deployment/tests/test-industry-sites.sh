#!/bin/bash
#
# Industry-Wide WCAG Testing Suite
# Tests sites across 10 major industries for accessibility compliance
#

set -e

API_URL="${1:-http://localhost:8080}"
OUTPUT_DIR="/tmp/industry-wcag-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
INDUSTRY_FILTER="${2:-all}"  # Optional: filter by specific industry

echo "🌐 Industry-Wide WCAG Testing Suite"
echo "===================================="
echo "API: $API_URL"
echo "Industry Filter: $INDUSTRY_FILTER"
echo "Output: $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"

# Load test configuration
INDUSTRY_CONFIG="deployment/tests/industry-sites.json"

if [ ! -f "$INDUSTRY_CONFIG" ]; then
  echo "❌ Industry configuration not found: $INDUSTRY_CONFIG"
  exit 1
fi

TOTAL_INDUSTRIES=$(jq '.industries | length' "$INDUSTRY_CONFIG")
echo "Total Industries: $TOTAL_INDUSTRIES"
echo ""

PASSED=0
FAILED=0
WARNINGS=0
TOTAL_SITES=0

# ========================================
# Test Each Industry
# ========================================

for industry_idx in $(seq 0 $((TOTAL_INDUSTRIES - 1))); do
  INDUSTRY_NAME=$(jq -r ".industries[$industry_idx].name" "$INDUSTRY_CONFIG")

  # Skip if filtering and this isn't the target industry
  if [ "$INDUSTRY_FILTER" != "all" ] && [ "$INDUSTRY_FILTER" != "$INDUSTRY_NAME" ]; then
    continue
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📁 INDUSTRY: $INDUSTRY_NAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  SITES_COUNT=$(jq ".industries[$industry_idx].sites | length" "$INDUSTRY_CONFIG")

  for site_idx in $(seq 0 $((SITES_COUNT - 1))); do
    SITE_NAME=$(jq -r ".industries[$industry_idx].sites[$site_idx].name" "$INDUSTRY_CONFIG")
    SITE_URL=$(jq -r ".industries[$industry_idx].sites[$site_idx].url" "$INDUSTRY_CONFIG")
    WCAG_LEVEL=$(jq -r ".industries[$industry_idx].sites[$site_idx].wcagLevel" "$INDUSTRY_CONFIG")

    TOTAL_SITES=$((TOTAL_SITES + 1))

    echo "🔍 Testing: $SITE_NAME"
    echo "   URL: $SITE_URL"
    echo "   Industry: $INDUSTRY_NAME"
    echo "   Target: WCAG $WCAG_LEVEL"
    echo ""

    # Create site-specific output directory
    SAFE_NAME=$(echo "${INDUSTRY_NAME}-${SITE_NAME}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -d '/')
    SITE_DIR="$OUTPUT_DIR/$SAFE_NAME"
    mkdir -p "$SITE_DIR"

    # Get critical elements for this site
    CRITICAL_ELEMENTS=$(jq -r ".industries[$industry_idx].sites[$site_idx].criticalElements | join(\", \")" "$INDUSTRY_CONFIG")
    echo "   Critical Elements: $CRITICAL_ELEMENTS"
    echo ""

    # Run WCAG scan
    echo "   Running accessibility scan..."

    SCAN_RESULT=$(curl -s -X POST "$API_URL/api/scan" \
      -H "Content-Type: application/json" \
      -d "{
        \"url\": \"$SITE_URL\",
        \"wcagLevel\": \"$WCAG_LEVEL\",
        \"includeWarnings\": true,
        \"timeout\": 60000,
        \"industry\": \"$INDUSTRY_NAME\"
      }" 2>/dev/null || echo '{"error":"API call failed"}')

    # Check if scan succeeded
    if echo "$SCAN_RESULT" | jq -e '.scanId' > /dev/null 2>&1; then
      SCAN_ID=$(echo "$SCAN_RESULT" | jq -r '.scanId')
      echo "   ✅ Scan initiated: $SCAN_ID"

      # Wait for scan to complete (polling)
      echo "   Waiting for scan to complete..."
      ATTEMPTS=0
      MAX_ATTEMPTS=20

      while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        sleep 5
        SCAN_STATUS=$(curl -s "$API_URL/api/scans/$SCAN_ID" 2>/dev/null || echo '{}')

        if echo "$SCAN_STATUS" | jq -e '.status == "completed"' > /dev/null 2>&1; then
          echo "   ✅ Scan completed"

          # Save full results
          echo "$SCAN_STATUS" | jq '.' > "$SITE_DIR/full-results.json"

          # Extract key metrics
          VIOLATIONS=$(echo "$SCAN_STATUS" | jq '.violations | length')
          WARNINGS_COUNT=$(echo "$SCAN_STATUS" | jq '.warnings | length // 0')
          COMPLIANCE_SCORE=$(echo "$SCAN_STATUS" | jq -r '.complianceScore // 0')

          echo ""
          echo "   📊 Results:"
          echo "      Violations: $VIOLATIONS"
          echo "      Warnings: $WARNINGS_COUNT"
          echo "      Compliance Score: ${COMPLIANCE_SCORE}%"

          # Categorize violations
          if [ "$VIOLATIONS" -eq 0 ]; then
            echo "      Status: ✅ PASSED"
            PASSED=$((PASSED + 1))
          elif [ "$VIOLATIONS" -lt 5 ]; then
            echo "      Status: ⚠️  MINOR ISSUES"
            WARNINGS=$((WARNINGS + 1))
          else
            echo "      Status: ❌ FAILED"
            FAILED=$((FAILED + 1))
          fi

          # Generate violation breakdown
          if [ "$VIOLATIONS" -gt 0 ]; then
            echo ""
            echo "   Top Violations:"
            echo "$SCAN_STATUS" | jq -r '.violations[:5] | .[] | "      • \(.rule): \(.message)"' 2>/dev/null || true
          fi

          # Save industry-specific metadata
          jq -n \
            --arg industry "$INDUSTRY_NAME" \
            --arg site "$SITE_NAME" \
            --arg url "$SITE_URL" \
            --arg elements "$CRITICAL_ELEMENTS" \
            --argjson violations "$VIOLATIONS" \
            --argjson score "$COMPLIANCE_SCORE" \
            '{
              industry: $industry,
              site: $site,
              url: $url,
              criticalElements: $elements,
              violations: $violations,
              complianceScore: $score,
              timestamp: now | strftime("%Y-%m-%d %H:%M:%S")
            }' > "$SITE_DIR/metadata.json"

          break
        elif echo "$SCAN_STATUS" | jq -e '.status == "failed"' > /dev/null 2>&1; then
          echo "   ❌ Scan failed"
          ERROR=$(echo "$SCAN_STATUS" | jq -r '.error // "Unknown error"')
          echo "      Error: $ERROR"
          FAILED=$((FAILED + 1))
          break
        fi

        ATTEMPTS=$((ATTEMPTS + 1))
        echo "      Still scanning... ($ATTEMPTS/$MAX_ATTEMPTS)"
      done

      if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        echo "   ⏱️  Scan timeout"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "   ❌ Scan initiation failed"
      ERROR=$(echo "$SCAN_RESULT" | jq -r '.error // "API error"')
      echo "      Error: $ERROR"
      FAILED=$((FAILED + 1))
    fi

    echo ""
    sleep 2
  done
done

# ========================================
# Generate Summary Report
# ========================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Industry-Wide WCAG Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Sites Tested: $TOTAL_SITES"
echo "Passed: $PASSED ($(echo "scale=1; ($PASSED * 100) / $TOTAL_SITES" | bc)%)"
echo "Minor Issues: $WARNINGS ($(echo "scale=1; ($WARNINGS * 100) / $TOTAL_SITES" | bc)%)"
echo "Failed: $FAILED ($(echo "scale=1; ($FAILED * 100) / $TOTAL_SITES" | bc)%)"
echo ""

# Generate detailed HTML report
cat > "$OUTPUT_DIR/industry-report.html" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Industry-Wide WCAG Test Results</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      font-size: 2.5rem;
      margin-bottom: 30px;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card h3 {
      font-size: 2.5rem;
      margin-bottom: 8px;
    }
    .stat-card p {
      color: #666;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card.passed h3 { color: #10b981; }
    .stat-card.warning h3 { color: #f59e0b; }
    .stat-card.failed h3 { color: #ef4444; }
    .industry-section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .industry-section h2 {
      color: #1a1a1a;
      font-size: 1.8rem;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 14px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tr:hover {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.passed {
      background: #d1fae5;
      color: #065f46;
    }
    .badge.warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge.failed {
      background: #fee2e2;
      color: #991b1b;
    }
    .critical-elements {
      font-size: 0.85rem;
      color: #6b7280;
      font-style: italic;
    }
    footer {
      text-align: center;
      color: white;
      margin-top: 40px;
      font-size: 0.9rem;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌐 Industry-Wide WCAG Test Results</h1>

    <div class="summary">
      <div class="stat-card">
        <h3>TOTAL_SITES_PLACEHOLDER</h3>
        <p>Sites Tested</p>
      </div>
      <div class="stat-card passed">
        <h3>PASSED_PLACEHOLDER</h3>
        <p>Passed</p>
      </div>
      <div class="stat-card warning">
        <h3>WARNINGS_PLACEHOLDER</h3>
        <p>Minor Issues</p>
      </div>
      <div class="stat-card failed">
        <h3>FAILED_PLACEHOLDER</h3>
        <p>Failed</p>
      </div>
    </div>

    INDUSTRIES_PLACEHOLDER

    <footer>
      <p>Generated: TIMESTAMP_PLACEHOLDER | WCAG AI Platform Industry Test Suite v2.0</p>
    </footer>
  </div>
</body>
</html>
HTMLEOF

# Replace placeholders
sed -i "s/TOTAL_SITES_PLACEHOLDER/$TOTAL_SITES/g" "$OUTPUT_DIR/industry-report.html"
sed -i "s/PASSED_PLACEHOLDER/$PASSED/g" "$OUTPUT_DIR/industry-report.html"
sed -i "s/WARNINGS_PLACEHOLDER/$WARNINGS/g" "$OUTPUT_DIR/industry-report.html"
sed -i "s/FAILED_PLACEHOLDER/$FAILED/g" "$OUTPUT_DIR/industry-report.html"
sed -i "s/TIMESTAMP_PLACEHOLDER/$(date -Iseconds)/g" "$OUTPUT_DIR/industry-report.html"

# Build industry sections HTML
INDUSTRIES_HTML=""
for industry_idx in $(seq 0 $((TOTAL_INDUSTRIES - 1))); do
  INDUSTRY_NAME=$(jq -r ".industries[$industry_idx].name" "$INDUSTRY_CONFIG")

  if [ "$INDUSTRY_FILTER" != "all" ] && [ "$INDUSTRY_FILTER" != "$INDUSTRY_NAME" ]; then
    continue
  fi

  INDUSTRIES_HTML+="<div class=\"industry-section\"><h2>$INDUSTRY_NAME</h2><table><thead><tr><th>Site</th><th>Critical Elements</th><th>Violations</th><th>Score</th><th>Status</th></tr></thead><tbody>"

  SITES_COUNT=$(jq ".industries[$industry_idx].sites | length" "$INDUSTRY_CONFIG")

  for site_idx in $(seq 0 $((SITES_COUNT - 1))); do
    SITE_NAME=$(jq -r ".industries[$industry_idx].sites[$site_idx].name" "$INDUSTRY_CONFIG")
    SAFE_NAME=$(echo "${INDUSTRY_NAME}-${SITE_NAME}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | tr -d '/')
    SITE_DIR="$OUTPUT_DIR/$SAFE_NAME"

    if [ -f "$SITE_DIR/metadata.json" ]; then
      VIOLATIONS=$(jq -r '.violations' "$SITE_DIR/metadata.json")
      SCORE=$(jq -r '.complianceScore' "$SITE_DIR/metadata.json")
      ELEMENTS=$(jq -r '.criticalElements' "$SITE_DIR/metadata.json")

      if [ "$VIOLATIONS" -eq 0 ]; then
        STATUS="<span class='badge passed'>✅ PASSED</span>"
      elif [ "$VIOLATIONS" -lt 5 ]; then
        STATUS="<span class='badge warning'>⚠️  MINOR</span>"
      else
        STATUS="<span class='badge failed'>❌ FAILED</span>"
      fi

      INDUSTRIES_HTML+="<tr><td><strong>$SITE_NAME</strong></td><td class='critical-elements'>$ELEMENTS</td><td>$VIOLATIONS</td><td>${SCORE}%</td><td>$STATUS</td></tr>"
    fi
  done

  INDUSTRIES_HTML+="</tbody></table></div>"
done

# Insert industries HTML
sed -i "s|INDUSTRIES_PLACEHOLDER|$INDUSTRIES_HTML|g" "$OUTPUT_DIR/industry-report.html"

echo "📄 HTML report generated: $OUTPUT_DIR/industry-report.html"
echo ""

# ========================================
# Exit Code
# ========================================

if [ $FAILED -eq 0 ]; then
  echo "✅ All sites passed or have only minor issues!"
  exit 0
else
  echo "❌ $FAILED site(s) failed accessibility tests"
  echo "Review detailed results in: $OUTPUT_DIR"
  exit 1
fi
