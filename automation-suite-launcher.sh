#!/bin/bash

# automation-suite-launcher.sh
# Master launcher for WCAG AI Platform automation suite
# Orchestrates all initialization and setup scripts

set -e

# Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Helper functions
print_header() {
  echo -e "\n${CYAN}╔════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  $1║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"
}

print_section() {
  echo -e "${BLUE}━━━ $1 ━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

check_script_exists() {
  local script="$1"
  if [ ! -f "$script" ]; then
    print_error "Script not found: $script"
    return 1
  fi
  print_success "Found: $script"
}

# Main menu
show_main_menu() {
  print_header "WCAG AI Platform - Automation Suite"

  echo -e "${MAGENTA}Available Commands:${NC}\n"

  echo -e "${CYAN}1${NC}) Initialize Day One (New Project)"
  echo "   └─ Creates project structure, logs, SOP, and git repo"
  echo ""

  echo -e "${CYAN}2${NC}) Initialize Client Audit (New Client)"
  echo "   └─ Sets up client project folder with templates and checklists"
  echo ""

  echo -e "${CYAN}3${NC}) Generate WCAG Checklist (Audit Tool)"
  echo "   └─ Creates dynamic WCAG 2.1 checklist (A/AA/AAA)"
  echo ""

  echo -e "${CYAN}4${NC}) Verify Installation (Health Check)"
  echo "   └─ Checks all scripts and dependencies"
  echo ""

  echo -e "${CYAN}5${NC}) View Documentation"
  echo "   └─ Opens AUTOMATION_SUITE_README.md"
  echo ""

  echo -e "${CYAN}6${NC}) Exit"
  echo ""

  read -p "Select option (1-6): " choice
  handle_menu_selection "$choice"
}

# Menu handler
handle_menu_selection() {
  local choice="$1"

  case $choice in
    1)
      run_day_one_init
      ;;
    2)
      run_client_audit_init
      ;;
    3)
      run_wcag_checklist
      ;;
    4)
      run_health_check
      ;;
    5)
      show_documentation
      ;;
    6)
      echo -e "${GREEN}Goodbye!${NC}\n"
      exit 0
      ;;
    *)
      print_error "Invalid selection"
      show_main_menu
      ;;
  esac
}

# Day One Initialization
run_day_one_init() {
  print_section "Day One Initialization"

  if check_script_exists "init-day1-git.sh"; then
    echo ""
    print_info "This will create a new project directory with:"
    echo "  • Day 1 execution checklist"
    echo "  • Credentials vault template"
    echo "  • Standard operating procedures"
    echo "  • Git repository initialization"
    echo ""

    read -p "Continue with Day One initialization? (y/n): " confirm

    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      bash init-day1-git.sh
      print_success "Day One initialization complete!"
    else
      print_info "Cancelled"
    fi
  fi

  prompt_continue
}

# Client Audit Initialization
run_client_audit_init() {
  print_section "Client Audit Initialization"

  if check_script_exists "init-client-audit.sh"; then
    echo ""
    print_info "This will create a new client audit project with:"
    echo "  • Client metadata tracking"
    echo "  • Audit logging templates"
    echo "  • WCAG findings templates"
    echo "  • Email communication templates"
    echo "  • Deliverables checklist"
    echo "  • Invoice templates"
    echo ""

    bash init-client-audit.sh
    print_success "Client audit project initialized!"
  fi

  prompt_continue
}

# WCAG Checklist Generation
run_wcag_checklist() {
  print_section "WCAG Checklist Generator"

  if check_script_exists "wcag-checklist-generator.sh"; then
    echo ""
    bash wcag-checklist-generator.sh
    print_success "WCAG checklist generated!"
  fi

  prompt_continue
}

# Health Check
run_health_check() {
  print_section "Installation Health Check"

  echo "Checking scripts and dependencies...\n"

  local all_good=true

  # Check scripts
  echo -e "${BLUE}Scripts:${NC}"
  check_script_exists "setup.sh" || all_good=false
  check_script_exists "init-day1-git.sh" || all_good=false
  check_script_exists "init-client-audit.sh" || all_good=false
  check_script_exists "wcag-checklist-generator.sh" || all_good=false
  check_script_exists "automation-suite-launcher.sh" || all_good=false

  echo ""
  echo -e "${BLUE}Documentation:${NC}"
  [ -f "START_HERE.md" ] && print_success "Found: START_HERE.md" || print_error "Missing: START_HERE.md"
  [ -f "ENV_SETUP_GUIDE.md" ] && print_success "Found: ENV_SETUP_GUIDE.md" || print_error "Missing: ENV_SETUP_GUIDE.md"
  [ -f "TESTING_CHECKLIST.md" ] && print_success "Found: TESTING_CHECKLIST.md" || print_error "Missing: TESTING_CHECKLIST.md"
  [ -f "IMPLEMENTATION_COMPLETE.md" ] && print_success "Found: IMPLEMENTATION_COMPLETE.md" || print_error "Missing: IMPLEMENTATION_COMPLETE.md"

  echo ""
  echo -e "${BLUE}Dependencies:${NC}"
  command -v node &> /dev/null && print_success "Found: Node.js $(node --version)" || print_error "Missing: Node.js"
  command -v npm &> /dev/null && print_success "Found: npm $(npm --version)" || print_error "Missing: npm"
  command -v git &> /dev/null && print_success "Found: git $(git --version | awk '{print $3}')" || print_error "Missing: git"
  command -v docker &> /dev/null && print_success "Found: Docker $(docker --version | awk '{print $3}')" || print_info "Optional: Docker (not installed)"

  echo ""
  if [ "$all_good" = true ]; then
    print_success "All checks passed! Ready to execute."
  else
    print_info "Some items missing. Review the documentation."
  fi

  prompt_continue
}

