#!/bin/bash

# init-client-audit.sh
# Initialize a new client audit project with templates, SOP, and tracking files
# Usage: ./init-client-audit.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}WCAG AI Platform - Client Audit Init${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Collect client information
read -p "Client Company Name: " CLIENT_NAME
read -p "Client Email: " CLIENT_EMAIL
read -p "Website URL(s) (comma-separated): " WEBSITES
read -p "Project Tier (basic/pro/enterprise): " TIER
read -p "Audit Start Date (YYYY-MM-DD) [$(date +%Y-%m-%d)]: " AUDIT_DATE
AUDIT_DATE=${AUDIT_DATE:-$(date +%Y-%m-%d)}

# Sanitize client name for folder
CLIENT_FOLDER=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd '[:alnum:]_')
CLIENT_ID="${CLIENT_FOLDER}_$(date +%s)"
TIMESTAMP=$(date "+%Y-%m-%d_%H-%M-%S")

# Create project structure
echo -e "${YELLOW}Creating project structure for: $CLIENT_NAME${NC}"
mkdir -p "projects/$CLIENT_ID"/{audit_logs,findings,fixes,deliverables,communications}

# Initialize client metadata file
cat > "projects/$CLIENT_ID/CLIENT_INFO.txt" <<EOF
================================
CLIENT AUDIT PROJECT
================================

Client Name: $CLIENT_NAME
Client Email: $CLIENT_EMAIL
Project ID: $CLIENT_ID
Tier: $TIER
Audit Start Date: $AUDIT_DATE
Created: $TIMESTAMP

Websites Audited:
$(echo "$WEBSITES" | tr ',' '\n' | sed 's/^/  - /')

================================
Project Folders
================================

audit_logs/        → Daily testing logs, observations
findings/          → Violations by WCAG criterion
fixes/             → Proposed fixes with code snippets
deliverables/      → Final VPAT, report, recommendations
communications/    → Email templates, client updates

================================
Next Steps
1. Run: ./wcag-checklist-generator.sh
2. Select Tier: $TIER
3. Begin manual audit with NVDA/JAWS
4. Log findings in audit_logs/
5. Generate report when complete
================================
EOF

# Create audit start log
cat > "projects/$CLIENT_ID/audit_logs/audit_start.log" <<EOF
[$(date "+%Y-%m-%d %H:%M:%S")] AUDIT STARTED
Client: $CLIENT_NAME
Tier: $TIER
Websites: $WEBSITES
Auditor: $(whoami)
Status: IN_PROGRESS

Testing methodology:
- Keyboard navigation (Tab, Enter, Space, Arrow keys)
- Screen reader (NVDA on Windows / VoiceOver on Mac)
- Color contrast checker (WebAIM, Stark)
- Automated scanning (Lighthouse, WAVE)
- Manual code review (semantic HTML, ARIA)

First test target URL: $(echo "$WEBSITES" | cut -d',' -f1 | xargs)
EOF

# Create findings template
cat > "projects/$CLIENT_ID/findings/FINDINGS_TEMPLATE.md" <<EOF
# WCAG 2.1 Findings - $CLIENT_NAME

## Summary
- **Conformance Level**: [A / AA / AAA]
- **Website**: [URL]
- **Audit Date**: $AUDIT_DATE
- **Auditor**: $(whoami)

---

## Critical Issues (Must Fix)

### Issue #1: [WCAG Criterion - e.g., 1.4.3 Contrast]
- **Severity**: CRITICAL
- **Location**: [Page URL, element selector]
- **Problem**: [Description of accessibility violation]
- **WCAG Criteria**: [e.g., 1.4.3 Contrast (Minimum) Level AA]
- **Impact**: [Who is affected and how]
- **Fix**: [Recommended solution with code example]
- **Confidence**: [HIGH/MEDIUM/LOW]

---

## Major Issues (Should Fix)

### Issue #2: [Example]

---

## Minor Issues (Nice to Fix)

### Issue #3: [Example]

---

## Assistive Technology Testing Results

