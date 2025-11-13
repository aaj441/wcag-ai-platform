# Warranty Tier & Onboarding System

## Overview

The WCAG AI Platform now provides automated daily scanning with comprehensive liability protection through three warranty tiers. This system includes automated client onboarding, daily scan scheduling, and legal compliance features.

## Warranty Tiers

### Basic Liability Protection - $299/month

**Best for:** Small businesses and startups getting started with accessibility compliance

**Features:**
- Daily automated WCAG 2.1 AA compliance scans
- Up to 50 pages per scan
- Email notifications for critical violations
- VPAT report generation
- **$25,000 liability coverage** for ADA claims
- 30-minute scan SLA
- 48-hour support response time

**What's Covered:**
- Automated scanning identifies violations
- Coverage applies to detected and reported issues
- Email alerts for critical accessibility barriers
- Monthly VPAT documentation

**What's Not Covered:**
- Undetected violations not found by automated scanning
- Third-party content, plugins, or user-generated content
- Issues arising from client failure to implement fixes

### Professional Liability Protection - $999/month

**Best for:** Mid-size businesses with significant web traffic and compliance requirements

**Features:**
- Daily automated WCAG 2.1 AA/AAA compliance scans
- Up to 200 pages per scan
- Real-time violation alerts (email/Slack/webhook)
- Monthly VPAT reports
- **$100,000 liability coverage** for ADA claims
- **Legal consultation** included (up to 3 hours/year)
- 5-minute priority scan SLA
- Custom webhook integrations
- 4-hour support response time

**What's Covered:**
- Comprehensive automated scanning
- Quarterly manual expert reviews
- Legal consultation for accessibility questions
- Coverage for violations detected in scheduled scans
- Priority support and faster SLA

**Enhanced Protection:**
- Legal consultation hours for strategy guidance
- Faster detection and response
- Broader page coverage

### Enterprise Liability Protection - $2,500/month

**Best for:** Large enterprises, government agencies, and organizations with high compliance requirements

**Features:**
- Daily automated WCAG 2.1 AA/AAA compliance scans
- Up to 1,000 pages per scan
- Real-time violation alerts via multiple channels
- Weekly VPAT reports with consultant review
- **$500,000 liability coverage** for ADA claims
- **Unlimited legal consultation** with accessibility attorneys
- 2-minute priority scan SLA with dedicated infrastructure
- Full API access and custom integrations
- **Dedicated account manager**
- Quarterly compliance reviews
- **Expert witness support** for litigation
- 1-hour support response time (24/7)

**What's Covered:**
- Comprehensive automated scanning
- Monthly manual expert reviews by certified consultants
- Unlimited legal consultation and litigation support
- Full coverage for detected violations
- Expert witness testimony if needed
- White-glove service and support

**Enterprise Benefits:**
- Highest level of protection and support
- Proactive compliance management
- Direct access to accessibility experts
- Legal defense support

## Annual Pricing (Save Up to 2 Months)

- **Basic:** $2,990/year (save $598 - 2 months free)
- **Pro:** $9,990/year (save $1,998 - 2 months free)
- **Enterprise:** $25,000/year (save $5,000 - 2 months free)

## Onboarding API

### Quick Start

#### 1. View Available Tiers

```bash
curl https://api.wcag-ai.com/api/onboarding/tiers
```

**Response:**
```json
{
  "success": true,
  "tiers": [
    {
      "tier": "basic",
      "name": "Basic Liability Protection",
      "pricing": {
        "monthly": 29900,
        "annual": 299000,
        "monthlySavings": 59800
      },
      "features": {
        "dailyScans": true,
        "maxPages": 50,
        "sla": "30 minutes",
        "liabilityCoverage": "$25,000"
      }
    }
  ]
}
```

#### 2. Generate CLI Onboarding Script

```bash
curl -X POST https://api.wcag-ai.com/api/onboarding/cli-template/pro \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "company": "Example Corp",
    "websiteUrl": "https://example.com"
  }'
```

This generates a ready-to-use bash script for automated onboarding.

#### 3. Complete Onboarding

```bash
curl -X POST https://api.wcag-ai.com/api/onboarding/warranty \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "company": "Example Corp",
    "contactName": "John Doe",
    "phone": "+1-555-0123",
    "websiteUrl": "https://example.com",
    "estimatedPages": 100,
    "tier": "pro",
    "billingCycle": "annual",
    "acceptedTerms": true,
    "acceptedPrivacy": true,
    "acceptedWarrantyTerms": true,
    "acceptanceTimestamp": "2025-11-13T00:00:00.000Z",
    "acceptanceIpAddress": "192.0.2.1",
    "enableDailyScans": true,
    "preferredScanTime": "02:00:00",
    "timezone": "America/New_York"
  }'
```

**Response:**
```json
{
  "success": true,
  "clientId": "client-uuid",
  "apiKey": "wcagaii_your-api-key",
  "message": "Successfully onboarded to Professional Liability Protection",
  "nextSteps": {
    "setupBilling": true,
    "verifyWebsite": true,
    "scheduleFirstScan": false
  },
  "billingInfo": {
    "tier": "pro",
    "monthlyPrice": 99900,
    "annualPrice": 999000,
    "nextBillingDate": "2026-11-13T00:00:00.000Z"
  },
  "scanSchedule": {
    "id": "schedule-uuid",
    "websiteUrl": "https://example.com",
    "enabled": true,
    "scanTime": "02:00:00",
    "timezone": "America/New_York",
    "nextScanAt": "2025-11-14T02:00:00.000Z"
  }
}
```

## API Endpoints

### `GET /api/onboarding/tiers`
Get all available warranty tiers with pricing and features.

