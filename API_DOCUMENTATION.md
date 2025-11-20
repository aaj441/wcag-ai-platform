# 📚 WCAG AI Platform API Documentation

RESTful API for the WCAG AI Platform with comprehensive security features.

---

## 🔐 Authentication

All protected endpoints require JWT authentication.

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### Using the Token

```bash
GET /api/drafts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- Tokens expire after 24 hours
- Expired token returns `401` with `code: TOKEN_EXPIRED`
- Invalid token returns `401` with `code: INVALID_TOKEN`

---

## 📊 Rate Limits

**Global API Limit:** 100 requests per 15 minutes per IP

**Scan Endpoints:** 10 requests per hour per IP

**Rate Limit Response (429):**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": "15 minutes"
}
```

---

## 🏥 Health & Status

### GET /health

Basic health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### GET /health/detailed

Detailed system health (internal use only).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "redis": {
      "status": "healthy"
    }
  },
  "queue": {
    "capacity": "healthy",
    "waiting": 3,
    "active": 2,
    "completed": 1247,
    "failed": 12
  }
}
```

---

## 📧 Email Drafts API

### GET /api/drafts

Get all email drafts with optional filtering.

**Authentication:** Optional (returns public drafts if not authenticated)

**Query Parameters:**
- `status` (string): Filter by status (draft, pending, approved, sent, rejected)
- `search` (string): Search in recipient, subject, body, company
- `keywords` (string): Comma-separated keywords to filter by

**Example:**
```bash
GET /api/drafts?status=pending&search=accessibility
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "draft_abc123",
      "recipient": "client@example.com",
      "recipientName": "John Doe",
      "company": "Acme Corp",
      "subject": "WCAG Accessibility Violations Report",
      "body": "Dear John...",
      "status": "pending",
      "violations": [...],
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "message": "Retrieved 1 draft(s)"
}
```

---

### GET /api/drafts/:id

Get a single draft by ID.

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "draft_abc123",
    "recipient": "client@example.com",
    "subject": "Accessibility Report",
    "body": "...",
    "status": "draft",
    "violations": [...],
    "keywords": ["wcag", "color-contrast", "alt-text"],
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

### POST /api/drafts

Create a new email draft with input validation.

**Authentication:** Required

**Request Body:**
```json
{
  "recipient": "client@example.com",
  "recipientName": "John Doe",
  "company": "Acme Corp",
  "subject": "Accessibility Violations Report",
  "body": "Dear John, We found the following issues...",
  "violations": [
    {
      "type": "color-contrast",
      "severity": "critical",
      "element": "button.submit"
    }
  ],
  "tags": ["urgent", "wcag-2.1"],
  "notes": "Follow up in 3 days"
}
```

**Validation Rules:**
- `recipient`: Valid email address (max 254 chars)
- `subject`: Required, 1-500 characters
- `body`: Required, 1-50,000 characters
- `recipientName`: Optional, max 200 characters
- `company`: Optional, max 200 characters
- `tags`: Optional array, max 20 tags, each max 50 chars
- `notes`: Optional, max 5,000 characters

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "draft_xyz789",
    "recipient": "client@example.com",
    ...
  },
  "message": "Draft created successfully"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "recipient",
      "message": "Invalid email address",
      "code": "invalid_string"
    },
    {
      "field": "subject",
      "message": "String must contain at least 1 character(s)",
      "code": "too_small"
    }
  ]
}
```

---

### PUT /api/drafts/:id

Update an existing draft.

**Authentication:** Required

**Request Body:** (all fields optional)
```json
{
  "recipient": "newemail@example.com",
  "subject": "Updated Subject",
  "status": "approved",
  "notes": "Approved for sending"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Draft updated successfully"
}
```

---

### DELETE /api/drafts/:id

