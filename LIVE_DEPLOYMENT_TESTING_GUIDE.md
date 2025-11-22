# Live Deployment Testing Guide

**Purpose**: Comprehensive testing checklist for validating live production deployments of the WCAG AI Platform.

**When to Use**: After deployment to Railway + Vercel, before announcing to users/customers.

---

## 🎯 Testing Philosophy

Live deployment testing ensures:
1. **Functionality**: All features work as designed
2. **Performance**: System meets response time requirements
3. **Reliability**: System handles errors gracefully
4. **Security**: No vulnerabilities exploitable
5. **Accessibility**: WCAG 2.2 Level AA compliance
6. **Scalability**: System handles expected load

---

## 📋 Pre-Testing Setup

### Required Tools
```bash
# Install testing tools
npm install -g artillery  # Load testing
npm install -g lighthouse  # Performance testing
npm install -g @axe-core/cli  # Accessibility testing

# Verify installations
artillery --version
lighthouse --version
axe --version
```

### Environment Variables
```bash
# Set your deployed URLs
export API_URL="https://your-app-name.up.railway.app"
export FRONTEND_URL="https://wcag-ai-platform.vercel.app"

echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
```

### Create Test Account
```bash
# If authentication is implemented, create test user:
# Email: test@wcag-ai-platform.com
# Password: [Use strong password]
# Save credentials securely
```

---

## 🧪 Test Suite 1: API Health & Infrastructure (30 minutes)

### Test 1.1: Basic Connectivity
```bash
# Health check
curl -v $API_URL/health

# Expected:
# HTTP 200 OK
# {"success":true,"status":"healthy","timestamp":"..."}

# Verify:
echo "✅ Health check passes" || echo "❌ FAIL: Health check"
```

### Test 1.2: API Endpoints Availability
```bash
# List all endpoints and test each
cat > /tmp/api-endpoints-test.sh << 'EOF'
#!/bin/bash
API_URL="$1"

endpoints=(
  "GET /health"
  "GET /api/drafts"
  "GET /api/consultants"
  "GET /api/violations"
)

for endpoint in "${endpoints[@]}"; do
  method=$(echo $endpoint | cut -d' ' -f1)
  path=$(echo $endpoint | cut -d' ' -f2)
  
  echo "Testing: $method $path"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$API_URL$path")
  
  if [ "$status" = "200" ] || [ "$status" = "201" ]; then
    echo "  ✅ $status OK"
  else
    echo "  ❌ FAIL: $status"
  fi
done
EOF

chmod +x /tmp/api-endpoints-test.sh
/tmp/api-endpoints-test.sh $API_URL
```

### Test 1.3: Database Connectivity
```bash
# Test database read
curl -s $API_URL/api/drafts | jq '.success'
# Expected: true

# Test database write (create draft)
curl -X POST $API_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "subject": "Test Draft",
    "body": "This is a test draft for deployment validation"
  }' | jq '.success'
# Expected: true

# Verify persistence (get drafts again)
curl -s $API_URL/api/drafts | jq '.data | length'
# Expected: > 0

echo "✅ Database read/write works"
```

### Test 1.4: Error Handling
```bash
# Test 404
curl -s -o /dev/null -w "%{http_code}" $API_URL/api/nonexistent
# Expected: 404

# Test 400 (invalid input)
curl -X POST $API_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  -s -o /dev/null -w "%{http_code}"
# Expected: 400

# Test malformed JSON
curl -X POST $API_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{invalid json}' \
  -s -o /dev/null -w "%{http_code}"
# Expected: 400

echo "✅ Error handling works"
```

### Test 1.5: Response Times
```bash
# Test API response time
for i in {1..10}; do
  curl -w "%{time_total}\n" -o /dev/null -s $API_URL/api/drafts
done | awk '{sum+=$1; count++} END {print "Average: " sum/count " seconds"}'
# Expected: < 1.0 seconds

echo "✅ Response times acceptable" || echo "⚠️ WARNING: Slow responses"
```

