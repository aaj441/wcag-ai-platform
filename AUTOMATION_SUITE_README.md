# WCAG AI Platform - Automation Suite

## Overview

The **Automation Suite** is a collection of bash scripts that automate the setup, initialization, and execution of WCAG accessibility audits. It's designed for founders executing the 30-day launch plan independently.

**What it does:**
- ✅ Initializes Day One project structure
- ✅ Sets up new client audit projects
- ✅ Generates dynamic WCAG 2.1 checklists
- ✅ Tracks daily operations and logging
- ✅ Manages git commits and version control
- ✅ Secures sensitive credentials

**Time savings:**
- Day One setup: 30 min (automated) → 2 hours (with verification)
- Client project init: 15 min per client
- WCAG checklist: 5 min per audit
- Daily SOP execution: 4-6 hours per project (structured)

---

## Scripts

### 1. **automation-suite-launcher.sh** (Master Control)

Interactive menu system for all automation tasks.

**Usage:**
```bash
./automation-suite-launcher.sh
```

**Menu Options:**
```
1) Initialize Day One (New Project)
2) Initialize Client Audit (New Client)
3) Generate WCAG Checklist (Audit Tool)
4) Verify Installation (Health Check)
5) View Documentation
6) Exit
```

**What it does:**
- Provides interactive menu interface
- Validates script dependencies
- Launches appropriate script based on user selection
- Displays context-specific help

---

### 2. **init-day1-git.sh** (Day One Setup)

Automated initialization of Day One project with structured logging and git management.

**Usage:**
```bash
./automation-suite-launcher.sh
# Select: Option 1
```

**Or directly:**
```bash
./init-day1-git.sh
```

**Creates:**
```
day1-setup-20250114_101503/
├── DAY_1_CHECKLIST.md              # 6-phase execution plan
├── CREDENTIALS_VAULT_TEMPLATE.txt  # Secure credential storage
├── DAILY_SOP.md                    # Standard operating procedures
├── day1-execution.log              # Complete session log
├── daylogs/                        # Daily logging folder
├── credentials-vault/              # Credential storage
├── setup-scripts/                  # Script backups
├── audit-templates/                # Template library
├── legal-documents/                # Legal file storage
├── .gitignore                      # Security exclusions
└── .git/                          # Git repository

```

**DAY_1_CHECKLIST.md includes:**
- Phase 1: Commitment & Decision (60 min)
  - 10 passion-test prompts
  - Implementation Owner Framework review
  - Go/no-go decision point

- Phase 2: Credentials Collection (45 min)
  - Clerk account setup
  - Stripe account setup
  - SendGrid account setup

- Phase 3: Database Setup (30 min)
  - Docker option (recommended)
  - Cloud option (Heroku/Railway)
  - Local PostgreSQL option

- Phase 4: Application Setup (45 min)
  - Execute setup.sh
  - npm dependency installation
  - Prisma migrations
  - Database verification

- Phase 5: Verification Testing (40 min)
  - Start application server
  - Run 8-phase TESTING_CHECKLIST.md
  - Validate all systems

- Phase 6: Security & Cleanup (10 min)
  - Delete sensitive files
  - Verify .env is secured
  - Confirm no secrets in git

**Total Time:** ~3 hours with verification

**Success Criteria:**
All 6 items in the checklist must be completed and verified ✓

---

### 3. **init-client-audit.sh** (Client Onboarding)

Sets up complete client audit project with templates and tracking.

**Usage:**
```bash
./automation-suite-launcher.sh
# Select: Option 2
```

**Or directly:**
```bash
./init-client-audit.sh
```

**Interactive Prompts:**
```
Client Company Name: [e.g., Acme Healthcare]
Client Email: [e.g., john@acme.com]
Website URL(s): [e.g., www.acme.com, blog.acme.com]
Project Tier: [basic/pro/enterprise]
Audit Start Date: [YYYY-MM-DD]
```

**Creates:**
```
projects/acme_healthcare_1705269500/
├── CLIENT_INFO.txt                      # Client metadata
├── audit_logs/
│   ├── audit_start.log                 # Audit initialization
│   ├── AUDIT_SOP_CHECKLIST.md          # 4-phase audit SOP
│   └── WCAG_AA_CHECKLIST_2025-01-14.md # (generated separately)
├── findings/
│   └── FINDINGS_TEMPLATE.md            # Structured findings format
├── fixes/
│   └── [generated during audit]
├── deliverables/
│   ├── DELIVERABLES_CHECKLIST.md       # Sign-off checklist
│   └── INVOICE_TEMPLATE.md             # Billing template
└── communications/
    └── EMAIL_TEMPLATES.md              # Client email templates
```

