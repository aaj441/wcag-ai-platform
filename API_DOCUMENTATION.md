# WCAG AI Platform - API Documentation

## Overview

The WCAG AI Platform API is a RESTful service that provides accessibility scanning, violation detection, automated remediation, and lead management capabilities.

**Base URL (Development)**: `http://localhost:3001`
**Base URL (Production)**: `https://api.wcag-ai-platform.com`

**Version**: 1.0
**Protocol**: HTTPS (Production), HTTP (Development)
**Format**: JSON

## Table of Contents

- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Scans](#scans)
  - [Violations](#violations)
  - [Fixes](#fixes)
  - [Leads](#leads)
  - [Billing](#billing)
- [Webhooks](#webhooks)
- [SDKs and Client Libraries](#sdks-and-client-libraries)

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication, integrated with Clerk for identity management.

### Obtaining an Access Token

1. **Sign Up / Sign In** via Clerk:
   - Development: `http://localhost:3000/sign-in`
   - Production: `https://app.wcag-ai-platform.com/sign-in`

2. **Retrieve JWT Token** from Clerk session:
   ```javascript
   const token = await clerk.session.getToken();
   ```

### Making Authenticated Requests

Include the JWT token in the `Authorization` header:

```http
GET /api/scans HTTP/1.1
Host: api.wcag-ai-platform.com
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Example with cURL:**
```bash
curl -X GET https://api.wcag-ai-platform.com/api/scans \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Example with JavaScript (fetch):**
```javascript
const response = await fetch('https://api.wcag-ai-platform.com/api/scans', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "scan_123",
    "url": "https://example.com",
    "status": "completed"
  },
  "message": "Scan completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Validation failed: URL is required",
  "code": "VALIDATION_ERROR"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Structure

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "url",
    "issue": "Invalid URL format"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_REQUIRED`: No auth token provided
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Unexpected server error

---

## Rate Limiting

**Limits:**
- Free Tier: 100 requests/hour
- Pro Tier: 1,000 requests/hour
- Enterprise: Custom limits

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 3600 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

---

## Endpoints

### Scans

#### POST /api/scans/create

Create a new accessibility scan.

**Request:**
```json
{
  "url": "https://example.com",
  "scanType": "full",
  "wcagLevel": "AA",
  "includeWarnings": true
}
```

**Parameters:**
- `url` (required): URL to scan
- `scanType` (optional): `"quick"` | `"full"` (default: `"full"`)
- `wcagLevel` (optional): `"A"` | `"AA"` | `"AAA"` (default: `"AA"`)
- `includeWarnings` (optional): Include warnings in results (default: `false`)

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "scan_abc123",
    "url": "https://example.com",
    "status": "pending",
    "wcagLevel": "AA",
    "createdAt": "2025-11-15T10:30:00Z",
    "estimatedCompletionTime": 120
  },
  "message": "Scan initiated successfully"
}
```

---

#### GET /api/scans

List all scans for the authenticated tenant.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `running`, `completed`, `failed`)
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field (default: `createdAt`)
- `order` (optional): `asc` | `desc` (default: `desc`)

**Example:**
```
GET /api/scans?status=completed&limit=10&sortBy=createdAt&order=desc
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "scan_abc123",
      "url": "https://example.com",
      "status": "completed",
      "violationCount": 15,
      "wcagLevel": "AA",
      "createdAt": "2025-11-15T10:30:00Z",
      "completedAt": "2025-11-15T10:32:15Z"
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

#### GET /api/scans/:scanId

Get details for a specific scan.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "scan_abc123",
    "url": "https://example.com",
    "status": "completed",
    "wcagLevel": "AA",
    "violations": [
      {
        "id": "viol_001",
        "wcagCriteria": "1.4.3",
        "severity": "critical",
        "element": "button.submit",
        "description": "Insufficient color contrast"
      }
    ],
    "summary": {
      "totalViolations": 15,
      "critical": 3,
      "high": 5,
      "medium": 4,
      "low": 3
    },
    "createdAt": "2025-11-15T10:30:00Z",
    "completedAt": "2025-11-15T10:32:15Z"
  }
}
```

---

#### DELETE /api/scans/:scanId

Delete a scan and its associated violations.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Scan deleted successfully"
}
```

---

### Violations

#### GET /api/violations/:scanId

Get all violations for a specific scan.

**Query Parameters:**
- `severity` (optional): Filter by severity
- `wcagCriteria` (optional): Filter by WCAG criteria (e.g., `1.4.3`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "viol_001",
      "scanId": "scan_abc123",
      "wcagCriteria": "1.4.3",
      "wcagLevel": "AA",
      "severity": "critical",
      "element": "button.submit",
      "elementSelector": "body > main > form > button.submit",
      "description": "Text color contrast ratio of 2.8:1 is below minimum requirement of 4.5:1",
      "recommendation": "Increase contrast ratio to at least 4.5:1 by darkening text color or lightening background",
      "codeSnippet": "<button class=\"submit\" style=\"color: #888; background: #fff;\">Submit</button>",
      "screenshot": "https://storage.wcag-ai.com/screenshots/viol_001.png",
      "affectedUsers": "Users with low vision, color blindness",
      "priority": 1
    }
  ]
}
```

---

### Fixes

#### POST /api/fixes/generate

Generate an AI-powered fix for a violation.

**Request:**
```json
{
  "violationId": "viol_001",
  "wcagCriteria": "1.4.3",
  "issueType": "color-contrast",
  "description": "Insufficient color contrast on submit button",
  "codeLanguage": "html"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "violationId": "viol_001",
    "fixType": "css-modification",
    "originalCode": "<button class=\"submit\" style=\"color: #888; background: #fff;\">Submit</button>",
    "fixedCode": "<button class=\"submit\" style=\"color: #000; background: #fff;\">Submit</button>",
    "explanation": "Changed text color from #888 to #000 to achieve 21:1 contrast ratio with white background",
    "confidenceScore": 0.95,
    "testingInstructions": "Verify contrast ratio using axe DevTools or WebAIM contrast checker",
    "reviewStatus": "pending",
    "createdAt": "2025-11-15T11:00:00Z"
  },
  "message": "Fix generated with 95% confidence"
}
```

---

#### GET /api/fixes/:fixId

Get details for a specific fix.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "violationId": "viol_001",
    "violation": {
      "wcagCriteria": "1.4.3",
      "description": "Insufficient color contrast"
    },
    "fixType": "css-modification",
    "originalCode": "...",
    "fixedCode": "...",
    "explanation": "...",
    "confidenceScore": 0.95,
    "reviewStatus": "approved",
    "reviewedBy": "admin@example.com",
    "reviewedAt": "2025-11-15T11:30:00Z",
    "applications": []
  }
}
```