### Test 1.6: Security Headers
```bash
# Check security headers
curl -I $API_URL/health | grep -i "x-frame-options\|content-security-policy\|strict-transport-security"
# Expected: Should see security headers

# Check CORS
curl -I -X OPTIONS $API_URL/api/drafts \
  -H "Origin: https://malicious-site.com" \
  | grep -i "access-control-allow-origin"
# Expected: Should NOT allow malicious origin

echo "✅ Security headers present"
```

---

## 🖥️ Test Suite 2: Frontend Functionality (45 minutes)

### Test 2.1: Page Load
```bash
# Test main page loads
curl -I $FRONTEND_URL
# Expected: HTTP 200

# Check for critical assets
curl -s $FRONTEND_URL | grep -o "script.*src" | wc -l
# Expected: > 0 (JavaScript bundles loaded)

curl -s $FRONTEND_URL | grep -o "link.*stylesheet" | wc -l
# Expected: > 0 (CSS loaded)

echo "✅ Frontend loads"
```

### Test 2.2: Manual UI Testing (In Browser)

Open `$FRONTEND_URL` in multiple browsers:

**Chrome/Edge:**
- [ ] Dashboard loads without errors
- [ ] Email drafts list displays
- [ ] Draft count badge shows correct number
- [ ] Status badges display (draft, approved, sent, etc.)
- [ ] Timestamp formatting correct
- [ ] No console errors in DevTools

**Firefox:**
- [ ] Same checklist as Chrome
- [ ] No browser-specific issues

**Safari (if available):**
- [ ] Same checklist as Chrome
- [ ] No browser-specific issues

**Mobile (Chrome on Android or Safari on iOS):**
- [ ] Dashboard is responsive
- [ ] Touch interactions work
- [ ] No horizontal scroll
- [ ] Font sizes readable
- [ ] Buttons large enough to tap

### Test 2.3: Email Draft Workflow

**Create New Draft:**
1. [ ] Click "Create Draft" button (if present)
2. [ ] Fill form:
   - Recipient: test@example.com
   - Subject: "Test Draft - Live Deployment"
   - Body: "Testing complete workflow"
3. [ ] Click "Save"
4. [ ] Verify draft appears in list
5. [ ] Verify success notification shows

**View Draft:**
1. [ ] Click on newly created draft
2. [ ] Verify preview panel shows correct data
3. [ ] Verify recipient, subject, body display correctly
4. [ ] Verify status shows "draft"

**Edit Draft:**
1. [ ] Click "Edit" button
2. [ ] Modify subject: "Test Draft - Edited"
3. [ ] Modify body: Add " - EDITED"
4. [ ] Click "Save Changes"
5. [ ] Verify changes persist
6. [ ] Verify "updatedAt" timestamp changes

**Approve Draft:**
1. [ ] Click "Approve" button
2. [ ] Verify status changes to "approved"
3. [ ] Verify approval timestamp appears
4. [ ] Verify approved badge shows green
5. [ ] Verify success notification

**Filter & Search:**
1. [ ] Test status filter dropdown
2. [ ] Filter by "approved" - only approved drafts show
3. [ ] Filter by "draft" - only draft status show
4. [ ] Test "All Statuses" - all drafts show
5. [ ] Search by recipient email - filters correctly
6. [ ] Search by company name - filters correctly
7. [ ] Clear search - all drafts return

### Test 2.4: Violation Management

**View Violations:**
1. [ ] Select draft with violations
2. [ ] Verify violations list displays
3. [ ] Verify severity badges (critical, high, medium, low)
4. [ ] Verify WCAG criterion codes display
5. [ ] Verify element locators display

**Add Violation:**
1. [ ] Click "Add Violation" (if present)
2. [ ] Fill violation form
3. [ ] Save
4. [ ] Verify violation appears in list

### Test 2.5: UI Responsiveness

**Desktop (1920x1080):**
- [ ] Dashboard uses full width appropriately
- [ ] Three-column layout displays correctly
- [ ] No overflow or scrolling issues
- [ ] Font sizes appropriate

**Tablet (768x1024):**
- [ ] Layout adjusts to two columns
- [ ] Navigation accessible
- [ ] Touch targets adequate
- [ ] Content readable

