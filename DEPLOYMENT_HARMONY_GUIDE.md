# Deployment Harmony Verification Guide

## Overview

The WCAG AI Platform uses a comprehensive **Deployment Harmony Verification System** to ensure all changes work together seamlessly before deployment. This system validates consistency across the monorepo and verifies deployment readiness for both Railway (backend) and Vercel (frontend).

## Components

### 1. Verify Harmony Agent (`.github/agents/verify-harmony.agent.md`)

A custom GitHub Copilot agent that:
- Verifies code changes are in harmony across packages
- Checks type synchronization between frontend and backend
- Validates API contracts and deployment configurations
- Ensures security and performance standards are met

**Usage:**
The agent is automatically available in GitHub Copilot. Invoke it when reviewing PRs or making changes.

### 2. Deployment Harmony Verification Script

**Location:** `deployment/scripts/verify-deployment-harmony.sh`

**Purpose:** Automated verification script that checks:
- Type consistency between packages
- API contract alignment
- Configuration validity (Railway, Vercel)
- Build success for both packages
- Security implementations
- Cross-platform integration

**Usage:**
```bash
# Pre-deployment verification
./deployment/scripts/verify-deployment-harmony.sh --pre-deploy staging

# Post-deployment verification
./deployment/scripts/verify-deployment-harmony.sh --post-deploy production
```

### 3. Unified Deployment Coordinator

**Location:** `deployment/scripts/deploy-unified.sh`

**Purpose:** Orchestrates deployment to both Railway and Vercel with:
- Pre-deployment validation
- Coordinated backend and frontend deployment
- Post-deployment verification
- Automatic rollback on failure
- Comprehensive deployment reporting

**Usage:**
```bash
# Deploy to staging
./deployment/scripts/deploy-unified.sh staging

# Deploy to production
./deployment/scripts/deploy-unified.sh production
```

### 4. GitHub Actions Workflow

**Location:** `.github/workflows/deployment-harmony.yml`

**Purpose:** Automated CI/CD integration that:
- Runs on every PR and push to main branches
- Executes harmony verification
- Builds and tests all packages
- Comments on PRs with results
- Generates deployment readiness reports

## Verification Phases

### Phase 1: Type Consistency
Ensures TypeScript types are synchronized between `packages/api` and `packages/webapp`:
- ✅ Common types exist in both packages
- ✅ Type definitions match
- ✅ No type mismatches

### Phase 2: API Contract Validation
Validates API endpoints and service calls:
- ✅ Backend routes exist
- ✅ Frontend service calls match backend routes
- ✅ Request/response schemas align

### Phase 3: Configuration Validation
Checks deployment configurations:
- ✅ Railway configuration (`railway.json`, `railway.toml`)
- ✅ Vercel configuration (`vercel.json`)
- ✅ Environment variables documented
- ✅ Security headers configured

### Phase 4: Build Validation
Verifies both packages build successfully:
- ✅ Dependencies install without errors
- ✅ TypeScript compiles successfully
- ✅ Build output generated correctly

### Phase 5: Deployment Configuration
Validates deployment scripts and settings:
- ✅ Build and start scripts configured
- ✅ Deployment scripts exist and are executable
- ✅ Validation scripts available

### Phase 6: Security Checks
Ensures security standards are met:
- ✅ `.env` files in `.gitignore`
- ✅ Security middleware configured (Helmet, rate limiting)
- ✅ SSRF protection implemented
- ✅ No secrets in git history

### Phase 7: Cross-Platform Integration
Validates frontend-backend communication:
- ✅ CORS configured
- ✅ API URL properly set in frontend
- ✅ Health check endpoints available

### Phase 8: Live Service Validation (Post-Deploy)
Tests deployed services:
- ✅ Backend health checks pass
- ✅ Frontend loads successfully
- ✅ Cross-platform communication works

## Workflow Integration

### For Developers

1. **Before committing:**
   ```bash
   # Run local verification
   ./deployment/scripts/verify-deployment-harmony.sh --pre-deploy staging
   ```

2. **Create a PR:**
   - GitHub Actions automatically runs harmony verification
   - Results posted as PR comment
   - Fix any issues before merging

3. **After PR approval:**
   - Merge triggers production deployment checks
   - Deploy using unified coordinator

### For CI/CD

