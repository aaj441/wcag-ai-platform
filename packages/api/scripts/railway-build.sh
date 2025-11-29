#!/bin/bash
set -e

echo "🔨 Building WCAG AI Platform for Railway..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --include=dev

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Build TypeScript
echo "⚙️  Compiling TypeScript..."
npm run build

# Verify build
echo "✅ Verifying build..."
if [ ! -f "dist/server.js" ]; then
  echo "❌ Build failed: dist/server.js not found"
  exit 1
fi

echo "✅ Build complete!"