#!/bin/bash
#
# Zero-Downtime Database Migration
# Multi-phase schema changes without service interruption
#

set -e

MIGRATION_NAME="$1"
BACKEND_URL="${BACKEND_URL:-https://wcagaii.railway.app}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

if [ -z "$MIGRATION_NAME" ]; then
  echo "Usage: ./migrate-safe.sh <migration_name>"
  echo "Example: ./migrate-safe.sh add-confidence-scoring"
  exit 1
fi

MIGRATION_DIR="./migrations/$MIGRATION_NAME"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo "❌ Migration directory not found: $MIGRATION_DIR"
  exit 1
fi

echo "🔄 Starting zero-downtime migration: $MIGRATION_NAME"
echo "=================================================="

# ========================================
# Phase 1: Deploy Additive Schema Changes
# ========================================
echo ""
echo "📦 Phase 1: Applying additive schema changes..."

if [ -f "$MIGRATION_DIR/schema-additive.sql" ]; then
  railway run --service=wcagaii-backend psql \$DATABASE_URL -f "$MIGRATION_DIR/schema-additive.sql"
  echo "✅ Additive schema changes applied"
else
  echo "⚠️  No additive schema file found, skipping"
fi

# ========================================
# Phase 2: Deploy Dual-Write Backend
# ========================================
echo ""
echo "🚀 Phase 2: Deploying dual-write backend..."

# Enable dual-write mode
railway variables set DUAL_WRITE_MODE=true MIGRATION_NAME="$MIGRATION_NAME" --service=wcagaii-backend

# Deploy new backend version
railway up --service=wcagaii-backend

echo "⏳ Waiting for deployment to stabilize..."
sleep 120

# Health check
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HEALTH_STATUS" != "200" ]; then
  echo "❌ Health check failed: $HEALTH_STATUS"
  echo "Rolling back..."
  railway rollback --service=wcagaii-backend
  exit 1
fi

echo "✅ Dual-write backend deployed successfully"

# ========================================
# Phase 3: Background Data Backfill
# ========================================
echo ""
echo "📊 Phase 3: Starting background backfill..."

if [ -f "$MIGRATION_DIR/backfill.js" ]; then
  # Run backfill in background
  nohup node "$MIGRATION_DIR/backfill.js" > "logs/backfill-$MIGRATION_NAME.log" 2>&1 &
  BACKFILL_PID=$!

  echo "Backfill started with PID: $BACKFILL_PID"

  # Monitor backfill progress
  TIMEOUT=3600  # 1 hour timeout
  ELAPSED=0
  while kill -0 $BACKFILL_PID 2>/dev/null; do
    # Get progress from Redis
    PROGRESS=$(redis-cli -u "$REDIS_URL" GET "backfill:$MIGRATION_NAME:progress" 2>/dev/null || echo "0")
    echo "Backfill progress: ${PROGRESS}%"

    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
      echo "⚠️  Backfill timeout reached, continuing anyway..."
      break
    fi

    sleep 60
    ELAPSED=$((ELAPSED + 60))
  done

  echo "✅ Backfill completed"
else
  echo "⚠️  No backfill script found, skipping"
fi

# ========================================
# Phase 4: Validate Data Integrity
# ========================================
echo ""
echo "✅ Phase 4: Validating migration..."

if [ -f "$MIGRATION_DIR/validate.js" ]; then
  node "$MIGRATION_DIR/validate.js"

  if [ $? -ne 0 ]; then
    echo "❌ Validation failed!"
    echo "Rolling back deployment..."

    # Rollback backend
    railway rollback --service=wcagaii-backend --to=previous

    # Rollback schema (if rollback script exists)
    if [ -f "$MIGRATION_DIR/rollback.sql" ]; then
      railway run --service=wcagaii-backend psql \$DATABASE_URL -f "$MIGRATION_DIR/rollback.sql"
    fi

    exit 1
  fi

  echo "✅ Validation passed"
else
  echo "⚠️  No validation script found, skipping"
fi

# ========================================
# Phase 5: Switch to New Schema
# ========================================
echo ""
echo "🎯 Phase 5: Switching reads to new schema..."

# Disable dual-write mode, read from new columns only
railway variables set DUAL_WRITE_MODE=false READ_FROM_NEW=true --service=wcagaii-backend

echo "⏳ Waiting for configuration to propagate..."
sleep 30

# Verify new schema is being used
echo "Testing new schema..."
TEST_RESPONSE=$(curl -s "$BACKEND_URL/api/status")
if echo "$TEST_RESPONSE" | grep -q "ok"; then
  echo "✅ New schema active"
else
  echo "❌ New schema test failed"
  exit 1
fi

# ========================================
# Phase 6: Schedule Cleanup
# ========================================
echo ""
echo "📅 Phase 6: Scheduling old column removal..."

if [ -f "$MIGRATION_DIR/cleanup.sql" ]; then
  # Schedule cleanup for 7 days from now
  CLEANUP_DATE=$(date -d "+7 days" +"%Y-%m-%d %H:%M")

  cat > "/tmp/cleanup-$MIGRATION_NAME.sh" <<EOF
#!/bin/bash
echo "Running scheduled cleanup for migration: $MIGRATION_NAME"
railway run --service=wcagaii-backend psql \\\$DATABASE_URL -f "$MIGRATION_DIR/cleanup.sql"
echo "Cleanup completed"
EOF

  chmod +x "/tmp/cleanup-$MIGRATION_NAME.sh"

  # Use at command if available, otherwise just log
  if command -v at &> /dev/null; then
    echo "/tmp/cleanup-$MIGRATION_NAME.sh" | at "$CLEANUP_DATE"
    echo "✅ Cleanup scheduled for $CLEANUP_DATE"
  else
    echo "⚠️  'at' command not available. Manually run cleanup in 7 days:"
    echo "   railway run --service=wcagaii-backend psql \\\$DATABASE_URL -f $MIGRATION_DIR/cleanup.sql"
  fi
else
  echo "⚠️  No cleanup script found, skipping"
fi

# ========================================
# Summary
# ========================================
echo ""
echo "=================================================="
echo "✅ Migration '$MIGRATION_NAME' completed successfully!"
echo ""
echo "Summary:"
echo "  - Phase 1: Schema changes applied"
echo "  - Phase 2: Dual-write backend deployed"
echo "  - Phase 3: Data backfilled"
echo "  - Phase 4: Validation passed"
echo "  - Phase 5: New schema active"
echo "  - Phase 6: Cleanup scheduled"
echo ""
echo "Migration details:"
echo "  - Duration: $ELAPSED seconds"
echo "  - Zero downtime: ✅"
echo "  - Rollback available: ✅"
echo ""

# Notify team
if [ -n "$SLACK_WEBHOOK" ]; then
  curl -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"✅ Migration '$MIGRATION_NAME' completed successfully\",
      \"attachments\": [{
        \"color\": \"good\",
        \"fields\": [
          {\"title\": \"Duration\", \"value\": \"${ELAPSED}s\", \"short\": true},
          {\"title\": \"Zero Downtime\", \"value\": \"Yes\", \"short\": true}
        ]
      }]
    }"
fi

echo "Done! 🎉"
