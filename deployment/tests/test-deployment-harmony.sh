#!/bin/bash
#
# Integration Tests for Deployment Harmony System
# Tests the verification and deployment scripts
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log() {
  echo -e "${GREEN}[TEST]${NC} $1"
}

error() {
  echo -e "${RED}[FAIL]${NC} $1"
}

pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

test_script_exists() {
  local script_path="$1"
  local test_name="$2"
  
  if [ -f "$script_path" ]; then
    pass "$test_name: Script exists"
  else
    fail "$test_name: Script does not exist at $script_path"
  fi
}

test_script_executable() {
  local script_path="$1"
  local test_name="$2"
  
  if [ -x "$script_path" ]; then
    pass "$test_name: Script is executable"
  else
    fail "$test_name: Script is not executable"
  fi
}

test_script_syntax() {
  local script_path="$1"
  local test_name="$2"
  
  if bash -n "$script_path" 2>/dev/null; then
    pass "$test_name: Script syntax is valid"
  else
    fail "$test_name: Script has syntax errors"
  fi
}

test_configuration_file() {
  local config_path="$1"
  local test_name="$2"
  
  if [ -f "$config_path" ]; then
    pass "$test_name: Configuration file exists"
    
    # Test JSON validity
    if jq empty "$config_path" 2>/dev/null; then
      pass "$test_name: JSON is valid"
    else
      fail "$test_name: JSON is invalid"
    fi
  else
    fail "$test_name: Configuration file does not exist"
  fi
}

test_agent_configuration() {
  local agent_path="$1"
  local test_name="$2"
  
  if [ -f "$agent_path" ]; then
    pass "$test_name: Agent file exists"
    
    # Check for required sections
    if grep -q "^name:" "$agent_path" && grep -q "^description:" "$agent_path"; then
      pass "$test_name: Agent metadata present"
    else
      fail "$test_name: Agent metadata missing"
    fi
  else
    fail "$test_name: Agent file does not exist"
  fi
}

test_verification_script_output() {
  local test_name="Verification Script Output"
  
  log "Running verification script (this may take a moment)..."
  
  # Run verification and capture output
  if OUTPUT=$(cd "$PROJECT_ROOT" && bash deployment/scripts/verify-deployment-harmony.sh --pre-deploy staging 2>&1); then
    pass "$test_name: Script executed without errors"
    
    # Check for expected output sections
    if echo "$OUTPUT" | grep -q "Phase 1: Type Consistency"; then
      pass "$test_name: Phase 1 output present"
    else
      fail "$test_name: Phase 1 output missing"
    fi
    
    if echo "$OUTPUT" | grep -q "Phase 2: API Contract"; then
      pass "$test_name: Phase 2 output present"
    else
      fail "$test_name: Phase 2 output missing"
    fi
    
    if echo "$OUTPUT" | grep -q "Verification Report"; then
      pass "$test_name: Report generation works"
    else
      fail "$test_name: Report generation failed"
    fi
    
    if echo "$OUTPUT" | grep -q "Score:"; then
      pass "$test_name: Score calculation works"
    else
      fail "$test_name: Score calculation failed"
    fi
  else
    # It's okay if it fails due to missing dependencies, just check syntax
    fail "$test_name: Script execution failed (may be due to missing dependencies)"
  fi
}

test_deployment_coordinator_syntax() {
  local test_name="Deployment Coordinator Syntax"
  
  if bash -n "$PROJECT_ROOT/deployment/scripts/deploy-unified.sh" 2>/dev/null; then
    pass "$test_name: Deployment coordinator syntax is valid"
  else
    fail "$test_name: Deployment coordinator has syntax errors"
  fi
}

test_github_workflow() {
  local workflow_path="$PROJECT_ROOT/.github/workflows/deployment-harmony.yml"
  local test_name="GitHub Workflow"
  
  if [ -f "$workflow_path" ]; then
    pass "$test_name: Workflow file exists"
    
    # Check for required jobs
    if grep -q "jobs:" "$workflow_path"; then
      pass "$test_name: Jobs defined"
    else
      fail "$test_name: No jobs defined"
    fi
    
    if grep -q "verify-harmony:" "$workflow_path"; then
      pass "$test_name: Verification job exists"
    else
      fail "$test_name: Verification job missing"
    fi
  else
    fail "$test_name: Workflow file does not exist"
  fi
}