**CLIENT_INFO.txt includes:**
- Client name, email, websites
- Project ID (auto-generated)
- Audit tier and start date
- Folder structure overview
- Next steps for auditor

**AUDIT_SOP_CHECKLIST.md phases:**

**Pre-Audit (30 min)**
- Verify website accessibility
- Document baseline metrics
- Test browser/screen reader setup
- Create communication template

**During Audit (4-5 hours)**
- Log start time and URL
- Run automated scanners
- Manual keyboard navigation (20+ min per site)
- Screen reader testing (20+ min per site)
- Document violations with severity
- Screenshot issues and code

**Post-Audit (30 min)**
- Review all findings for accuracy
- Categorize by WCAG criterion
- Prioritize by severity
- Create fix recommendations

**Deliverables (Ready for client)**
- VPAT (Voluntary Product Accessibility Template)
- Accessibility Statement
- Finding details with code snippets
- Remediation roadmap and timeline
- Invoice and contract signature

**EMAIL_TEMPLATES.md includes:**
- Audit started email (Day 1)
- Mid-audit update (Day 5)
- Audit complete email (Day 10)
- Fix delivery email (Post-remediation)

**INVOICE_TEMPLATE.md:**
- Service description
- Tiered pricing
- Tax calculation
- Payment terms (50/50 split)

**Time per setup:** ~10 minutes

---

### 4. **wcag-checklist-generator.sh** (Audit Tool)

Generates dynamic WCAG 2.1 checklists for different conformance levels.

**Usage:**
```bash
./automation-suite-launcher.sh
# Select: Option 3
```

**Or directly:**
```bash
./wcag-checklist-generator.sh
```

**Interactive Prompts:**
```
Select WCAG Conformance Level:
1) A (Basic)
2) AA (Standard, recommended)
3) AAA (Enhanced)

Enter project folder: [e.g., projects/company_name_123456]
```

**Conformance Levels:**

**Level A** - Basic accessibility (25 criteria)
- Text alternatives
- Time-based media
- Adaptable content
- Distinguishable elements
- Keyboard accessible
- Timing adjustable
- No seizure risks
- Navigation aids
- Readable and predictable
- Input assistance
- Robust markup

**Level AA** - Recommended standard (42 criteria)
- All Level A criteria
- Enhanced contrast (4.5:1 for normal text)
- Captions for live audio
- Audio description for video
- Language detection
- Consistent navigation
- Multiple ways to find content
- Visible focus indicators
- Error suggestions
- Status message announcements

**Level AAA** - Enhanced accessibility (83 criteria)
- All Level A and AA criteria
- Enhanced contrast (7:1 for normal text)
- Sign language interpretation
- Extended audio descriptions
- No timing constraints anywhere
- Keyboard only requirement
- 44x44 pixel touch targets
- Complete reflow capability

**Output Format:**

```
WCAG_AA_CHECKLIST_2025-01-14.md
```

**Checklist Structure:**
- Perceivable section (images, video, text)
- Operable section (keyboard, navigation, focus)
- Understandable section (language, predictability, input)
- Robust section (compatibility, accessibility)

**Per criterion includes:**
- [ ] Checkbox for marking complete
- Description of requirement
- Testing methodology
- Notes field for documentation

**Summary Section:**
- Issues found count
- Date tested
- Tested by (name)
- Overall pass/fail result

**Time per checklist:** ~5 minutes

---

## Workflow Examples

### Example 1: Complete Day One Execution

**Timeline: 3 hours total**

```bash
# Step 1: Initialize Day One (5 min)
./automation-suite-launcher.sh
# Select: Option 1
# Output: day1-setup-20250114_101503/

cd day1-setup-20250114_101503

# Step 2: Review Checklist (10 min)
cat DAY_1_CHECKLIST.md

# Step 3: Phase 1 - Commitment (60 min)
# Read START_HERE.md
# Complete 10 passion prompts
# Review Implementation Owner Framework
# Make go/no-go decision

# Step 4: Phase 2 - Credentials (45 min)
# Create Clerk account → copy keys
# Create Stripe account → copy keys
# Create SendGrid account → copy key
# Save all to CREDENTIALS_VAULT_TEMPLATE.txt

# Step 5: Phase 3 - Database (30 min)
# Option A: Docker (recommended, 10 min)
docker pull postgres:15
docker run --name wcag-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=wcag_ai_dev \
  -p 5432:5432 \
  -d postgres:15

# Option B: Cloud (Heroku/Railway, 20 min)
# Option C: Local PostgreSQL (5 min)

# Step 6: Phase 4 - Application (45 min)
../setup.sh
# Follow prompts, paste credentials

# Step 7: Phase 5 - Verification (40 min)
# Terminal 1:
npm run dev

# Terminal 2:
cat ../TESTING_CHECKLIST.md
# Execute 8 verification phases

# Step 8: Phase 6 - Security (10 min)
rm CREDENTIALS_VAULT_TEMPLATE.txt
git status  # Verify no secrets
```