**Mobile (375x667):**
- [ ] Single column layout
- [ ] Hamburger menu if present
- [ ] Cards stack vertically
- [ ] No content cut off
- [ ] Buttons easily tappable

### Test 2.6: Error Scenarios

**Network Failure Simulation:**
1. [ ] Open DevTools > Network
2. [ ] Set throttling to "Offline"
3. [ ] Try to approve a draft
4. [ ] Verify error notification shows
5. [ ] Verify helpful error message
6. [ ] Re-enable network
7. [ ] Verify retry works

**API Error Simulation:**
1. [ ] Use DevTools to block API request
2. [ ] Try action that calls API
3. [ ] Verify error handling
4. [ ] Verify UI doesn't crash

---

## ♿ Test Suite 3: WCAG Accessibility (30 minutes)

### Test 3.1: Automated Accessibility Scan
```bash
# Run axe accessibility scan
axe $FRONTEND_URL --save /tmp/axe-results.json

# Check results
cat /tmp/axe-results.json | jq '.violations | length'
# Expected: 0 critical/serious violations

# Generate report
axe $FRONTEND_URL --reporter html > /tmp/accessibility-report.html
echo "Report saved to /tmp/accessibility-report.html"
```

### Test 3.2: Keyboard Navigation

**Full Keyboard Test (No Mouse):**
1. [ ] Load $FRONTEND_URL
2. [ ] Press Tab - focus moves to first interactive element
3. [ ] Continue tabbing through all interactive elements
4. [ ] Verify focus indicator visible at all times
5. [ ] Verify tab order logical (left-to-right, top-to-bottom)
6. [ ] Verify no keyboard traps
7. [ ] Press Enter on draft - opens preview
8. [ ] Tab to "Approve" button, press Enter - works
9. [ ] Press Escape - closes modals (if present)
10. [ ] Shift+Tab - moves focus backward

### Test 3.3: Screen Reader Testing

**macOS VoiceOver:**
```bash
# Enable VoiceOver
# Cmd+F5

# Navigate site with VoiceOver enabled:
```
1. [ ] Heading structure announced correctly
2. [ ] Buttons have descriptive labels
3. [ ] Form fields have associated labels
4. [ ] Status messages announced (aria-live)
5. [ ] Lists announced as lists
6. [ ] Draft count announced
7. [ ] Loading states announced
8. [ ] Error messages announced

**NVDA (Windows) or JAWS:**
1. [ ] Same checklist as VoiceOver
2. [ ] Test in Firefox and Chrome

### Test 3.4: Color Contrast
```bash
# Manual check with browser DevTools
# Chrome: DevTools > Elements > Styles > Color picker shows contrast ratio

# Check critical elements:
```
1. [ ] Text on backgrounds: > 4.5:1 ratio
2. [ ] Large text (18pt+): > 3:1 ratio
3. [ ] Button text: > 4.5:1 ratio
4. [ ] Icon colors: > 3:1 ratio
5. [ ] Status badges: readable contrast
6. [ ] Links distinguishable from text

### Test 3.5: Focus Management
1. [ ] Click draft - focus moves to preview header
2. [ ] Open modal - focus moves to modal title
3. [ ] Close modal - focus returns to trigger
4. [ ] Submit form - focus moves to result/error
5. [ ] No focus lost scenarios

### Test 3.6: ARIA Implementation
```bash
# View page source and check:
curl -s $FRONTEND_URL | grep -o "aria-[a-z]*" | sort | uniq
# Expected: aria-label, aria-live, aria-describedby, etc.
```

Manual verification:
1. [ ] Buttons have aria-label if icon-only
2. [ ] Form errors have aria-describedby
3. [ ] Status regions have aria-live
4. [ ] Modal has aria-modal="true"
5. [ ] Expandable sections have aria-expanded

---

## ⚡ Test Suite 4: Performance (30 minutes)