---

#### PATCH /api/fixes/:fixId/review

Review and approve/reject a fix.

**Request:**
```json
{
  "reviewStatus": "approved",
  "reviewNotes": "Fix looks good, contrast ratio verified"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "reviewStatus": "approved",
    "reviewedBy": "admin@example.com",
    "reviewedAt": "2025-11-15T11:30:00Z",
    "reviewNotes": "Fix looks good, contrast ratio verified"
  },
  "message": "Fix approved"
}
```

---

#### POST /api/fixes/:fixId/apply

Apply a fix (Phase 2 feature - creates GitHub PR).

**Request:**
```json
{
  "repository": "https://github.com/example/repo",
  "filePath": "src/components/Button.tsx",
  "branch": "main"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "app_123",
    "fixId": "fix_xyz789",
    "repository": "https://github.com/example/repo",
    "filePath": "src/components/Button.tsx",
    "branch": "main",
    "success": true,
    "verificationStatus": "pending",
    "appliedAt": "2025-11-15T12:00:00Z"
  },
  "message": "Fix applied (Phase 2: GitHub PR integration coming)"
}
```

---

### Leads

#### POST /api/leads/search

Search for companies by keywords and create leads.

**Request:**
```json
{
  "keywords": ["fintech", "healthcare"],
  "minEmployees": 50,
  "maxEmployees": 500
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "keywords": ["fintech", "healthcare"],
    "companiesFound": 15,
    "leadsCreated": 12,
    "leads": [
      {
        "id": "lead_001",
        "email": "compliance@stripe.com",
        "company": "Stripe Corporation",
        "industry": "Financial Services",
        "relevanceScore": "85%",
        "priority": "high",
        "status": "new"
      }
    ]
  }
}
```

