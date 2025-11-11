# WCAG AI Platform - API Documentation

Complete OpenAPI 3.0 specification with interactive Swagger UI.

## Quick Links

- **Interactive Docs:** [Open index.html](./index.html) (or deploy to view online)
- **OpenAPI Spec:** [openapi.yaml](../../openapi.yaml)
- **Postman Collection:** Import `openapi.yaml` directly into Postman
- **Code Generation:** Use OpenAPI Generator for client SDKs

---

## Viewing Documentation

### Option 1: Local Preview

```bash
# Open in browser
open docs/api/index.html

# Or serve with Python
cd docs/api
python3 -m http.server 8000
# Visit: http://localhost:8000
```

### Option 2: Deploy to Vercel/Netlify

```bash
# Vercel
cd docs/api
vercel --prod

# Netlify
netlify deploy --dir=docs/api --prod
```

### Option 3: Swagger Editor

```bash
# Open in Swagger Editor online
https://editor.swagger.io/
# File → Import → Select openapi.yaml
```

---

## API Overview

### Base URLs

| Environment | URL | Use Case |
|-------------|-----|----------|
| Production | `https://api.wcagii.com/v1` | Live applications |
| Staging | `https://staging-api.wcagii.com/v1` | Testing |
| Local | `http://localhost:8080` | Development |

### Authentication

All endpoints (except `/health` and `/metrics`) require API key authentication:

```bash
# Get your API key from https://wcagii.com/dashboard/api-keys

curl -X POST https://api.wcagii.com/v1/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "url": "https://example.com",
    "wcagLevel": "AA"
  }'
```

### Rate Limits

| Tier | Requests/15min | Scans/hour | Cost |
|------|---------------|------------|------|
| Free | 100 | 10 | $0 |
| Pro | 1000 | 100 | $29/mo |
| Enterprise | Unlimited | Unlimited | Custom |

---

## Quick Start Examples

### JavaScript (Fetch API)

```javascript
const apiKey = 'your_api_key_here';

// Create scan
const response = await fetch('https://api.wcagii.com/v1/api/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  },
  body: JSON.stringify({
    url: 'https://example.com',
    wcagLevel: 'AA',
    includeWarnings: true
  })
});

const { scanId } = await response.json();

// Poll for results
const checkScan = async () => {
  const result = await fetch(`https://api.wcagii.com/v1/api/scans/${scanId}`, {
    headers: { 'X-API-Key': apiKey }
  });

  const scan = await result.json();

  if (scan.status === 'completed') {
    console.log(`Found ${scan.summary.totalViolations} violations`);
    console.log(`Compliance score: ${scan.complianceScore}%`);
    return scan;
  } else if (scan.status === 'failed') {
    throw new Error('Scan failed');
  } else {
    // Still running, check again in 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    return checkScan();
  }
};

const results = await checkScan();
```

### Python (requests)

```python
import requests
import time

API_KEY = 'your_api_key_here'
BASE_URL = 'https://api.wcagii.com/v1'
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
}

# Create scan
response = requests.post(
    f'{BASE_URL}/api/scan',
    headers=headers,
    json={
        'url': 'https://example.com',
        'wcagLevel': 'AA',
        'includeWarnings': True
    }
)

scan_id = response.json()['scanId']

# Poll for results
while True:
    result = requests.get(
        f'{BASE_URL}/api/scans/{scan_id}',
        headers={'X-API-Key': API_KEY}
    )

    scan = result.json()

    if scan['status'] == 'completed':
        print(f"Found {scan['summary']['totalViolations']} violations")
        print(f"Compliance score: {scan['complianceScore']}%")
        break
    elif scan['status'] == 'failed':
        raise Exception('Scan failed')

    time.sleep(5)
```

### cURL

```bash
# Create scan
SCAN_RESPONSE=$(curl -X POST https://api.wcagii.com/v1/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "url": "https://example.com",
    "wcagLevel": "AA",
    "includeWarnings": true,
    "industry": "ecommerce"
  }')

SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.scanId')
echo "Scan ID: $SCAN_ID"

# Poll for results
while true; do
  SCAN_RESULT=$(curl -s \
    -H "X-API-Key: your_api_key_here" \
    "https://api.wcagii.com/v1/api/scans/$SCAN_ID")

  STATUS=$(echo $SCAN_RESULT | jq -r '.status')
  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo "Results:"
    echo $SCAN_RESULT | jq
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Scan failed"
    exit 1
  fi

  sleep 5
