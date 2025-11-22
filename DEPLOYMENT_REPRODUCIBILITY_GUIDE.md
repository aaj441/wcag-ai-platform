# Deployment Reproducibility Guide

**Goal**: Enable anyone to deploy the WCAG AI Platform from scratch with 100% reproducibility.

**Target Audience**: DevOps engineers, consultants, QA testers, and stakeholders who need to verify or replicate deployments.

---

## 🎯 Reproducibility Principles

This guide follows these core principles:
1. **Deterministic**: Same inputs → Same outputs, every time
2. **Documented**: Every step clearly explained with verification
3. **Automated**: Scripts over manual steps where possible
4. **Validated**: Each stage has success criteria
5. **Recoverable**: Clear rollback procedures at each stage

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

### Required Accounts (Free Tiers Available)
- [ ] GitHub account (for code repository)
- [ ] Railway account (for backend API hosting)
- [ ] Vercel account (for frontend hosting)
- [ ] OpenAI or Anthropic API key (for AI features)

### Required Software
- [ ] Node.js v18+ installed
  ```bash
  node --version  # Should output v18.x.x or higher
  ```
- [ ] npm v9+ installed
  ```bash
  npm --version  # Should output 9.x.x or higher
  ```
- [ ] Git installed
  ```bash
  git --version
  ```
- [ ] jq (JSON parser) installed
  ```bash
  jq --version
  # Install: brew install jq (Mac) or apt-get install jq (Linux)
  ```

### Required CLI Tools
- [ ] Railway CLI
  ```bash
  npm install -g @railway/cli
  railway --version
  ```
- [ ] Vercel CLI
  ```bash
  npm install -g vercel
  vercel --version
  ```

### Authentication
- [ ] GitHub authenticated
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```
- [ ] Railway authenticated
  ```bash
  railway login
  # Opens browser for OAuth
  railway whoami  # Verify
  ```
- [ ] Vercel authenticated
  ```bash
  vercel login
  # Opens browser for OAuth
  vercel whoami  # Verify
  ```

---

## 🚀 Deployment Process (Step-by-Step)

### Stage 1: Repository Setup (5 minutes)

**1.1 Clone Repository**
```bash
git clone https://github.com/aaj441/wcag-ai-platform.git
cd wcag-ai-platform
```

**Verification**:
```bash
# Should show all files including packages/ directory
ls -la
# Should show main branch
git branch
```

**1.2 Install Root Dependencies**
```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

**Verification**:
```bash
# Should show node_modules directory
ls -la node_modules | head
# Should complete without errors
echo "Root dependencies: ✓"
```

**1.3 Install API Dependencies**
```bash
cd packages/api
npm install
```

**Verification**:
```bash
# Check critical dependencies
npm list express prisma typescript tsx
echo "API dependencies: ✓"
cd ../..
```

**1.4 Install WebApp Dependencies**
```bash
cd packages/webapp
npm install
```

**Verification**:
```bash
# Check critical dependencies
npm list react vite tailwindcss
echo "WebApp dependencies: ✓"
cd ../..
```

**Success Criteria**:
- ✅ No npm errors
- ✅ All three package.json locations have node_modules/
- ✅ Total time < 5 minutes

---

### Stage 2: Local Configuration (10 minutes)

**2.1 Configure API Environment Variables**
```bash
cd packages/api
cp .env.example .env
```

**Edit .env file** with your actual values:
```bash
# Required for AI features
OPENAI_API_KEY=sk-...                    # Get from platform.openai.com
# OR
ANTHROPIC_API_KEY=sk-ant-...             # Get from console.anthropic.com

# Database (for local development - Railway will override in production)
DATABASE_URL=postgresql://user:password@localhost:5432/wcag_platform

# Optional
GITHUB_TOKEN=ghp_...                     # For GitHub integration
LAUNCHDARKLY_SDK_KEY=sdk-...            # For feature flags
NODE_ENV=development
PORT=3001
```

**Verification**:
```bash
# Check .env exists and has required keys
grep -q "OPENAI_API_KEY\|ANTHROPIC_API_KEY" .env && echo "AI key: ✓" || echo "AI key: ✗ MISSING"
cd ../..
```

**2.2 Configure WebApp Environment Variables**
```bash
cd packages/webapp
cp .env.example .env
```

**Edit .env file**:
```bash
VITE_API_URL=http://localhost:3001
NODE_ENV=development
```

**Verification**:
```bash
grep -q "VITE_API_URL" .env && echo "WebApp config: ✓"
cd ../..
```

**2.3 Initialize Database (Optional for Local)**
```bash
cd packages/api
npx prisma generate
# Only if you have local PostgreSQL running:
# npx prisma db push
cd ../..
```

