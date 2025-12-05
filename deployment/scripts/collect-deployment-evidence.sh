#!/bin/bash

##############################################################################
# Deployment Evidence Collection Script
# 
# Purpose: Automatically collect evidence of deployment completeness
# Usage: ./collect-deployment-evidence.sh [api-url] [frontend-url]
# Output: Creates evidence vault with timestamped reports
##############################################################################

set -euo pipefail

# Configuration
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
EVIDENCE_DIR="/home/runner/work/wcag-ai-platform/wcag-ai-platform/evidence-vault/deployment-${TIMESTAMP}"
API_URL="${1:-}"
FRONTEND_URL="${2:-}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

##############################################################################
# Setup
##############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WCAG AI Platform - Deployment Evidence Collection            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create evidence directory
mkdir -p "$EVIDENCE_DIR"
echo -e "${GREEN}✓${NC} Created evidence directory: $EVIDENCE_DIR"

##############################################################################
# Collect Repository Evidence
##############################################################################

echo ""
echo -e "${YELLOW}Collecting Repository Evidence...${NC}"

# Git status
git --no-pager status > "$EVIDENCE_DIR/git-status.txt" 2>&1 || true
echo -e "${GREEN}✓${NC} Git status saved"

# Git log (last 50 commits)
git --no-pager log --oneline -50 > "$EVIDENCE_DIR/git-log.txt" 2>&1 || true
echo -e "${GREEN}✓${NC} Git log saved"

# Branch information
git --no-pager branch -a > "$EVIDENCE_DIR/git-branches.txt" 2>&1 || true
echo -e "${GREEN}✓${NC} Branch info saved"

