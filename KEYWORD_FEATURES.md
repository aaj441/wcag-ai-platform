# WCAG AI Platform - Keyword Features Documentation

This document describes the keyword extraction, search, template substitution, and alerting features added to the WCAG AI Platform.

## Overview

The keyword features enhance the platform's ability to:
1. Extract and categorize keywords from WCAG violation descriptions
2. Search and filter drafts by keywords and tags
3. Use template variables for personalized email generation
4. Trigger alerts for critical keywords like "lawsuit risk"

## Features

### 1. Keyword Extraction Service

Location: `packages/api/src/services/keywordExtractor.ts`

The keyword extraction service analyzes violation descriptions using NLP techniques to extract:
- **Keywords**: Specific terms related to WCAG criteria, severity, elements, and affected users
- **Tags**: Categorized groups like "contrast", "navigation", "forms", "alternative"
- **Violation Types**: High-level categorization (e.g., "color-contrast", "keyboard-navigation")
- **Impact Levels**: Severity-based impact assessment

#### Key Functions

```typescript
// Extract keywords from a single violation
extractKeywords(violation: LegacyViolation): ExtractedKeywords

// Extract keywords from multiple violations
extractKeywordsFromViolations(violations: LegacyViolation[]): {
  allKeywords: string[];
  allTags: string[];
  violationTypes: string[];
  highestImpactLevel: string;
}

// Check for alert triggers in text
checkAlertTriggers(text: string): AlertTrigger[]

// Check for alert triggers in violations
checkViolationAlerts(violations: LegacyViolation[]): AlertTrigger[]

// Generate search-friendly tags
generateSearchTags(keywords: string[]): string[]
```

#### Keyword Categories

The service recognizes these WCAG-related categories:
- **contrast**: Color contrast and visibility issues
- **navigation**: Keyboard navigation and focus management
- **alternative**: Alt text and alternative content
- **structure**: Semantic HTML and document structure
- **forms**: Form inputs, labels, and validation
- **multimedia**: Video, audio, captions, and transcripts
- **timing**: Timeouts, animations, and automatic updates
- **cognitive**: Clear language and predictable behavior

### 2. Enhanced EmailDraft Model

The `EmailDraft` type now includes:

```typescript
interface EmailDraft {
  // ... existing fields
  keywords?: string[];        // Extracted keywords
  keywordTags?: string[];     // Categorized tags
}
```

These fields are automatically populated when creating drafts with violations.

### 3. Search & Filter API Endpoints

#### GET /api/drafts

Enhanced with new query parameters:

```
GET /api/drafts?keyword=contrast
GET /api/drafts?tag=forms
GET /api/drafts?violationType=color-contrast
GET /api/drafts?status=draft&keyword=critical
```

Query Parameters:
- `status`: Filter by draft status
- `search`: Text search in recipient, subject, company, body
- `keyword`: Filter by specific keywords
- `tag`: Filter by keyword tags
- `violationType`: Filter by violation type tags

#### GET /api/drafts/:id/keywords

Get extracted keywords for a specific draft:

```json
{
  "success": true,
  "data": {
    "keywords": ["wcag-1.4.3", "aa", "critical", "contrast", "color"],
    "keywordTags": ["contrast", "color-contrast"],
    "violations": 2
  }
}
```

### 4. Email Template Service

Location: `packages/api/src/services/templateService.ts`

#### Template Variables

The following template variables are supported:

- `{{recipient_name}}` - Recipient's name
- `{{company}}` - Company name
- `{{violation_type}}` - Primary violation type (formatted)
- `{{wcag_criterion}}` - WCAG criterion number
- `{{impact_level}}` - Impact level (formatted)
- `{{severity_level}}` - Severity (critical/high/medium/low)
- `{{total_violations}}` - Total number of violations
- `{{critical_count}}` - Number of critical violations
- `{{high_count}}` - Number of high severity violations
- `{{medium_count}}` - Number of medium severity violations
- `{{low_count}}` - Number of low severity violations
- `{{affected_users}}` - Description of affected users
- `{{primary_issue}}` - Description of primary issue

#### Usage Example

```json
POST /api/drafts
{
  "recipient": "user@example.com",
  "recipientName": "John Doe",
  "company": "ACME Corp",
  "subject": "{{severity_level}} Issues at {{company}}",
  "body": "Dear {{recipient_name}},\n\nWe found {{total_violations}} violations...",
  "violations": [...],
  "useTemplate": true
}
```

#### Built-in Templates

Three pre-configured templates are available:
1. **Formal**: Professional tone for corporate communications
2. **Friendly**: Casual tone for existing relationships
3. **Urgent**: High-priority tone for critical issues

#### POST /api/drafts/:id/regenerate

Regenerate draft content with custom templates:

```json
POST /api/drafts/draft123/regenerate
{
  "subjectTemplate": "{{severity_level}} Issues at {{company}}",
  "bodyTemplate": "Dear {{recipient_name}},\n\nWe found {{total_violations}} violations..."
}
```

### 5. Keyword-Based Alerting System

Location: `packages/api/src/services/alertService.ts`

#### Alert Triggers

The system monitors for these critical keywords:

**Lawsuit Risk (Critical Priority)**
- "lawsuit"
- "legal"
- "ada violation"
- "lawsuit risk"

**Critical Severity (Critical Priority)**
- "critical"

**Immediate Action (High Priority)**
- "urgent"

**Compliance Issues (High Priority)**
- "compliance"

#### Alert API Endpoints

##### GET /api/alerts
Get all unacknowledged alerts

##### GET /api/alerts/summary
Get alert summary with counts:

```json
{
  "alerts": [...],
  "summary": {
    "total": 4,
    "critical": 4,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "actionRequired": true
}
```

##### GET /api/alerts/statistics
Get comprehensive alert statistics:

```json
{
  "total": 4,
  "acknowledged": 0,
  "unacknowledged": 4,
  "notified": 0,
  "byPriority": {
    "critical": 4,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "byType": {
    "lawsuit_risk": 2,
    "critical_severity": 2,
    "immediate_action": 0,
    "compliance_issue": 0
  }
}
```

##### GET /api/alerts/priority/:priority
Get alerts by priority level (critical, high, medium, low)

##### GET /api/alerts/type/:type
Get alerts by type (lawsuit_risk, critical_severity, immediate_action, compliance_issue)

##### POST /api/alerts/:id/acknowledge
Acknowledge an alert:

```json
POST /api/alerts/alert123/acknowledge
{
  "acknowledgedBy": "admin@example.com"
}
```

##### POST /api/alerts/notify
Send pending notifications (placeholder for email/webhook integration)

### 6. GET /api/drafts/:id/alerts

Get alerts for a specific draft:

```json
{
  "success": true,
  "data": [
    {
      "id": "alert-123",
      "draftId": "draft456",
      "timestamp": "2025-11-12T13:32:41.147Z",
      "trigger": {
        "keyword": "lawsuit risk",
        "priority": "critical",
        "alertType": "lawsuit_risk",
        "message": "Explicit lawsuit risk mentioned - immediate action required"
      },
      "violation": {...},
      "notified": false
    }
  ]
}
```

## Integration Examples

### Creating a Draft with Keywords

```javascript
const response = await fetch('/api/drafts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipient: 'client@example.com',
    recipientName: 'Jane Smith',
    company: 'Example Inc',
    subject: 'Critical {{violation_type}} Issues',
    body: 'Dear {{recipient_name}},\n\nWe found {{total_violations}} issues...',
    violations: [/* violation objects */],
    useTemplate: true
  })
});

const draft = await response.json();
console.log('Keywords:', draft.data.keywords);
console.log('Alerts:', draft.data.alerts);
```

### Searching by Keywords

```javascript
// Find all drafts with contrast issues
const response = await fetch('/api/drafts?keyword=contrast');
const drafts = await response.json();

// Find drafts by violation type
const formDrafts = await fetch('/api/drafts?violationType=form-accessibility');
```

### Monitoring Alerts

```javascript
// Get unacknowledged alerts
const alertsResponse = await fetch('/api/alerts/summary');
const { alerts, summary, actionRequired } = await alertsResponse.json();

if (actionRequired) {
  console.log(`${summary.critical} critical alerts require attention!`);
}

// Acknowledge an alert
await fetch(`/api/alerts/${alertId}/acknowledge`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ acknowledgedBy: 'admin@example.com' })
});
```

## Testing

Run the keyword extraction tests:

```bash
cd packages/api
npx tsx src/__tests__/keywordExtractor.test.ts
```

## Future Enhancements

1. **Machine Learning**: Train ML models on historical data for better keyword extraction
2. **Custom Keywords**: Allow users to define custom alert keywords
3. **Webhook Integration**: Send alerts to Slack, Teams, or custom webhooks
4. **Advanced NLP**: Use external NLP services (spaCy, NLTK) for better extraction
5. **Keyword Analytics**: Track keyword trends over time
6. **Multi-language Support**: Extract keywords in multiple languages

## Architecture Notes

- Keywords are extracted automatically when creating drafts with violations
- Alert checking happens synchronously during draft creation
- All alert data is stored in-memory (production should use database)
- Template substitution is performed server-side before saving
- Search/filter operations are performed in-memory on the store

## Performance Considerations

- Keyword extraction is O(n*m) where n = violations, m = avg description length
- Alert checking is O(n*k) where k = number of alert keywords
- Search filtering is O(n) where n = total drafts
- Consider implementing caching for large datasets
- Database indices recommended on keywords and keywordTags fields in production