**Success Criteria**:
- ✅ Both .env files created
- ✅ AI API key configured
- ✅ Prisma client generated

---

### Stage 3: Local Build & Test (15 minutes)

**3.1 Build API**
```bash
cd packages/api
npm run build
```

**Verification**:
```bash
# Should create dist/ directory with compiled JS
ls -la dist/
test -f dist/server.js && echo "API build: ✓" || echo "API build: ✗ FAILED"
cd ../..
```

**3.2 Build WebApp**
```bash
cd packages/webapp
npm run build
```

**Verification**:
```bash
# Should create dist/ directory with index.html
ls -la dist/
test -f dist/index.html && echo "WebApp build: ✓" || echo "WebApp build: ✗ FAILED"
cd ../..
```

**3.3 Run Tests**
```bash
# API tests
cd packages/api
npm test 2>&1 | tee /tmp/api-test-results.txt

# WebApp tests (if configured)
cd ../webapp
npm test 2>&1 | tee /tmp/webapp-test-results.txt
cd ../..
```

**Verification**:
```bash
# Check test results
grep -i "pass\|fail" /tmp/api-test-results.txt
echo "Review test output above"
```

**Success Criteria**:
- ✅ API builds without TypeScript errors
- ✅ WebApp builds without errors
- ✅ All tests pass (or known failures documented)
- ✅ Build artifacts created in dist/ directories

---

### Stage 4: Local Runtime Verification (10 minutes)

**4.1 Start API Server (Terminal 1)**
```bash
cd packages/api
npm run dev
```

**Expected Output**:
```
🚀 WCAG AI Platform API Server
📡 Server running on http://localhost:3001
✅ Health check available at http://localhost:3001/health
```

**Verification** (in new terminal):
```bash
# Health check
curl http://localhost:3001/health
# Expected: {"success":true,"status":"healthy",...}

# API endpoints check
curl http://localhost:3001/api/drafts
# Expected: {"success":true,"data":[...],...}
```

**4.2 Start WebApp Server (Terminal 2)**
```bash
cd packages/webapp
npm run dev
```

**Expected Output**:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Verification** (in browser):
1. Open http://localhost:3000
2. Should see "WCAG AI Consultant Dashboard"
3. Should see email drafts list
4. No console errors in browser DevTools

**4.3 End-to-End Smoke Test**
```bash
# In a third terminal
cd /home/runner/work/wcag-ai-platform/wcag-ai-platform
./deployment/scripts/smoke-test.sh http://localhost:3001 http://localhost:3000
```

**Success Criteria**:
- ✅ API responds to health check
- ✅ API returns data from endpoints
- ✅ WebApp loads in browser
- ✅ Dashboard displays correctly
- ✅ No critical console errors
- ✅ Basic interaction works (click draft, view details)

---

### Stage 5: Production Deployment to Railway (Backend) (15 minutes)

**5.1 Railway Project Setup**
```bash
cd packages/api
railway init
```

**Interactive prompts**:
- Project name: `wcag-ai-platform-api`
- Environment: `production`

**5.2 Configure Railway Environment Variables**
```bash
# Set all required environment variables
railway variables set OPENAI_API_KEY="sk-..."
# OR
railway variables set ANTHROPIC_API_KEY="sk-ant-..."

railway variables set NODE_ENV="production"
railway variables set PORT="3001"

# Railway will auto-provision PostgreSQL - get DATABASE_URL after provisioning
```

**5.3 Add PostgreSQL Database**
```bash
railway add
# Select: PostgreSQL
# Verify database added:
railway variables
# Should see DATABASE_URL
```

**5.4 Run Database Migrations**
```bash
railway run npx prisma migrate deploy
# OR
railway run npx prisma db push
```

**5.5 Deploy to Railway**
```bash
railway up
```

**Expected Output**:
```
✓ Build successful
✓ Deployment successful
✓ Available at: https://your-app-name.up.railway.app
```

**Verification**:
```bash
# Get your Railway URL
RAILWAY_URL=$(railway variables get RAILWAY_STATIC_URL)
echo "Railway URL: $RAILWAY_URL"

# Test health endpoint
curl https://your-app-name.up.railway.app/health
# Expected: {"success":true,"status":"healthy"}

# Test API endpoint
curl https://your-app-name.up.railway.app/api/drafts
# Expected: {"success":true,"data":[...]}
```

**5.6 Validate Railway Deployment**
```bash
cd ../../deployment/scripts
./validate-railway.sh https://your-app-name.up.railway.app
```

**Success Criteria**:
- ✅ Railway project created
- ✅ PostgreSQL database provisioned
- ✅ Environment variables set
- ✅ Migrations run successfully
- ✅ API deployed and responding
- ✅ Health check passes
- ✅ Validation script passes >90%

---

