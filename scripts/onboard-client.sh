#!/bin/bash
# WCAG AI Platform - Sample Onboarding Script
# This script demonstrates automated client onboarding

set -e

# =============================================================================
# CONFIGURATION - Update these values for your client
# =============================================================================

# API Configuration
API_ENDPOINT="${API_ENDPOINT:-http://localhost:3002/api/onboarding/warranty}"

# Client Information
CLIENT_EMAIL="${CLIENT_EMAIL:-client@example.com}"
COMPANY_NAME="${COMPANY_NAME:-Example Company}"
CONTACT_NAME="${CONTACT_NAME:-John Doe}"
PHONE="${PHONE:-}"

# Website Details
WEBSITE_URL="${WEBSITE_URL:-https://example.com}"
ESTIMATED_PAGES="${ESTIMATED_PAGES:-50}"

# Tier Selection (basic, pro, enterprise)
TIER="${TIER:-basic}"
BILLING_CYCLE="${BILLING_CYCLE:-monthly}"

# Legal Acceptance (MUST BE EXPLICITLY SET TO true)
ACCEPT_TERMS="${ACCEPT_TERMS:-false}"
ACCEPT_PRIVACY="${ACCEPT_PRIVACY:-false}"
ACCEPT_WARRANTY="${ACCEPT_WARRANTY:-false}"

# Scanning Preferences
ENABLE_DAILY_SCANS="${ENABLE_DAILY_SCANS:-true}"
SCAN_TIME="${SCAN_TIME:-02:00:00}"
TIMEZONE="${TIMEZONE:-UTC}"

# =============================================================================
# VALIDATION
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏛️  WCAG AI Platform - Client Onboarding"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Client: $COMPANY_NAME"
echo "Email: $CLIENT_EMAIL"
echo "Website: $WEBSITE_URL"
echo "Tier: $TIER ($BILLING_CYCLE)"
echo ""

# Check legal acceptance
if [ "$ACCEPT_TERMS" != "true" ] || [ "$ACCEPT_PRIVACY" != "true" ] || [ "$ACCEPT_WARRANTY" != "true" ]; then
  echo "❌ ERROR: Legal terms must be accepted before onboarding"
  echo ""
  echo "Please review the legal documents at:"
  echo "  Terms of Service: https://wcag-ai.com/legal/terms"
  echo "  Privacy Policy: https://wcag-ai.com/legal/privacy"
  echo "  Warranty Terms: https://wcag-ai.com/legal/warranty"
  echo ""
  echo "After reviewing, set the following variables to 'true':"
  echo "  ACCEPT_TERMS=true"
  echo "  ACCEPT_PRIVACY=true"
  echo "  ACCEPT_WARRANTY=true"
  echo ""
  exit 1
fi

# Check required fields
if [ -z "$CLIENT_EMAIL" ] || [ -z "$COMPANY_NAME" ] || [ -z "$CONTACT_NAME" ] || [ -z "$WEBSITE_URL" ]; then
  echo "❌ ERROR: Missing required fields"
  echo "Required: CLIENT_EMAIL, COMPANY_NAME, CONTACT_NAME, WEBSITE_URL"
  exit 1
fi

# =============================================================================
# TIER INFORMATION
# =============================================================================

echo "📋 Retrieving tier information..."
TIER_INFO=$(curl -s "${API_ENDPOINT%/warranty}/tier/$TIER")

if [ $? -eq 0 ]; then
  echo "✓ Tier information retrieved"
  echo ""
  echo "Selected Tier: $TIER"
  
  # Extract pricing (requires jq)
  if command -v jq &> /dev/null; then
    MONTHLY_PRICE=$(echo "$TIER_INFO" | jq -r '.tier.pricing.monthly.formatted')
    ANNUAL_PRICE=$(echo "$TIER_INFO" | jq -r '.tier.pricing.annual.formatted')
    SAVINGS=$(echo "$TIER_INFO" | jq -r '.tier.pricing.annual.savingsFormatted')
    
    echo "  Monthly: $MONTHLY_PRICE"
    echo "  Annual: $ANNUAL_PRICE (save $SAVINGS)"
    echo ""
  fi