**Result:** Production-ready API running on localhost:3000

---

### Example 2: First Client Audit

**Timeline: 5 days**

```bash
# Day 1: Client Setup (20 min)
./automation-suite-launcher.sh
# Select: Option 2 (Initialize Client Audit)

# Prompts:
# Client Company Name: Acme Healthcare
# Client Email: john@acme.com
# Website URLs: www.acme.com, blog.acme.com
# Project Tier: pro
# Audit Start Date: 2025-01-14

# Output: projects/acme_healthcare_1705269500/

# Day 1-2: Audit Preparation (2 hours)
cd projects/acme_healthcare_1705269500
cat CLIENT_INFO.txt
cat audit_logs/AUDIT_SOP_CHECKLIST.md

# Generate WCAG checklist
../../automation-suite-launcher.sh
# Select: Option 3
# Level: AA
# Folder: projects/acme_healthcare_1705269500

# Day 2-4: Audit Execution (20 hours)
# Use WCAG_AA_CHECKLIST_2025-01-14.md
# Test each criterion
# Log findings in audit_logs/audit_start.log
# Add detailed findings to findings/FINDINGS_TEMPLATE.md

# Day 4: Deliverables Preparation (4 hours)
cat deliverables/DELIVERABLES_CHECKLIST.md
# Generate VPAT
# Create Accessibility Statement
# Prepare remediation roadmap

# Day 5: Client Delivery (2 hours)
cat communications/EMAIL_TEMPLATES.md
# Send audit complete email
# Schedule review call
# Invoice client using invoice template
```

**Result:** Complete client deliverable package ready for signature

---

### Example 3: Monthly Automation Cycle

**Timeline: Monthly operations**

```bash
# Week 1: New client onboarding
./automation-suite-launcher.sh → Option 2
# Client 1 project created
# Client 2 project created
# Client 3 project created

# Week 2-3: Audit execution
./automation-suite-launcher.sh → Option 3
# Generate WCAG checklists for each client
# Execute audits in parallel (if team) or sequentially
# Log findings daily using SOP templates

# Week 4: Deliverables and closure
# Prepare VPAT documents
# Generate invoices
# Send delivery emails
# Archive completed projects

# Week 4-5: Metrics and planning
# Review daily_logs/ for time tracking
# Calculate billable hours per client
# Plan next month's capacity

# Monthly refresh
git commit -am "Month of [DATE] - X clients audited"
git push origin main
```

---

## File Structure Reference

```
wcag-ai-platform/
│
├── 📄 automation-suite-launcher.sh      ← START HERE (master launcher)
├── 📄 init-day1-git.sh                  (Day One setup)
├── 📄 init-client-audit.sh              (Client onboarding)
├── 📄 wcag-checklist-generator.sh       (Checklist tool)
├── 📄 setup.sh                          (Environment setup)
│
├── 📚 Documentation
│   ├── 📄 START_HERE.md
│   ├── 📄 ENV_SETUP_GUIDE.md
│   ├── 📄 TESTING_CHECKLIST.md
│   ├── 📄 IMPLEMENTATION_COMPLETE.md
│   ├── 📄 AUTOMATION_SUITE_README.md    ← YOU ARE HERE
│   ├── 📄 30-DAY_LAUNCH_BLUEPRINT.md
│   └── 📄 IMPLEMENTATION_OWNER_DECISION_FRAMEWORK.md
│
├── 📁 packages/
│   └── api/
│       ├── src/
│       │   ├── services/
│       │   │   ├── scanScheduler.ts
│       │   │   └── onboardingService.ts
│       │   └── routes/
│       │       └── clients.ts
│       └── prisma/
│           └── schema.prisma
│
├── 📁 legal-templates/
│   ├── SERVICE_AGREEMENT.md
│   ├── LIABILITY_WAIVER.md
│   ├── SLA_BY_TIER.md
│   └── ACCESSIBILITY_STATEMENT_TEMPLATE.md
│
└── 📁 projects/                         ← Generated projects
    ├── day1-setup-20250114_101503/      (Day One)
    └── client_name_1234567890/          (Client audits)
        ├── CLIENT_INFO.txt
        ├── audit_logs/
        ├── findings/
        ├── fixes/
        ├── deliverables/
        └── communications/
```