### Stage 6: Production Deployment to Vercel (Frontend) (10 minutes)

**6.1 Vercel Project Setup**
```bash
cd packages/webapp
vercel
```

**Interactive prompts**:
- Set up and deploy: `Y`
- Scope: [Select your account]
- Link to existing project: `N`
- Project name: `wcag-ai-platform`
- Directory: `./` (current directory)
- Override settings: `N`

**6.2 Configure Vercel Environment Variables**
```bash
# Set production API URL (use your Railway URL)
vercel env add VITE_API_URL production
# Enter: https://your-app-name.up.railway.app

# Verify
vercel env ls
```

**6.3 Deploy to Production**
```bash
vercel --prod
```

**Expected Output**:
```
✓  Production: https://wcag-ai-platform.vercel.app [copied to clipboard]
```

**Verification**:
```bash
# Test production frontend
curl -I https://wcag-ai-platform.vercel.app
# Expected: HTTP/2 200

# Open in browser and test
echo "Open https://wcag-ai-platform.vercel.app in browser"
```

**6.4 Validate Vercel Deployment**
```bash
cd ../../deployment/scripts
./validate-vercel.sh https://wcag-ai-platform.vercel.app
```

**Success Criteria**:
- ✅ Vercel project created
- ✅ Environment variables set
- ✅ Frontend deployed
- ✅ App loads in browser
- ✅ API connection works
- ✅ Dashboard functional
- ✅ Validation script passes >90%

---

### Stage 7: End-to-End Production Validation (15 minutes)

**7.1 Automated Validation**
```bash
cd /home/runner/work/wcag-ai-platform/wcag-ai-platform/deployment/scripts
./verify-deployment-harmony.sh --post-deploy production
```

**7.2 Manual Testing Checklist**

Test on production URLs:
- **Backend**: https://your-app-name.up.railway.app
- **Frontend**: https://wcag-ai-platform.vercel.app

**Backend Tests**:
- [ ] Health check: `curl https://your-app-name.up.railway.app/health`
- [ ] List drafts: `curl https://your-app-name.up.railway.app/api/drafts`
- [ ] Create draft: 
  ```bash
  curl -X POST https://your-app-name.up.railway.app/api/drafts \
    -H "Content-Type: application/json" \
    -d '{"recipient":"test@example.com","subject":"Test","body":"Test body"}'
  ```
- [ ] Database persistence: Create → Refresh → Verify data persists

**Frontend Tests**:
- [ ] Dashboard loads
- [ ] Email drafts list displays
- [ ] Click draft → Preview shows
- [ ] Edit draft → Save works
- [ ] Approve draft → Status updates
- [ ] Notifications appear
- [ ] No console errors
- [ ] Mobile responsive

**Integration Tests**:
- [ ] Frontend connects to backend API
- [ ] Create draft in frontend → appears in list
- [ ] Approve draft → API updates status
- [ ] Real-time updates work
- [ ] Error handling works (disconnect network)

**7.3 Performance Validation**
```bash
# Backend response time
curl -w "@-" -o /dev/null -s https://your-app-name.up.railway.app/api/drafts <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
# Total time should be < 1s

# Frontend Lighthouse test
npx lighthouse https://wcag-ai-platform.vercel.app --only-categories=performance,accessibility --output=json --output-path=/tmp/lighthouse-report.json
cat /tmp/lighthouse-report.json | jq '.categories'
```

**7.4 Accessibility Validation**
```bash
# Automated accessibility scan
cd /home/runner/work/wcag-ai-platform/wcag-ai-platform
npm run accessibility:scan https://wcag-ai-platform.vercel.app
```

**Success Criteria**:
- ✅ All automated checks pass
- ✅ All manual tests pass
- ✅ API response time < 1s
- ✅ Frontend loads < 3s
- ✅ Lighthouse performance > 80
- ✅ Lighthouse accessibility > 90
- ✅ No critical errors in logs
- ✅ Database persistence confirmed

---

## 🔄 Rollback Procedures

If deployment fails at any stage:

### Stage 5 Rollback (Railway)
```bash
cd packages/api
railway rollback
# Or redeploy previous version
railway up --detach
```

### Stage 6 Rollback (Vercel)
```bash
cd packages/webapp
# List deployments
vercel ls
# Promote previous deployment
vercel promote [deployment-url]
```

### Full Rollback
```bash
# Delete Railway project
railway delete
# Delete Vercel project
vercel remove wcag-ai-platform
# Start over from Stage 5
```

---

## 📊 Deployment Verification Matrix

