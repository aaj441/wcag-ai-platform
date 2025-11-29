#!/bin/bash
set -e

echo "🚂 Starting WCAG AI Platform on Railway..."

# Check environment
echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Check database connection
echo "🔍 Checking database connection..."
npx prisma db execute --stdin <<EOF
SELECT 1;
EOF

echo "✅ Database ready!"

# Start the server
echo "🚀 Starting server..."
node dist/server.js