### Screen Reader (NVDA/JAWS)
- Navigation: [PASS/FAIL] - Comments
- Form labels: [PASS/FAIL] - Comments
- Images alt text: [PASS/FAIL] - Comments

### Keyboard Navigation
- Tab order: [PASS/FAIL] - Comments
- Focus visible: [PASS/FAIL] - Comments
- Keyboard traps: [PASS/FAIL] - Comments

---

## Recommendations
1. [Priority 1 recommendation]
2. [Priority 2 recommendation]
3. [Priority 3 recommendation]

EOF

# Create SOP checklist
cat > "projects/$CLIENT_ID/audit_logs/AUDIT_SOP_CHECKLIST.md" <<EOF
# Audit Standard Operating Procedure - $CLIENT_NAME

## Pre-Audit (Before testing)
- [ ] Verify all websites are live and accessible
- [ ] Document baseline metrics (number of pages, technologies used)
- [ ] Test browser/screen reader setup
- [ ] Create client communication template
- [ ] Set expectations email to client

## During Audit (Daily)
- [ ] Log start time and target URL
- [ ] Run automated scanners (Lighthouse, WAVE, Axe)
- [ ] Manual keyboard navigation test (15+ minutes per site)
- [ ] Screen reader test with NVDA (15+ minutes per site)
- [ ] Document every violation found
- [ ] Screenshot violations and code snippets
- [ ] Rate confidence score (HIGH/MEDIUM/LOW)
- [ ] Log end time and notes

## Post-Audit (After testing complete)
- [ ] Review all findings for accuracy
- [ ] Categorize by WCAG criterion
- [ ] Prioritize by severity and impact
- [ ] Create fix recommendations
- [ ] Generate VPAT document
- [ ] Prepare executive summary
- [ ] Schedule client call to present findings

## Deliverables (Ready for client)
- [ ] VPAT (Voluntary Product Accessibility Template)
- [ ] Accessibility Statement
- [ ] Finding details with code snippets
- [ ] Remediation roadmap with timeline
- [ ] Invoice and contract signature confirmation

EOF

# Create communications template
cat > "projects/$CLIENT_ID/communications/EMAIL_TEMPLATES.md" <<EOF
# Email Communication Templates - $CLIENT_NAME

## Audit Started (Send Day 1)
Subject: Accessibility Audit Started - $CLIENT_NAME

Hi [Client Name],

Your WCAG 2.1 accessibility audit is now underway.

**Audit Details:**
- Start Date: $AUDIT_DATE
- Tier: $TIER
- Expected Completion: [+10 business days]
- Websites: $WEBSITES

**What to expect:**
We're conducting a comprehensive manual audit using industry-standard tools including NVDA screen reader, keyboard navigation testing, and color contrast verification.

**Your involvement:**
- Please maintain normal website operations (no changes to affected pages)
- We'll keep you updated every 3 days
- Final report and recommendations will be delivered by [DATE]

Questions? Reply to this email.

---

## Mid-Audit Update (Send Day 5)
Subject: Accessibility Audit Update - 50% Complete

Hi [Client Name],

Quick update on your accessibility audit:

**Progress:** 50% of pages tested
**Issues Found So Far:** [NUMBER] violations across [X] WCAG criteria
**Severity Breakdown:** [X] Critical, [X] Major, [X] Minor

We're on track for completion by [DATE].

Next: Continue testing remaining pages and developing remediation recommendations.

---

## Audit Complete (Send Day 10)
Subject: Your WCAG Accessibility Audit Report - Ready for Review

Hi [Client Name],

Your accessibility audit is complete! Your report is attached.

**Deliverables:**
- Detailed findings by WCAG criterion
- VPAT (Voluntary Product Accessibility Template)
- Recommended remediation roadmap
- Executive summary

**Next Steps:**
Let's schedule a 30-minute call to review the findings and answer any questions.

Available times: [CALENDAR LINK]

---

## Fix Delivery (After remediation)
Subject: Accessibility Fixes Delivered - Testing Complete

