#!/bin/bash

# init-day1-git.sh
# Automated Day One setup with git commits and structured logging
# Usage: ./init-day1-git.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_DIR="day1-setup-$(date +%Y%m%d_%H%M%S)"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
LOG_FILE="$PROJECT_DIR/day1-execution.log"
CREDENTIALS_TEMP="$PROJECT_DIR/.credentials-temp"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  WCAG AI Platform - Day One Setup     ║${NC}"
echo -e "${CYAN}║  Automated Initialization with Git    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"

# Function to log actions
log_action() {
  local message="$1"
  local status="${2:-INFO}"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] [$status] $message" | tee -a "$LOG_FILE"
}

# Function to initialize directory structure
init_directory_structure() {
  log_action "Creating project directory structure..." "STEP"

  mkdir -p "$PROJECT_DIR"/{daylogs,credentials-vault,setup-scripts,audit-templates,legal-documents}

  log_action "Directory structure created at: $PROJECT_DIR" "OK"
}

# Function to create Day 1 execution checklist
create_day1_checklist() {
  log_action "Creating Day 1 execution checklist..." "STEP"

  cat > "$PROJECT_DIR/DAY_1_CHECKLIST.md" <<'CHECKLIST'
# Day One Execution Checklist

**Date:** $(date +%Y-%m-%d)
**Time Started:** $(date +%H:%M:%S)

## Phase 1: Commitment & Decision (60 minutes)

- [ ] Read START_HERE.md
- [ ] Review Implementation Owner Decision Framework
- [ ] Complete 10 passion-test prompts
  - Score: ___ / 10 (average)
  - Decision: [Solo Founder / Get Co-founder / Pause]
- [ ] Announce decision to accountability partner

**Phase 1 Complete Time:** __________

## Phase 2: Credentials Collection (45 minutes)

### Clerk Account
- [ ] Go to https://clerk.com
- [ ] Create account (email, password)
- [ ] Copy NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] Copy CLERK_SECRET_KEY
- [ ] Saved to .credentials-temp ✓

### Stripe Account
- [ ] Go to https://stripe.com
- [ ] Create account (business info)
- [ ] Ensure TEST MODE is active
- [ ] Copy Publishable Key (pk_test_...)
- [ ] Copy Secret Key (sk_test_...)
- [ ] Create Webhook Endpoint
- [ ] Copy Webhook Secret (whsec_test_...)
- [ ] Saved to .credentials-temp ✓

### SendGrid Account
- [ ] Go to https://sendgrid.com
- [ ] Sign up (free account)
- [ ] Verify email
- [ ] Create API Key in Settings → API Keys
- [ ] Copy full API Key (SG....)
- [ ] Saved to .credentials-temp ✓

**Phase 2 Complete Time:** __________

## Phase 3: Database Setup (30 minutes)

