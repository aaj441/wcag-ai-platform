#!/bin/bash

# Comprehensive Security Audit Script
# This script checks for all critical security issues mentioned in the verification protocol

echo "=========================================="
echo "WCAG AI Platform - Security Audit Report"
echo "=========================================="
echo ""
echo "Audit Date: $(date)"
echo "Repository: aaj441/wcag-ai-platform"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize counters
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0

echo "=========================================="
echo "1. SECRETS SWEEP (CRITICAL)"
echo "=========================================="
echo ""

echo "Checking for secrets in current HEAD..."
SECRET_CHECK=$(git grep -i "password\|secret\|key=\|token=" -- "*env*" "*TEMPLATE*" 2>/dev/null || echo "")
if [ -z "$SECRET_CHECK" ]; then
    echo -e "${GREEN}✓ No secrets found in env/template files${NC}"
else
    echo -e "${RED}✗ CRITICAL: Secrets found in files:${NC}"
    echo "$SECRET_CHECK"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi
echo ""

echo "Checking git history for exposed secrets..."
HISTORY_SECRETS=$(git log -p --all -S 'sk_live' -S 'pk_live' -S 'BEGIN RSA' --oneline | head -20 || echo "")
if [ -z "$HISTORY_SECRETS" ]; then
    echo -e "${GREEN}✓ No obvious secrets in git history${NC}"
else
    echo -e "${RED}✗ CRITICAL: Potential secrets in git history${NC}"
    echo "$HISTORY_SECRETS"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi
echo ""

echo "Verifying .gitignore blocks secrets..."
if [ -f .gitignore ]; then
    if git check-ignore -v .env.production >/dev/null 2>&1; then
        echo -e "${GREEN}✓ .env.production is properly ignored${NC}"
    else
        echo -e "${RED}✗ CRITICAL: .env.production NOT in .gitignore${NC}"
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
    
    if git check-ignore -v .env.local >/dev/null 2>&1; then
        echo -e "${GREEN}✓ .env.local is properly ignored${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING: .env.local NOT in .gitignore${NC}"
        HIGH_ISSUES=$((HIGH_ISSUES + 1))
    fi
else
    echo -e "${RED}✗ CRITICAL: No .gitignore file found${NC}"
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "2. PATH TRAVERSAL CHECK"
echo "=========================================="
echo ""

echo "Searching for unsanitized path operations..."
PATH_ISSUES=$(find . -type f -name "*.js" -o -name "*.ts" | xargs grep -n "path\.join\|path\.resolve" 2>/dev/null | grep -v "node_modules" | grep -v "basename\|sanitize" || echo "")
if [ -z "$PATH_ISSUES" ]; then
    echo -e "${GREEN}✓ No obvious path traversal vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠ Potential path traversal issues found:${NC}"
    echo "$PATH_ISSUES" | head -20
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "3. ReDoS VERIFICATION"
echo "=========================================="
echo ""

echo "Finding dynamic RegExp usage..."
REDOS_CHECK=$(find . -type f \( -name "*.js" -o -name "*.ts" \) | xargs grep -n "new RegExp(" 2>/dev/null | grep -v "node_modules" || echo "")
if [ -z "$REDOS_CHECK" ]; then
    echo -e "${GREEN}✓ No dynamic RegExp patterns found${NC}"
else
    echo -e "${YELLOW}⚠ Dynamic RegExp usage found (potential ReDoS):${NC}"
    echo "$REDOS_CHECK" | head -20
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "4. SRI INTEGRITY CHECK"
echo "=========================================="
echo ""

echo "Checking HTML files for SRI attributes..."
HTML_FILES=$(find . -type f -name "*.html" | grep -v "node_modules")
if [ -z "$HTML_FILES" ]; then
    echo -e "${YELLOW}⚠ No HTML files found to check${NC}"
else
    MISSING_SRI=$(echo "$HTML_FILES" | xargs grep -L 'integrity=' 2>/dev/null || echo "")
    if [ -z "$MISSING_SRI" ]; then
        echo -e "${GREEN}✓ All HTML files have SRI integrity attributes${NC}"
    else
        echo -e "${YELLOW}⚠ HTML files missing SRI integrity:${NC}"
        echo "$MISSING_SRI"
        MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
    fi
fi
echo ""

echo "=========================================="
echo "5. ASYNC LOOP AUDIT"
echo "=========================================="
echo ""

