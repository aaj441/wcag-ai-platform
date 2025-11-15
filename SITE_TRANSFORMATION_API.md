# Site Transformation API Documentation

## Overview

The Site Transformation API provides AI-powered WCAG remediation capabilities, transforming existing websites to be fully compliant with WCAG 2.1 AA/AAA standards.

## Strategic Pivot

This represents the platform's evolution from a violation scanner to a complete AI-powered remediation platform:

**Before:** "Here are your violations" → Client must implement fixes
**After:** "Here's your compliant website" → Ready to deploy

## Endpoints

### POST /api/transform

Start a new site transformation.

**Request Body:**
```json
{
  "url": "https://example.com",
  "wcagLevel": "AA",
  "preserveDesign": true,
  "generateReport": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transform_1234567890_abc123",
    "url": "https://example.com",
    "status": "complete",
    "originalSite": {
      "url": "https://example.com",
      "html": "<html>...</html>",
      "css": "body { ... }",
      "metadata": {
        "title": "Example Site",
        "description": "An example",
        "viewport": "width=device-width"
      },
      "assets": {
        "images": ["/logo.png"],
        "fonts": [],
        "scripts": []
      }
    },
    "transformedSite": {
      "html": "<html>...compliant...</html>",
      "css": "body { ... } /* accessibility enhancements */"
    },
    "violations": [
      {
        "wcagCriteria": "1.1.1",
        "severity": "critical",
        "description": "Image missing alt text",
        "fixed": true,
        "elementSelector": "img",
        "codeSnippet": "<img src='/logo.png'>"
      }
    ],
    "complianceScore": {
      "before": 60,
      "after": 95,
      "improvement": 35
    },
    "createdAt": "2025-11-14T23:00:00.000Z",
    "completedAt": "2025-11-14T23:05:00.000Z"
  }
}
```

### GET /api/transform/:id

Get transformation details.

**Parameters:**
- `id` - Transformation ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transform_1234567890_abc123",
    "url": "https://example.com",
    "status": "complete",
    "violations": [...],
    "complianceScore": {
      "before": 60,
      "after": 95,
      "improvement": 35
    },
    "screenshotUrls": {
      "before": "https://storage.example.com/before.png",
      "after": "https://storage.example.com/after.png"
    }
  }
}
```

### GET /api/transform/:id/status

Check transformation status.

**Parameters:**
- `id` - Transformation ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transform_1234567890_abc123",
    "status": "transforming",
    "progress": 65,
    "currentStep": "Applying fixes",
    "estimatedTimeRemaining": 120,
    "complianceScore": {
      "before": 60,
      "after": 0,
      "improvement": 0
    }
  }
}
```

**Status Values:**
- `pending` - Transformation queued
- `extracting` - Extracting site content
- `analyzing` - Analyzing for violations
- `transforming` - Applying fixes
- `complete` - Transformation complete
- `failed` - Transformation failed

### POST /api/transform/:id/deploy/github

Create GitHub PR with transformation fixes.

**Parameters:**
- `id` - Transformation ID

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repo",
  "branchName": "wcag-compliance-fixes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prUrl": "https://github.com/username/repo/pull/123",
    "branchName": "wcag-compliance-fixes"
  }
}
```

### POST /api/transform/:id/deploy/package

Generate self-hosted deployment package.

**Parameters:**
- `id` - Transformation ID

**Response:**
```json
{
  "success": true,
  "data": {
    "zipUrl": "https://storage.example.com/transformations/[id]/package.zip",
    "deploymentGuide": "# Deployment Guide\n\n...",
    "testResults": {
      "complianceScore": 95,
      "violationsFixed": 12,
      "totalViolations": 12
    }
  }
}
```

## Architecture

### Transformation Pipeline

```
1. Extract Site
   ↓
2. Analyze Violations (axe-core)
   ↓
3. Generate Fixes
   ├─ Template-based (80% of cases)
   └─ AI-powered (20% of cases)
   ↓
4. Apply Fixes
   ├─ Preserve design
   └─ Maintain functionality
   ↓
5. Verify Compliance
   ↓
6. Generate Screenshots
   ↓