### Option A: Docker (Recommended)
- [ ] Install Docker Desktop (https://docker.com/products/docker-desktop)
- [ ] Run: `docker pull postgres:15`
- [ ] Run: `docker run --name wcag-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=wcag_ai_dev -p 5432:5432 -d postgres:15`
- [ ] Verify: `docker ps` shows wcag-db running
- [ ] Connection string: postgresql://postgres:password@localhost:5432/wcag_ai_dev

### Option B: Cloud (Heroku / Railway)
- [ ] Choose platform (Heroku / Railway)
- [ ] Create PostgreSQL instance
- [ ] Copy connection string (DATABASE_URL)
- [ ] Test connection with psql or GUI tool

### Option C: Local PostgreSQL
- [ ] Verify PostgreSQL 12+ is installed
- [ ] Start service
- [ ] Note connection string

**Database Type Selected:** __________
**Connection String:** postgresql://...
**Phase 3 Complete Time:** __________

## Phase 4: Application Setup (45 minutes)

- [ ] Execute: `./setup.sh`
- [ ] Follow all interactive prompts
- [ ] Paste Clerk credentials when prompted
- [ ] Paste Stripe credentials when prompted
- [ ] Paste SendGrid API key when prompted
- [ ] Select database option when prompted
- [ ] Script creates .env file automatically
- [ ] Script installs npm dependencies
- [ ] Script runs Prisma migrations
- [ ] Script verifies database schema
- [ ] Setup completed successfully ✓

**Phase 4 Complete Time:** __________

## Phase 5: Verification Testing (40 minutes)

### Start Application
- [ ] Open Terminal 1: `npm run dev`
- [ ] API server starts on http://localhost:3000
- [ ] Health endpoint responds: `curl http://localhost:3000/health`

### Run Verification Checklist
- [ ] Open TESTING_CHECKLIST.md
- [ ] Follow 8 verification phases
  - [ ] Phase 1: Database & Credentials (5 min)
  - [ ] Phase 2: Start Application (5 min)
  - [ ] Phase 3: Authentication (10 min)
  - [ ] Phase 4: Client Onboarding (10 min)
  - [ ] Phase 5: Email Service (10 min)
  - [ ] Phase 6: Stripe Billing (10 min)
  - [ ] Phase 7: Scan Scheduler (10 min)
  - [ ] Phase 8: Full Integration (20 min)
- [ ] All 8 phases passed ✓

**Phase 5 Complete Time:** __________

## Phase 6: Security & Cleanup (10 minutes)

- [ ] Verify `.credentials-temp` file contains all keys
- [ ] Delete `.credentials-temp` (sensitive data)
- [ ] Verify .env file is in .gitignore
- [ ] Run: `git status` → should show no sensitive files
- [ ] Security verified ✓

**Phase 6 Complete Time:** __________

## End of Day 1

**Time Completed:** __________
**Total Time Spent:** __________

### Success Criteria (All must be ✓)
- [ ] Commitment decision made
- [ ] All 3 credentials collected (Clerk, Stripe, SendGrid)
- [ ] Database running and connected
- [ ] setup.sh executed successfully
- [ ] All 8 verification phases passed
- [ ] Sensitive files deleted/secured
- [ ] API running successfully

### Next Steps (Day 2)
1. Review IMPLEMENTATION_COMPLETE.md for full status
2. Plan legal/insurance path
3. Prepare first client onboarding
4. Begin WCAG 2.1 AA self-study

---

**Signed Off By:** __________________ **Date:** __________

CHECKLIST

  # Replace placeholders with actual values
  sed -i "s/\$(date +%Y-%m-%d)/$(date +%Y-%m-%d)/g" "$PROJECT_DIR/DAY_1_CHECKLIST.md"
  sed -i "s/\$(date +%H:%M:%S)/$(date +%H:%M:%S)/g" "$PROJECT_DIR/DAY_1_CHECKLIST.md"

  log_action "Day 1 checklist created" "OK"
}

# Function to create startup log
create_startup_log() {
  log_action "Creating startup execution log..." "STEP"

  cat > "$LOG_FILE" <<EOF
╔════════════════════════════════════════════════╗
║  WCAG AI Platform - Day One Setup Log         ║
║  Automated Initialization Session              ║
╚════════════════════════════════════════════════╝

Start Time: $TIMESTAMP
Project Directory: $PROJECT_DIR

---

EOF

  log_action "Setup initiated" "START"
}

# Function to create credentials vault (secure template)
create_credentials_vault() {
  log_action "Creating secure credentials vault..." "STEP"

  cat > "$PROJECT_DIR/CREDENTIALS_VAULT_TEMPLATE.txt" <<'VAULT'
==============================================
WCAG AI PLATFORM - CREDENTIALS VAULT
==============================================

⚠️ WARNING: This file contains sensitive information
❌ DO NOT commit to git
❌ DO NOT share
✅ DELETE after environment setup

---

## CLERK AUTHENTICATION

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: [paste here]
CLERK_SECRET_KEY: [paste here]

---

## STRIPE PAYMENTS (TEST MODE ONLY)

Publishable Key: [paste here]
Secret Key: [paste here]
Webhook Secret: [paste here]

---

## SENDGRID EMAIL

API Key: [paste here]

---

## DATABASE

Connection String: [paste here]
Format: postgresql://user:password@host:port/database

---

## NOTES

All credentials above should be temporary (test mode).
After setup.sh completes:
1. Copy credentials into .env file
2. DELETE this file
3. Verify .env is in .gitignore

VAULT

  log_action "Credentials vault template created" "OK"
}