---

#### GET /api/leads

Get all leads with optional filters.

**Query Parameters:**
- `status`: Filter by status (`new`, `contacted`, `interested`, `qualified`, `won`, `lost`)
- `priority`: Filter by priority tier (`high`, `medium`, `low`)
- `sortBy`: Sort field (default: `relevanceScore`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "lead_001",
      "email": "compliance@stripe.com",
      "company": {
        "name": "Stripe Corporation",
        "website": "https://stripe.com",
        "industry": "Financial Services"
      },
      "relevanceScore": 0.85,
      "priorityTier": "high",
      "status": "new",
      "createdAt": "2025-11-15T09:00:00Z"
    }
  ],
  "stats": {
    "total": 47,
    "byStatus": {
      "new": 15,
      "contacted": 20,
      "interested": 8,
      "qualified": 3,
      "won": 1,
      "lost": 0
    },
    "byPriority": {
      "high": 10,
      "medium": 25,
      "low": 12
    }
  }
}
```

---

#### PATCH /api/leads/:leadId

Update lead status or details.

**Request:**
```json
{
  "status": "contacted",
  "notes": "Sent initial outreach email",
  "priorityTier": "high",
  "nextFollowUp": "2025-11-20T10:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "lead_001",
    "status": "contacted",
    "notes": "Sent initial outreach email",
    "priorityTier": "high",
    "lastContacted": "2025-11-15T14:00:00Z",
    "nextFollowUp": "2025-11-20T10:00:00Z"
  }
}
```

---

### Billing

#### GET /api/billing/usage

Get current usage and billing information.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentPeriod": {
      "start": "2025-11-01T00:00:00Z",
      "end": "2025-11-30T23:59:59Z"
    },
    "usage": {
      "scansPerformed": 47,
      "scansLimit": 100,
      "fixesGenerated": 85,
      "fixesLimit": 200
    },
    "subscription": {
      "plan": "pro",
      "status": "active",
      "nextBillingDate": "2025-12-01T00:00:00Z",
      "amount": 99.00,
      "currency": "USD"
    }
  }
}
```

---

## Webhooks

Configure webhooks to receive real-time notifications about events.

### Available Events

- `scan.completed`: Scan finished successfully
- `scan.failed`: Scan encountered an error
- `fix.generated`: Fix created for violation
- `fix.approved`: Fix approved by reviewer
- `lead.created`: New lead discovered

### Webhook Payload

```json
{
  "event": "scan.completed",
  "timestamp": "2025-11-15T10:32:15Z",
  "data": {
    "scanId": "scan_abc123",
    "url": "https://example.com",
    "violationCount": 15,
    "summary": {
      "critical": 3,
      "high": 5,
      "medium": 4,
      "low": 3
    }
  }
}
```

### Webhook Signature Verification

All webhook requests include an `X-Webhook-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

---

## SDKs and Client Libraries

### JavaScript/TypeScript

```bash
npm install @wcag-ai/sdk
```

```javascript
import { WCAGClient } from '@wcag-ai/sdk';

const client = new WCAGClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.wcag-ai-platform.com'
});

// Create a scan
const scan = await client.scans.create({
  url: 'https://example.com',
  wcagLevel: 'AA'
});

// Get results
const results = await client.scans.get(scan.id);
```

### Python

```bash
pip install wcag-ai
```

```python
from wcag_ai import WCAGClient

client = WCAGClient(api_key='your-api-key')

# Create a scan
scan = client.scans.create(
    url='https://example.com',
    wcag_level='AA'
)

# Get results
results = client.scans.get(scan.id)
```

---

## Changelog

### Version 1.0 (Current)

- Initial API release
- Scan creation and management
- Violation detection
- AI-powered fix generation
- Lead management
- Billing and usage tracking

---

## Support

- **Documentation**: https://docs.wcag-ai-platform.com
- **GitHub Issues**: https://github.com/aaj441/wcag-ai-platform/issues
- **Email**: support@wcag-ai-platform.com
- **Discord**: https://discord.gg/wcag-ai

---

**Last Updated**: 2025-11-15
**API Version**: 1.0
