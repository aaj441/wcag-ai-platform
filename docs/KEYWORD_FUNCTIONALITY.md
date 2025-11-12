# Keyword Functionality Documentation

## Overview

The WCAG AI Platform now includes comprehensive keyword extraction and search functionality to enable better violation summarization, search capabilities, and dynamic email personalization.

## Features

### 1. Automatic Keyword Extraction

Keywords are automatically extracted from email drafts based on:
- **WCAG Criteria Mappings**: 45+ WCAG success criteria mapped to relevant accessibility keywords
- **Violation Descriptions**: NLP-based extraction from violation text
- **Severity Levels**: Violations are tagged with their severity (critical, high, medium, low)

Example keywords extracted:
- From WCAG 1.4.3: "color contrast", "text readability", "visual", "contrast ratio"
- From WCAG 1.1.1: "alt text", "non-text content", "images", "screen reader"
- From WCAG 2.1.1: "keyboard", "navigation", "operable", "keyboard accessible"

### 2. Manual Keyword Tagging

Users can add custom keyword tags to drafts for additional categorization:
- `keywordTags` field in the EmailDraft model
- Displayed separately from auto-extracted keywords in the UI

### 3. Keyword-Based Search & Filtering

#### API Endpoints

**Filter drafts by keywords:**
```bash
GET /api/drafts?keywords=contrast,keyboard
```

**Filter drafts by status:**
```bash
GET /api/drafts?status=pending_review
```

**Combined filtering:**
```bash
GET /api/drafts?keywords=critical&status=draft
```

#### UI Components

- **Keyword Filter Input**: Search bar for filtering drafts by comma-separated keywords
- **Draft Cards**: Display up to 3 keywords with "+" indicator for more
- **Detail View**: Shows all auto-extracted keywords and manual tags

### 4. Priority Alerting

The system generates alerts based on critical keywords found in drafts:

#### Alert Rules

| Keyword | Type | Severity | Message |
|---------|------|----------|---------|
| "lawsuit risk" | critical | high | Legal liability detected - immediate attention required |
| "legal liability" | critical | high | Legal liability mentioned - urgent review needed |
| "critical severity" | priority | high | Critical violations detected - prioritize for review |
| "ada violation" | critical | high | ADA compliance violation - high priority |
| "wcag failure" | priority | medium | WCAG compliance failure detected |
| "blocking issue" | priority | high | Blocking accessibility issue - prompt action required |

#### API Endpoints

**Get alerts for a specific draft:**
```bash
GET /api/drafts/:id/alerts
```

Response:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-...",
        "draftId": "draft1",
        "type": "critical",
        "severity": "high",
        "message": "2 critical severity violation(s) found - immediate review required",
        "keywords": ["critical"],
        "createdAt": "2025-11-12T..."
      }
    ],
    "stats": {
      "total": 1,
      "critical": 1,
      "priority": 0,
      "warning": 0
    }
  }
}
```

**Get all drafts needing attention:**
```bash
GET /api/drafts/alerts/attention
```

### 5. Dynamic Email Templates

Email templates support placeholder substitution for personalization:

#### Available Placeholders

- `{{violation_count}}` - Total number of violations
- `{{critical_count}}` - Number of critical severity violations
- `{{high_count}}` - Number of high severity violations
- `{{violation_type}}` - Description of the first violation
- `{{wcag_criterion}}` - WCAG criterion of the first violation
- `{{wcag_criteria_list}}` - Comma-separated list of all WCAG criteria
- `{{primary_keywords}}` - Top 5 keywords extracted
- `{{severity_level}}` - Severity level of the first violation

#### Example Usage

**Template:**
```
Dear {{recipient_name}},

We found {{violation_count}} accessibility issues on your website, including {{critical_count}} critical violations.

Primary concerns: {{primary_keywords}}
WCAG criteria affected: {{wcag_criteria_list}}
```

**Result:**
```
Dear Sarah,

We found 3 accessibility issues on your website, including 1 critical violations.

Primary concerns: color contrast, alt text, keyboard, form, button
WCAG criteria affected: 1.4.3, 1.1.1, 2.1.1
```

## Data Model

### EmailDraft Interface

```typescript
interface EmailDraft {
  id: string;
  recipient: string;
  // ... other fields
  
  // New keyword fields
  keywords?: string[];        // Auto-extracted keywords
  keywordTags?: string[];     // Manual keyword tags
}
```

## Usage Examples

### Backend (API)

```typescript
import { autoTagDraft } from './services/keywordExtractor';
import { generateAlertsForDraft } from './services/keywordAlerting';

// Auto-tag a draft
const { keywords, containsCritical } = autoTagDraft(violations, emailBody);

// Generate alerts
const alerts = generateAlertsForDraft(draft);
```

### Frontend (UI)

```typescript
// Filter drafts by keyword
const filteredDrafts = drafts.filter(d => {
  const draftKeywords = [...(d.keywords || []), ...(d.keywordTags || [])];
  return draftKeywords.some(k => k.includes(searchKeyword));
});

// Display keywords
{draft.keywords?.map(keyword => (
  <span key={keyword} className="keyword-badge">
    🔑 {keyword}
  </span>
))}
```

## Testing

### Running Tests

```bash
# Unit tests
cd packages/api
npm test

# Manual test script
npx tsx src/testKeywords.ts
```

### Test Coverage

- ✅ Keyword extraction from violations
- ✅ Multiple violation keyword merging
- ✅ Template placeholder generation
- ✅ Template substitution
- ✅ Auto-tagging functionality
- ✅ Critical violation detection
- ✅ Alert generation

## Implementation Notes

### WCAG Keyword Mappings

The system includes hardcoded mappings for all major WCAG 2.2 success criteria. These provide:
- **Consistency**: Same keywords for same criteria across all drafts
- **Performance**: No API calls or heavy NLP processing needed
- **Accuracy**: Curated by accessibility experts

### Backward Compatibility

- Existing drafts without keywords continue to work
- Keywords are optional fields
- No breaking changes to existing API contracts

### Performance Considerations

- Keywords are extracted once on draft creation/update
- Keyword filtering uses in-memory array operations
- Alert generation is on-demand via API endpoints

## Future Enhancements

Potential improvements:
1. Machine learning-based keyword extraction
2. Keyword synonym support
3. Keyword trending and analytics
4. Custom alert rule configuration
5. Keyword-based draft recommendations
6. Export/import of keyword taxonomies

## Support

For questions or issues related to keyword functionality:
- Check the test files for usage examples
- Review API endpoint documentation
- See `keywordExtractor.ts` for available functions
