# Screenshot Service API Documentation

## Overview

The Screenshot Service provides before/after website transformation capability using Puppeteer for automated accessibility fixes.

## Endpoints

### POST /api/screenshot

Captures before and after screenshots of a website with automated accessibility fixes applied.

#### Request

```bash
curl -X POST http://localhost:3001/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The website URL to capture (must be valid HTTP/HTTPS URL) |

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "beforeUrl": "https://wcagai-screenshots.s3.us-east-1.amazonaws.com/abcd1234/before-1699794620000.png",
    "afterUrl": "https://wcagai-screenshots.s3.us-east-1.amazonaws.com/abcd1234/after-1699794620001.png",
    "violationsFixed": 23,
    "complianceImprovement": 48.9,
    "timeToCapture": 8234
  }
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The input website URL |
| `beforeUrl` | string | S3 URL to the before screenshot (PNG), or base64 data URL if S3 fails |
| `afterUrl` | string | S3 URL to the after screenshot (PNG), or base64 data URL if S3 fails |
| `violationsFixed` | number | Number of accessibility violations fixed (15-45 range in demo) |
| `complianceImprovement` | number | Compliance improvement percentage (0-100) |
| `timeToCapture` | number | Total time to capture both screenshots in milliseconds |

**Error Responses**

```json
{
  "error": "Invalid URL format"
}
```

Status: `400 Bad Request`

```json
{
  "error": "Failed to generate screenshots",
  "message": "Timeout waiting for navigation"
}
```

Status: `500 Internal Server Error`

## Features

### Auto-Fix Overlay Script

The service automatically injects the following accessibility improvements:

1. **Alt Text for Images**
   - Adds `alt` attributes to images missing them
   - Uses image filename as default alt text

2. **Focus Indicators**
   - Adds visible focus styles to buttons, links, and inputs
   - Uses 3px indigo outline with 2px offset

3. **Skip Links**
   - Adds "Skip to main content" link if missing
   - Positioned off-screen by default, visible on focus
   - Black background with white text

## Environment Variables

```bash
# Puppeteer Configuration
PUPPETEER_HEADLESS=true              # Run browser in headless mode
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# AWS S3 Configuration (for storing screenshots)
AWS_REGION=us-east-1
AWS_S3_BUCKET=wcagai-screenshots
S3_PUBLIC_BUCKET_URL=https://wcagai-screenshots.s3.us-east-1.amazonaws.com

# Optional AWS Credentials (for S3 upload fallback to base64)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

## Example Usage

### JavaScript/TypeScript (Frontend)

```typescript
import axios from 'axios';

async function transformWebsite(url: string) {
  try {
    const response = await axios.post('/api/screenshot', { url });
    const { data } = response.data;

    console.log('Before:', data.beforeUrl);
    console.log('After:', data.afterUrl);
    console.log('Violations Fixed:', data.violationsFixed);
    console.log('Improvement:', data.complianceImprovement.toFixed(0) + '%');
  } catch (error) {
    console.error('Failed:', error.response?.data?.error);
  }
}
```

### cURL (Command Line)

```bash
# Test with example.com
curl -X POST http://localhost:3001/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Test with Wikipedia
curl -X POST http://localhost:3001/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.wikipedia.org"}'
```

## Performance

- **Average Time**: 5-15 seconds per website
  - Page navigation: 3-8 seconds
  - Screenshot capture: 1-3 seconds per screenshot (before + after)
  - S3 upload: 1-3 seconds (if configured)

- **Concurrent Requests**: Currently sequential (single browser instance)
  - Planned enhancement: Browser pool for concurrent requests

## Limitations (Demo Phase)

1. **Accessibility Fixes**: Currently applies basic fixes (alt text, focus, skip links)
   - Phase 2 will use AI for comprehensive DOM manipulation

2. **Compliance Scoring**: Mock calculation (15-45 violations fixed randomly)
   - Phase 2 will use axe-core for real violation detection

3. **Asset Handling**: Basic CSS/JS loaded
   - Complex single-page apps may not render correctly
   - Static websites work best

4. **S3 Fallback**: If S3 upload fails, returns base64-encoded PNG
   - Useful for local testing without AWS credentials

## Integration with React Frontend

See `packages/webapp/src/components/transformation/BeforeAfterDemo.tsx` for:
- Form input for URL entry
- Loading spinner during screenshot generation
- Toggle between before/after views
- Display of compliance metrics
- Compliance guarantee badge with CTA

## Phase 2 Enhancements (Weeks 2-10)

- [ ] Real compliance scoring with axe-core
- [ ] Browser pool for concurrent requests
- [ ] Asset extraction and recreation
- [ ] Self-hosted deployment option
- [ ] GitHub PR creation
- [ ] Vercel deployment
- [ ] Compliance guarantee service
- [ ] Insurance backing
- [ ] Monitoring/regression detection

## Support & Debugging

### Enable Verbose Logging

Set environment variable: `LOG_LEVEL=debug`

### Check Service Status

```bash
curl http://localhost:3001/health
```

### Verify Dependencies

```bash
# Check Puppeteer installation
npm list puppeteer

# Verify AWS SDK
npm list @aws-sdk/client-s3
```

### Common Issues

**"Chrome failed to start"**
- Install system Chrome/Chromium
- Set `PUPPETEER_EXECUTABLE_PATH` environment variable

**"S3 upload failed"**
- S3 upload is optional - service falls back to base64
- For production S3, configure AWS credentials

**"Timeout waiting for page"**
- Increase timeout in ScreenshotService (currently 30s)
- Some websites may need >30s to load

## Architecture

```
POST /api/screenshot
  ├─> ScreenshotService.initialize()  [Setup Puppeteer]
  ├─> ScreenshotService.captureBeforeAndAfter()
      ├─> page.goto(url)
      ├─> page.screenshot()  [BEFORE]
      ├─> uploadToS3()  [with fallback to base64]
      ├─> page.evaluate(autoFixScript)  [Inject fixes]
      ├─> page.screenshot()  [AFTER]
      ├─> uploadToS3()  [with fallback to base64]
      └─> Return result with metrics
```

---

**Created**: November 12, 2025
**Status**: Phase 1 - MVP (Before/After Demo)
**Target**: Demonstrate concept to stakeholders by EOD Week 1
