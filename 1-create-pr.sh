#!/bin/bash
# Step 1: Create Pull Request

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 STEP 1: CREATE PULL REQUEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if gh CLI is available
if command -v gh &> /dev/null; then
    echo "Using GitHub CLI to create PR..."

    # Read PR template
    PR_BODY=$(cat PR_TEMPLATE.md)

    # Create PR
    gh pr create \
        --title "Production Hardening: Load Stability, Observability & Performance Optimization" \
        --body "$PR_BODY" \
        --base main \
        --head claude/production-hardening-01VaiUp8MLXU3JjtGyyzVTzy

    echo ""
    echo "✅ Pull request created successfully!"
    echo ""
else
    echo "GitHub CLI not found. Opening browser to create PR manually..."
    echo ""
    echo "Please:"
    echo "1. Click the link that will open"
    echo "2. Click 'Create pull request'"
    echo "3. Copy the contents from PR_TEMPLATE.md into the description"
    echo "4. Click 'Create pull request' again"
    echo ""

    # Try to open browser
    PR_URL="https://github.com/aaj441/wcag-ai-platform/compare/main...claude/production-hardening-01VaiUp8MLXU3JjtGyyzVTzy?expand=1"

    if command -v xdg-open &> /dev/null; then
        xdg-open "$PR_URL"
    elif command -v open &> /dev/null; then
        open "$PR_URL"
    else
        echo "Open this URL in your browser:"
        echo "$PR_URL"
    fi

    echo ""
    echo "PR Template location: PR_TEMPLATE.md"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ STEP 1 COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next: Run ./2-setup-github-secrets.sh"
echo ""