done
```

---

## Endpoints

### POST /api/scan

Create a new accessibility scan.

**Request:**
```json
{
  "url": "https://example.com",
  "wcagLevel": "AA",
  "includeWarnings": true,
  "timeout": 60000,
  "industry": "healthcare",
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

**Response (200):**
```json
{
  "scanId": "scan_abc123xyz",
  "status": "pending",
  "url": "https://example.com",
  "wcagLevel": "AA",
  "estimatedCompletionTime": 30,
  "message": "Scan queued successfully"
}
```

---

### GET /api/scans/{scanId}

Retrieve scan results.

**Response (200):**
```json
{
  "scanId": "scan_abc123xyz",
  "status": "completed",
  "url": "https://example.com",
  "wcagLevel": "AA",
  "complianceScore": 87.5,
  "violations": [
    {
      "id": "color-contrast",
      "rule": "1.4.3 Contrast (Minimum)",
      "severity": "serious",
      "message": "Element has insufficient color contrast",
      "element": "body > main > div.card > p",
      "suggestion": "Increase text color contrast to at least 4.5:1"
    }
  ],
  "summary": {
    "totalViolations": 12,
    "critical": 2,
    "serious": 5,
    "moderate": 3,
    "minor": 2
  },
  "metadata": {
    "scanDuration": 23.5,
    "pageTitle": "Example Domain",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

---

### GET /api/scans

List all scans.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (default: 20, max: 100)
- `status` (string): Filter by status (pending/running/completed/failed)

**Response (200):**
```json
{
  "scans": [ /* array of ScanResult objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

---

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "2.0.0"
}
```

---

### GET /metrics

Prometheus metrics.

**Response (200):**
```
# HELP wcagai_scans_total Total number of scans processed
# TYPE wcagai_scans_total counter
wcagai_scans_total 12345

# HELP wcagai_queue_length Current scan queue depth
# TYPE wcagai_queue_length gauge
wcagai_queue_length 5
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Invalid URL",
  "message": "The provided URL is not a valid HTTP/HTTPS URL",
  "code": "INVALID_URL",
  "details": {
    "url": "not-a-valid-url"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_URL` | Invalid URL format | 400 |
| `SSRF_BLOCKED` | URL blocked by SSRF protection | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `UNAUTHORIZED` | Invalid or missing API key | 401 |
| `SCAN_NOT_FOUND` | Scan ID not found | 404 |
| `INTERNAL_ERROR` | Server error | 500 |
| `TIMEOUT` | Scan timeout | 500 |

---

## SDK Generation

Generate type-safe clients for any language using OpenAPI Generator:

### TypeScript/JavaScript

```bash
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o src/generated/api

# Usage
import { DefaultApi } from './generated/api';

const api = new DefaultApi({
  basePath: 'https://api.wcagii.com/v1',
  headers: { 'X-API-Key': 'your_key' }
});

const scan = await api.createScan({
  scanRequest: {
    url: 'https://example.com',
    wcagLevel: 'AA'
  }
});
```

### Python

```bash
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o python-client

# Usage
from openapi_client import DefaultApi, Configuration

config = Configuration(
    host='https://api.wcagii.com/v1',
    api_key={'ApiKeyAuth': 'your_key'}
)

api = DefaultApi(api_client=ApiClient(config))
scan = api.create_scan(scan_request=ScanRequest(
    url='https://example.com',
    wcag_level='AA'
))
```

### Go

```bash
openapi-generator-cli generate \
  -i openapi.yaml \
  -g go \
  -o go-client

// Usage
import "github.com/your-org/wcagai-go-client"

config := wcagai.NewConfiguration()
config.AddDefaultHeader("X-API-Key", "your_key")
client := wcagai.NewAPIClient(config)

scan, _, err := client.DefaultApi.CreateScan(context.Background()).
    ScanRequest(wcagai.ScanRequest{
        Url:       "https://example.com",
        WcagLevel: "AA",
    }).Execute()
```

---

## Webhooks (Coming Soon)

Subscribe to real-time scan updates:

```json
{
  "event": "scan.completed",
  "scanId": "scan_abc123xyz",
  "status": "completed",
  "complianceScore": 87.5,
  "violationCount": 12,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Best Practices

### 1. Use Polling with Exponential Backoff

```javascript
const pollScan = async (scanId, maxAttempts = 20) => {
  let attempt = 0;
  let delay = 2000; // Start with 2 seconds

  while (attempt < maxAttempts) {
    const scan = await getScan(scanId);

    if (scan.status === 'completed' || scan.status === 'failed') {
      return scan;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 10000); // Max 10 seconds
    attempt++;
  }

  throw new Error('Scan timeout');
};
```

### 2. Handle Rate Limits Gracefully

```javascript
const makeRequest = async (url, options) => {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return makeRequest(url, options);
    }

    return response;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};
```

### 3. Batch Scans Efficiently

```javascript
const scanMultipleUrls = async (urls) => {
  // Don't exceed rate limit of 10 scans/hour
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 3600000 / 2; // 30 minutes

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);

    const scans = await Promise.all(
      batch.map(url => createScan({ url, wcagLevel: 'AA' }))
    );

    // Wait for batch to complete
    await Promise.all(
      scans.map(({ scanId }) => pollScan(scanId))
    );

    // Delay before next batch (if not last batch)
    if (i + BATCH_SIZE < urls.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
};
```

---

## Support

- **Documentation:** https://docs.wcagii.com
- **Status Page:** https://status.wcagii.com
- **Email Support:** support@wcagii.com
- **GitHub Issues:** https://github.com/your-org/wcag-ai-platform/issues

---

**Version:** 2.0.0 | **Last Updated:** 2024-11-11