Delete a draft.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Draft deleted successfully"
}
```

---

## 🔍 Accessibility Violations API

### GET /api/violations

Get WCAG violations with filtering.

**Authentication:** Optional

**Query Parameters:**
- `url` (string): Filter by URL
- `severity` (enum): critical, serious, moderate, minor
- `wcagLevel` (enum): A, AA, AAA
- `status` (enum): open, in_progress, fixed, wont_fix
- `limit` (number): Max results (1-100, default: 50)
- `offset` (number): Pagination offset (default: 0)

**Example:**
```bash
GET /api/violations?severity=critical&wcagLevel=AA&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "viol_123",
      "url": "https://example.com",
      "type": "color-contrast",
      "severity": "critical",
      "wcagLevel": "AA",
      "wcagCriteria": "1.4.3",
      "element": "button.primary",
      "description": "Insufficient color contrast ratio",
      "recommendation": "Increase contrast to 4.5:1",
      "status": "open"
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 📸 Screenshot API

### POST /api/screenshot

Capture website screenshot with SSRF protection.

**Authentication:** Required

**Rate Limit:** 10 requests per hour

**Request Body:**
```json
{
  "url": "https://example.com",
  "waitForPageLoad": 3000,
  "fullPage": true
}
```

**Validation:**
- `url`: Valid HTTPS URL (max 2048 chars)
- Blocks localhost, private IPs, and metadata endpoints
- `waitForPageLoad`: 0-30000ms (default: 5000)

**Response (200):**
```json
{
  "success": true,
  "screenshot": "data:image/png;base64,iVBORw0KG...",
  "metadata": {
    "url": "https://example.com",
    "timestamp": "2024-01-20T12:00:00.000Z",
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

**SSRF Protection (403):**
```json
{
  "error": "Forbidden",
  "message": "URL scanning prohibited: Private IP address"
}
```

---

## 👥 Clients API

### POST /api/clients

Create a new client.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "website": "https://acme.com",
  "phone": "+1-555-0123",
  "company": "Acme Corp",
  "status": "active"
}
```

**Validation:**
- `name`: Required, 1-200 characters
- `email`: Valid email, max 254 characters
- `website`: Valid URL, max 2048 characters (optional)
- `phone`: Valid phone format (optional)
- `status`: active, inactive, trial, cancelled (default: active)

---

## 📊 Reports API

### GET /api/reports/:clientId

Generate accessibility report for a client.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "report": {
    "clientId": "client_123",
    "generatedAt": "2024-01-20T12:00:00.000Z",
    "summary": {
      "totalViolations": 47,
      "critical": 12,
      "serious": 18,
      "moderate": 15,
      "minor": 2
    },
    "complianceScore": 73,
    "wcagLevel": "AA",
    "violations": [...]
  }
}
```

---

## 🔄 Webhooks

### POST /api/webhooks/stripe

Stripe webhook endpoint with signature verification.

**Headers:**
- `x-webhook-signature`: HMAC-SHA256 signature

**Security:**
- Uses constant-time comparison to prevent timing attacks
- Rejects webhooks without valid signature

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Invalid Signature (401):**
```json
{
  "error": "Invalid webhook signature"
}
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address",
      "code": "invalid_string"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

OR

```json
{
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "URL scanning prohibited: Private IP address"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Endpoint not found",
  "path": "/api/invalid"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

*Note: Stack traces are NEVER included in production responses.*

---

## 🔒 Security Features

### Headers

All responses include security headers:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Input Validation

All inputs validated using Zod schemas:
- Email format validation
- URL validation with SSRF protection
- String length limits
- Type checking
- Required field enforcement

### CORS

Configured to allow specific origins only:
- Set via `CORS_ORIGIN` environment variable
- Credentials supported
- Pre-flight requests handled

---

## 📦 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ]  // Optional validation details
}
```

---

## 🧪 Testing

Test the API:
```bash
# Run security test suite
cd packages/api
./scripts/test-security.sh

# Test specific endpoint
curl -X POST https://your-api.com/api/drafts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"recipient":"test@example.com","subject":"Test","body":"Test body"}'
```

---

## 📞 Support

- **Documentation Issues:** Open GitHub issue
- **Security Issues:** Email security@yourdomain.com
- **API Questions:** Check `/health` endpoint status first

---

**API Version:** 1.0.0
**Last Updated:** 2024-01-20
**Base URL:** `https://your-api-domain.com`