7. Create Deployment Package
```

### AI Fix Generation

The platform uses a hybrid approach:

1. **Template-Based Fixes** (Fast Path - 80%)
   - Pre-built fixes for common violations
   - Instant application
   - High confidence (0.9+)

2. **AI-Powered Fixes** (Intelligent Path - 20%)
   - OpenAI GPT-4 or Anthropic Claude
   - Context-aware generation
   - Complex violation handling
   - Confidence scoring (0.75-0.95)

### Fix Confidence Scoring

- **0.9-1.0:** High confidence - Auto-approved
- **0.8-0.89:** Medium confidence - Review recommended
- **0.7-0.79:** Low confidence - Review required
- **<0.7:** Very low confidence - Manual intervention needed

## Business Model Integration

### Tiered Pricing Support

The API supports the strategic pivot to tiered pricing:

**Basic ($5,000-10,000)**
- Small sites (1-5 pages)
- WCAG 2.1 AA compliance
- GitHub PR delivery

**Pro ($15,000-25,000)**
- Medium sites (6-25 pages)
- WCAG 2.1 AAA compliance
- Multiple deployment options
- Custom styling preservation

**Enterprise ($25,000+)**
- Large sites (26+ pages)
- Custom integrations
- Advanced compliance (AAA)
- SLA backing
- Insurance coverage

### Compliance Guarantee

The transformation service enables 100% compliance guarantees:

1. **Automated Verification**
   - Re-run axe-core after transformation
   - Verify all violations resolved
   - Generate compliance certificate

2. **SLA Tracking**
   - 24-48 hour transformation time
   - 99.9% uptime guarantee
   - Automatic remediation

3. **Insurance Backing**
   - Errors & Omissions insurance
   - Legal compliance protection
   - Risk mitigation for clients

## Configuration

### Environment Variables

```bash
# AI Provider Configuration
OPENAI_API_KEY=sk-...          # OpenAI API key (optional)
ANTHROPIC_API_KEY=sk-ant-...   # Anthropic API key (optional)
AI_MODEL=gpt-4                 # Model to use (default: gpt-4)

# Storage Configuration
AWS_S3_BUCKET=wcagai-screenshots
AWS_REGION=us-east-1
S3_PUBLIC_BUCKET_URL=https://wcagai-screenshots.s3.us-east-1.amazonaws.com

# GitHub Integration (optional)
GITHUB_TOKEN=ghp_...           # For PR creation
GITHUB_APP_ID=123456           # GitHub App ID
GITHUB_APP_PRIVATE_KEY=...     # GitHub App private key
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Resource not found
- `500` - Internal server error

## Rate Limiting

Transformation endpoints are rate-limited:

- **Free Tier:** 5 transformations/hour
- **Basic Tier:** 20 transformations/hour
- **Pro Tier:** 50 transformations/hour
- **Enterprise Tier:** Unlimited

## Examples

### Complete Transformation Workflow

```javascript
// 1. Start transformation
const response = await fetch('/api/transform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    wcagLevel: 'AA',
    preserveDesign: true,
  }),
});
const { data: transformation } = await response.json();

// 2. Poll for status
let status;
do {
  const statusResponse = await fetch(`/api/transform/${transformation.id}/status`);
  const { data } = await statusResponse.json();
  status = data.status;
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
} while (status !== 'complete' && status !== 'failed');

// 3. Get full details
const detailsResponse = await fetch(`/api/transform/${transformation.id}`);
const { data: details } = await detailsResponse.json();

// 4. Deploy to GitHub
const deployResponse = await fetch(
  `/api/transform/${transformation.id}/deploy/github`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoUrl: 'https://github.com/myorg/myrepo',
      branchName: 'accessibility-fixes',
    }),
  }
);
const { data: deployment } = await deployResponse.json();
console.log('PR created:', deployment.prUrl);
```

### Using AI Service Directly

```javascript
import { aiService } from './services/AIService';

// Generate fix for a single violation
const fix = await aiService.generateFix({
  violationId: 'v123',
  wcagCriteria: '1.1.1',
  issueType: 'missing_alt_text',
  description: 'Image missing alt text',
  codeSnippet: '<img src="/logo.png">',
  elementSelector: 'img',
});

console.log(fix.fixedCode);     // '<img src="/logo.png" alt="Company logo">'
console.log(fix.explanation);   // 'Added descriptive alt text...'
console.log(fix.confidence);    // 0.95

// Batch generate fixes
const fixes = await aiService.generateBatchFixes([
  { violationId: 'v1', wcagCriteria: '1.1.1', ... },
  { violationId: 'v2', wcagCriteria: '1.4.3', ... },
  { violationId: 'v3', wcagCriteria: '2.4.1', ... },
]);
```

## Support

For questions or issues:
- GitHub Issues: https://github.com/aaj441/wcag-ai-platform/issues
- Email: support@wcagai.com
- Documentation: https://docs.wcagai.com

## See Also

- [Strategic Pivot Document](../STRATEGIC_PIVOT_AI_SITE_TRANSFORMATION.md)
- [Main README](../README.md)
- [Deployment Guide](../DEPLOYMENT_HARMONY_GUIDE.md)
