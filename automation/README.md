# Automation Scripts
## WCAG AI Platform - Automated Workflows

This directory contains automation scripts for the multi-platform business operations.

## Available Scripts

### 1. Insurance Lead Import (`insurance_lead_import.py`)
**Purpose**: HIPAA-compliant import and processing of health insurance leads

**Features**:
- Multi-source support (Facebook Lead Ads, CSV, Third-party APIs)
- HIPAA-compliant encryption for sensitive data
- Comprehensive audit logging
- Automatic deduplication
- PostgreSQL storage with S3 archiving

**Usage**:
```bash
# Import from Facebook
python insurance_lead_import.py --source facebook --date 2025-11-14

# Import from CSV
python insurance_lead_import.py --source csv --file leads.csv

# Import from API
python insurance_lead_import.py --source api --batch-id 12345
```

**Requirements**:
```bash
pip install boto3 cryptography pandas psycopg2-binary requests
```

**Environment Variables**:
- `HIPAA_ENCRYPTION_KEY`: 256-bit encryption key for HIPAA data
- `DATABASE_URL`: PostgreSQL connection string
- `INSURANCE_LEADS_BUCKET`: S3 bucket for lead archiving
- `FACEBOOK_LEADS_ACCESS_TOKEN`: Facebook API token
- `FACEBOOK_LEADS_PAGE_ID`: Facebook page ID
- `AGED_LEADS_API_KEY`: Third-party lead provider API key

---

### 2. AI Email Generator (`ai_email_generator.js`)
**Purpose**: Generate personalized, professional outreach emails using Claude AI

**Features**:
- Multiple email templates (discovery, follow-up, proposal, case study)
- AI-powered personalization
- Quick accessibility scanning for prospects
- Industry-specific insights
- Batch processing support

**Usage**:
```bash
# Single prospect
node ai_email_generator.js --prospect prospect.json --template discovery

# Batch processing
node ai_email_generator.js --prospect prospects-list.json --template follow-up
```

**Prospect JSON Format**:
```json
{
  "company": "Acme Corp",
  "contactName": "John Smith",
  "contactTitle": "CTO",
  "email": "john@acme.com",
  "industry": "ecommerce",
  "website": "https://acme.com"
}
```

**Templates**:
- `discovery`: Initial cold outreach
- `followUp`: Follow-up after initial contact
- `proposal`: Accompanying audit proposal
- `caseStudy`: Share relevant success story

**Requirements**:
```bash
npm install @anthropic-ai/sdk axios dotenv
```

**Environment Variables**:
- `ANTHROPIC_API_KEY`: Claude API key
- `ANTHROPIC_MODEL`: AI model (default: claude-3-sonnet-20240229)
- `EMAIL_OUTPUT_DIR`: Output directory for generated emails

---

### 3. Music Metadata Sync (`music_metadata_sync.py`)
**Purpose**: Synchronize music metadata across streaming platforms

**Features**:
- Multi-platform support (Spotify, Last.fm, Apple Music, SoundCloud)
- AI-generated accessible descriptions
- Automatic metadata merging
- Real-time popularity tracking
- Genre and tag aggregation

**Usage**:
```bash
# Sync artist metadata
python music_metadata_sync.py --artist "Artist Name" --output metadata.json

# With accessible descriptions
python music_metadata_sync.py --artist "Artist Name" --generate-accessible-descriptions
```

**Output Format**:
```json
{
  "artist_name": "Artist Name",
  "platforms": {
    "spotify": { "..." },
    "lastfm": { "..." }
  },
  "combined": {
    "genres": ["rock", "indie"],
    "popularity_score": 75,
    "total_listeners": 1000000
  },
  "accessible_description": "AI-generated screen reader friendly description",
  "synced_at": "2025-11-14T17:00:00Z"
}
```

**Requirements**:
```bash
pip install spotipy requests anthropic
```

**Environment Variables**:
- `SPOTIFY_CLIENT_ID`: Spotify API client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify API secret
- `LASTFM_API_KEY`: Last.fm API key
- `ANTHROPIC_API_KEY`: Claude API key (for descriptions)

---

### 4. VPAT Generator (`vpat_generator.js`)
**Purpose**: Generate legal-compliant VPAT (Voluntary Product Accessibility Template) reports

**Features**:
- VPAT 2.4 compliant (Revised Section 508 / WCAG 2.1)
- Automatic WCAG criteria mapping
- HTML and PDF output
- Comprehensive coverage tables
- Legal disclaimers included

**Usage**:
```bash
# Generate HTML VPAT
node vpat_generator.js --scan scan-results.json --output vpat-report.html

# Generate PDF VPAT
node vpat_generator.js --scan scan-results.json --output vpat-report.pdf --format pdf
```