# Show Documentation
show_documentation() {
  print_section "Documentation"

  if [ -f "AUTOMATION_SUITE_README.md" ]; then
    less AUTOMATION_SUITE_README.md 2>/dev/null || cat AUTOMATION_SUITE_README.md
  else
    print_info "Documentation file not found. Creating reference...\n"
    cat <<'AUTODOC'

╔════════════════════════════════════════════════════════════════╗
║  WCAG AI Platform - Automation Suite Reference                ║
╚════════════════════════════════════════════════════════════════╝

## Scripts Overview

### 1. init-day1-git.sh
Purpose: Initialize Day One setup with project structure
Usage: ./automation-suite-launcher.sh → Option 1
Creates:
  • DAY_1_CHECKLIST.md - Complete execution plan
  • CREDENTIALS_VAULT_TEMPLATE.txt - Secure credential storage
  • DAILY_SOP.md - Standard operating procedures
  • day1-execution.log - Execution log
  • Git repository with initial commit

Time: ~5 minutes to set up

---

### 2. init-client-audit.sh
Purpose: Initialize new client audit project
Usage: ./automation-suite-launcher.sh → Option 2
Prompts for:
  • Client Company Name
  • Client Email
  • Website URLs (comma-separated)
  • Project Tier (basic/pro/enterprise)
  • Audit Start Date

Creates:
  • Client metadata file (CLIENT_INFO.txt)
  • Audit logging templates
  • WCAG findings templates
  • Email communication templates
  • Deliverables checklist
  • Invoice templates

Time: ~10 minutes per client setup

---

### 3. wcag-checklist-generator.sh
Purpose: Generate WCAG 2.1 checklists for audits
Usage: ./automation-suite-launcher.sh → Option 3
Prompts for:
  • Conformance Level (A / AA / AAA)
  • Project folder path

Creates:
  • Dynamic WCAG checklist with 40+ criteria
  • Testable checkbox items
  • Notes fields for documentation

Output: WCAG_{LEVEL}_CHECKLIST_{DATE}.md

Time: ~5 minutes per checklist

---

## Quick Start Workflow

### Day 1: Project Setup
1. Run: ./automation-suite-launcher.sh
2. Select: Option 1 (Initialize Day One)
3. Follow: DAY_1_CHECKLIST.md sequentially
4. Complete: All 6 phases (2 hours total)

### Day 2-4: First Audit
1. Run: ./automation-suite-launcher.sh
2. Select: Option 2 (Initialize Client Audit)
3. Enter: Client details
4. Run: ./automation-suite-launcher.sh → Option 3 (WCAG Checklist)
5. Execute: Audit using checklist
6. Deliver: Final VPAT and findings

### Ongoing: Client Audits
1. Use automation-suite-launcher.sh for each new client
2. Follow SOP templates for consistency
3. Log all findings in structured format
4. Generate reports from templates

---

## File Structure

wcag-ai-platform/
├── automation-suite-launcher.sh    (Master launcher)
├── init-day1-git.sh               (Day One initialization)
├── init-client-audit.sh           (Client project setup)
├── wcag-checklist-generator.sh    (Checklist generator)
├── setup.sh                       (Environment setup)
├── START_HERE.md                  (Entry point)
├── ENV_SETUP_GUIDE.md             (Configuration reference)
├── TESTING_CHECKLIST.md           (Verification steps)
├── IMPLEMENTATION_COMPLETE.md     (Status summary)
└── projects/                      (Generated projects)
    ├── day1-setup-20250114_101503/
    │   ├── DAY_1_CHECKLIST.md
    │   ├── CREDENTIALS_VAULT_TEMPLATE.txt
    │   ├── DAILY_SOP.md
    │   └── day1-execution.log
    └── company_name_1234567890/
        ├── CLIENT_INFO.txt
        ├── audit_logs/
        ├── findings/
        ├── fixes/
        ├── deliverables/
        └── communications/

---

## Security Best Practices

1. ⚠️ Never commit .env or .credentials-temp to git
2. ⚠️ Delete credentials file after setup
3. ✅ Always use .gitignore to exclude sensitive files
4. ✅ Store credentials in secure vault when not in use
5. ✅ Use test API keys during development
6. ✅ Rotate credentials periodically

---

## Troubleshooting

### Scripts not executable
Fix: chmod +x *.sh

### Script not found
Fix: Ensure you're in the project root directory

### Credential vault not secure
Fix: Delete .credentials-temp after setup
     Verify .env is in .gitignore
     Use encrypted password manager for long-term storage

### Database connection failed
Fix: Verify PostgreSQL is running
     Check connection string in .env
     Test with: psql $DATABASE_URL

### API won't start
Fix: Run TESTING_CHECKLIST.md
     Check npm dependencies: npm install
     Review error logs for details

---

## Next Steps

1. Run: ./automation-suite-launcher.sh
2. Select: Option 1 (Day One Initialization)
3. Follow: DAY_1_CHECKLIST.md for 2-hour launch
4. Use: Option 2 for each new client
5. Execute: Option 3 for WCAG audits

Ready to begin? 🚀

AUTODOC
  fi

  prompt_continue
}

# Continue prompt
prompt_continue() {
  echo ""
  read -p "Press Enter to return to main menu..."
  clear
  show_main_menu
}

# Main execution
main() {
  clear
  show_main_menu
}

# Run main
main