# Function to create SOP documentation
create_sop_documentation() {
  log_action "Creating Standard Operating Procedure..." "STEP"

  cat > "$PROJECT_DIR/DAILY_SOP.md" <<'SOP'
# Daily Operating Procedure

## Morning Standup (5 minutes)

- [ ] Check email for client inquiries
- [ ] Review previous day's findings
- [ ] Verify all systems are online (API, database, email)
- [ ] Review today's audit schedule

## Audit Execution (4-6 hours per project)

### Pre-Audit (30 min)
- [ ] Verify all client websites are accessible
- [ ] Confirm browser and screen reader (NVDA/JAWS) are working
- [ ] Create audit log file with client name and date

### During Audit (4-5 hours)
- [ ] Run automated scanners (Lighthouse, WAVE, Axe)
- [ ] Manual keyboard navigation testing (20+ minutes per site)
- [ ] Screen reader testing with NVDA (20+ minutes per site)
- [ ] Document all violations found
- [ ] Screenshot violations
- [ ] Rate severity and confidence
- [ ] Take detailed notes

### Post-Audit (30 min)
- [ ] Review all findings for accuracy
- [ ] Categorize by WCAG criterion
- [ ] Organize by severity level
- [ ] Update client with progress email

## Administrative Tasks (30 min)

- [ ] Log daily work hours
- [ ] Update project status spreadsheet
- [ ] Review legal/insurance communications
- [ ] Plan next client presentations

## EOD Review (15 minutes)

- [ ] Verify all findings documented
- [ ] Log issues encountered
- [ ] Update project timeline
- [ ] Prepare next day checklist

---

**Time Tracking Template:**
- Audit Hours: _______
- Admin Hours: _______
- Learning Hours: _______
- Total: _______

SOP

  log_action "SOP documentation created" "OK"
}

# Function to create git initialization
initialize_git_repo() {
  log_action "Initializing git repository..." "STEP"

  # Check if we're already in a git repo
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    git init "$PROJECT_DIR"
    log_action "Git repository initialized in $PROJECT_DIR" "OK"
  else
    log_action "Already in git repository" "OK"
  fi
}

# Function to create git ignore
create_gitignore() {
  log_action "Creating .gitignore..." "STEP"

  cat > "$PROJECT_DIR/.gitignore" <<'GITIGNORE'
# Security
.env
.env.local
.credentials-temp
CREDENTIALS_VAULT_TEMPLATE.txt
*.key
*.pem

# Node
node_modules/
npm-debug.log
yarn-error.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Sensitive files
secrets/
private/
vault/

GITIGNORE

  log_action ".gitignore created" "OK"
}

# Function to make scripts executable
make_scripts_executable() {
  log_action "Making scripts executable..." "STEP"

  chmod +x setup.sh 2>/dev/null || true
  chmod +x init-client-audit.sh 2>/dev/null || true
  chmod +x wcag-checklist-generator.sh 2>/dev/null || true
  chmod +x init-day1-git.sh 2>/dev/null || true

  log_action "Scripts made executable" "OK"
}

# Function to create initial git commit
create_initial_commit() {
  log_action "Creating initial git commit..." "STEP"

  cd "$PROJECT_DIR"

  git add .
  git commit -m "Day One Setup: Initialize project structure and SOP" \
    --no-verify 2>&1 | tee -a "$LOG_FILE" || true

  log_action "Initial commit created" "OK"

  cd - > /dev/null
}

# Function to display completion summary
display_summary() {
  local end_time=$(date "+%Y-%m-%d %H:%M:%S")

  echo -e "\n${CYAN}╔════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  Day One Setup Complete!              ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"

  echo -e "${GREEN}✓ Project created in: $PROJECT_DIR${NC}\n"

  echo -e "${BLUE}Files Created:${NC}"
  echo "  ✓ DAY_1_CHECKLIST.md - Execution checklist with all phases"
  echo "  ✓ day1-execution.log - Complete session log"
  echo "  ✓ CREDENTIALS_VAULT_TEMPLATE.txt - Secure credential storage"
  echo "  ✓ DAILY_SOP.md - Standard operating procedure"
  echo "  ✓ .gitignore - Security file exclusions"
  echo ""

  echo -e "${YELLOW}Next Actions:${NC}"
  echo "  1. cd $PROJECT_DIR"
  echo "  2. Start executing DAY_1_CHECKLIST.md"
  echo "  3. Follow each phase sequentially"
  echo "  4. Log completion times as you go"
  echo ""

  echo -e "${BLUE}Important Reminders:${NC}"
  echo "  ⚠️  Keep CREDENTIALS_VAULT_TEMPLATE.txt secure"
  echo "  ⚠️  Delete credentials file after setup"
  echo "  ⚠️  Never commit .env or credentials to git"
  echo "  ✅ Verify .env is in .gitignore"
  echo ""

  log_action "Setup script completed successfully" "COMPLETE"
  log_action "End time: $end_time" "END"
}

# Main execution
main() {
  create_startup_log
  init_directory_structure
  create_day1_checklist
  create_credentials_vault
  create_sop_documentation
  initialize_git_repo
  create_gitignore
  make_scripts_executable
  create_initial_commit
  display_summary
}

# Execute main function
main

exit 0
