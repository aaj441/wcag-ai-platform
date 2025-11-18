#!/bin/bash
# WCAGAI Documentation Reorganization Script
# Created: 2025-11-18
# Purpose: Automate repository reorganization from 68+ root files to organized structure

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'  # No Color

# Configuration
DRY_RUN=false
BACKUP_DIR=".backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="reorganization-$(date +%Y%m%d-%H%M%S).log"

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check if we're in the repository root
if [[ ! -d ".git" ]]; then
    error "Not in git repository root. Please run from project root."
fi

info "Starting documentation reorganization"
[[ $DRY_RUN == true ]] && warn "DRY RUN MODE - No actual changes will be made"

# Create backup
if [[ $DRY_RUN == false ]]; then
    info "Creating backup in $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r *.md "$BACKUP_DIR/" 2>/dev/null || true
fi

# Create new directory structure
info "Creating new directory structure"
declare -a NEW_DIRS=(
    "docs/getting-started"
    "docs/architecture"
    "docs/deployment"
    "docs/consultant-business"
    "docs/api"
    "docs/compliance"
    "docs/legal"
    "docs/testing"
    "archive/old-summaries"
    "archive/old-deployment-guides"
)

for dir in "${NEW_DIRS[@]}"; do
    if [[ $DRY_RUN == false ]]; then
        mkdir -p "$dir"
        info "Created: $dir"
    else
        log "Would create: $dir"
    fi
done

# Move files function
move_file() {
    local src=$1
    local dest=$2
    
    if [[ -f "$src" ]]; then
        if [[ $DRY_RUN == false ]]; then
            git mv "$src" "$dest" 2>/dev/null || mv "$src" "$dest"
            info "Moved: $src → $dest"
        else
            log "Would move: $src → $dest"
        fi
    else
        warn "File not found: $src"
    fi
}

# DEPLOYMENT DOCS
info "\nOrganizing deployment documentation..."
move_file "DEPLOYMENT_READY.md" "docs/deployment/overview.md"
move_file "RAILWAY_DEPLOYMENT_GUIDE.md" "docs/deployment/railway.md"
move_file "PRODUCTION_DEPLOY_CHECKLIST.md" "docs/deployment/production-checklist.md"
move_file "DEPLOYMENT_TEST_REPORT.md" "docs/deployment/test-report.md"
move_file "QUICK_DEPLOY.md" "docs/deployment/quickstart.md"
move_file "RAILWAY_QUICK_START.md" "docs/deployment/railway-quickstart.md"

# Archive old deployment guides
move_file "DEPLOYMENT_AUDIT_RAILWAY_VERCEL.md" "archive/old-deployment-guides/"
move_file "DEPLOYMENT_HARMONY_GUIDE.md" "archive/old-deployment-guides/"
move_file "DEPLOYMENT_READINESS_NOVEMBER_2025.md" "archive/old-deployment-guides/"

# CONSULTANT BUSINESS DOCS
info "\nOrganizing consultant business documentation..."
move_file "consultant-site/README.md" "docs/consultant-business/setup-guide.md"
move_file "CONSULTANT_BUSINESS_GUIDE.md" "docs/consultant-business/marketing-playbook.md"
move_file "CONSULTANT_QUICKSTART.md" "docs/consultant-business/quickstart.md"
move_file "DAY_ONE_IMPLEMENTATION_BUDGET.md" "docs/consultant-business/budget-planning.md"
move_file "IMMEDIATE_ACTION_PLAN_WEEK_1.md" "docs/consultant-business/week-1-plan.md"

# ARCHITECTURE DOCS
info "\nOrganizing architecture documentation..."
move_file "CODEBASE_ARCHITECTURE.md" "docs/architecture/overview.md"
move_file "ARCHITECTURE_DIAGRAMS.md" "docs/architecture/diagrams.md"
move_file "WCAGAI_Architecture_Flow.md" "docs/architecture/data-flow.md"
move_file "QUICK_REFERENCE.md" "docs/architecture/quick-reference.md"

# LEGAL & COMPLIANCE
info "\nOrganizing legal and compliance documentation..."
move_file "LEGAL_COMPLIANCE_CHECKLIST.md" "docs/legal/compliance-checklist.md"
move_file "MULTI_PLATFORM_BUSINESS_MODEL.md" "docs/legal/business-model.md"

# TESTING DOCS
info "\nOrganizing testing documentation..."
move_file "TESTING_STRATEGY.md" "docs/testing/strategy.md"
move_file "TEST_SUMMARY.md" "docs/testing/summary.md"
move_file "END_TO_END_TESTING_GUIDE.md" "docs/testing/e2e-guide.md"
move_file "FINTECH_TESTING_GUIDE.md" "docs/testing/fintech-guide.md"

# IMPLEMENTATION SUMMARIES (Archive old ones)
info "\nArchiving implementation summaries..."
move_file "IMPLEMENTATION_COMPLETE.md" "archive/old-summaries/"
move_file "IMPLEMENTATION_COMPLETE_SUMMARY.md" "archive/old-summaries/"
move_file "IMPLEMENTATION_SUMMARY_PIVOT.md" "archive/old-summaries/"
move_file "IMPLEMENTATION_STATUS.md" "docs/implementation-status.md"

