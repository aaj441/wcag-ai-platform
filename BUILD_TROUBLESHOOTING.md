# Build Troubleshooting Guide

This guide helps you resolve common build errors in the WCAG AI Platform.

## Quick Diagnosis

Run this command to check your environment:

```bash
node --version && npm --version && tsc --version
```

Expected output:
- Node.js: v18.0.0 or higher
- npm: v9.0.0 or higher
- TypeScript: v5.0.0 or higher

## Common Build Errors

### 1. TypeScript Compilation Errors

#### Error: "Cannot find name 'console'" (TS2584)

**Symptom:**
```
src/routes/fixes.ts:64:5 - error TS2584: Cannot find name 'console'. Do you need to change your target library?
```

**Cause:** Missing DOM library in `tsconfig.json`

**Solution:**

Edit `packages/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"]  // Add "DOM" here
  }
}
```

**Alternative:** Add Node.js types:
```bash
cd packages/api
npm install --save-dev @types/node
```

---

#### Error: "Duplicate identifier" (TS2300)

**Symptom:**
```
src/data/fintechTestData.ts:7:10 - error TS2300: Duplicate identifier 'EmailDraft'.
```

**Cause:** Type imported multiple times from the same module

**Solution:**

Consolidate imports into a single line:

```typescript
// Before (WRONG)
import { EmailDraft, LegacyViolation } from '../types';
import { EmailDraft, Consultant } from '../types';

// After (CORRECT)
import { EmailDraft, LegacyViolation, Consultant } from '../types';
```

---

#### Error: "Parameter implicitly has 'any' type" (TS7006)

**Symptom:**
```
src/routes/fixes.ts:15:50 - error TS7006: Parameter 'req' implicitly has an 'any' type.
src/routes/fixes.ts:15:55 - error TS7006: Parameter 'res' implicitly has an 'any' type.
```

**Cause:** Missing type annotations on Express route handlers

**Solution:**

Add Request and Response types:

```typescript
// 1. Import types at the top
import express, { Request, Response } from 'express';

// 2. Add type annotations to route handlers
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  // Handler code
});
```

---

#### Error: "Cannot find module '@opentelemetry/...'" (TS2307)

**Symptom:**
```
src/instrumentation.ts:7:26 - error TS2307: Cannot find module '@opentelemetry/sdk-trace-node'
```

**Cause:** Dependencies listed in package.json but not installed

**Solution:**

```bash
cd packages/api
npm install
```

If the error persists:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

#### Error: "Cannot find module '@prisma/client'" (TS2307)

**Symptom:**
```
src/lib/prisma.ts:1:31 - error TS2307: Cannot find module '@prisma/client'
```

**Cause:** Prisma client not generated or installed

**Solution:**

```bash
cd packages/api

# Install Prisma dependencies
npm install

# Generate Prisma client
npx prisma generate

# If database doesn't exist, create it
createdb wcag_ai_dev
npx prisma migrate dev
```

---

### 2. Build Tool Errors

#### Error: "vite: not found"

**Symptom:**
```
sh: 1: vite: not found
```

**Cause:** Webapp dependencies not installed

**Solution:**

```bash
cd packages/webapp
npm install
```

---

#### Error: "tsc: command not found"

**Symptom:**
```
npm run build:api
sh: 1: tsc: command not found
```

**Cause:** TypeScript not installed

**Solution:**

```bash
# Install globally (not recommended)
npm install -g typescript

# Or install locally in the project (recommended)
cd packages/api
npm install --save-dev typescript
```

---

### 3. Dependency Errors

#### Error: "Cannot find module 'express'"

**Symptom:**
```
Error: Cannot find module 'express'
```

**Cause:** Dependencies not installed or corrupted

**Solution:**

```bash
# Clean install for API
cd packages/api
rm -rf node_modules package-lock.json
npm install

# Clean install for webapp
cd ../webapp
rm -rf node_modules package-lock.json
npm install

# Clean install for root
cd ../..
rm -rf node_modules package-lock.json
npm install
```

---

#### Error: "npm ERR! peer dependencies conflict"

**Symptom:**
```
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^18.0.0" from react-dom@18.2.0
```

**Cause:** Incompatible peer dependencies

**Solution:**

```bash
# Use --legacy-peer-deps flag
npm install --legacy-peer-deps

# Or force install (use with caution)
npm install --force
```

---

### 4. Database Errors

#### Error: "Can't reach database server"

**Symptom:**
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Cause:** PostgreSQL not running or wrong connection string

**Solution:**

1. Check if PostgreSQL is running:
   ```bash
   pg_isready
   # Should output: "accepting connections"
   ```

2. Start PostgreSQL if not running:
   ```bash
   # macOS (Homebrew)
   brew services start postgresql@16

   # Linux (systemd)
   sudo systemctl start postgresql

   # Docker
   docker start wcag-postgres
   ```

