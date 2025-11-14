#!/bin/bash

################################################################################
# Example: Complete Client Workflow
# Demonstrates the full client lifecycle from onboarding to reporting
################################################################################

set -e

API_URL="http://localhost:3001"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 WCAGAI Client Workflow Demo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Onboard a new client
echo "📝 Step 1: Onboarding client..."
CLIENT_RESPONSE=$(curl -s -X POST "$API_URL/api/clients/onboard" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "company": "Demo Corporation",
    "tier": "pro"
  }')

CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.data.id')
echo "✅ Client onboarded: $CLIENT_ID"
echo ""

# Step 2: Register a scan for SLA tracking
echo "🔍 Step 2: Registering scan for SLA tracking..."
SCAN_ID="scan-$(date +%s)"
curl -s -X POST "$API_URL/api/sla/scan/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$SCAN_ID\",
    \"url\": \"https://democorp.com\",
    \"tier\": \"pro\",
    \"customerId\": \"$CLIENT_ID\"
  }" | jq .
echo ""

# Step 3: Simulate scan completion
echo "✅ Step 3: Completing scan..."
sleep 2
curl -s -X POST "$API_URL/api/sla/scan/$SCAN_ID/complete" | jq .
echo ""

# Step 4: Generate a proposal
echo "📄 Step 4: Generating proposal..."
curl -s -X POST "$API_URL/api/proposals/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Demo Corporation",
    "url": "https://democorp.com",
    "violationCount": 18,
    "criticalViolations": 3,
    "userImpact": 25000,
    "format": "markdown"
  }' > /tmp/proposal-demo.md

echo "✅ Proposal saved to /tmp/proposal-demo.md"
echo "Preview (first 20 lines):"
head -20 /tmp/proposal-demo.md
echo ""

# Step 5: Get SLA statistics
echo "📊 Step 5: Checking SLA compliance..."
curl -s "$API_URL/api/sla/statistics" | jq .
echo ""

# Step 6: Get SLA report for last hour
echo "📈 Step 6: Getting SLA report..."
curl -s "$API_URL/api/sla/report?hours=1" | jq .
echo ""

# Step 7: Get client information
echo "👤 Step 7: Retrieving client information..."
curl -s "$API_URL/api/clients/$CLIENT_ID" | jq .
echo ""

# Step 8: Update client scan count
echo "🔄 Step 8: Updating client scan count..."
curl -s -X PATCH "$API_URL/api/clients/$CLIENT_ID/scans" \
  -H "Content-Type: application/json" \
  -d '{"scansRemaining": 9}' | jq .
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Demo Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo "  ✅ Client onboarded"
echo "  ✅ Scan tracked via SLA monitoring"
echo "  ✅ Proposal generated"
echo "  ✅ SLA statistics retrieved"
echo "  ✅ Client information updated"
echo ""
echo "💡 Next Steps:"
echo "  1. Integrate Stripe for real billing"
echo "  2. Add Clerk for authentication"
echo "  3. Connect to production scanner"
echo "  4. Deploy marketing site"
echo ""