| Stage | Component | Success Criteria | Rollback Available |
|-------|-----------|------------------|-------------------|
| 1 | Repository | All files cloned | N/A - local only |
| 2 | Dependencies | node_modules/ created | rm -rf node_modules |
| 3 | Configuration | .env files valid | Delete .env files |
| 4 | Local Build | dist/ created, tests pass | rm -rf dist/ |
| 5 | Local Runtime | Servers start, APIs respond | Ctrl+C to stop |
| 6 | Railway Deploy | API accessible, DB connected | railway rollback |
| 7 | Vercel Deploy | Frontend accessible, UI works | vercel promote [prev] |
| 8 | Integration | E2E tests pass | See rollback section |

---

## 🐛 Troubleshooting Common Issues

### Issue: npm install fails
**Solution**:
```bash
# Clear npm cache
npm cache clean --force
# Delete node_modules
rm -rf node_modules package-lock.json
# Reinstall
npm install
```

### Issue: TypeScript build errors
**Solution**:
```bash
# Check TypeScript version
npx tsc --version  # Should be 5.x+
# Clean build
rm -rf dist/
npm run build
```

### Issue: Railway deployment fails
**Solution**:
```bash
# Check logs
railway logs
# Verify environment variables
railway variables
# Redeploy
railway up
```

### Issue: Vercel deployment fails
**Solution**:
```bash
# Check build logs
vercel logs
# Verify environment variables
vercel env ls
# Clear cache and redeploy
vercel --force
```

### Issue: API not connecting to database
**Solution**:
```bash
# Check DATABASE_URL
railway variables get DATABASE_URL
# Run migrations
railway run npx prisma migrate deploy
# Check database connection
railway run npx prisma db pull
```

### Issue: Frontend can't connect to backend
**Solution**:
```bash
# Verify VITE_API_URL
vercel env ls
# Check CORS settings in packages/api/src/server.ts
# Redeploy with correct URL
vercel env add VITE_API_URL production
vercel --prod
```

---

## ✅ Reproducibility Checklist

Before claiming "100% reproducible", verify:

### Documentation
- [ ] All steps documented
- [ ] All prerequisites listed
- [ ] All commands provided
- [ ] All expected outputs shown
- [ ] All verification steps included
- [ ] All errors documented with solutions

### Automation
- [ ] Build scripts work without manual intervention
- [ ] Deployment scripts are idempotent
- [ ] Environment variable templates complete
- [ ] Configuration validation automated
- [ ] Test suites automated

### Validation
- [ ] Each stage has success criteria
- [ ] Verification commands provided
- [ ] Performance benchmarks defined
- [ ] Rollback procedures tested
- [ ] Error recovery documented

### Testing
- [ ] Deployed successfully 3+ times from scratch
- [ ] Deployed by different team members
- [ ] Deployed in different environments
- [ ] Deployed from different machines/OS
- [ ] All edge cases handled

---

## 📈 Continuous Improvement

After each deployment:
1. Document any deviations from this guide
2. Update guide with new findings
3. Automate manual steps where possible
4. Improve error messages and logging
5. Refine success criteria
6. Update troubleshooting section

---

## 📞 Support & Escalation

If you encounter issues not covered here:
1. Check GitHub Issues: https://github.com/aaj441/wcag-ai-platform/issues
2. Review Railway docs: https://docs.railway.app
3. Review Vercel docs: https://vercel.com/docs
4. Open new issue with:
   - Stage where failure occurred
   - Full error output
   - Environment details (OS, Node version, etc.)
   - Steps to reproduce

---

## 📝 Deployment Evidence Log

After each deployment, document:

```markdown
## Deployment Log: [Date] [Deployer Name]

### Environment
- Node.js version: v18.x.x
- npm version: 9.x.x
- OS: [Mac/Linux/Windows]

### Timing
- Stage 1 (Setup): X minutes
- Stage 2 (Config): X minutes
- Stage 3 (Build): X minutes
- Stage 4 (Local): X minutes
- Stage 5 (Railway): X minutes
- Stage 6 (Vercel): X minutes
- Stage 7 (Validation): X minutes
- **Total Time**: X minutes

### URLs
- Railway API: https://...
- Vercel Frontend: https://...

### Verification Results
- Health Check: ✅/❌
- API Tests: ✅/❌
- Frontend Tests: ✅/❌
- E2E Tests: ✅/❌
- Performance: ✅/❌ (Lighthouse score: XX/100)
- Accessibility: ✅/❌ (WCAG score: XX%)

### Issues Encountered
1. [Issue description] - [Solution]
2. ...

### Deviations from Guide
- [Any steps modified or skipped]

### Overall Success
- [ ] Deployment fully successful
- [ ] Deployment partial (document what failed)
- [ ] Deployment failed (document why)

### Next Steps
- [Any follow-up actions needed]
```

---

**Last Updated**: November 18, 2025
**Version**: 1.0
**Tested By**: [List of successful deployments]
**Next Review**: December 18, 2025