The GitHub Actions workflow automatically:
1. Runs on PR creation/update
2. Verifies harmony across all packages
3. Builds and tests packages
4. Comments results on PR
5. Generates deployment readiness report

### For Deployment

1. **Manual deployment:**
   ```bash
   ./deployment/scripts/deploy-unified.sh production
   ```

2. **Workflow dispatch:**
   - Go to Actions tab
   - Select "Deployment Harmony Verification"
   - Click "Run workflow"
   - Choose environment

## Understanding Results

### Success (✅)
```
Score: 100%
✅ Passed: 37/37
❌ Failed: 0/37
⚠️  Warnings: 0
```
**Action:** Ready for deployment

### Warnings (⚠️)
```
Score: 95%
✅ Passed: 35/37
❌ Failed: 0/37
⚠️  Warnings: 2
```
**Action:** Review warnings, deploy with caution

### Failure (❌)
```
Score: 85%
✅ Passed: 32/37
❌ Failed: 5/37
⚠️  Warnings: 2
```
**Action:** Fix critical issues before deploying

## Common Issues and Solutions

### Type Mismatch
**Issue:** Types differ between frontend and backend
**Solution:** Synchronize types in `packages/api/src/types.ts` and `packages/webapp/src/types.ts`

### API Contract Break
**Issue:** Frontend calls endpoint that doesn't exist
**Solution:** Update backend routes or frontend service calls

### Build Failure
**Issue:** TypeScript compilation errors
**Solution:** Fix TypeScript errors in the failing package

### Configuration Error
**Issue:** Invalid Railway or Vercel configuration
**Solution:** Validate JSON syntax in `railway.json` or `vercel.json`

### Security Issue
**Issue:** Missing security headers or rate limiting
**Solution:** Implement security middleware

## Best Practices

1. **Always run verification before committing:**
   ```bash
   ./deployment/scripts/verify-deployment-harmony.sh --pre-deploy staging
   ```

2. **Keep types synchronized:**
   - Use identical type definitions in both packages
   - Consider creating a shared types package

3. **Update documentation:**
   - Document new API endpoints
   - Update environment variable templates

4. **Test locally before pushing:**
   ```bash
   cd packages/api && npm run build
   cd ../webapp && npm run build
   ```

5. **Monitor deployments:**
   ```bash
   # Railway logs
   railway logs --service=wcagaii-backend
   
   # Vercel logs
   vercel logs <deployment-url>
   ```

## Troubleshooting

### Verification Script Fails
```bash
# Check script permissions
chmod +x deployment/scripts/verify-deployment-harmony.sh

# Run with verbose output
bash -x deployment/scripts/verify-deployment-harmony.sh --pre-deploy staging
```

### Deployment Coordinator Issues
```bash
# Check logs
cat /tmp/wcagai-unified-deploy-*.log

# Verify CLI tools installed
which railway
which vercel
```

### GitHub Actions Failures
- Check workflow logs in Actions tab
- Verify secrets are configured
- Ensure branch protection rules allow workflow runs

## Advanced Usage

### Custom Verification Rules

Edit `deployment/scripts/verify-deployment-harmony.sh` to add custom checks:

```bash
# Add to verify_custom_rules()
verify_custom_rules() {
  section "Custom Rules"
  
  # Add your custom checks here
  if [ -f "path/to/file" ]; then
    check "Custom file exists" 0
  else
    check "Custom file exists" 1
  fi
}
```

### Pre-Deploy Hooks

Add pre-deployment hooks in `deploy-unified.sh`:

```bash
pre_deployment_hooks() {
  # Run custom pre-deployment tasks
  log "Running custom pre-deployment hooks..."
  
  # Your custom logic here
}
```

### Post-Deploy Actions

Add post-deployment actions:

```bash
post_deployment_hooks() {
  # Run custom post-deployment tasks
  log "Running custom post-deployment hooks..."
  
  # Notify team
  # Run smoke tests
  # Update monitoring
}
```

## Support

For issues or questions:
1. Check this guide first
2. Review workflow logs
3. Open an issue on GitHub
4. Contact the platform team

## Related Documentation

- [Railway Deployment Guide](../RAILWAY_DEPLOYMENT_GUIDE.md)
- [Vercel Configuration](../packages/webapp/vercel.json)
- [Production Readiness Audit](../PRODUCTION_READINESS_AUDIT.md)
- [Deployment Audit](../DEPLOYMENT_AUDIT_RAILWAY_VERCEL.md)