### `GET /api/onboarding/tier/:tierName`
Get detailed information for a specific tier (basic, pro, or enterprise).

**Parameters:**
- `tierName` (path): Tier identifier - `basic`, `pro`, or `enterprise`

### `GET /api/onboarding/legal`
Get all legal disclaimers and SLA terms.

**Response includes:**
- General warranty disclaimer
- Data collection policies
- Service availability SLA
- Billing terms
- Cancellation policy
- SLA credit policies

### `POST /api/onboarding/warranty`
Complete client onboarding with warranty tier selection.

**Required Fields:**
- `email` - Client email address
- `company` - Company name
- `contactName` - Primary contact name
- `websiteUrl` - Website to monitor
- `estimatedPages` - Number of pages
- `tier` - Warranty tier (basic, pro, enterprise)
- `billingCycle` - monthly or annual
- `acceptedTerms` - Must be true
- `acceptedPrivacy` - Must be true
- `acceptedWarrantyTerms` - Must be true
- `acceptanceTimestamp` - ISO timestamp
- `enableDailyScans` - Enable automated daily scanning

**Optional Fields:**
- `phone` - Contact phone number
- `acceptanceIpAddress` - Client IP for legal records
- `preferredScanTime` - Time for daily scans (default: 02:00:00)
- `timezone` - Timezone for scans (default: UTC)

### `POST /api/onboarding/validate`
Validate an onboarding request without creating a client.

### `POST /api/onboarding/cli-template/:tier`
Generate a CLI bash script template for automated onboarding.

## Daily Scanning

### How It Works

1. **Schedule Creation**: When a client onboards with `enableDailyScans: true`, a daily scan schedule is automatically created.

2. **Scan Execution**: Every day at the specified time (in the client's timezone), the system:
   - Initiates a WCAG compliance scan
   - Analyzes up to the tier's page limit
   - Detects accessibility violations
   - Generates a report

3. **Notifications**: If violations are found:
   - Email notification sent to client
   - Includes violation count and severity breakdown
   - Links to detailed report in dashboard

4. **Failure Handling**: If a scan fails:
   - System retries automatically
   - After 3 consecutive failures, schedule is disabled
   - Client receives notification to check website configuration

### Scan Statistics

Clients can view their scan history and statistics:
- Total scans performed
- Last scan date
- Violation trends over time
- Success/failure rates

## Legal Disclaimers

### General Warranty Disclaimer

This service provides automated accessibility scanning and liability protection as outlined in your selected tier. **Important limitations:**

- Automated tools cannot identify all accessibility barriers
- This service does NOT guarantee complete ADA compliance
- This service does NOT provide immunity from lawsuits
- You are responsible for implementing recommended fixes
- Coverage applies only to violations detected and reported by our system

### What's Covered

**Liability protection applies to:**
- Violations detected by automated daily scans
- Issues reported in your scan reports
- Barriers identified within your tier's page limit
- Problems found during your active subscription period

**Up to your tier's coverage limit:**
- Basic: $25,000
- Pro: $100,000
- Enterprise: $500,000

### What's NOT Covered

**Protection does NOT cover:**
- Violations not detected by our automated scanning
- Issues on pages exceeding your tier limit
- Third-party content, plugins, or widgets
- User-generated content (comments, forums, etc.)
- Problems arising after subscription cancellation
- Violations you failed to remediate after notification
- Legal fees exceeding your coverage limit

### Legal Support Tiers

**Basic Tier:**
- No legal consultation included
- Self-service resources and documentation

**Pro Tier:**
- 3 hours/year legal consultation
- Email/phone consultation with accessibility attorneys
- Guidance on remediation strategies
- Does NOT include legal representation

**Enterprise Tier:**
- Unlimited legal consultation
- Priority access to accessibility attorneys
- Expert witness support for litigation
- Does NOT include full legal representation

### Your Responsibilities

As a client, you must:
1. Implement recommended fixes within reasonable timeframes
2. Maintain an active subscription
3. Grant access for scanning your website
4. Respond to critical violation notifications
5. Keep contact information current
6. Report any site changes that may affect accessibility

### SLA Terms

**Scan Completion Times:**
- Basic: 30 minutes
- Pro: 5 minutes
- Enterprise: 2 minutes

**Uptime Guarantee:** 99.5% monthly uptime

**SLA Credits:**
- Automatic credits for scan SLA breaches (10% monthly fee per breach)
- Uptime SLA credits based on monthly availability
- Credits applied automatically to next billing cycle

## Implementation Checklist

- [x] Warranty tier definitions and pricing
- [x] Daily scan scheduler with timezone support
- [x] Onboarding API with validation
- [x] Legal disclaimers and terms
- [x] CLI template generation
- [x] API key generation
- [ ] Prisma database integration (in progress)
- [ ] Stripe billing integration (planned)
- [ ] Email notification service (planned)
- [ ] WCAG scanning engine integration (planned)
- [ ] Frontend dashboard UI (planned)

## Development Status

**Current Phase:** MVP - Core Infrastructure Complete

**Working Features:**
- ✅ Full API implementation
- ✅ Daily scan scheduling
- ✅ Tier management
- ✅ Onboarding workflow
- ✅ Validation and error handling

**Next Phase:** Production Integration
- Database persistence
- Payment processing
- Email notifications
- Actual WCAG scanning
- Client dashboard

## Support

For questions about warranty tiers and onboarding:
- Email: support@wcag-ai.com
- Documentation: https://docs.wcag-ai.com
- API Reference: https://api.wcag-ai.com

---

**Last Updated:** November 13, 2025
**Version:** 1.0.0