# File structure
tree -L 3 -I 'node_modules|dist|.git' > "$EVIDENCE_DIR/file-structure.txt" 2>&1 || \
    find . -type f -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.git/*' | head -100 > "$EVIDENCE_DIR/file-structure.txt"
echo -e "${GREEN}✓${NC} File structure saved"

##############################################################################
# Collect Dependency Evidence
##############################################################################

echo ""
echo -e "${YELLOW}Collecting Dependency Evidence...${NC}"

# Root package.json
cp package.json "$EVIDENCE_DIR/root-package.json" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Root package.json saved"

# API package.json
cp packages/api/package.json "$EVIDENCE_DIR/api-package.json" 2>/dev/null || true
echo -e "${GREEN}✓${NC} API package.json saved"

# WebApp package.json
cp packages/webapp/package.json "$EVIDENCE_DIR/webapp-package.json" 2>/dev/null || true
echo -e "${GREEN}✓${NC} WebApp package.json saved"

# npm audit
cd packages/api && npm audit --json > "$EVIDENCE_DIR/api-npm-audit.json" 2>&1 || true
cd ../..
echo -e "${GREEN}✓${NC} API npm audit saved"

cd packages/webapp && npm audit --json > "$EVIDENCE_DIR/webapp-npm-audit.json" 2>&1 || true
cd ../..
echo -e "${GREEN}✓${NC} WebApp npm audit saved"

##############################################################################
# Collect Build Evidence
##############################################################################

echo ""
echo -e "${YELLOW}Collecting Build Evidence...${NC}"

# Build API
cd packages/api
echo "Building API..." > "$EVIDENCE_DIR/api-build.log"
npm run build >> "$EVIDENCE_DIR/api-build.log" 2>&1 && \
    echo "Build successful" >> "$EVIDENCE_DIR/api-build.log" || \
    echo "Build failed" >> "$EVIDENCE_DIR/api-build.log"
cd ../..
echo -e "${GREEN}✓${NC} API build log saved"

# Build WebApp
cd packages/webapp
echo "Building WebApp..." > "$EVIDENCE_DIR/webapp-build.log"
npm run build >> "$EVIDENCE_DIR/webapp-build.log" 2>&1 && \
    echo "Build successful" >> "$EVIDENCE_DIR/webapp-build.log" || \
    echo "Build failed" >> "$EVIDENCE_DIR/webapp-build.log"
cd ../..
echo -e "${GREEN}✓${NC} WebApp build log saved"

# List build artifacts
ls -lah packages/api/dist/ > "$EVIDENCE_DIR/api-dist-contents.txt" 2>/dev/null || echo "No dist directory" > "$EVIDENCE_DIR/api-dist-contents.txt"
ls -lah packages/webapp/dist/ > "$EVIDENCE_DIR/webapp-dist-contents.txt" 2>/dev/null || echo "No dist directory" > "$EVIDENCE_DIR/webapp-dist-contents.txt"
echo -e "${GREEN}✓${NC} Build artifacts listed"

##############################################################################
# Collect Test Evidence
##############################################################################

echo ""
echo -e "${YELLOW}Collecting Test Evidence...${NC}"

# Run API tests
cd packages/api
echo "Running API tests..." > "$EVIDENCE_DIR/api-tests.log"
npm test >> "$EVIDENCE_DIR/api-tests.log" 2>&1 || true
cd ../..
echo -e "${GREEN}✓${NC} API test results saved"

# Run WebApp tests
cd packages/webapp
echo "Running WebApp tests..." > "$EVIDENCE_DIR/webapp-tests.log"
npm test >> "$EVIDENCE_DIR/webapp-tests.log" 2>&1 || true
cd ../..
echo -e "${GREEN}✓${NC} WebApp test results saved"

##############################################################################
# Collect Deployment Configuration Evidence
##############################################################################

echo ""
echo -e "${YELLOW}Collecting Deployment Configuration Evidence...${NC}"

# Railway configuration
cp packages/api/railway.json "$EVIDENCE_DIR/railway.json" 2>/dev/null || true
cp packages/api/railway.toml "$EVIDENCE_DIR/railway.toml" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Railway config saved"

# Vercel configuration
cp packages/webapp/vercel.json "$EVIDENCE_DIR/vercel.json" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Vercel config saved"

# Docker configuration
cp packages/api/Dockerfile "$EVIDENCE_DIR/api-Dockerfile" 2>/dev/null || true
cp docker-compose.yml "$EVIDENCE_DIR/docker-compose.yml" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Docker config saved"

# Environment variable templates
cp packages/api/.env.example "$EVIDENCE_DIR/api-env-example.txt" 2>/dev/null || true
cp packages/webapp/.env.example "$EVIDENCE_DIR/webapp-env-example.txt" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Environment templates saved"

##############################################################################
# Collect Live Deployment Evidence (if URLs provided)
##############################################################################

if [ -n "$API_URL" ] && [ -n "$FRONTEND_URL" ]; then
    echo ""
    echo -e "${YELLOW}Collecting Live Deployment Evidence...${NC}"
    
    # API health check
    curl -s "$API_URL/health" > "$EVIDENCE_DIR/api-health-response.json" 2>&1 || \
        echo "Failed to reach API health endpoint" > "$EVIDENCE_DIR/api-health-response.json"
    echo -e "${GREEN}✓${NC} API health response saved"
    
    # API endpoints
    curl -s "$API_URL/api/drafts" > "$EVIDENCE_DIR/api-drafts-response.json" 2>&1 || \
        echo "Failed to reach API drafts endpoint" > "$EVIDENCE_DIR/api-drafts-response.json"
    echo -e "${GREEN}✓${NC} API drafts response saved"
    
    # Frontend HTML
    curl -s "$FRONTEND_URL" > "$EVIDENCE_DIR/frontend-html.html" 2>&1 || \
        echo "Failed to reach frontend" > "$EVIDENCE_DIR/frontend-html.html"
    echo -e "${GREEN}✓${NC} Frontend HTML saved"
    
    # API response time test
    echo "Testing API response time (10 requests)..." > "$EVIDENCE_DIR/api-performance.log"
    for i in {1..10}; do
        curl -w "Request $i: %{time_total}s\n" -o /dev/null -s "$API_URL/api/drafts" >> "$EVIDENCE_DIR/api-performance.log" 2>&1
    done
    echo -e "${GREEN}✓${NC} API performance log saved"
    
    # Security headers
    curl -I "$FRONTEND_URL" > "$EVIDENCE_DIR/frontend-security-headers.txt" 2>&1 || true
    curl -I "$API_URL/health" > "$EVIDENCE_DIR/api-security-headers.txt" 2>&1 || true
    echo -e "${GREEN}✓${NC} Security headers saved"
    
    # Run comprehensive deployment check
    ./deployment/scripts/comprehensive-deployment-check.sh "$API_URL" "$FRONTEND_URL" > "$EVIDENCE_DIR/comprehensive-check-results.txt" 2>&1 || true
    echo -e "${GREEN}✓${NC} Comprehensive check results saved"
else
    echo ""
    echo -e "${YELLOW}Skipping live deployment checks (no URLs provided)${NC}"
fi

##############################################################################
# Collect Accessibility Evidence
##############################################################################

if [ -n "$FRONTEND_URL" ] && command -v axe &> /dev/null; then
    echo ""
    echo -e "${YELLOW}Collecting Accessibility Evidence...${NC}"
    
    # Run axe scan
    axe "$FRONTEND_URL" --save "$EVIDENCE_DIR/axe-accessibility-report.json" 2>&1 || true
    echo -e "${GREEN}✓${NC} Accessibility scan saved"
fi

##############################################################################
# Collect Documentation Evidence
##############################################################################

echo ""
echo -e "${YELLOW}Collecting Documentation Evidence...${NC}"

# Copy key documentation files
cp README.md "$EVIDENCE_DIR/README.md" 2>/dev/null || true
cp PRODUCTION_READINESS_AUDIT.md "$EVIDENCE_DIR/PRODUCTION_READINESS_AUDIT.md" 2>/dev/null || true
cp DEPLOYMENT_COMPLETENESS_CHECKLIST.md "$EVIDENCE_DIR/DEPLOYMENT_COMPLETENESS_CHECKLIST.md" 2>/dev/null || true
cp AI_AUDIT_PROMPTS.md "$EVIDENCE_DIR/AI_AUDIT_PROMPTS.md" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Documentation copied"

##############################################################################
# Generate Evidence Summary Report
##############################################################################

echo ""
echo -e "${YELLOW}Generating Evidence Summary Report...${NC}"

cat > "$EVIDENCE_DIR/EVIDENCE_SUMMARY.md" << EOF
# Deployment Evidence Summary

**Collection Date**: $(date)
**Evidence Directory**: $(basename "$EVIDENCE_DIR")
**Collected By**: $(git config user.name) <$(git config user.email)>

---

## 📁 Evidence Files Collected

### Repository Evidence
- \`git-status.txt\` - Current Git working directory status
- \`git-log.txt\` - Recent commit history (50 commits)
- \`git-branches.txt\` - Branch information
- \`file-structure.txt\` - Repository file structure

### Dependency Evidence
- \`root-package.json\` - Root workspace dependencies
- \`api-package.json\` - API package dependencies
- \`webapp-package.json\` - WebApp package dependencies
- \`api-npm-audit.json\` - API dependency vulnerability scan
- \`webapp-npm-audit.json\` - WebApp dependency vulnerability scan

### Build Evidence
- \`api-build.log\` - API build output
- \`webapp-build.log\` - WebApp build output
- \`api-dist-contents.txt\` - API build artifacts
- \`webapp-dist-contents.txt\` - WebApp build artifacts

### Test Evidence
- \`api-tests.log\` - API test execution results
- \`webapp-tests.log\` - WebApp test execution results

### Configuration Evidence
- \`railway.json\` - Railway deployment configuration
- \`railway.toml\` - Railway build configuration
- \`vercel.json\` - Vercel deployment configuration
- \`api-Dockerfile\` - API Docker configuration
- \`docker-compose.yml\` - Docker Compose configuration
- \`api-env-example.txt\` - API environment variable template
- \`webapp-env-example.txt\` - WebApp environment variable template

### Live Deployment Evidence
$(if [ -n "$API_URL" ]; then
echo "- \`api-health-response.json\` - API health check response"
echo "- \`api-drafts-response.json\` - API drafts endpoint response"
echo "- \`frontend-html.html\` - Frontend HTML content"
echo "- \`api-performance.log\` - API response time measurements"
echo "- \`frontend-security-headers.txt\` - Frontend security headers"
echo "- \`api-security-headers.txt\` - API security headers"
echo "- \`comprehensive-check-results.txt\` - Full deployment validation results"
else
echo "- *(No live deployment evidence - URLs not provided)*"
fi)

### Accessibility Evidence
$(if [ -n "$FRONTEND_URL" ] && command -v axe &> /dev/null; then
echo "- \`axe-accessibility-report.json\` - Automated accessibility scan results"
else
echo "- *(No accessibility evidence - axe-cli not installed or URL not provided)*"
fi)

### Documentation Evidence
- \`README.md\` - Main project README
- \`PRODUCTION_READINESS_AUDIT.md\` - Production readiness audit
- \`DEPLOYMENT_COMPLETENESS_CHECKLIST.md\` - Deployment checklist
- \`AI_AUDIT_PROMPTS.md\` - AI audit prompts

---

## 🔍 Quick Analysis

### Git Status
\`\`\`
$(cat "$EVIDENCE_DIR/git-status.txt")
\`\`\`

### Build Status
**API Build**: $(grep -q "Build successful" "$EVIDENCE_DIR/api-build.log" && echo "✅ Success" || echo "❌ Failed")
**WebApp Build**: $(grep -q "Build successful" "$EVIDENCE_DIR/webapp-build.log" && echo "✅ Success" || echo "❌ Failed")

### Dependency Vulnerabilities
**API**: $(if [ -f "$EVIDENCE_DIR/api-npm-audit.json" ]; then jq -r '.metadata | "Critical: \(.vulnerabilities.critical), High: \(.vulnerabilities.high), Moderate: \(.vulnerabilities.moderate)"' "$EVIDENCE_DIR/api-npm-audit.json" 2>/dev/null || echo "Unable to parse"; else echo "No audit data"; fi)
**WebApp**: $(if [ -f "$EVIDENCE_DIR/webapp-npm-audit.json" ]; then jq -r '.metadata | "Critical: \(.vulnerabilities.critical), High: \(.vulnerabilities.high), Moderate: \(.vulnerabilities.moderate)"' "$EVIDENCE_DIR/webapp-npm-audit.json" 2>/dev/null || echo "Unable to parse"; else echo "No audit data"; fi)

$(if [ -n "$API_URL" ]; then
echo "### Live Deployment Status"
echo "**API URL**: $API_URL"
echo "**Frontend URL**: $FRONTEND_URL"
echo "**API Health**: $(curl -sf "$API_URL/health" > /dev/null && echo "✅ Healthy" || echo "❌ Unreachable")"
echo "**Frontend Status**: $(curl -sf "$FRONTEND_URL" > /dev/null && echo "✅ Online" || echo "❌ Unreachable")"
fi)

---

## 📊 Evidence Validation

To validate this evidence:

1. Review all collected files in: \`$EVIDENCE_DIR\`
2. Verify build logs show successful compilation
3. Check test logs show passing tests
4. Validate security headers are present
5. Confirm no critical vulnerabilities in npm audit
6. Review comprehensive check results (if available)

---

## 🔗 Related Documentation

- [AI Audit Prompts](AI_AUDIT_PROMPTS.md)
- [Deployment Reproducibility Guide](DEPLOYMENT_REPRODUCIBILITY_GUIDE.md)
- [Live Deployment Testing Guide](LIVE_DEPLOYMENT_TESTING_GUIDE.md)
- [Production Readiness Audit](PRODUCTION_READINESS_AUDIT.md)

---

**Evidence Collection Complete**: $(date)
EOF

echo -e "${GREEN}✓${NC} Evidence summary report generated"

##############################################################################
# Create Evidence Archive
##############################################################################

echo ""
echo -e "${YELLOW}Creating Evidence Archive...${NC}"

ARCHIVE_NAME="deployment-evidence-${TIMESTAMP}.tar.gz"
tar -czf "$EVIDENCE_DIR/../$ARCHIVE_NAME" -C "$(dirname "$EVIDENCE_DIR")" "$(basename "$EVIDENCE_DIR")"

echo -e "${GREEN}✓${NC} Evidence archive created: $ARCHIVE_NAME"

##############################################################################
# Summary
##############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Evidence Collection Complete                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Evidence Directory: ${GREEN}$EVIDENCE_DIR${NC}"
echo -e "Evidence Archive:   ${GREEN}$EVIDENCE_DIR/../$ARCHIVE_NAME${NC}"
echo -e "Summary Report:     ${GREEN}$EVIDENCE_DIR/EVIDENCE_SUMMARY.md${NC}"
echo ""
echo -e "View the summary report:"
echo -e "  ${YELLOW}cat $EVIDENCE_DIR/EVIDENCE_SUMMARY.md${NC}"
echo ""
echo -e "Share the evidence archive:"
echo -e "  ${YELLOW}scp $EVIDENCE_DIR/../$ARCHIVE_NAME user@server:/path/${NC}"
echo ""
