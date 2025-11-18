# AI Fix Generation API - Usage Examples

This document provides practical examples for using the AI-powered accessibility fix generation API.

## Authentication

All endpoints require authentication. Include your auth token in the header:

```bash
Authorization: Bearer <your_token>
```

---

## 1. Generate AI Fix for a Violation

**Endpoint**: `POST /api/fixes/generate`

### Request

```bash
curl -X POST https://api.wcag-ai.com/api/fixes/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "violationId": "viol_abc123",
    "wcagCriteria": "1.1.1",
    "issueType": "missing_alt_text",
    "description": "Image missing alt text for screen readers",
    "codeLanguage": "html"
  }'
```

### Response (Success)

```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "violationId": "viol_abc123",
    "wcagCriteria": "1.1.1",
    "issueType": "missing_alt_text",
    "codeLanguage": "html",
    "originalCode": "<img src=\"logo.png\">",
    "fixedCode": "<img src=\"logo.png\" alt=\"Company logo\" role=\"img\">",
    "explanation": "Added descriptive alt text to provide text alternative for image content. Alt text describes the purpose/content of the image for screen reader users.",
    "confidenceScore": 0.95,
    "reviewStatus": "approved",
    "generatedBy": "gpt-4",
    "createdAt": "2025-11-18T00:50:00Z",
    "updatedAt": "2025-11-18T00:50:00Z"
  },
  "message": "Fix generated with 95% confidence"
}
```

### Example: Color Contrast Fix

```bash
curl -X POST https://api.wcag-ai.com/api/fixes/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "violationId": "viol_def456",
    "wcagCriteria": "1.4.3",
    "issueType": "low_contrast",
    "description": "Text color contrast ratio 3.2:1 (requires 4.5:1)",
    "codeLanguage": "css"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "fix_abc111",
    "fixedCode": "color: #1a1a1a; background: #ffffff;",
    "explanation": "Increased contrast ratio from 3.2:1 to 16.1:1 (WCAG AAA compliant). Changed text color to much darker shade for better readability.",
    "confidenceScore": 0.92,
    "reviewStatus": "pending"
  }
}
```

---

## 2. Get Fix Details

**Endpoint**: `GET /api/fixes/:fixId`

### Request

```bash
curl -X GET https://api.wcag-ai.com/api/fixes/fix_xyz789 \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "violationId": "viol_abc123",
    "wcagCriteria": "1.1.1",
    "issueType": "missing_alt_text",
    "codeLanguage": "html",
    "originalCode": "<img src=\"logo.png\">",
    "fixedCode": "<img src=\"logo.png\" alt=\"Company logo\" role=\"img\">",
    "explanation": "Added descriptive alt text...",
    "confidenceScore": 0.95,
    "reviewStatus": "approved",
    "reviewedBy": "consultant@wcag-ai.com",
    "reviewedAt": "2025-11-18T01:00:00Z",
    "applications": [
      {
        "id": "app_123",
        "appliedBy": "developer@client.com",
        "appliedAt": "2025-11-18T01:15:00Z",
        "repository": "https://github.com/client/website",
        "filePath": "src/components/Header.tsx",
        "success": true,
        "verificationStatus": "verified"
      }
    ]
  }
}
```

---

## 3. Review a Fix (Approve/Reject)

**Endpoint**: `PATCH /api/fixes/:fixId/review`

### Approve a Fix

```bash
curl -X PATCH https://api.wcag-ai.com/api/fixes/fix_xyz789/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reviewStatus": "approved",
    "reviewNotes": "Fix looks good and follows best practices"
  }'
```

### Reject a Fix

```bash
curl -X PATCH https://api.wcag-ai.com/api/fixes/fix_xyz789/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reviewStatus": "rejected",
    "reviewNotes": "Alt text should be more descriptive"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "reviewStatus": "approved",
    "reviewedBy": "consultant@wcag-ai.com",
    "reviewedAt": "2025-11-18T01:00:00Z",
    "reviewNotes": "Fix looks good and follows best practices"
  },
  "message": "Fix approved"
}
```

---

## 4. Apply a Fix

**Endpoint**: `POST /api/fixes/:fixId/apply`

### Phase 1: Log Application

```bash
curl -X POST https://api.wcag-ai.com/api/fixes/fix_xyz789/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "filePath": "src/components/Header.tsx",
    "repository": "https://github.com/client/website",
    "branch": "fix/accessibility-improvements"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "app_123",
    "fixId": "fix_xyz789",
    "appliedBy": "developer@client.com",
    "appliedAt": "2025-11-18T01:15:00Z",
    "repository": "https://github.com/client/website",
    "filePath": "src/components/Header.tsx",
    "branch": "fix/accessibility-improvements",
    "success": true,
    "verificationStatus": "pending"
  },
  "message": "Fix applied (Phase 2: GitHub PR integration coming)"
}
```

---

## 5. Get All Fixes for a Scan

**Endpoint**: `GET /api/fixes/scan/:scanId`

### Request

```bash
curl -X GET https://api.wcag-ai.com/api/fixes/scan/scan_abc123 \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "success": true,
  "data": {
    "fixes": [
      {
        "id": "fix_xyz789",
        "violationId": "viol_abc123",
        "wcagCriteria": "1.1.1",
        "fixedCode": "<img src=\"logo.png\" alt=\"Company logo\">",
        "confidenceScore": 0.95,
        "reviewStatus": "approved"
      },
      {
        "id": "fix_abc111",
        "violationId": "viol_def456",
        "wcagCriteria": "1.4.3",
        "fixedCode": "color: #1a1a1a; background: #ffffff;",
        "confidenceScore": 0.92,
        "reviewStatus": "pending"
      }
    ],
    "stats": {
      "totalViolations": 10,
      "fixesGenerated": 2,
      "fixesApproved": 1,
      "fixesApplied": 1,
      "averageConfidence": "0.94"
    }
  }
}
```