---

## Quick Reference Commands

### Launch Master Menu
```bash
./automation-suite-launcher.sh
```

### Initialize Day One Directly
```bash
./init-day1-git.sh
```

### Initialize Client Directly
```bash
./init-client-audit.sh
```

### Generate Checklist Directly
```bash
./wcag-checklist-generator.sh
```

### Check Installation
```bash
./automation-suite-launcher.sh
# Select: Option 4 (Health Check)
```

### Make Scripts Executable
```bash
chmod +x *.sh
```

### View Documentation
```bash
./automation-suite-launcher.sh
# Select: Option 5 (View Documentation)
```

---

## Troubleshooting

### Scripts won't execute
**Error:** `Command not found: ./automation-suite-launcher.sh`

**Fix:**
```bash
chmod +x *.sh
./automation-suite-launcher.sh
```

### Script not found in menu
**Error:** Error initializing client audit

**Fix:**
```bash
ls -la *.sh  # Verify all scripts exist
pwd         # Verify you're in project root
./automation-suite-launcher.sh → Option 4 (Health Check)
```

### Credentials file error
**Error:** `CREDENTIALS_VAULT_TEMPLATE.txt not found`

**Fix:**
```bash
# Run Day One init again
./automation-suite-launcher.sh → Option 1

# Or recreate manually
touch .credentials-temp
echo "CLERK_PUB_KEY=pk_test_..." >> .credentials-temp
```

### Database connection failed
**Error:** `Cannot connect to PostgreSQL`

**Fix:**
```bash
# Verify Docker container
docker ps | grep wcag-db

# Start if not running
docker start wcag-db

# Test connection
psql postgresql://postgres:password@localhost:5432/wcag_ai_dev
```

### Permission denied
**Error:** `Permission denied` when running scripts

**Fix:**
```bash
# Make all scripts executable
chmod +x *.sh

# Verify permissions
ls -l *.sh  # Should show rwx for owner
```

---

## Best Practices

### Daily Operations
✅ Use SOP checklists for consistency
✅ Log all findings in structured templates
✅ Commit project changes daily
✅ Keep credentials in vault, not git
✅ Review logs at EOD for next day planning

### Project Management
✅ Create new client folder for each audit
✅ Generate checklist before starting audit
✅ Follow pre/during/post-audit phases
✅ Document time spent for billing accuracy
✅ Archive completed projects in git

### Security
✅ NEVER commit .env or credentials
✅ Use .gitignore for sensitive files
✅ Delete temporary credential files
✅ Use test API keys until production ready
✅ Rotate API keys every 90 days

### Scalability
✅ Use automation-suite for consistency
✅ Template everything (emails, invoices, findings)
✅ Log all operations for metrics
✅ Git commit regularly for backup
✅ Plan for team scaling after 5 projects

---

## Support & Documentation

**Quick Start:**
→ `START_HERE.md` - 2-minute overview

**Setup Help:**
→ `ENV_SETUP_GUIDE.md` - Configuration reference
→ `TESTING_CHECKLIST.md` - Verification steps

**Architecture:**
→ `IMPLEMENTATION_COMPLETE.md` - Full system overview
→ `30-DAY_LAUNCH_BLUEPRINT.md` - Business strategy

**Framework:**
→ `IMPLEMENTATION_OWNER_DECISION_FRAMEWORK.md` - Delegation guidelines

---

## Getting Help

**Health Check:**
```bash
./automation-suite-launcher.sh → Option 4
```

**View Logs:**
```bash
cat projects/day1-setup-*/day1-execution.log
```

**Check Git Status:**
```bash
git status  # See current changes
git log --oneline  # See recent commits
```

**Verify Installation:**
```bash
node --version
npm --version
git --version
docker --version
psql --version
```

---

## Next Steps

1. **Execute Day One:**
   ```bash
   ./automation-suite-launcher.sh
   # Select: Option 1
   ```

2. **Follow DAY_1_CHECKLIST.md** for 6-phase setup (~3 hours)

3. **Initialize First Client:**
   ```bash
   ./automation-suite-launcher.sh
   # Select: Option 2
   ```

4. **Audit and Deliver:**
   ```bash
   ./automation-suite-launcher.sh
   # Select: Option 3 (Generate WCAG checklist)
   # Follow AUDIT_SOP_CHECKLIST.md
   ```

5. **Scale and Automate:**
   Use templates for consistency across clients

---

**You're ready to build.** 🚀

*Automation Suite v1.0 - WCAG AI Platform*
