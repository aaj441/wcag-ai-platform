# WCAG AI Platform - Comprehensive API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Core Scanning APIs](#core-scanning-apis)
- [Consultant Workflow APIs](#consultant-workflow-apis)
- [Email Automation APIs](#email-automation-apis)
- [Reporting & VPAT Generation](#reporting--vpat-generation)
- [Lead Discovery & Prospecting](#lead-discovery--prospecting)
- [Monitoring & SLA](#monitoring--sla)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Webhooks](#webhooks)
- [SDKs & Code Examples](#sdks--code-examples)

---

## Overview

The WCAG AI Platform provides a comprehensive REST API for automated accessibility compliance, consultant workflows, email automation, and lead discovery. All endpoints return JSON unless otherwise specified.

**Current Version:** 2.0.0
**Last Updated:** November 15, 2025

---

## Authentication

All API requests (except `/health` and `/metrics`) require authentication using an API key.

### API Key Authentication

Include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_api_key_here" \
  https://api.wcagai.com/v1/scans
```

### Getting an API Key

1. Sign up at https://wcagai.com
2. Navigate to Dashboard → API Keys
3. Click "Create New Key"
4. Copy your key (shown only once)

### Security Best Practices

- ✅ Store API keys in environment variables
- ✅ Rotate keys every 90 days
- ✅ Use different keys for development/production
- ❌ Never commit keys to version control
- ❌ Don't expose keys in client-side code

---

## Base URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Production** | `https://api.wcagai.com/v1` | Live applications |
| **Staging** | `https://staging-api.wcagai.com/v1` | Testing |
| **Demo** | `https://api-demo.wcagai.com/v1` | Demo/sandbox |
| **Local** | `http://localhost:3001` | Development |

---

## Core Scanning APIs

### POST /v1/scans

Create a new accessibility scan.

**Request Body:**
```json
{
  "url": "https://example.com",
  "wcagLevel": "AA",
  "includeWarnings": true,
  "industry": "ecommerce",
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "timeout": 60000
}
```

**Parameters:**
- `url` (string, required): URL to scan
- `wcagLevel` (string): "A", "AA", or "AAA" (default: "AA")
- `includeWarnings` (boolean): Include WCAG warnings
- `industry` (string): Industry context for AI recommendations
- `viewport` (object): Browser viewport dimensions
- `timeout` (number): Max scan time in ms (default: 60000)

**Response (201):**
```json
{
  "scan_id": "scan_abc123xyz",
  "status": "queued",
  "url": "https://example.com",
  "wcagLevel": "AA",
  "estimatedCompletionTime": 30,
  "created_at": "2025-11-15T19:30:00Z"
}
```

---

### GET /v1/scans/{scan_id}

Retrieve scan results.

**Path Parameters:**
- `scan_id` (string, required): Scan identifier

**Response (200):**
```json
{
  "scan_id": "scan_abc123xyz",
  "status": "completed",
  "url": "https://example.com",
  "wcagLevel": "AA",
  "complianceScore": 87.5,
  "violations": [
    {
      "id": "color-contrast",
      "rule": "1.4.3 Contrast (Minimum)",
      "impact": "serious",
      "description": "Elements must have sufficient color contrast",
      "nodes": [
        {
          "html": "<button>Submit</button>",
          "target": ["#submit-btn"],
          "failureSummary": "Contrast ratio of 2.8:1"
        }
      ],
      "remediation": {
        "summary": "Increase contrast to at least 4.5:1",
        "estimatedEffort": "15 minutes",
        "suggestedFix": "button { color: #000; background: #fff; }"
      }
    }
  ],
  "summary": {
    "totalViolations": 12,
    "critical": 2,
    "serious": 5,
    "moderate": 3,
    "minor": 2,
    "passes": 47,
    "incomplete": 1
  },
  "metadata": {
    "scanDuration": 23.5,
    "pageTitle": "Example Domain",
    "timestamp": "2025-11-15T19:30:45Z",
    "viewport": "1920x1080"
  }
}
```

**Status Values:**
- `queued`: Scan is waiting in queue
- `running`: Scan is in progress
- `completed`: Scan finished successfully
- `failed`: Scan encountered an error

---

### GET /v1/scans

List all scans for your account.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (default: 20, max: 100)
- `status` (string): Filter by status
- `url` (string): Filter by URL pattern

**Response (200):**
```json
{
  "scans": [
    {
      "scan_id": "scan_abc123xyz",
      "url": "https://example.com",
      "status": "completed",
      "complianceScore": 87.5,
      "created_at": "2025-11-15T19:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

---

## Consultant Workflow APIs

### GET /v1/consultant/drafts

List pending email drafts for consultant review.

**Query Parameters:**
- `status` (string): Filter by status ("pending", "approved", "rejected")
- `limit` (integer): Results per page

**Response (200):**
```json
{
  "drafts": [
    {
      "draft_id": "draft_xyz789",
      "scan_id": "scan_abc123xyz",
      "recipient": "client@example.com",
      "subject": "WCAG Accessibility Issues Found",
      "body": "We found 12 accessibility violations...",
      "violations": [
        {
          "id": "color-contrast",
          "impact": "serious",
          "count": 3
        }
      ],
      "status": "pending",
      "created_at": "2025-11-15T19:30:00Z"
    }
  ],
  "total": 5
}
```

---

### PUT /v1/consultant/drafts/{draft_id}

Approve or reject an email draft.

**Path Parameters:**
- `draft_id` (string, required): Draft identifier

**Request Body:**
```json
{
  "action": "approve",
  "modifications": {
    "body": "Updated email body...",
    "subject": "Updated subject"
  },
  "notes": "Approved with minor edits"
}
```

**Response (200):**
```json
{
  "draft_id": "draft_xyz789",
  "status": "approved",
  "updated_at": "2025-11-15T19:35:00Z",
  "email_sent": true
}
```

---

### GET /v1/consultant/clients

List clients managed by consultant.

**Response (200):**
```json
{
  "clients": [
    {
      "client_id": "client_abc123",
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "websites": ["https://acme.com", "https://shop.acme.com"],
      "totalScans": 45,
      "lastScan": "2025-11-15T19:30:00Z",
      "complianceScore": 89.2
    }
  ]
}
```

---

## Email Automation APIs

### POST /v1/emails/send-report

Send accessibility report via email.

**Request Body:**
```json
{
  "scan_id": "scan_abc123xyz",
  "recipients": ["consultant@example.com", "client@example.com"],
  "include_remediation": true,
  "format": "html",
  "attach_pdf": true
}
```

**Response (200):**
```json
{
  "email_id": "email_xyz789",
  "status": "sent",
  "recipients": ["consultant@example.com", "client@example.com"],
  "sent_at": "2025-11-15T19:30:00Z"
}
```

---

### POST /v1/emails/schedule

Schedule automated email reports.

**Request Body:**
```json
{
  "scan_id": "scan_abc123xyz",
  "recipients": ["client@example.com"],
  "schedule": {
    "frequency": "weekly",
    "dayOfWeek": "monday",
    "time": "09:00"
  }
}
```

**Response (201):**
```json
{
  "schedule_id": "sched_abc123",
  "status": "active",
  "nextRun": "2025-11-18T09:00:00Z"
}
```

---

## Reporting & VPAT Generation

### POST /v1/reports/vpat

Generate a VPAT (Voluntary Product Accessibility Template) report.

**Request Body:**
```json
{
  "scan_id": "scan_abc123xyz",
  "product_name": "Acme Web Platform",
  "version": "2.0",
  "contact_info": {
    "name": "John Doe",
    "email": "john@acme.com",
    "company": "Acme Corp"
  },
  "format": "pdf"
}
```

**Response (200):**
```json
{
  "report_id": "vpat_abc123",
  "download_url": "https://api.wcagai.com/v1/reports/vpat_abc123/download",
  "expires_at": "2025-11-22T19:30:00Z",
  "format": "pdf"
}
```

---

### GET /v1/reports/{report_id}

Retrieve a generated report.

**Path Parameters:**
- `report_id` (string, required): Report identifier

**Response (200):**
Returns the report file (PDF, HTML, or JSON based on format)

---

### POST /v1/reports/custom

Generate a custom accessibility report.

**Request Body:**
```json
{
  "scan_id": "scan_abc123xyz",
  "sections": ["executive_summary", "violations", "recommendations"],
  "branding": {
    "logo_url": "https://acme.com/logo.png",
    "company_name": "Acme Corp",
    "color_scheme": "#0066cc"
  },
  "format": "pdf"
}
```

---

## Lead Discovery & Prospecting

### POST /v1/leads/discover

Discover potential accessibility consulting leads.

**Request Body:**
```json
{
  "industry": "healthcare",
  "location": "US",
  "company_size": "50-200",
  "technology_stack": ["React", "WordPress"]
}
```

**Response (200):**
```json
{
  "leads": [
    {
      "company": "Healthcare Inc",
      "website": "https://healthcare-inc.com",
      "estimatedViolations": 25,
      "confidence": 0.87,
      "priority": "high",
      "contact": {
        "email": "contact@healthcare-inc.com"
      }
    }
  ],
  "total": 15
}
```

---

### GET /v1/leads/{lead_id}

Get detailed information about a lead.

**Response (200):**
```json
{
  "lead_id": "lead_abc123",
  "company": "Healthcare Inc",
  "website": "https://healthcare-inc.com",
  "scan_results": {
    "violations": 25,
    "complianceScore": 65.3,
    "criticalIssues": 5
  },
  "estimated_value": "$15,000",
  "next_steps": [
    "Send initial outreach email",
    "Schedule discovery call"
  ]
}
```

---

## Monitoring & SLA

### GET /v1/monitoring/status

Get real-time platform status.

**Response (200):**
```json
{
  "status": "operational",
  "uptime": 99.97,
  "services": {
    "api": "operational",
    "scanner": "operational",
    "database": "operational",
    "email": "operational"
  },
  "metrics": {
    "avgResponseTime": 245,
    "queueLength": 3,
    "activeScans": 12
  }
}
```

---

### GET /v1/sla/metrics

Get SLA compliance metrics.

**Response (200):**
```json
{
  "uptime": {
    "current_month": 99.98,
    "last_month": 99.95,
    "quarterly": 99.96
  },
  "performance": {
    "avg_scan_time": 28.5,
    "p95_scan_time": 45.2,
    "p99_scan_time": 62.8
  },
  "sla_breaches": 0
}
```

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Invalid URL",
  "message": "The provided URL is not a valid HTTP/HTTPS URL",
  "code": "INVALID_URL",
  "details": {
    "url": "not-a-valid-url"
  },
  "request_id": "req_abc123xyz"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary service outage |

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_URL` | 400 | Invalid URL format |
| `SSRF_BLOCKED` | 400 | URL blocked by SSRF protection |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `SCAN_NOT_FOUND` | 404 | Scan ID not found |
| `INTERNAL_ERROR` | 500 | Server error |
| `TIMEOUT` | 500 | Scan timeout |
| `INSUFFICIENT_CREDITS` | 402 | Not enough API credits |

---

## Rate Limits

### Tier Limits

| Tier | Requests/15min | Scans/hour | Concurrent Scans |
|------|---------------|------------|------------------|
| Free | 100 | 10 | 1 |
| Pro | 1,000 | 100 | 5 |
| Enterprise | Unlimited | Unlimited | 50 |

### Rate Limit Headers

Every API response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 842
X-RateLimit-Reset: 1637012345
```

### Handling Rate Limits

```javascript
const makeRequest = async (url, options) => {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeRequest(url, options);
  }

  return response;
};
```

---

## Webhooks

Subscribe to real-time events via webhooks.

### Event Types

- `scan.created`: New scan initiated
- `scan.completed`: Scan finished successfully
- `scan.failed`: Scan encountered an error
- `email.sent`: Email notification sent
- `draft.approved`: Email draft approved by consultant
- `lead.discovered`: New lead identified

### Webhook Payload Example

```json
{
  "event": "scan.completed",
  "timestamp": "2025-11-15T19:30:00Z",
  "data": {
    "scan_id": "scan_abc123xyz",
    "status": "completed",
    "url": "https://example.com",
    "complianceScore": 87.5,
    "violationCount": 12
  },
  "request_id": "req_xyz789"
}
```

### Webhook Security

Verify webhook authenticity using HMAC signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === hash;
}
```

---

## SDKs & Code Examples

### JavaScript/TypeScript

```bash
npm install @wcagai/sdk
```

```typescript
import { WCAGClient } from '@wcagai/sdk';

const client = new WCAGClient({
  apiKey: process.env.WCAG_API_KEY,
  baseUrl: 'https://api.wcagai.com/v1'
});

// Create scan
const scan = await client.scans.create({
  url: 'https://example.com',
  wcagLevel: 'AA'
});

// Wait for completion
const result = await client.scans.wait(scan.scan_id);

console.log(`Compliance Score: ${result.complianceScore}%`);
console.log(`Violations: ${result.summary.totalViolations}`);
```

### Python

```bash
pip install wcagai
```

```python
from wcagai import WCAGClient

client = WCAGClient(api_key='your_api_key')

# Create scan
scan = client.scans.create(
    url='https://example.com',
    wcag_level='AA'
)

# Wait for completion
result = client.scans.wait(scan.scan_id)

print(f"Compliance Score: {result.compliance_score}%")
print(f"Violations: {result.summary.total_violations}")
```

### cURL Examples

```bash
# Create scan
curl -X POST https://api.wcagai.com/v1/scans \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "url": "https://example.com",
    "wcagLevel": "AA"
  }'

# Get scan results
curl https://api.wcagai.com/v1/scans/scan_abc123xyz \
  -H "X-API-Key: your_api_key"

# List pending drafts
curl https://api.wcagai.com/v1/consultant/drafts?status=pending \
  -H "X-API-Key: your_api_key"

# Generate VPAT report
curl -X POST https://api.wcagai.com/v1/reports/vpat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "scan_id": "scan_abc123xyz",
    "product_name": "My Product",
    "version": "1.0"
  }'
```

---

## Support & Resources

- **Documentation:** https://docs.wcagai.com
- **API Status:** https://status.wcagai.com
- **GitHub:** https://github.com/aaj441/wcag-ai-platform
- **Email Support:** support@wcagai.com
- **Community:** https://community.wcagai.com

---

**Version:** 2.0.0
**Last Updated:** November 15, 2025
**License:** Proprietary