3. Verify DATABASE_URL in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/wcag_ai_dev"
   ```

---

#### Error: "Database does not exist"

**Symptom:**
```
Error: P1003: Database `wcag_ai_dev` does not exist
```

**Solution:**

```bash
# Create the database
createdb wcag_ai_dev

# Or if using Docker
docker exec -it wcag-postgres createdb -U postgres wcag_ai_dev

# Run migrations
cd packages/api
npx prisma migrate dev
```

---

### 5. Port Conflicts

#### Error: "EADDRINUSE: address already in use"

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Cause:** Another process is using the port

**Solution:**

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process (replace <PID> with actual process ID)
kill -9 <PID>

# Or use a different port
PORT=3002 npm run dev:api
```

---

### 6. Permission Errors

#### Error: "EACCES: permission denied"

**Symptom:**
```
npm ERR! Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Cause:** Trying to install global packages without permission

**Solution:**

```bash
# Option 1: Use npx instead of global install
npx tsc --version

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 3: Use sudo (NOT recommended)
sudo npm install -g typescript
```

---

### 7. Memory Errors

#### Error: "JavaScript heap out of memory"

**Symptom:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:** Not enough memory allocated to Node.js

**Solution:**

```bash
# Increase memory limit for build
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or add to package.json scripts:
"build": "NODE_OPTIONS=--max-old-space-size=4096 npm run build:api && npm run build:webapp"
```

---

### 8. CI/CD Pipeline Errors

#### Workflow Fails: "Process completed with exit code 1"

**Cause:** Build fails in GitHub Actions

**Solution:**

1. Check workflow logs in GitHub Actions tab
2. Reproduce locally:
   ```bash
   npm ci  # Use ci instead of install (exact versions)
   npm run build
   npm test
   ```

3. Common issues:
   - Missing environment variables (set in GitHub Secrets)
   - Different Node.js version (check .github/workflows/*.yml)
   - Platform-specific issues (test on Linux if possible)

---

## Build Process Checklist

Use this checklist when encountering build errors:

### Initial Setup
- [ ] Node.js v18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Git repository cloned
- [ ] Root dependencies installed (`npm install`)

### API Package
- [ ] API dependencies installed (`cd packages/api && npm install`)
- [ ] `.env` file created from `.env.example`
- [ ] DATABASE_URL configured correctly
- [ ] Database created (`createdb wcag_ai_dev`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Migrations run (`npx prisma migrate dev`)
- [ ] API builds successfully (`npm run build`)

### Webapp Package
- [ ] Webapp dependencies installed (`cd packages/webapp && npm install`)
- [ ] `.env` file created
- [ ] VITE_API_URL points to correct API URL
- [ ] Webapp builds successfully (`npm run build`)

### Verification
- [ ] TypeScript compiles without errors
- [ ] No linting errors (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] Dev servers start successfully
- [ ] Application loads in browser

---

## Advanced Debugging

### Enable Verbose Logging

```bash
# npm verbose mode
npm run build --verbose

# TypeScript verbose mode
tsc --listFiles --listEmittedFiles

# Prisma debug mode
DEBUG=* npx prisma generate
```

### Check TypeScript Configuration

```bash
# Show effective TypeScript config
cd packages/api
npx tsc --showConfig
```

### Verify Module Resolution

```bash
# Check if module can be resolved
node -e "require.resolve('express')"

# Should output path to express module
# If error, module is not installed
```

### Clean Build

Nuclear option - completely clean and rebuild:

```bash
# Remove all build artifacts and dependencies
rm -rf node_modules package-lock.json
rm -rf packages/api/node_modules packages/api/package-lock.json packages/api/dist
rm -rf packages/webapp/node_modules packages/webapp/package-lock.json packages/webapp/dist

# Reinstall everything
npm install
cd packages/api && npm install && cd ../..
cd packages/webapp && npm install && cd ../..

# Rebuild
npm run build
```

---

## Getting Help

If you're still experiencing issues after trying these solutions:

1. **Check GitHub Issues**: https://github.com/aaj441/wcag-ai-platform/issues
   - Search for similar problems
   - Check closed issues too

2. **Create a New Issue** with:
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Operating system
   - Complete error message
   - Steps to reproduce
   - What you've already tried

3. **Discussions**: https://github.com/aaj441/wcag-ai-platform/discussions

4. **Email**: developers@wcag-ai-platform.com

---

## Preventive Measures

### Keep Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update packages (carefully!)
npm update

# For major updates, use:
npx npm-check-updates -u
npm install
```

### Use Recommended Versions

Create `.nvmrc` file in project root:
```
18.20.0
```

Then use:
```bash
nvm use
```

### Pre-commit Hooks

Install husky for automatic checks:

```bash
npx husky-init && npm install
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm test"
```

---

**Last Updated**: 2025-11-15

**Note**: If you find a new issue not covered here, please open a PR to update this guide!