**Scan Results Format**:
```json
{
  "websiteUrl": "https://example.com",
  "violations": [
    {
      "wcagCriteria": "1.4.3",
      "severity": "high",
      "description": "Insufficient color contrast"
    }
  ]
}
```

**Requirements**:
```bash
npm install handlebars puppeteer
```

**Output**: Professional VPAT report with:
- Product information
- Evaluation methods
- WCAG 2.1 Level A/AA conformance tables
- Detailed remarks for each criterion
- Legal disclaimers

---

## Installation

### Python Scripts
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Node.js Scripts
```bash
# Install dependencies
npm install
```

## Configuration

### Create `.env` file
```bash
cp ../config/.env.example .env
# Edit .env with your API keys
```

### Set up AWS Secrets Manager (Production)
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name wcag-platform-secrets \
  --secret-string file://secrets.json
```

## Scheduling

### Cron Jobs (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Daily insurance lead import at 8 AM
0 8 * * * cd /path/to/automation && python insurance_lead_import.py --source facebook --date $(date +\%Y-\%m-\%d)

# Weekly music metadata sync on Sundays at 2 AM
0 2 * * 0 cd /path/to/automation && python music_metadata_sync.py --artist "Artist Name"
```

### Windows Task Scheduler
```powershell
# Create scheduled task
schtasks /create /tn "Insurance Lead Import" /tr "python C:\path\to\insurance_lead_import.py" /sc daily /st 08:00
```

### CI/CD Integration (GitHub Actions)
```yaml
# .github/workflows/automation.yml
name: Run Automation Scripts
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM UTC
jobs:
  insurance-leads:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: python automation/insurance_lead_import.py --source api
```

## Monitoring & Logging

### Log Files
- Insurance: `/tmp/insurance_lead_import.log`
- Audit: `/tmp/insurance_lead_audit.jsonl`
- Email Generation: `/tmp/generated-emails/`
- Music Sync: Standard output

### Alerts
Set up monitoring for:
- Failed lead imports
- API rate limit errors
- Encryption failures
- Database connection issues

### Slack Notifications
```javascript
// Add to scripts for Slack alerts
const axios = require('axios');

async function notifySlack(message) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `[Automation] ${message}`
  });
}
```

## Security Best Practices

1. **Never commit API keys**: Use environment variables or secrets manager
2. **Encrypt sensitive data**: Use HIPAA_ENCRYPTION_KEY for insurance data
3. **Rotate keys regularly**: Quarterly minimum for production
4. **Audit access**: Review `/tmp/insurance_lead_audit.jsonl` regularly
5. **Limit permissions**: Use least-privilege AWS IAM roles
6. **Monitor costs**: Track AI API usage to avoid unexpected bills

## Testing

### Run Tests
```bash
# Test insurance import with sample data
python insurance_lead_import.py --source csv --file test-leads.csv

# Test email generation with mock prospect
node ai_email_generator.js --prospect test-prospect.json --template discovery

# Test VPAT generation
node vpat_generator.js --scan test-scan.json --output test-vpat.html
```

### Sample Test Data
See `/tests/fixtures/` for sample data files.

## Cost Estimates

### AI API Usage (Monthly)
| Script | API Calls | Cost per Call | Monthly Cost |
|--------|-----------|---------------|--------------|
| Email Generator | 100 emails | $0.01-0.03 | $1-$3 |
| Music Metadata | 50 artists | $0.001-0.003 | $0.05-0.15 |
| **Total** | | | **$1-$5/month** |

### Storage (Monthly)
| Type | Volume | Cost |
|------|--------|------|
| S3 Lead Archives | 1 GB | $0.023 |
| Database | 5 GB | $10-20 (RDS) |
| **Total** | | **$10-$20/month** |

## Troubleshooting

### Common Issues

**Issue**: `ImportError: No module named 'boto3'`  
**Solution**: Run `pip install boto3`

**Issue**: `ANTHROPIC_API_KEY not set`  
**Solution**: Add key to `.env` file or set environment variable

**Issue**: Database connection timeout  
**Solution**: Check `DATABASE_URL` and network connectivity

**Issue**: S3 permission denied  
**Solution**: Verify IAM role has `s3:PutObject` permission

## Support

For questions or issues:
- **GitHub Issues**: [github.com/aaj441/wcag-ai-platform/issues](https://github.com/aaj441/wcag-ai-platform/issues)
- **Email**: support@wcagaiplatform.com
- **Documentation**: See main README.md

---

**Last Updated**: November 2025  
**Maintainer**: WCAG AI Platform Team  
**License**: MIT
