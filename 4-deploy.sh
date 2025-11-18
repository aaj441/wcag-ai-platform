#!/bin/bash
# Step 4: Deploy to Production

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 4: DEPLOY TO PRODUCTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we can use gh CLI
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI not found."
    echo ""
    echo "Please merge the PR manually:"
    echo "1. Go to: https://github.com/aaj441/wcag-ai-platform/pulls"
    echo "2. Find PR: 'Production Hardening: Load Stability, Observability & Performance Optimization'"
    echo "3. Review the changes"
    echo "4. Click 'Merge pull request'"
    echo "5. Confirm merge"
    echo ""
    read -p "Press ENTER when PR is merged..."
else
    echo "Checking PR status..."

    # Get PR number
    PR_NUMBER=$(gh pr list --head claude/production-hardening-01VaiUp8MLXU3JjtGyyzVTzy --json number --jq '.[0].number' 2>/dev/null || echo "")

    if [ -z "$PR_NUMBER" ]; then
        echo "PR not found. Create it first with ./1-create-pr.sh"
        exit 1
    fi

    echo "Found PR #$PR_NUMBER"
    echo ""

    # Check if approved
    echo "PR Status:"
    gh pr view $PR_NUMBER
    echo ""

    read -p "Merge this PR now? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Merging PR..."
        gh pr merge $PR_NUMBER --squash --delete-branch
        echo "✅ PR merged!"
    else
        echo "Merge manually when ready:"
        echo "gh pr merge $PR_NUMBER --squash --delete-branch"
        exit 0
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ DEPLOYMENT IN PROGRESS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "GitHub Actions is now running automated deployment..."
echo ""
echo "The workflow will:"
echo "  1. ✅ Validate code (TypeScript, tests) - 3 min"
echo "  2. ✅ Deploy to Railway - 5 min"
echo "  3. ✅ Run database migrations - 2 min"
echo "  4. ✅ Apply performance indexes - 3 min"
echo "  5. ✅ Run health checks - 1 min"
echo "  6. ✅ Auto-rollback if any failures - <2 min"
echo ""
echo "Total time: ~10-15 minutes"
echo ""

# Open GitHub Actions
ACTIONS_URL="https://github.com/aaj441/wcag-ai-platform/actions"

echo "Opening GitHub Actions to monitor deployment..."
if command -v xdg-open &> /dev/null; then
    xdg-open "$ACTIONS_URL"
elif command -v open &> /dev/null; then
    open "$ACTIONS_URL"
else
    echo "Visit: $ACTIONS_URL"
fi

echo ""
echo "Monitor deployment at:"
echo "👉 $ACTIONS_URL"
echo ""

# Wait for deployment
echo "Waiting for deployment to complete..."
echo "(Press Ctrl+C to stop waiting and check manually)"
echo ""

WAITED=0
MAX_WAIT=1200  # 20 minutes

while [ $WAITED -lt $MAX_WAIT ]; do
    sleep 30
    WAITED=$((WAITED + 30))

    # Try to get workflow status
    if command -v gh &> /dev/null; then
        STATUS=$(gh run list --workflow=railway-deploy.yml --limit 1 --json status --jq '.[0].status' 2>/dev/null || echo "")

        if [ "$STATUS" = "completed" ]; then
            CONCLUSION=$(gh run list --workflow=railway-deploy.yml --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "")

            if [ "$CONCLUSION" = "success" ]; then
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "✅ DEPLOYMENT SUCCESSFUL!"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                break
            else
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "⚠️  DEPLOYMENT FAILED - ROLLBACK TRIGGERED"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "Check logs at: $ACTIONS_URL"
                exit 1
            fi
        else
            printf "."
        fi
    else
        printf "."
    fi
done

echo ""
echo ""
echo "Run ./5-verify.sh to check production health"
echo ""