# STRATEGIC DOCS
info "\nArchiving strategic documents..."
move_file "STRATEGIC_PIVOT_AI_SITE_TRANSFORMATION.md" "archive/old-summaries/"
move_file "STRATEGIC_SUMMARY_EXEC_BRIEF.md" "archive/old-summaries/"
move_file "WCAGAI_SESSION_SUMMARY.md" "archive/old-summaries/"

# API & INTEGRATION DOCS
info "\nOrganizing API documentation..."
move_file "API_KEYS_SETUP_GUIDE.md" "docs/api/keys-setup.md"
move_file "COMPLETE_DEPLOYMENT_PACKAGE.md" "docs/api/deployment-package.md"
move_file "SITE_TRANSFORMATION_API.md" "docs/api/transformation-api.md"

# PRODUCTION DOCS
info "\nOrganizing production documentation..."
move_file "PRODUCTION_READINESS_AUDIT.md" "docs/deployment/readiness-audit.md"
move_file "PRODUCTION_READINESS_IMPLEMENTATION.md" "docs/deployment/readiness-implementation.md"
move_file "PRODUCTION_RELIABILITY.md" "docs/deployment/reliability.md"
move_file "PRODUCTION_HARDENING_GUIDE.md" "docs/deployment/hardening-guide.md"

# MISC SUMMARIES
info "\nOrganizing miscellaneous summaries..."
move_file "ACCESSIBILITY_SCANNER_SUMMARY.md" "docs/getting-started/scanner-overview.md"
move_file "AGENTIC_DEPLOYMENT_SUMMARY.md" "docs/deployment/agentic-summary.md"
move_file "AUDIT_VERIFICATION_REPORT.md" "docs/compliance/audit-report.md"

# AI PROMPTS & GUIDES
info "\nOrganizing AI guides..."
move_file "AI_UNCERTAINTY_MITIGATION_FRAMEWORK.md" "docs/architecture/ai-mitigation.md"
move_file "MEGA_PROMPT_3_INTEGRATION.md" "docs/architecture/mega-prompt.md"

# SPECIALIZED GUIDES
info "\nOrganizing specialized guides..."
move_file "FULL_STACK_GUIDE.md" "docs/getting-started/fullstack-guide.md"
move_file "GITHUB_ACTIONS_SETUP.md" "docs/deployment/github-actions.md"
move_file "RAILWAY_ENV_TEMPLATE.txt" "docs/deployment/railway-env-template.txt"

# WCAGAI SPECIFIC
info "\nOrganizing WCAGAI specific docs..."
move_file "WCAGAI_Complete_Strategy.md" "docs/consultant-business/complete-strategy.md"
move_file "WCAGAI_Consultant_Roadmap.md" "docs/consultant-business/roadmap.md"
move_file "WCAGAI_Executive_OnePager.md" "docs/consultant-business/executive-summary.md"
move_file "WCAGAI_Masonic_Code.md" "docs/architecture/masonic-code.md"
move_file "WCAGAI_Masonic_Messaging.md" "docs/architecture/masonic-messaging.md"
move_file "WCAG_CONFORMANCE_REPORT.md" "docs/compliance/conformance-report.md"

# PHASE REPORTS
info "\nOrganizing phase reports..."
move_file "PHASE_1_VALIDATION_REPORT.md" "docs/testing/phase-1-report.md"
move_file "DAY_1_EXECUTION_TODAY.md" "archive/old-summaries/"

# PR & SECURITY
info "\nOrganizing PR and security docs..."
move_file "PR_TEMPLATE.md" "docs/contributing/pr-template.md"
move_file "SECURITY.md" "docs/security.md"

# SCREENSHOT SERVICE
info "\nOrganizing screenshot service docs..."
move_file "SCREENSHOT_SERVICE_API.md" "docs/api/screenshot-service.md"

info "\n✨ File reorganization complete!"

# Generate summary report
info "\nGenerating summary report..."

if [[ $DRY_RUN == false ]]; then
    cat > docs/REORGANIZATION_REPORT.md <<EOF
# Documentation Reorganization Report

Date: $(date +'%Y-%m-%d %H:%M:%S')
Backup Location: $BACKUP_DIR

## Summary

- **Files moved**: $(grep -c "Moved:" "$LOG_FILE" || echo "0")
- **Directories created**: ${#NEW_DIRS[@]}
- **Files archived**: $(find archive -type f | wc -l)

## New Structure

\`\`\`
docs/
├── getting-started/
├── architecture/
├── deployment/
├── consultant-business/
├── api/
├── compliance/
├── legal/
└── testing/

archive/
├── old-summaries/
└── old-deployment-guides/
\`\`\`

## Next Steps

1. Review the new structure
2. Update any internal links in documentation
3. Test documentation navigation
4. Commit changes to git

## Rollback

If needed, restore from backup:
\`\`\`bash
cp -r $BACKUP_DIR/* .
\`\`\`

Full log: $LOG_FILE
EOF

    info "Report generated: docs/REORGANIZATION_REPORT.md"
fi

info "\n🎉 Reorganization complete! Check $LOG_FILE for details."

if [[ $DRY_RUN == true ]]; then
    warn "\nThis was a dry run. No changes were made."
    warn "Run without --dry-run to apply changes."
fi
