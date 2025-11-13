# Deployment Scripts

This directory contains deployment automation scripts for the WCAG AI Platform.

## Scripts Overview

### Core Deployment Scripts

#### `deploy-unified.sh`
**Unified deployment coordinator for Railway (backend) + Vercel (frontend)**

```bash
# Deploy to staging
./deploy-unified.sh staging

# Deploy to production
./deploy-unified.sh production
```

**Features:**
- Pre-deployment validation
- Coordinated backend + frontend deployment
- Post-deployment verification
- Automatic rollback on failure
- Comprehensive deployment reports

#### `deploy-production.sh`
**Production-ready deployment script with comprehensive validation**

```bash
./deploy-production.sh
```

**Includes:**
- 12-step deployment process
- Git status verification
- Dependency installation
- Build validation
- Railway + Vercel deployment
- Post-deployment testing
- Deployment report generation

#### `deploy.sh`
**General-purpose deployment script**

```bash
./deploy.sh [staging|production]
```

### Verification & Validation Scripts

#### `verify-deployment-harmony.sh`
**Comprehensive deployment harmony verification system**

```bash
# Pre-deployment check
./verify-deployment-harmony.sh --pre-deploy staging

# Post-deployment check
./verify-deployment-harmony.sh --post-deploy production
```

**Checks:**
- Type consistency between packages
- API contract validation
- Configuration validity
- Build success
- Security implementation
- Cross-platform integration

#### `validate-railway.sh`
**Railway-specific deployment validator**

```bash
./validate-railway.sh https://your-app.railway.app
```

**Validates:**
- Railway configuration
- Health endpoint
- Environment variables
- Service configuration
- Database connectivity
- Performance metrics
- Security headers

#### `validate-vercel.sh`
**Vercel-specific deployment validator**

```bash
./validate-vercel.sh https://your-app.vercel.app
```

**Validates:**
- Vercel configuration
- Frontend availability
- Security headers
- Performance metrics
- Asset optimization
- CDN configuration

#### `verify-production.sh`
**Production readiness verification (10 meta prompts)**

```bash
./verify-production.sh https://your-production-url.com
```

**Verifies:**
1. Health check reality
2. Rollback capability
3. Environment parity
4. Load testing & autoscaling
5. Observability
6. Data corruption protection
7. Dependency resilience
8. Security audit
9. Build reproducibility
10. Business continuity

### Utility Scripts

#### `smoke-test.sh`
**Quick smoke tests after deployment**

```bash
./smoke-test.sh https://deployment-url.com
```

#### `test-validators.sh`
**Tests the validation scripts themselves**

```bash
./test-validators.sh
```

#### `setup-env.sh`
**Sets up environment variables for deployment**

```bash
./setup-env.sh
```

#### `migrate-safe.sh`
**Safe database migration script**

```bash
./migrate-safe.sh
```

## Workflow

### 1. Pre-Deployment

```bash
# Step 1: Verify harmony
./verify-deployment-harmony.sh --pre-deploy staging

# Step 2: Run tests
cd ../../deployment/tests
./test-deployment-harmony.sh

# Step 3: Check current status
git status
```

### 2. Deployment

**Option A: Unified Deployment (Recommended)**
```bash
./deploy-unified.sh production
```

**Option B: Manual Step-by-Step**
```bash
# Backend (Railway)
cd packages/api
railway up --service=wcagaii-backend

# Frontend (Vercel)
cd packages/webapp
vercel --prod
```

**Option C: Traditional Script**
```bash
./deploy-production.sh
```

### 3. Post-Deployment

```bash
# Step 1: Validate deployments
./validate-railway.sh https://your-backend.railway.app
./validate-vercel.sh https://your-frontend.vercel.app

# Step 2: Run smoke tests
./smoke-test.sh https://your-backend.railway.app

# Step 3: Verify production readiness
./verify-production.sh https://your-backend.railway.app

# Step 4: Post-deployment harmony check
./verify-deployment-harmony.sh --post-deploy production
```

## Environment Variables

Required environment variables:

### Railway
- `RAILWAY_TOKEN` - Railway API token
- `RAILWAY_SERVICE` - Service name (default: `wcagaii-backend`)

### Vercel
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_PROJECT` - Project name (default: `wcagaii`)

### Application
- `NODE_ENV` - Environment (staging/production)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `VITE_API_BASE_URL` - Frontend API URL

## Prerequisites

### Required Tools

```bash
# Node.js & npm
node --version  # v18+
npm --version   # v9+

# Deployment CLIs
npm install -g @railway/cli
npm install -g vercel

# Utilities
sudo apt-get install jq bc curl
```

### Authentication

```bash
# Railway
railway login

# Vercel
vercel login

# Verify
railway whoami
vercel whoami
```

## Testing

### Run Integration Tests

```bash
cd ../tests
./test-deployment-harmony.sh
```

### Manual Testing

```bash
# Test script syntax
bash -n script-name.sh

# Dry run (some scripts support this)
./deploy-dry-run.sh

# Test with staging first
./deploy-unified.sh staging
```

## Troubleshooting

### Common Issues

**Issue:** Script not executable
```bash
chmod +x script-name.sh
```

**Issue:** Missing dependencies
```bash
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel

# Install utilities
sudo apt-get install jq bc
```

**Issue:** Authentication errors
```bash
# Railway
railway login
railway whoami

# Vercel
vercel login
vercel whoami
```

**Issue:** Build failures
```bash
# Check logs
cat /tmp/wcagai-deploy-*.log

# Test builds locally
cd packages/api && npm run build
cd packages/webapp && npm run build
```

### Debug Mode

Most scripts support verbose output:

```bash
# Run with bash debug mode
bash -x script-name.sh

# Check script logs
ls -lt /tmp/wcagai-*.log
tail -f /tmp/wcagai-deploy-*.log
```

## CI/CD Integration

These scripts integrate with GitHub Actions:

### Workflows

- `.github/workflows/deployment-harmony.yml` - Automated verification on PRs
- `.github/workflows/production-deploy.yml` - Production deployment workflow

### Manual Trigger

1. Go to GitHub Actions tab
2. Select "Deployment Harmony Verification"
3. Click "Run workflow"
4. Choose environment (staging/production)

## Best Practices

1. **Always verify before deploying:**
   ```bash
   ./verify-deployment-harmony.sh --pre-deploy production
   ```

2. **Test in staging first:**
   ```bash
   ./deploy-unified.sh staging
   # Validate
   # Then deploy to production
   ./deploy-unified.sh production
   ```

3. **Monitor deployments:**
   ```bash
   railway logs --service=wcagaii-backend
   vercel logs <deployment-url>
   ```

4. **Keep scripts updated:**
   ```bash
   git pull origin main
   chmod +x deployment/scripts/*.sh
   ```

5. **Document changes:**
   - Update this README when adding new scripts
   - Document new environment variables
   - Add examples for new features

## Script Maintenance

### Adding New Scripts

1. Create script in this directory
2. Make it executable: `chmod +x script-name.sh`
3. Add documentation to this README
4. Add tests to `../tests/test-deployment-harmony.sh`
5. Update workflow if needed

### Updating Existing Scripts

1. Test changes locally
2. Run integration tests
3. Update documentation
4. Create PR for review
5. Merge after approval

## Related Documentation

- [Deployment Harmony Guide](../../DEPLOYMENT_HARMONY_GUIDE.md)
- [Railway Deployment Guide](../../RAILWAY_DEPLOYMENT_GUIDE.md)
- [Production Readiness Audit](../../PRODUCTION_READINESS_AUDIT.md)
- [Deployment Audit](../../DEPLOYMENT_AUDIT_RAILWAY_VERCEL.md)

## Support

For issues or questions:
1. Check this README
2. Review script logs in `/tmp/wcagai-*.log`
3. Run tests: `../tests/test-deployment-harmony.sh`
4. Check GitHub Actions logs
5. Open an issue on GitHub

## Version History

- **v2.0** - Added unified deployment coordinator and harmony verification
- **v1.5** - Enhanced Railway and Vercel validators
- **v1.0** - Initial deployment scripts
