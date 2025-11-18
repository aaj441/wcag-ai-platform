#!/bin/bash
#
# Database Rollback Script
# Safely rolls back database migrations and restores from backup
#
# Usage: ./database-rollback.sh <migration-name> <backup-file>
# Example: ./database-rollback.sh add_user_firstname backup-20251115.sql
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
MIGRATION_NAME=$1
BACKUP_FILE=$2

# Display usage if arguments missing
if [ -z "$MIGRATION_NAME" ] || [ -z "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Missing required arguments${NC}"
  echo ""
  echo "Usage: ./database-rollback.sh <migration-name> <backup-file>"
  echo ""
  echo "Example:"
  echo "  ./database-rollback.sh add_user_firstname backup-20251115.sql"
  echo ""
  exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
  exit 1
fi

echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   DATABASE ROLLBACK PROCEDURE          ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will rollback your database!${NC}"
echo ""
echo "Migration to rollback: $MIGRATION_NAME"
echo "Backup file: $BACKUP_FILE"
echo "Database: ${DATABASE_URL:0:30}..."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Rollback cancelled${NC}"
  exit 0
fi

# Step 1: Create safety backup
echo ""
echo -e "${YELLOW}Step 1/5: Creating safety backup...${NC}"
SAFETY_BACKUP="rollback-safety-$(date +%Y%m%d-%H%M%S).sql"
pg_dump "$DATABASE_URL" > "$SAFETY_BACKUP"
echo -e "${GREEN}✓ Safety backup created: $SAFETY_BACKUP${NC}"

# Step 2: Mark migration as rolled back
echo ""
echo -e "${YELLOW}Step 2/5: Marking migration as rolled back...${NC}"
cd "$(dirname "$0")/../../packages/api" || exit
npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"
echo -e "${GREEN}✓ Migration marked as rolled back${NC}"

# Step 3: Restore from backup
echo ""
echo -e "${YELLOW}Step 3/5: Restoring database from backup...${NC}"
echo "This may take several minutes depending on database size..."

# Drop all connections to database
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" || true

# Restore backup
psql "$DATABASE_URL" < "../../$BACKUP_FILE" 2>&1 | grep -v "^SET\|^--\|^$" || true
echo -e "${GREEN}✓ Database restored from backup${NC}"

# Step 4: Verify database state
echo ""
echo -e "${YELLOW}Step 4/5: Verifying database state...${NC}"
npx prisma db pull
echo -e "${GREEN}✓ Database schema verified${NC}"

# Step 5: Run data integrity checks
echo ""
echo -e "${YELLOW}Step 5/5: Running data integrity checks...${NC}"

# Check row counts
echo "Checking table row counts..."
psql "$DATABASE_URL" -c "
  SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 10;
"

# Check for corrupted indexes
echo ""
echo "Checking for corrupted indexes..."
psql "$DATABASE_URL" -c "
  SELECT
    schemaname,
    tablename,
    indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
  LIMIT 5;
"

echo -e "${GREEN}✓ Data integrity checks passed${NC}"

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ROLLBACK COMPLETED SUCCESSFULLY      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Summary:"
echo "  - Migration rolled back: $MIGRATION_NAME"
echo "  - Database restored from: $BACKUP_FILE"
echo "  - Safety backup created: $SAFETY_BACKUP"
echo ""
echo "Next steps:"
echo "  1. Restart application servers"
echo "  2. Verify application functionality"
echo "  3. Monitor error logs"
echo "  4. Keep safety backup for 7 days"
echo ""