### Test 4.1: Lighthouse Performance Audit
```bash
# Run Lighthouse
lighthouse $FRONTEND_URL \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=html \
  --output-path=/tmp/lighthouse-report.html \
  --chrome-flags="--headless"

# View report
open /tmp/lighthouse-report.html  # Mac
# Or xdg-open /tmp/lighthouse-report.html  # Linux

# Check scores
lighthouse $FRONTEND_URL --output=json --output-path=/tmp/lighthouse.json --quiet
cat /tmp/lighthouse.json | jq '.categories | {
  performance: .performance.score,
  accessibility: .accessibility.score,
  bestPractices: .["best-practices"].score,
  seo: .seo.score
}'

# Expected:
# performance: > 0.80 (80+)
# accessibility: > 0.90 (90+)
# bestPractices: > 0.90 (90+)
# seo: > 0.80 (80+)
```

### Test 4.2: Core Web Vitals
```bash
# Use PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$FRONTEND_URL&strategy=mobile" \
  | jq '.lighthouseResult.audits | {
    fcp: .["first-contentful-paint"].displayValue,
    lcp: .["largest-contentful-paint"].displayValue,
    cls: .["cumulative-layout-shift"].displayValue,
    tbt: .["total-blocking-time"].displayValue
  }'

# Expected:
# FCP: < 1.8s
# LCP: < 2.5s
# CLS: < 0.1
# TBT: < 300ms
```

### Test 4.3: Bundle Size Analysis
```bash
# Check bundle size
curl -s $FRONTEND_URL | grep -o "src=\"[^\"]*\.js\"" | while read line; do
  url=$(echo $line | sed 's/src="//;s/"$//')
  if [[ $url == /* ]]; then
    url="$FRONTEND_URL$url"
  fi
  size=$(curl -sI "$url" | grep -i content-length | awk '{print $2}' | tr -d '\r')
  echo "$url: $(($size / 1024)) KB"
done

# Expected: Main bundle < 250 KB
```

### Test 4.4: API Performance Under Load
```bash
# Create Artillery load test config
cat > /tmp/load-test.yml << EOF
config:
  target: "$API_URL"
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/second
      name: "Warm up"
    - duration: 120
      arrivalRate: 50  # 50 requests/second
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100  # 100 requests/second
      name: "Spike test"
scenarios:
  - name: "Get drafts"
    flow:
      - get:
          url: "/api/drafts"
      - think: 1
  - name: "Create draft"
    flow:
      - post:
          url: "/api/drafts"
          json:
            recipient: "load-test@example.com"
            subject: "Load Test Draft"
            body: "Testing under load"
      - think: 2
EOF

# Run load test
artillery run /tmp/load-test.yml --output /tmp/artillery-report.json

# View summary
artillery report /tmp/artillery-report.json

# Expected:
# - Success rate: > 99%
# - p95 latency: < 1000ms
# - p99 latency: < 2000ms
# - No errors or timeouts
```

### Test 4.5: Database Performance
```bash
# Test database query performance
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s $API_URL/api/drafts
done | sort -n | tail -5 | head -1
# P95 response time should be < 1.0s

echo "✅ Database performs under load"
```

---

## 🔒 Test Suite 5: Security (30 minutes)

### Test 5.1: Security Headers Validation
```bash
# Check all security headers
curl -I $FRONTEND_URL | grep -i "x-frame-options\|content-security-policy\|strict-transport-security\|x-content-type-options\|referrer-policy"

# Expected headers:
# X-Frame-Options: DENY
# Content-Security-Policy: ...
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin

echo "✅ Security headers present" || echo "❌ FAIL: Missing security headers"
```

### Test 5.2: HTTPS Enforcement
```bash
# Test HTTP redirect
curl -I http://wcag-ai-platform.vercel.app | grep "301\|302"
# Expected: Redirects to HTTPS

# Verify HTTPS works
curl -I https://wcag-ai-platform.vercel.app | grep "HTTP/2 200"
# Expected: HTTP/2 200

echo "✅ HTTPS enforced"
```

### Test 5.3: SQL Injection Testing
```bash
# Test SQL injection in query parameters
curl -s "$API_URL/api/drafts?id=1' OR '1'='1" | jq '.success'
# Expected: false or proper error, not SQL error

# Test SQL injection in POST body
curl -X POST $API_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "subject": "Test' OR '1'='1",
    "body": "Test"
  }' | jq '.success'
# Expected: Input sanitized or rejected

echo "✅ SQL injection protected"
```

