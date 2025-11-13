#!/bin/bash
# PostgreSQL Migration Script
# Migrates WCAG AI Platform from SQLite to PostgreSQL production database
#
# Prerequisites:
# - PostgreSQL 15+ installed locally or Docker container running
# - Prisma CLI installed (npm install -g prisma)
# - .env configured with DATABASE_URL pointing to PostgreSQL
#
# Usage: ./migrate-to-postgres.sh [environment]
# Example: ./migrate-to-postgres.sh production

ENVIRONMENT=${1:-development}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "════════════════════════════════════════════════════════════════"
echo "WCAG AI Platform: SQLite → PostgreSQL Migration"
echo "Environment: ${ENVIRONMENT}"
echo "Timestamp: ${TIMESTAMP}"
echo "════════════════════════════════════════════════════════════════"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Step 1: Backup existing SQLite database (if exists)
if [ -f "./prisma/dev.db" ]; then
  echo ""
  echo "📦 Backing up existing SQLite database..."
  cp ./prisma/dev.db "${BACKUP_DIR}/dev.db.${TIMESTAMP}.backup"
  echo "✅ Backup created: ${BACKUP_DIR}/dev.db.${TIMESTAMP}.backup"
fi

# Step 2: Load environment variables
echo ""
echo "🔧 Loading environment configuration..."
if [ ! -f ".env" ]; then
  echo "❌ ERROR: .env file not found"
  echo "Create .env from .env.example and configure DATABASE_URL to point to PostgreSQL"
  echo ""
  echo "Example:"
  echo "  DATABASE_URL=\"postgresql://username:password@localhost:5432/wcag_ai_prod\""
  exit 1
fi
source .env

if [[ ! "$DATABASE_URL" =~ ^postgresql ]]; then
  echo "❌ ERROR: DATABASE_URL must point to PostgreSQL (postgresql://...)"
  echo "Current: $DATABASE_URL"
  exit 1
fi

echo "✅ DATABASE_URL configured: ${DATABASE_URL:0:50}..."

# Step 3: Verify PostgreSQL connection
echo ""
echo "🔗 Verifying PostgreSQL connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ ERROR: Cannot connect to PostgreSQL"
  echo "Please verify:"
  echo "  1. PostgreSQL is running"
  echo "  2. DATABASE_URL is correct"
  echo "  3. User has CREATE DATABASE permissions"
  exit 1
fi
echo "✅ PostgreSQL connection successful"

# Step 4: Drop existing PostgreSQL database (if --force flag provided)
if [[ " $@ " =~ " --force " ]]; then
  echo ""
  echo "⚠️  --force flag detected. Dropping existing PostgreSQL database..."
  read -p "Are you sure? This will delete all data. (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    # Extract database name from CONNECTION_URL
    DB_NAME=$(echo $DATABASE_URL | sed 's/.*\///')
    psql "$DATABASE_URL" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
    echo "✅ Database dropped"
  else
    echo "❌ Migration cancelled"
    exit 1
  fi
fi

# Step 5: Run Prisma migrations
echo ""
echo "🔄 Running Prisma migrations..."
echo "   Command: npx prisma migrate deploy"
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "❌ ERROR: Migration failed"
  echo "   - Check migration files in ./prisma/migrations/"
  echo "   - Verify database schema is compatible"
  echo "   - Roll back if needed: restore backup from ${BACKUP_DIR}"
  exit 1
fi

echo "✅ Migrations completed successfully"

# Step 6: Generate Prisma client
echo ""
echo "🔨 Regenerating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
  echo "❌ ERROR: Prisma client generation failed"
  exit 1
fi

echo "✅ Prisma client generated"

# Step 7: Seed database (optional)
echo ""
read -p "Run database seeding? (yes/no): " seed_confirm
if [ "$seed_confirm" = "yes" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed
  if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
  else
    echo "⚠️  Seeding failed or no seed script defined"
  fi
fi

# Step 8: Verify migration
echo ""
echo "✅ Verifying database tables..."
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
EOF

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ MIGRATION COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Verify data integrity: npm run verify-migration"
echo "2. Test application: npm run dev"
echo "3. Run smoke tests: npm run test:smoke"
echo "4. Monitor in production for 24 hours before declaring victory"
echo ""
echo "To rollback (if needed):"
echo "1. Restore backup: cp ${BACKUP_DIR}/dev.db.${TIMESTAMP}.backup ./prisma/dev.db"
echo "2. Update DATABASE_URL in .env to point back to SQLite"
echo "3. Restart application"
echo ""
