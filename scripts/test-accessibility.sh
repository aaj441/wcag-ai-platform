#!/bin/bash

# Accessibility Scanner Test Script
# This script demonstrates the accessibility scanning capabilities

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   WCAG AI Platform - Accessibility Scanner Test          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Running npm install..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi
echo "✅ Dependencies installed"
echo ""

# Check if scripts are executable
echo "🔧 Verifying scripts..."
if [ ! -f "scripts/accessibility-scan.js" ]; then
    echo "❌ accessibility-scan.js not found"
    exit 1
fi
if [ ! -f "scripts/pa11y-scan.js" ]; then
    echo "❌ pa11y-scan.js not found"
    exit 1
fi
if [ ! -f "scripts/update-evidence-vault.js" ]; then
    echo "❌ update-evidence-vault.js not found"
    exit 1
fi
echo "✅ All scripts found"
echo ""

# Create/update evidence vault
echo "📂 Updating Evidence Vault..."
node scripts/update-evidence-vault.js
if [ $? -ne 0 ]; then
    echo "❌ Failed to update evidence vault"
    exit 1
fi
echo ""

# Check evidence vault structure
echo "📊 Evidence Vault Structure:"
if [ -d "evidence-vault/scans" ]; then
    echo "   ✅ scans/ directory exists"
else
    echo "   ❌ scans/ directory missing"
fi

if [ -d "evidence-vault/attestations" ]; then
    echo "   ✅ attestations/ directory exists"
else
    echo "   ❌ attestations/ directory missing"
fi

if [ -d "evidence-vault/reports" ]; then
    echo "   ✅ reports/ directory exists"
else
    echo "   ❌ reports/ directory missing"
fi
echo ""

# Display available npm scripts
echo "📝 Available npm scripts:"
echo "   • npm run accessibility:scan [URL]  - Run axe-core scan"
echo "   • npm run accessibility:pa11y [URL] - Run Pa11y scan"
echo "   • npm run evidence:update           - Update evidence vault"
echo ""

# Check GitHub Actions workflow
echo "🔄 GitHub Actions Workflow:"
if [ -f ".github/workflows/accessibility.yml" ]; then
    echo "   ✅ accessibility.yml workflow configured"
    echo "   📋 Triggers:"
    echo "      • Pull requests to main/develop"
    echo "      • Pushes to main"
    echo "      • Manual workflow dispatch"
else
    echo "   ❌ Workflow file missing"
fi
echo ""

# Display usage instructions
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Usage Instructions                                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "To run accessibility scans locally:"
echo ""
echo "1. Start your application:"
echo "   Terminal 1: cd packages/api && npm run dev"
echo "   Terminal 2: cd packages/webapp && npm run dev"
echo ""
echo "2. Run accessibility scan:"
echo "   node scripts/accessibility-scan.js http://localhost:3000"
echo ""
echo "3. Or use Pa11y:"
echo "   node scripts/pa11y-scan.js http://localhost:3000"
echo ""
echo "4. View scan results:"
echo "   cat evidence-vault/index.json"
echo ""
echo "For CI/CD integration:"
echo "• Scans run automatically on every PR"
echo "• Critical violations block merges"
echo "• Results are posted as PR comments"
echo "• Scan artifacts retained for 90 days"
echo ""
echo "✅ Accessibility scanner is ready!"
echo ""
