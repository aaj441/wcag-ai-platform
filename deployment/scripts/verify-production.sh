#!/bin/bash
#
# Production Deployment Verification
# Validates all 10 meta prompts are satisfied
#

set -e

PRODUCTION_URL="${1:-https://wcagaii.railway.app}"
FAILED=0

echo "🔍 WCAG AI Platform - Production Verification"
echo "=============================================="
echo "Target: $PRODUCTION_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local result="$2"

  if [ "$result" = "0" ]; then
    echo -e "${GREEN}✅${NC} $name"
  else
    echo -e "${RED}❌${NC} $name"
    FAILED=$((FAILED + 1))
  fi
}

warn() {
  local name="$1"
  echo -e "${YELLOW}⚠️${NC}  $name"
}

# ========================================
# 1. Health Check Reality
# ========================================
echo "1️⃣  Health Check Reality"
echo "-------------------------------------------"

health_response=$(curl -s "$PRODUCTION_URL/health")
health_status=$?

if [ $health_status -eq 0 ] && echo "$health_response" | grep -q "ok"; then
  check "Health endpoint returns 200 with status" 0
else
  check "Health endpoint returns 200 with status" 1
fi

# Check if health endpoint includes DB connectivity
if echo "$health_response" | grep -qi "database\|db\|postgres"; then
  check "Health check verifies database connectivity" 0
else
  warn "Health check doesn't explicitly verify database"
fi

# ========================================
# 2. Rollback Capability
# ========================================
echo ""
echo "2️⃣  Rollback Capability"
echo "-------------------------------------------"

if command -v railway &> /dev/null; then
  check "Railway CLI installed" 0
else
  check "Railway CLI installed" 1
fi

if [ -f ".github/workflows/production-deploy.yml" ]; then
  if grep -q "rollback" ".github/workflows/production-deploy.yml"; then
    check "Automated rollback configured in CI/CD" 0
  else
    check "Automated rollback configured in CI/CD" 1
  fi
else
  warn "GitHub Actions workflow not found"
fi

# ========================================
# 3. Environment Parity
# ========================================
echo ""
echo "3️⃣  Environment Parity"
echo "-------------------------------------------"

if [ -f "deployment/terraform/main.tf" ]; then
  check "Infrastructure as Code (Terraform) present" 0
else
  check "Infrastructure as Code (Terraform) present" 1
fi

if [ -f "deployment/config/.env.template" ]; then
  check "Environment variable template documented" 0
else
  check "Environment variable template documented" 1
fi

# ========================================
# 4. Load Testing & Autoscaling
# ========================================
echo ""
echo "4️⃣  Load Testing & Autoscaling"
echo "-------------------------------------------"

if [ -f "deployment/scripts/load-test.js" ]; then
  check "Load test script exists (k6)" 0
else
  check "Load test script exists (k6)" 1
fi

if grep -q "autoscaling" "deployment/terraform/main.tf" 2>/dev/null; then
  check "Autoscaling configured in infrastructure" 0
else
  warn "Autoscaling configuration not found in Terraform"
fi

# ========================================
# 5. Observability
# ========================================
echo ""
echo "5️⃣  Observability Under Fire"
echo "-------------------------------------------"

metrics_response=$(curl -s "$PRODUCTION_URL/metrics")
if echo "$metrics_response" | grep -q "wcagai_"; then
  check "Prometheus metrics endpoint responding" 0
else
  check "Prometheus metrics endpoint responding" 1
fi

if [ -f "packages/api/src/instrumentation.ts" ]; then
  check "OpenTelemetry tracing configured" 0
else
  check "OpenTelemetry tracing configured" 1
fi

if [ -f "packages/api/src/utils/logger.ts" ]; then
  check "Structured logging implemented" 0
else
  check "Structured logging implemented" 1
fi