Hi [Client Name],

Your accessibility improvements are complete and tested.

**Changes Made:** [X] fixes deployed
**New Conformance Level:** [A / AA / AAA]
**Re-tested:** All modified pages verified with NVDA and keyboard navigation

Your website is now [X% more accessible].

Attached: Updated VPAT and completion certificate.

EOF

# Create deliverables checklist
cat > "projects/$CLIENT_ID/deliverables/DELIVERABLES_CHECKLIST.md" <<EOF
# Client Deliverables Checklist - $CLIENT_NAME

## Final Audit Report

### Document Components
- [ ] Executive Summary (1 page)
- [ ] WCAG Conformance Level (A / AA / AAA)
- [ ] Finding Details (organized by criterion)
- [ ] Screenshots and code snippets
- [ ] Severity and impact assessment
- [ ] Remediation recommendations
- [ ] Timeline for fixes

### VPAT (Voluntary Product Accessibility Template)
- [ ] Completed VPAT Section 1 (Product info)
- [ ] Completed VPAT Section 2 (Conformance claims)
- [ ] Completed VPAT Section 3 (Details of conformance)
- [ ] Completed VPAT Section 4 (Revised accessibility statement)

### Accessibility Statement
- [ ] Conformance claims included
- [ ] Testing methodology documented
- [ ] Known limitations disclosed
- [ ] Contact information provided
- [ ] Remediation process described

### Deliverable Package
- [ ] PDF Report (formatted)
- [ ] VPAT (Excel or PDF)
- [ ] Accessibility Statement (for website publication)
- [ ] Detailed findings (Excel with all violations)
- [ ] Invoice and payment terms
- [ ] Contract/NDA signed copies
- [ ] Completion certificate

## Sign-Off
- [ ] Client has reviewed all documents
- [ ] Client has asked clarifying questions
- [ ] Client has approved for publication
- [ ] Payment received (50% upon delivery per contract)
- [ ] VPAT signed by auditor and authorized client representative
- [ ] Contract signature confirmed
- [ ] Archived in secure location

EOF

# Create billing/invoice template
cat > "projects/$CLIENT_ID/deliverables/INVOICE_TEMPLATE.md" <<EOF
# Invoice Template - $CLIENT_NAME

---

**WCAG AI Platform**
Accessibility Audit Services

**Invoice Date:** $(date +%Y-%m-%d)
**Project ID:** $CLIENT_ID
**Invoice #:** [AUTO_GENERATED]

---

## Bill To:
$CLIENT_NAME
$CLIENT_EMAIL

---

## Services Rendered

| Service | Quantity | Rate | Amount |
|---------|----------|------|--------|
| WCAG 2.1 AA Audit ($TIER tier) | 1 | \$[TIER_PRICE] | \$[TIER_PRICE] |
| Subtotal | | | \$[TIER_PRICE] |
| Tax (if applicable) | | | \$[TAX] |
| **Total Due** | | | **\$[TOTAL]** |

---

## Payment Terms
- 50% due upon delivery (TODAY)
- 50% due within 30 days of delivery
- Wire transfer, ACH, or credit card accepted

---

## Notes
Thank you for choosing WCAG AI Platform for your accessibility audit. We're committed to making your digital content accessible to everyone.

Questions? Contact: [AUDITOR_EMAIL]

EOF

echo -e "\n${GREEN}✓ Project initialized successfully!${NC}"
echo -e "\n${BLUE}Project Details:${NC}"
echo "  Client: $CLIENT_NAME"
echo "  Project ID: $CLIENT_ID"
echo "  Path: projects/$CLIENT_ID/"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review: cat projects/$CLIENT_ID/CLIENT_INFO.txt"
echo "  2. Generate WCAG checklist: ./wcag-checklist-generator.sh"
echo "  3. Start audit: Open projects/$CLIENT_ID/audit_logs/"
echo "  4. Log findings: Add to projects/$CLIENT_ID/findings/"
echo ""
echo -e "${GREEN}Ready to audit!${NC}"