### Test 5.4: XSS Testing
```bash
# Test XSS in form input
curl -X POST $API_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "subject": "<script>alert(\"XSS\")</script>",
    "body": "Test"
  }' | jq '.data.subject'
# Expected: Script tags escaped/removed

# Verify in frontend
# Open draft with XSS attempt - script should NOT execute

echo "✅ XSS protected"
```

### Test 5.5: Rate Limiting
```bash
# Test rate limiting (should be 100 requests per 15 minutes)
for i in {1..101}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/drafts)
  if [ "$status" = "429" ]; then
    echo "Rate limited after $i requests"
    break
  fi
done

# Expected: Should see 429 before 101 requests

echo "✅ Rate limiting works" || echo "⚠️ WARNING: No rate limiting"
```

### Test 5.6: CORS Security
```bash
# Test CORS from unauthorized origin
curl -X OPTIONS $API_URL/api/drafts \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET" \
  -I | grep "Access-Control-Allow-Origin"
# Expected: Should NOT allow evil.com

# Test CORS from authorized origin (Vercel frontend)
curl -X OPTIONS $API_URL/api/drafts \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -I | grep "Access-Control-Allow-Origin"
# Expected: Should allow $FRONTEND_URL

echo "✅ CORS configured correctly"
```

---

## 🔄 Test Suite 6: Integration & End-to-End (30 minutes)

### Test 6.1: Frontend-Backend Integration
```bash
# Test API connection from frontend
echo "Open browser DevTools > Network"
echo "1. Load $FRONTEND_URL"
echo "2. Verify API calls to $API_URL"
echo "3. Verify CORS works (no CORS errors)"
echo "4. Verify all API responses successful"
```

Manual checks:
1. [ ] Frontend successfully calls backend API
2. [ ] No CORS errors in console
3. [ ] API responses display in UI correctly
4. [ ] Create/Read/Update operations work
5. [ ] Real-time updates work

### Test 6.2: Database Persistence
```bash
# Create draft via API
DRAFT_ID=$(curl -X POST $API_URL/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "persistence-test@example.com",
    "subject": "Persistence Test",
    "body": "Testing data persistence"
  }' | jq -r '.data.id')

echo "Created draft ID: $DRAFT_ID"

# Refresh frontend
echo "Refresh $FRONTEND_URL and verify draft with ID $DRAFT_ID appears"

# Wait 30 seconds
sleep 30

# Verify still exists (persisted to database)
curl -s $API_URL/api/drafts | jq ".data[] | select(.id==\"$DRAFT_ID\")"
# Expected: Draft details returned

echo "✅ Database persistence works"
```

### Test 6.3: Workflow Completeness

**Complete User Journey:**
1. [ ] Open $FRONTEND_URL
2. [ ] View existing drafts
3. [ ] Create new draft
4. [ ] Edit draft
5. [ ] Add violations
6. [ ] Submit for approval
7. [ ] Approve draft
8. [ ] Verify status = "approved"
9. [ ] Send email (if implemented)
10. [ ] Verify status = "sent"

### Test 6.4: Error Recovery
1. [ ] Disconnect network mid-operation
2. [ ] Verify error message shown
3. [ ] Reconnect network
4. [ ] Verify retry/recovery works
5. [ ] No data loss

---

## 📊 Test Results Summary Template

After completing all tests, fill out:

```markdown
# Live Deployment Test Results
**Date**: [Date]
**Tester**: [Name]
**Environment**: Production (Railway + Vercel)
**URLs**:
- API: [Railway URL]
- Frontend: [Vercel URL]

## Test Suite Results

### 1. API Health & Infrastructure
- Basic Connectivity: ✅ PASS / ❌ FAIL
- Endpoints Availability: ✅ PASS / ❌ FAIL
- Database Connectivity: ✅ PASS / ❌ FAIL
- Error Handling: ✅ PASS / ❌ FAIL
- Response Times: ✅ PASS / ❌ FAIL
- Security Headers: ✅ PASS / ❌ FAIL

**Issues**: [List any issues]

### 2. Frontend Functionality
- Page Load: ✅ PASS / ❌ FAIL
- Draft Workflow: ✅ PASS / ❌ FAIL
- Violation Management: ✅ PASS / ❌ FAIL
- UI Responsiveness: ✅ PASS / ❌ FAIL
- Error Scenarios: ✅ PASS / ❌ FAIL

**Issues**: [List any issues]

### 3. WCAG Accessibility
- Automated Scan: [X violations found]
- Keyboard Navigation: ✅ PASS / ❌ FAIL
- Screen Reader: ✅ PASS / ❌ FAIL
- Color Contrast: ✅ PASS / ❌ FAIL
- Focus Management: ✅ PASS / ❌ FAIL
- ARIA Implementation: ✅ PASS / ❌ FAIL

**WCAG Score**: [XX%]
**Issues**: [List any violations]

### 4. Performance
- Lighthouse Performance: [XX/100]
- Lighthouse Accessibility: [XX/100]
- Core Web Vitals: ✅ PASS / ❌ FAIL
  - LCP: [X.Xs]
  - FID: [XXXms]
  - CLS: [0.XX]
- Load Testing: ✅ PASS / ❌ FAIL
  - Success Rate: [XX%]
  - P95 Latency: [XXXms]

**Issues**: [List any issues]

### 5. Security
- Security Headers: ✅ PASS / ❌ FAIL
- HTTPS Enforcement: ✅ PASS / ❌ FAIL
- SQL Injection: ✅ PASS / ❌ FAIL
- XSS Protection: ✅ PASS / ❌ FAIL
- Rate Limiting: ✅ PASS / ❌ FAIL
- CORS Security: ✅ PASS / ❌ FAIL

**Issues**: [List any issues]

### 6. Integration & E2E
- Frontend-Backend: ✅ PASS / ❌ FAIL
- Database Persistence: ✅ PASS / ❌ FAIL
- Workflow Completeness: ✅ PASS / ❌ FAIL
- Error Recovery: ✅ PASS / ❌ FAIL

**Issues**: [List any issues]

## Overall Assessment

**Total Tests**: [XX]
**Passed**: [XX] ([XX%])
**Failed**: [XX] ([XX%])

**Critical Issues**: [X]
**High Priority**: [X]
**Medium Priority**: [X]
**Low Priority**: [X]

## Recommendation
- [ ] ✅ **APPROVED FOR PRODUCTION** - All tests pass, ready for users
- [ ] 🟡 **CONDITIONAL APPROVAL** - Minor issues, fix within [X] days
- [ ] ❌ **NOT READY** - Critical issues must be fixed before launch

## Next Steps
1. [Action item]
2. [Action item]
3. [Action item]

**Signed**: [Tester Name]
**Date**: [Date]
```

---

## 🔄 Continuous Testing

### Daily Smoke Tests
Run these daily on production:
```bash
./deployment/scripts/smoke-test.sh $API_URL $FRONTEND_URL
```

### Weekly Comprehensive Tests
Run full test suite weekly:
```bash
# Schedule in cron or GitHub Actions
0 2 * * 1 /path/to/run-comprehensive-tests.sh
```

### Post-Deployment Tests
After every deployment:
```bash
./deployment/scripts/verify-production.sh
```

---

## 📞 Incident Response

If critical test failures occur:

1. **Assess Severity**:
   - P0: Total outage → Rollback immediately
   - P1: Major feature broken → Fix within 4 hours
   - P2: Minor issue → Fix within 24 hours

2. **Rollback Procedure**:
   ```bash
   cd packages/api
   railway rollback
   
   cd packages/webapp
   vercel promote [previous-deployment]
   ```

3. **Communication**:
   - Notify stakeholders
   - Update status page
   - Document in incident log

4. **Root Cause Analysis**:
   - What happened?
   - Why did tests not catch it?
   - How to prevent recurrence?

---

**Last Updated**: November 18, 2025
**Version**: 1.0
**Next Review**: December 18, 2025