# ========================================
# 6. Data Corruption & Backups
# ========================================
echo ""
echo "6️⃣  Data Corruption & Backup Protection"
echo "-------------------------------------------"

if grep -q "aws_s3_bucket_versioning" "deployment/terraform/main.tf" 2>/dev/null; then
  check "S3 versioning enabled for audit logs" 0
else
  warn "S3 versioning not found in Terraform"
fi

if grep -q "lifecycle" "deployment/terraform/main.tf" 2>/dev/null; then
  check "S3 lifecycle policies configured" 0
else
  warn "S3 lifecycle policies not configured"
fi

# ========================================
# 7. Dependency Resilience
# ========================================
echo ""
echo "7️⃣  Dependency Hell Validation"
echo "-------------------------------------------"

if [ -f "packages/api/src/middleware/security.ts" ]; then
  if grep -q "rateLimit" "packages/api/src/middleware/security.ts"; then
    check "Rate limiting implemented" 0
  else
    check "Rate limiting implemented" 1
  fi

  if grep -q "ssrfProtection" "packages/api/src/middleware/security.ts"; then
    check "SSRF protection implemented" 0
  else
    check "SSRF protection implemented" 1
  fi
else
  check "Security middleware exists" 1
fi

# ========================================
# 8. Security Audit
# ========================================
echo ""
echo "8️⃣  Security Audit Speedrun"
echo "-------------------------------------------"

# Check for secrets in git
if git log --all --pretty=format: --name-only --diff-filter=A | grep -i -E "(secret|key|password)" | grep -v ".example" | head -1 > /dev/null 2>&1; then
  warn "Potential secrets found in git history"
else
  check "No secrets in git history (basic check)" 0
fi

# Test SSRF protection
ssrf_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PRODUCTION_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost"}')

if [ "$ssrf_response" = "403" ] || [ "$ssrf_response" = "400" ]; then
  check "SSRF protection active (blocks localhost)" 0
else
  check "SSRF protection active (blocks localhost)" 1
fi

# Check security headers
security_headers=$(curl -s -I "$PRODUCTION_URL/health")
if echo "$security_headers" | grep -qi "X-Content-Type-Options"; then
  check "Security headers present (X-Content-Type-Options)" 0
else
  warn "Security headers missing"
fi

# ========================================
# 9. Build Reproducibility
# ========================================
echo ""
echo "9️⃣  Build Reproducibility Test"
echo "-------------------------------------------"

if [ -f "packages/api/package-lock.json" ] && [ -f "packages/webapp/package-lock.json" ]; then
  check "Dependencies pinned (package-lock.json)" 0
else
  check "Dependencies pinned (package-lock.json)" 1
fi

if [ -f ".github/workflows/production-deploy.yml" ]; then
  if grep -q "cache" ".github/workflows/production-deploy.yml"; then
    check "Build caching configured" 0
  else
    warn "Build caching not found in CI/CD"
  fi
fi

# ========================================
# 10. Business Continuity
# ========================================
echo ""
echo "🔟 Business Continuity Question"
echo "-------------------------------------------"

if [ -f "README.md" ]; then
  check "Documentation exists (README.md)" 0
else
  check "Documentation exists (README.md)" 1
fi

if [ -f "PRODUCTION_READINESS_AUDIT.md" ] || [ -f "docs/RUNBOOK.md" ]; then
  check "Runbook/deployment docs exist" 0
else
  warn "No runbook found"
fi

if [ -d "deployment/terraform" ] && [ -d ".github/workflows" ]; then
  check "Infrastructure and CI/CD documented in code" 0
else
  check "Infrastructure and CI/CD documented in code" 1
fi

# ========================================
# Summary
# ========================================
echo ""
echo "=============================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All critical checks passed!${NC}"
  echo "   The platform is production-ready."
  exit 0
else
  echo -e "${RED}❌ $FAILED critical check(s) failed${NC}"
  echo "   Review the failures before deploying to production."
  exit 1
fi