test_documentation() {
  local doc_path="$PROJECT_ROOT/DEPLOYMENT_HARMONY_GUIDE.md"
  local test_name="Documentation"
  
  if [ -f "$doc_path" ]; then
    pass "$test_name: Documentation file exists"
    
    # Check for key sections
    if grep -q "## Overview" "$doc_path"; then
      pass "$test_name: Overview section present"
    else
      fail "$test_name: Overview section missing"
    fi
    
    if grep -q "## Components" "$doc_path"; then
      pass "$test_name: Components section present"
    else
      fail "$test_name: Components section missing"
    fi
    
    if grep -q "## Verification Phases" "$doc_path"; then
      pass "$test_name: Verification phases documented"
    else
      fail "$test_name: Verification phases not documented"
    fi
  else
    fail "$test_name: Documentation file does not exist"
  fi
}

# ============================================================================
# Main Test Suite
# ============================================================================

main() {
  echo ""
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Deployment Harmony System - Integration Tests           ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  cd "$PROJECT_ROOT"
  
  # Test 1: Verify Harmony Agent
  echo -e "${BLUE}Test Suite 1: Verify Harmony Agent${NC}"
  test_agent_configuration ".github/agents/verify-harmony.agent.md" "Verify Harmony Agent"
  echo ""
  
  # Test 2: Verification Script
  echo -e "${BLUE}Test Suite 2: Verification Script${NC}"
  test_script_exists "deployment/scripts/verify-deployment-harmony.sh" "Verification Script"
  test_script_executable "deployment/scripts/verify-deployment-harmony.sh" "Verification Script"
  test_script_syntax "deployment/scripts/verify-deployment-harmony.sh" "Verification Script"
  test_verification_script_output
  echo ""
  
  # Test 3: Deployment Coordinator
  echo -e "${BLUE}Test Suite 3: Deployment Coordinator${NC}"
  test_script_exists "deployment/scripts/deploy-unified.sh" "Deploy Unified"
  test_script_executable "deployment/scripts/deploy-unified.sh" "Deploy Unified"
  test_deployment_coordinator_syntax
  echo ""
  
  # Test 4: Existing Validation Scripts
  echo -e "${BLUE}Test Suite 4: Validation Scripts${NC}"
  test_script_exists "deployment/scripts/validate-railway.sh" "Railway Validator"
  test_script_executable "deployment/scripts/validate-railway.sh" "Railway Validator"
  test_script_syntax "deployment/scripts/validate-railway.sh" "Railway Validator"
  
  test_script_exists "deployment/scripts/validate-vercel.sh" "Vercel Validator"
  test_script_executable "deployment/scripts/validate-vercel.sh" "Vercel Validator"
  test_script_syntax "deployment/scripts/validate-vercel.sh" "Vercel Validator"
  echo ""
  
  # Test 5: Configuration Files
  echo -e "${BLUE}Test Suite 5: Configuration Files${NC}"
  test_configuration_file "packages/api/railway.json" "Railway Config"
  test_configuration_file "packages/webapp/vercel.json" "Vercel Config"
  echo ""
  
  # Test 6: GitHub Workflow
  echo -e "${BLUE}Test Suite 6: GitHub Actions${NC}"
  test_github_workflow
  echo ""
  
  # Test 7: Documentation
  echo -e "${BLUE}Test Suite 7: Documentation${NC}"
  test_documentation
  echo ""
  
  # Summary
  echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Test Results Summary                                     ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
  echo -e "${RED}Failed:${NC} $TESTS_FAILED"
  
  TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
  if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; ($TESTS_PASSED / $TOTAL_TESTS) * 100" | bc)
    echo -e "${BLUE}Pass Rate:${NC} ${PASS_RATE}%"
  fi
  echo ""
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
  fi
}

# Run tests
main "$@"