echo "Counting await-in-loop patterns..."
ASYNC_LOOPS=$(find . -type f \( -name "*.js" -o -name "*.ts" \) | xargs grep -n "for.*await\|await.*for" 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$ASYNC_LOOPS" -eq 0 ]; then
    echo -e "${GREEN}✓ No await-in-loop antipatterns found${NC}"
elif [ "$ASYNC_LOOPS" -lt 5 ]; then
    echo -e "${YELLOW}⚠ Found $ASYNC_LOOPS await-in-loop patterns (review recommended)${NC}"
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
else
    echo -e "${RED}✗ Found $ASYNC_LOOPS await-in-loop patterns (needs refactoring)${NC}"
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "6. DEPENDENCY SECURITY"
echo "=========================================="
echo ""

echo "Checking for package.json files..."
PACKAGE_FILES=$(find . -name "package.json" | grep -v "node_modules")
if [ -z "$PACKAGE_FILES" ]; then
    echo -e "${YELLOW}⚠ No package.json files found${NC}"
else
    echo "Found package.json files:"
    echo "$PACKAGE_FILES"
    echo ""
    echo "Note: Run 'npm audit' in each directory to check for vulnerabilities"
fi
echo ""

echo "=========================================="
echo "7. ENVIRONMENT VARIABLE SECURITY"
echo "=========================================="
echo ""

echo "Checking for hardcoded credentials in code..."
HARDCODED_CREDS=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) | xargs grep -n "password\s*=\s*['&quot;].\|api_key\s*=\s*['&quot;].\|secret\s*=\s*['&quot;]." 2>/dev/null | grep -v "node_modules" | grep -v "process.env" | grep -v "config\." || echo "")
if [ -z "$HARDCODED_CREDS" ]; then
    echo -e "${GREEN}✓ No hardcoded credentials found${NC}"
else
    echo -e "${RED}✗ CRITICAL: Hardcoded credentials found:${NC}"
    echo "$HARDCODED_CREDS" | head -10
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "8. SQL INJECTION CHECK"
echo "=========================================="
echo ""

echo "Checking for potential SQL injection vulnerabilities..."
SQL_INJECTION=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" \) | xargs grep -n "execute.*+\|query.*+\|SELECT.*\${" 2>/dev/null | grep -v "node_modules" || echo "")
if [ -z "$SQL_INJECTION" ]; then
    echo -e "${GREEN}✓ No obvious SQL injection patterns found${NC}"
else
    echo -e "${YELLOW}⚠ Potential SQL injection vulnerabilities:${NC}"
    echo "$SQL_INJECTION" | head -10
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "9. XSS VULNERABILITY CHECK"
echo "=========================================="
echo ""

echo "Checking for potential XSS vulnerabilities..."
XSS_CHECK=$(find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) | xargs grep -n "innerHTML\|dangerouslySetInnerHTML" 2>/dev/null | grep -v "node_modules" || echo "")
if [ -z "$XSS_CHECK" ]; then
    echo -e "${GREEN}✓ No obvious XSS patterns found${NC}"
else
    echo -e "${YELLOW}⚠ Potential XSS vulnerabilities (review needed):${NC}"
    echo "$XSS_CHECK" | head -10
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "10. CORS CONFIGURATION"
echo "=========================================="
echo ""

echo "Checking CORS configuration..."
CORS_CHECK=$(find . -type f \( -name "*.js" -o -name "*.ts" \) | xargs grep -n "Access-Control-Allow-Origin.*\*" 2>/dev/null | grep -v "node_modules" || echo "")
if [ -z "$CORS_CHECK" ]; then
    echo -e "${GREEN}✓ No wildcard CORS configurations found${NC}"
else
    echo -e "${YELLOW}⚠ Wildcard CORS found (may be intentional):${NC}"
    echo "$CORS_CHECK" | head -5
    LOW_ISSUES=$((LOW_ISSUES + 1))
fi
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Critical Issues: $CRITICAL_ISSUES"
echo "High Issues: $HIGH_ISSUES"
echo "Medium Issues: $MEDIUM_ISSUES"
echo "Low Issues: $LOW_ISSUES"
echo ""

TOTAL_ISSUES=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES))

if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo -e "${RED}✗ CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED${NC}"
    exit 1
elif [ $HIGH_ISSUES -gt 0 ]; then
    echo -e "${YELLOW}⚠ HIGH PRIORITY ISSUES FOUND - ADDRESS SOON${NC}"
    exit 2
elif [ $MEDIUM_ISSUES -gt 0 ]; then
    echo -e "${YELLOW}⚠ MEDIUM PRIORITY ISSUES FOUND - REVIEW RECOMMENDED${NC}"
    exit 3
else
    echo -e "${GREEN}✓ NO CRITICAL SECURITY ISSUES FOUND${NC}"
    exit 0
fi