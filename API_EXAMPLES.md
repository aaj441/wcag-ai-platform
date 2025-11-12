# API Usage Examples - Keyword Features

This document provides practical examples of using the new keyword features in the WCAG AI Platform API.

## Table of Contents
1. [Creating Drafts with Keywords](#creating-drafts-with-keywords)
2. [Searching and Filtering](#searching-and-filtering)
3. [Template Usage](#template-usage)
4. [Alert Management](#alert-management)
5. [Advanced Use Cases](#advanced-use-cases)

---

## Creating Drafts with Keywords

### Basic Draft with Automatic Keyword Extraction

```bash
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "client@example.com",
    "recipientName": "Jane Smith",
    "company": "Example Corp",
    "subject": "Accessibility Audit Results",
    "body": "Dear Jane,\n\nWe have completed your accessibility audit...",
    "violations": [
      {
        "id": "v1",
        "url": "https://example.com",
        "pageTitle": "Homepage",
        "element": "button.submit",
        "wcagCriteria": "1.4.3",
        "wcagLevel": "AA",
        "severity": "critical",
        "description": "Insufficient color contrast on submit button",
        "recommendation": "Increase contrast ratio to 4.5:1",
        "priority": 1,
        "affectedUsers": "Users with low vision"
      }
    ]
  }'
```

**Response includes:**
```json
{
  "success": true,
  "data": {
    "id": "draft123",
    "keywords": ["wcag-1.4.3", "aa", "critical", "contrast", "color", "button", "low-vision"],
    "keywordTags": ["contrast", "color-contrast"],
    ...
  }
}
```

### Draft with Template Substitution

```bash
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "admin@company.com",
    "recipientName": "John Doe",
    "company": "ACME Inc",
    "subject": "{{severity_level}} {{violation_type}} Issues at {{company}}",
    "body": "Dear {{recipient_name}},\n\nOur audit found {{total_violations}} violations:\n- Critical: {{critical_count}}\n- High: {{high_count}}\n- Medium: {{medium_count}}\n- Low: {{low_count}}\n\nThe primary issue is {{violation_type}} affecting {{affected_users}}.",
    "violations": [...],
    "useTemplate": true
  }'
```

**Result:**
- Subject: "critical Color Contrast Issues at ACME Inc"
- Body variables replaced with actual values

### Draft with Alert Triggers

```bash
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "legal@company.com",
    "subject": "Urgent: Compliance Issues",
    "body": "Critical accessibility issues creating lawsuit risk...",
    "violations": [
      {
        "id": "v1",
        "severity": "critical",
        "description": "Missing alt text creates ADA compliance lawsuit risk",
        ...
      }
    ]
  }'
```

**Response includes alerts:**
```json
{
  "data": {
    "id": "draft456",
    "alerts": [
      {
        "id": "alert-123",
        "trigger": {
          "keyword": "lawsuit risk",
          "priority": "critical",
          "alertType": "lawsuit_risk",
          "message": "Explicit lawsuit risk mentioned - immediate action required"
        }
      }
    ]
  }
}
```

---

## Searching and Filtering

### Search by Keyword

Find drafts containing specific keywords:

```bash
# Find drafts with contrast issues
curl "http://localhost:3001/api/drafts?keyword=contrast"

# Find drafts with critical severity
curl "http://localhost:3001/api/drafts?keyword=critical"

# Find drafts mentioning WCAG 1.4.3
curl "http://localhost:3001/api/drafts?keyword=wcag-1.4.3"
```

### Filter by Tag

Find drafts by category tags:

```bash
# Form accessibility issues
curl "http://localhost:3001/api/drafts?tag=forms"

# Navigation issues
curl "http://localhost:3001/api/drafts?tag=navigation"

# Alt text issues
curl "http://localhost:3001/api/drafts?tag=alternative"
```

### Filter by Violation Type

Find drafts by high-level violation types:

```bash
# Color contrast issues
curl "http://localhost:3001/api/drafts?violationType=color-contrast"

# Missing alt text
curl "http://localhost:3001/api/drafts?violationType=missing-alt-text"

# Keyboard navigation issues
curl "http://localhost:3001/api/drafts?violationType=keyboard-navigation"
```

### Combined Filters

Combine multiple filters:

```bash
# Draft status + keyword
curl "http://localhost:3001/api/drafts?status=pending_review&keyword=critical"

# Keyword + tag
curl "http://localhost:3001/api/drafts?keyword=wcag-1.4.3&tag=contrast"

# Text search + violation type
curl "http://localhost:3001/api/drafts?search=TechCorp&violationType=form-accessibility"
```

### Get Keywords for a Draft

```bash
curl "http://localhost:3001/api/drafts/draft123/keywords"
```

**Response:**
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

---

## Template Usage

### Available Template Variables

| Variable | Description | Example Output |
|----------|-------------|----------------|
| `{{recipient_name}}` | Recipient's name | John Doe |
| `{{company}}` | Company name | ACME Inc |
| `{{violation_type}}` | Primary violation type | Color Contrast |
| `{{wcag_criterion}}` | WCAG criterion | 1.4.3 |
| `{{impact_level}}` | Impact level | Critical Impact |
| `{{severity_level}}` | Severity | critical |
| `{{total_violations}}` | Total count | 5 |
| `{{critical_count}}` | Critical count | 2 |
| `{{high_count}}` | High count | 2 |
| `{{medium_count}}` | Medium count | 1 |
| `{{low_count}}` | Low count | 0 |
| `{{affected_users}}` | Affected users | Users with low vision |
| `{{primary_issue}}` | Primary issue description | Insufficient color contrast |

### Template Examples

#### Formal Business Template

```bash
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "WCAG {{wcag_criterion}} Compliance - {{company}}",
    "body": "Dear {{recipient_name}},\n\nThis letter serves to inform {{company}} of {{total_violations}} WCAG compliance violations identified during our recent audit.\n\nSeverity Breakdown:\n• Critical: {{critical_count}}\n• High: {{high_count}}\n• Medium: {{medium_count}}\n• Low: {{low_count}}\n\nPrimary Concern: {{violation_type}} ({{impact_level}})\n\nThese issues primarily affect {{affected_users}} and require immediate remediation to ensure ADA compliance.\n\nBest regards,\nWCAG AI Platform",
    "useTemplate": true,
    ...
  }'
```

#### Friendly Template

```bash
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Quick Update: {{violation_type}} Issues",
    "body": "Hi {{recipient_name}}! 👋\n\nJust wanted to give you a heads-up about some {{violation_type}} issues we found on the {{company}} website.\n\nHere'\''s the quick breakdown:\n✓ {{critical_count}} critical items\n✓ {{high_count}} high priority\n✓ {{medium_count}} medium priority\n\nThe main thing to focus on is the {{primary_issue}}. This affects {{affected_users}}, so it'\''s worth prioritizing.\n\nWant to hop on a call to discuss? 📞\n\nThanks!",
    "useTemplate": true,
    ...
  }'
```

### Regenerate Draft with New Template

```bash
curl -X POST http://localhost:3001/api/drafts/draft123/regenerate \
  -H "Content-Type: application/json" \
  -d '{
    "subjectTemplate": "Action Required: {{total_violations}} {{severity_level}} Issues",
    "bodyTemplate": "Dear {{recipient_name}},\n\nImmediate action required for {{company}}.\n\nWe have identified {{critical_count}} critical violations that require your immediate attention.\n\nViolation Type: {{violation_type}}\nImpact: {{impact_level}}\nAffected Users: {{affected_users}}"
  }'
```

---

## Alert Management

### Get Alert Summary

```bash
curl http://localhost:3001/api/alerts/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
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
}
```

### Get All Unacknowledged Alerts

```bash
curl http://localhost:3001/api/alerts
```

### Get Alerts by Priority

```bash
# Critical alerts only
curl http://localhost:3001/api/alerts/priority/critical

# High priority alerts
curl http://localhost:3001/api/alerts/priority/high
```

### Get Alerts by Type

```bash
# Lawsuit risk alerts
curl http://localhost:3001/api/alerts/type/lawsuit_risk

# Critical severity alerts
curl http://localhost:3001/api/alerts/type/critical_severity

# Compliance issues
curl http://localhost:3001/api/alerts/type/compliance_issue

# Immediate action alerts
curl http://localhost:3001/api/alerts/type/immediate_action
```

### Get Alert Statistics

```bash
curl http://localhost:3001/api/alerts/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
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
}
```

### Acknowledge an Alert

```bash
curl -X POST http://localhost:3001/api/alerts/alert-123/acknowledge \
  -H "Content-Type: application/json" \
  -d '{
    "acknowledgedBy": "admin@example.com"
  }'
```

### Get Alerts for a Specific Draft

```bash
curl http://localhost:3001/api/drafts/draft123/alerts
```

### Send Pending Notifications

```bash
curl -X POST http://localhost:3001/api/alerts/notify
```

---

## Advanced Use Cases

### Workflow 1: Create Draft → Check Alerts → Notify Team

```bash
# Step 1: Create draft
RESPONSE=$(curl -s -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{...}')

# Step 2: Extract draft ID
DRAFT_ID=$(echo $RESPONSE | jq -r '.data.id')

# Step 3: Check for alerts
ALERTS=$(curl -s "http://localhost:3001/api/drafts/$DRAFT_ID/alerts")
ALERT_COUNT=$(echo $ALERTS | jq '.data | length')

# Step 4: If critical alerts, send notifications
if [ $ALERT_COUNT -gt 0 ]; then
  curl -X POST http://localhost:3001/api/alerts/notify
fi
```

### Workflow 2: Bulk Analysis

```bash
# Get all drafts with critical keywords
CRITICAL_DRAFTS=$(curl -s "http://localhost:3001/api/drafts?keyword=critical")

# Count by violation type
curl -s "http://localhost:3001/api/drafts?violationType=color-contrast" | jq '.data | length'
curl -s "http://localhost:3001/api/drafts?violationType=missing-alt-text" | jq '.data | length'
curl -s "http://localhost:3001/api/drafts?violationType=keyboard-navigation" | jq '.data | length'
```

### Workflow 3: Alert Dashboard

```bash
# Get comprehensive alert data
echo "=== Alert Dashboard ==="
echo ""

# Overall statistics
echo "Overall Statistics:"
curl -s http://localhost:3001/api/alerts/statistics | jq '.data'

echo ""
echo "Critical Alerts:"
curl -s http://localhost:3001/api/alerts/priority/critical | jq '.data | length'

echo ""
echo "Lawsuit Risk Alerts:"
curl -s http://localhost:3001/api/alerts/type/lawsuit_risk | jq '.data | length'

echo ""
echo "Action Required:"
curl -s http://localhost:3001/api/alerts/summary | jq '.data.actionRequired'
```

### Workflow 4: Template-Based Bulk Generation

```bash
# Create multiple drafts with same template
for CLIENT in "client1@example.com" "client2@example.com"; do
  curl -X POST http://localhost:3001/api/drafts \
    -H "Content-Type: application/json" \
    -d "{
      \"recipient\": \"$CLIENT\",
      \"subject\": \"{{violation_type}} Issues Detected\",
      \"body\": \"Dear {{recipient_name}},\\n\\nWe found {{total_violations}} issues...\",
      \"useTemplate\": true,
      \"violations\": [...]
    }"
done
```

### Workflow 5: Keyword-Based Reporting

```bash
#!/bin/bash

# Generate keyword report
echo "=== Keyword Analysis Report ==="
echo ""

# Get all drafts
DRAFTS=$(curl -s http://localhost:3001/api/drafts)

# Extract unique keywords
KEYWORDS=$(echo $DRAFTS | jq -r '.data[].keywords[]?' | sort | uniq)

# Count occurrences of each keyword
for KEYWORD in $KEYWORDS; do
  COUNT=$(curl -s "http://localhost:3001/api/drafts?keyword=$KEYWORD" | jq '.data | length')
  echo "$KEYWORD: $COUNT drafts"
done
```

---

## Error Handling

### Invalid Filters

```bash
# Invalid priority
curl http://localhost:3001/api/alerts/priority/invalid
# Returns: {"success": false, "error": "Invalid priority..."}

# Invalid type
curl http://localhost:3001/api/alerts/type/invalid
# Returns: {"success": false, "error": "Invalid type..."}
```

### Missing Required Fields

```bash
# Missing acknowledgedBy
curl -X POST http://localhost:3001/api/alerts/alert-123/acknowledge \
  -H "Content-Type: application/json" \
  -d '{}'
# Returns: {"success": false, "error": "Missing required field: acknowledgedBy"}
```

### Not Found

```bash
# Non-existent draft
curl http://localhost:3001/api/drafts/nonexistent/keywords
# Returns: {"success": false, "error": "Draft not found"}

# Non-existent alert
curl -X POST http://localhost:3001/api/alerts/nonexistent/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"acknowledgedBy": "admin@example.com"}'
# Returns: {"success": false, "error": "Alert not found"}
```

---

## Integration with Frontend

### React Example

```javascript
// Search drafts by keyword
const searchByKeyword = async (keyword) => {
  const response = await fetch(
    `http://localhost:3001/api/drafts?keyword=${encodeURIComponent(keyword)}`
  );
  const data = await response.json();
  return data.data;
};

// Create draft with template
const createDraftWithTemplate = async (draftData) => {
  const response = await fetch('http://localhost:3001/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...draftData,
      useTemplate: true
    })
  });
  const result = await response.json();
  
  // Check for alerts
  if (result.data.alerts && result.data.alerts.length > 0) {
    console.warn('Draft created with alerts:', result.data.alerts);
  }
  
  return result.data;
};

// Monitor alerts
const checkAlerts = async () => {
  const response = await fetch('http://localhost:3001/api/alerts/summary');
  const { data } = await response.json();
  
  if (data.actionRequired) {
    showNotification(`${data.summary.critical} critical alerts require attention!`);
  }
  
  return data;
};
```

---

## Best Practices

1. **Use Templates**: Always set `useTemplate: true` when creating drafts to leverage keyword substitution
2. **Monitor Alerts**: Regularly poll `/api/alerts/summary` for critical issues
3. **Filter Effectively**: Use specific keywords/tags for better search results
4. **Acknowledge Alerts**: Mark alerts as acknowledged to maintain clean alert lists
5. **Batch Operations**: Use filters to process multiple drafts at once
6. **Error Handling**: Always check `success` field in responses
7. **Keyword Analysis**: Use `/keywords` endpoint to understand draft content
8. **Template Testing**: Test template variables before bulk generation

---

For more information, see [KEYWORD_FEATURES.md](./KEYWORD_FEATURES.md)