---

## 6. Get Remediation Metrics

**Endpoint**: `GET /api/fixes/metrics`

### Request

```bash
curl -X GET https://api.wcag-ai.com/api/fixes/metrics \
  -H "Authorization: Bearer <token>"
```

### Response

```json
{
  "success": true,
  "data": {
    "totalFixes": 127,
    "approvedFixes": 115,
    "averageConfidence": "0.89",
    "totalApplications": 98,
    "successfulApplications": 95,
    "successRate": "96.9%",
    "totalGenerationCost": "12.45"
  }
}
```

---

## Error Handling

### Missing Required Fields

```json
{
  "success": false,
  "error": "Missing required fields: violationId, wcagCriteria, issueType"
}
```

### Violation Not Found

```json
{
  "success": false,
  "error": "Violation not found"
}
```

### Fix Already Exists

```json
{
  "success": true,
  "data": {
    "id": "fix_xyz789",
    "violationId": "viol_abc123"
  },
  "message": "Fix already generated for this violation"
}
```

### Unapproved Fix Application

```json
{
  "success": false,
  "error": "Fix must be approved before applying"
}
```

---

## Mock Fix Development

When no AI API key is configured, the service returns mock fixes:

```bash
# No OPENAI_API_KEY or ANTHROPIC_API_KEY set
curl -X POST https://api.wcag-ai.com/api/fixes/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "violationId": "viol_test",
    "wcagCriteria": "2.4.1",
    "issueType": "missing_heading_structure",
    "description": "Page missing proper heading hierarchy"
  }'
```

**Response** (Mock Fix):

```json
{
  "success": true,
  "data": {
    "id": "fix_mock_123",
    "fixedCode": "<h1>Main Title</h1>",
    "explanation": "Replaced styled div with semantic H1 heading. Proper heading hierarchy helps screen readers and keyboard users navigate content structure.",
    "confidenceScore": 0.94,
    "reviewStatus": "pending",
    "generatedBy": "gpt-4-mock"
  },
  "message": "Fix generated with 94% confidence"
}
```

---

## Frontend Integration Examples

### React Component

```typescript
import { apiService } from './services/api';

async function handleGenerateFix(violation: Violation) {
  try {
    const fix = await apiService.generateFix({
      violationId: violation.id,
      wcagCriteria: violation.wcagCriteria,
      issueType: violation.element.includes('img') ? 'missing_alt_text' : 'unknown',
      description: violation.description,
      codeLanguage: 'html',
    });

    if (fix) {
      console.log('Fix generated:', fix);
      // Show fix in modal
      setCurrentFix(fix);
      setShowFixModal(true);
    }
  } catch (error) {
    console.error('Failed to generate fix:', error);
  }
}
```

### Copy Fix Code

```typescript
async function copyFixCode(fix: Fix) {
  await navigator.clipboard.writeText(fix.fixedCode);
  showNotification('Fix code copied to clipboard!');
}
```

### Apply Fix

```typescript
async function applyFix(fix: Fix) {
  const result = await apiService.applyFix(fix.id, {
    filePath: 'src/components/Header.tsx',
    repository: 'https://github.com/myorg/website',
    branch: 'fix/accessibility',
  });

  if (result.success) {
    showNotification('Fix applied successfully!');
  }
}
```

---

## Rate Limiting

- **Default**: 100 requests per hour per user
- **Fix Generation**: 50 requests per hour (AI API costs)
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

### Rate Limit Response

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 15 minutes.",
  "retryAfter": 900
}
```

---

## Cost Estimates

Based on OpenAI GPT-4 pricing:

| Operation | Avg Tokens | Cost per Request |
|-----------|------------|------------------|
| Fix Generation (Template) | 0 | $0.00 (free) |
| Fix Generation (AI) | 500-1000 | $0.02-$0.04 |
| Batch Generation (10 fixes) | 5000-10000 | $0.20-$0.40 |

**Optimization**: Use templates for common violations (free) and AI for complex cases.

---

## Best Practices

1. **Check for Existing Fix** before generating:
   ```typescript
   const scan = await apiService.getFixesByScan(scanId);
   const existingFix = scan.fixes.find(f => f.violationId === violationId);
   ```

2. **Use Templates for Common Violations**:
   - Missing alt text
   - Low contrast
   - Missing form labels
   - Missing heading structure
   
3. **Review Low-Confidence Fixes** (<0.8):
   ```typescript
   if (fix.confidenceScore < 0.8) {
     requireManualReview(fix);
   }
   ```

4. **Batch Generate for Multiple Violations**:
   ```typescript
   const fixes = await Promise.all(
     violations.map(v => apiService.generateFix({ ... }))
   );
   ```

5. **Track Costs**:
   ```typescript
   const metrics = await apiService.getFixMetrics();
   console.log('Total cost:', metrics.totalGenerationCost);
   ```

---

## Support

For questions or issues:
- **Documentation**: https://docs.wcag-ai.com/api/fixes
- **Support Email**: support@wcag-ai.com
- **GitHub Issues**: https://github.com/aaj441/wcag-ai-platform/issues
