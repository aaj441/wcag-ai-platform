# WCAG AI Platform - Scripts

## Onboarding Script

### Quick Start

The `onboard-client.sh` script provides automated client onboarding with warranty tier selection.

**Basic Usage:**

```bash
# Set required environment variables
export CLIENT_EMAIL="client@example.com"
export COMPANY_NAME="Example Company"
export CONTACT_NAME="John Doe"
export WEBSITE_URL="https://example.com"
export TIER="pro"

# Accept legal terms (after reviewing)
export ACCEPT_TERMS="true"
export ACCEPT_PRIVACY="true"
export ACCEPT_WARRANTY="true"

# Run onboarding
./scripts/onboard-client.sh
```

**Complete Example:**

```bash
# Professional tier with all options
API_ENDPOINT="http://localhost:3002/api/onboarding/warranty" \
CLIENT_EMAIL="demo@company.com" \
COMPANY_NAME="Demo Company" \
CONTACT_NAME="Jane Smith" \
PHONE="+1-555-0123" \
WEBSITE_URL="https://democompany.com" \
ESTIMATED_PAGES="100" \
TIER="pro" \
BILLING_CYCLE="annual" \
ACCEPT_TERMS="true" \
ACCEPT_PRIVACY="true" \
ACCEPT_WARRANTY="true" \
ENABLE_DAILY_SCANS="true" \
SCAN_TIME="02:00:00" \
TIMEZONE="America/New_York" \
./scripts/onboard-client.sh
```

### Configuration Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CLIENT_EMAIL` | Client email address | `client@example.com` |
| `COMPANY_NAME` | Company name | `Example Company` |
| `CONTACT_NAME` | Primary contact name | `John Doe` |
| `WEBSITE_URL` | Website to monitor | `https://example.com` |
| `TIER` | Warranty tier | `basic`, `pro`, or `enterprise` |
| `ACCEPT_TERMS` | Accept Terms of Service | `true` |
| `ACCEPT_PRIVACY` | Accept Privacy Policy | `true` |
| `ACCEPT_WARRANTY` | Accept Warranty Terms | `true` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_ENDPOINT` | API endpoint URL | `http://localhost:3002/api/onboarding/warranty` |
| `PHONE` | Contact phone | (empty) |
| `ESTIMATED_PAGES` | Number of pages | `50` |
| `BILLING_CYCLE` | `monthly` or `annual` | `monthly` |
| `ENABLE_DAILY_SCANS` | Enable daily scanning | `true` |
| `SCAN_TIME` | Daily scan time (24h format) | `02:00:00` |
| `TIMEZONE` | Timezone for scans | `UTC` |

### Tier Selection

Choose from three warranty tiers:

**Basic ($299/month)**
- 50 pages per scan
- 30-minute SLA
- $25,000 liability coverage
- Best for small businesses

**Pro ($999/month)**
- 200 pages per scan
- 5-minute SLA
- $100,000 liability coverage
- Legal consultation (3 hours/year)
- Best for mid-size businesses

**Enterprise ($2,500/month)**
- 1,000 pages per scan
- 2-minute SLA
- $500,000 liability coverage
- Unlimited legal consultation
- Dedicated account manager
- Best for large organizations

### Output

The script generates:
1. Console output with onboarding status
2. A credentials file: `wcag-ai-credentials-YYYYMMDD-HHMMSS.txt`

**Sample Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️  WCAG AI Platform - Client Onboarding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client: Example Company
Email: client@example.com
Website: https://example.com
Tier: pro (monthly)

✓ Onboarding successful!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SUCCESS: Successfully onboarded to Professional Liability Protection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Client Details:
   Client ID: abc123...
   API Key: wcagaii_xxx...

✓ Credentials saved to: wcag-ai-credentials-20251113-042800.txt

📝 Next Steps:
   1. Setup billing
   2. Verify website ownership
   3. First scan scheduled for: 2025-11-14T02:00:00.000Z

✅ Onboarding process complete
```

### Legal Requirements

Before using this script, you MUST:

1. Review the Terms of Service
2. Review the Privacy Policy
3. Review the Warranty Terms

Only set the `ACCEPT_*` variables to `true` after reviewing the legal documents.

### Troubleshooting

**Error: Legal terms must be accepted**
- Solution: Set all three `ACCEPT_*` variables to `true` after reviewing legal documents

**Error: Missing required fields**
- Solution: Ensure all required variables are set

**Error: Invalid email address format**
- Solution: Use a valid email format (e.g., `user@domain.com`)

**Error: Invalid tier**
- Solution: Use `basic`, `pro`, or `enterprise`

**Connection refused**
- Solution: Ensure the API server is running and `API_ENDPOINT` is correct

### Requirements

- `curl` - For API requests
- `jq` (optional) - For formatted JSON output
- `bash` - Shell interpreter

### For Production Use

Update the `API_ENDPOINT` to point to your production API:

```bash
export API_ENDPOINT="https://api.wcag-ai.com/api/onboarding/warranty"
```

---

**See also:**
- [WARRANTY_ONBOARDING_GUIDE.md](../WARRANTY_ONBOARDING_GUIDE.md) - Complete documentation
- [API Documentation](https://api.wcag-ai.com/docs)