else
  echo "⚠️  Warning: Could not retrieve tier information"
  echo ""
fi

# =============================================================================
# ONBOARDING REQUEST
# =============================================================================

echo "📤 Sending onboarding request..."

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Build JSON payload
PAYLOAD=$(cat <<EOF
{
  "email": "$CLIENT_EMAIL",
  "company": "$COMPANY_NAME",
  "contactName": "$CONTACT_NAME",
  "phone": "$PHONE",
  "websiteUrl": "$WEBSITE_URL",
  "estimatedPages": $ESTIMATED_PAGES,
  "tier": "$TIER",
  "billingCycle": "$BILLING_CYCLE",
  "acceptedTerms": $ACCEPT_TERMS,
  "acceptedPrivacy": $ACCEPT_PRIVACY,
  "acceptedWarrantyTerms": $ACCEPT_WARRANTY,
  "acceptanceTimestamp": "$TIMESTAMP",
  "enableDailyScans": $ENABLE_DAILY_SCANS,
  "preferredScanTime": "$SCAN_TIME",
  "timezone": "$TIMEZONE"
}
EOF
)

# Send request
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# =============================================================================
# PROCESS RESPONSE
# =============================================================================

if command -v jq &> /dev/null; then
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    echo "✓ Onboarding successful!"
    echo ""
    
    # Extract key information
    CLIENT_ID=$(echo "$RESPONSE" | jq -r '.clientId')
    API_KEY=$(echo "$RESPONSE" | jq -r '.apiKey')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 SUCCESS: $MESSAGE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Client Details:"
    echo "   Client ID: $CLIENT_ID"
    echo "   API Key: $API_KEY"
    echo ""
    
    # Save credentials to file
    CREDS_FILE="wcag-ai-credentials-$(date +%Y%m%d-%H%M%S).txt"
    cat > "$CREDS_FILE" <<CREDS
WCAG AI Platform - Client Credentials
Generated: $(date)

Client ID: $CLIENT_ID
API Key: $API_KEY
Company: $COMPANY_NAME
Email: $CLIENT_EMAIL
Tier: $TIER
Website: $WEBSITE_URL

IMPORTANT: Keep this file secure and do not share your API key.

Next Steps:
1. Set up billing in the dashboard
2. Verify website ownership
3. Review your first scan report

Dashboard: https://dashboard.wcag-ai.com
Documentation: https://docs.wcag-ai.com
CREDS
    
    echo "✓ Credentials saved to: $CREDS_FILE"
    echo ""
    
    # Show next steps
    echo "📝 Next Steps:"
    SETUP_BILLING=$(echo "$RESPONSE" | jq -r '.nextSteps.setupBilling')
    VERIFY_WEBSITE=$(echo "$RESPONSE" | jq -r '.nextSteps.verifyWebsite')
    if [ "$SETUP_BILLING" = "true" ]; then
      echo "   1. Setup billing: Required"
    else
      echo "   1. Setup billing: Completed"
    fi
    if [ "$VERIFY_WEBSITE" = "true" ]; then
      echo "   2. Verify website ownership: Required"
    else
      echo "   2. Website ownership: Verified"
    fi
    if [ "$ENABLE_DAILY_SCANS" = "true" ]; then
      NEXT_SCAN=$(echo "$RESPONSE" | jq -r '.scanSchedule.nextScanAt')
      echo "   3. First scan scheduled for: $NEXT_SCAN"
    else
      echo "   3. Schedule your first scan"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo "❌ Onboarding failed: $ERROR"
    echo ""
    echo "Full response:"
    echo "$RESPONSE" | jq .
    exit 1
  fi
else
  # No jq, show raw response
  echo ""
  echo "Response:"
  echo "$RESPONSE"
  echo ""
  echo "Note: Install 'jq' for formatted output"
fi

echo ""
echo "✅ Onboarding process complete"
