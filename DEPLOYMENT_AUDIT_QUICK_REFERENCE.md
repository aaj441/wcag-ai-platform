# Quick Reference: Deployment Audit & Testing

**For**: Rapid deployment verification and audit execution

---

## 🚀 Quick Commands

### Automated Deployment Verification
```bash
# Comprehensive deployment check (50+ tests)
./deployment/scripts/comprehensive-deployment-check.sh \
  https://your-api.railway.app \
  https://your-app.vercel.app

# Success: >90% pass rate, 0 failed checks
# Output: Color-coded results with pass/fail/warn
```

### Evidence Collection
```bash
# Collect all deployment evidence
./deployment/scripts/collect-deployment-evidence.sh \
  https://your-api.railway.app \
  https://your-app.vercel.app

# Creates timestamped evidence vault with:
# - Build logs
# - Test results
# - Security headers
# - Performance metrics
# - Configuration files
```

### Manual Testing
```bash
# View comprehensive testing guide
cat LIVE_DEPLOYMENT_TESTING_GUIDE.md

# View reproducibility guide
cat DEPLOYMENT_REPRODUCIBILITY_GUIDE.md

# View completeness checklist
cat DEPLOYMENT_COMPLETENESS_CHECKLIST.md
```

---

## 🤖 AI Auditing Workflow

### Step 1: Choose Your Audit Focus

**For comprehensive audit (recommended):**
- Use Prompt 1 from `AI_AUDIT_PROMPTS.md`
- Covers: Security, error handling, WCAG, monitoring, data integrity

**For targeted audits:**
- Security → Prompts 1, 8
- Code Quality → Prompts 3, 4  
- Deployment → Prompts 2, 7
- Accessibility → Prompt 6
- Performance → Prompt 9
- End-User → Prompt 10

### Step 2: Execute Audit

```bash
# 1. Open AI_AUDIT_PROMPTS.md
cat AI_AUDIT_PROMPTS.md

# 2. Copy desired prompt(s)
# 3. Paste into Kimi/Claude/ChatGPT
# 4. Provide repository access or key files
# 5. Wait for detailed report
```

### Step 3: Track Results

```markdown
| Prompt | Date  | P0 | P1 | P2 | Score | Status |
|--------|-------|----|----|----|----|--------|
| 1      | 11/18 | 0  | 2  | 5  | 8/10| ✅     |
| 2      | 11/18 | 0  | 1  | 3  | 9/10| ✅     |
```

### Step 4: Address Findings

Priority order:
1. P0 (Blockers) - Fix immediately
2. P1 (High) - Fix within 7 days
3. P2 (Medium) - Fix within 30 days

---

## 📋 Deployment Checklist Speed Run

### Phase 1: Pre-Deploy (5 min)
```bash
# Check git status
git status

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
cd packages/api && npm test
cd packages/webapp && npm test
```

### Phase 2: Deploy (15 min)
```bash
# Deploy API to Railway
cd packages/api
railway login
railway init
railway up

# Deploy Frontend to Vercel
cd packages/webapp
vercel login
vercel --prod
```

### Phase 3: Verify (10 min)
```bash
# Automated verification
./deployment/scripts/comprehensive-deployment-check.sh \
  $RAILWAY_URL $VERCEL_URL

# Manual smoke tests
curl $RAILWAY_URL/health
open $VERCEL_URL
```

### Phase 4: Document (5 min)
```bash
# Collect evidence
./deployment/scripts/collect-deployment-evidence.sh \
  $RAILWAY_URL $VERCEL_URL

# Review evidence summary
cat evidence-vault/deployment-*/EVIDENCE_SUMMARY.md
```

**Total Time: ~35 minutes**

---

## 🎯 Success Criteria Quick Check

### Deployment Ready ✅
- [ ] All builds pass
- [ ] All tests pass  
- [ ] Security scan clean
- [ ] Accessibility >90%
- [ ] Response time <1s
- [ ] No P0/P1 issues

### Production Ready ✅
- [ ] Comprehensive check >90%
- [ ] WCAG AA compliance >95%
- [ ] Security score >9/10
- [ ] Performance score >8/10
- [ ] Load test passed
- [ ] Monitoring configured
- [ ] Rollback tested

---

## 🔧 Troubleshooting Quick Fixes

### Build Failures
```bash
# Clear caches
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Test Failures
```bash
# Run specific test
npm test -- --testNamePattern="test name"

# Update snapshots
npm test -- -u
```

### Deployment Failures
```bash
# Railway: Check logs
railway logs

# Vercel: Check logs
vercel logs

# Rollback
railway rollback
vercel promote [previous-url]
```

### Slow Performance
```bash
# Profile API
curl -w "@-" -o /dev/null -s $API_URL/api/drafts << 'EOF'
    time_total:  %{time_total}\n
EOF

# Check bundle size
ls -lh packages/webapp/dist/assets/
```

---

## 📊 Key Metrics Dashboard

### API Health
```bash
# Response time
curl -w "%{time_total}\n" -o /dev/null -s $API_URL/health

# Uptime check
curl -sf $API_URL/health && echo "✅ UP" || echo "❌ DOWN"

# Endpoints status
curl -s $API_URL/api/drafts | jq '.success'
```

### Frontend Health
```bash
# Load time
curl -w "%{time_total}\n" -o /dev/null -s $FRONTEND_URL

# Lighthouse score
lighthouse $FRONTEND_URL --only-categories=performance,accessibility

# Bundle size
curl -sI $FRONTEND_URL | grep content-length
```

### Security Check
```bash
# HTTPS enforced
curl -I $FRONTEND_URL | grep -i strict-transport-security

# Security headers
curl -I $FRONTEND_URL | grep -i "x-frame-options\|content-security"

# CORS config
curl -I -X OPTIONS $API_URL/api/drafts -H "Origin: https://evil.com"
```

---

## 📞 Quick Links

### Documentation
- [AI Audit Prompts](AI_AUDIT_PROMPTS.md) - 10 comprehensive prompts
- [Deployment Reproducibility](DEPLOYMENT_REPRODUCIBILITY_GUIDE.md) - Step-by-step guide
- [Live Testing Guide](LIVE_DEPLOYMENT_TESTING_GUIDE.md) - Production tests
- [Completeness Checklist](DEPLOYMENT_COMPLETENESS_CHECKLIST.md) - 13-phase checklist

### Scripts
- `comprehensive-deployment-check.sh` - 50+ automated checks
- `collect-deployment-evidence.sh` - Evidence collection
- `deploy-unified.sh` - Unified deployment
- `verify-deployment-harmony.sh` - Pre/post validation

### Existing Guides
- [README.md](README.md) - Main documentation
- [Production Readiness Audit](PRODUCTION_READINESS_AUDIT.md) - Detailed findings
- [Deployment Harmony Guide](DEPLOYMENT_HARMONY_GUIDE.md) - Unified verification

---

## 🎓 Best Practices

### Before Every Deployment
1. ✅ Run comprehensive deployment check locally
2. ✅ Review and fix all P0/P1 issues
3. ✅ Test rollback procedure
4. ✅ Verify monitoring alerts
5. ✅ Brief team on changes

### After Every Deployment
1. ✅ Run comprehensive deployment check on production
2. ✅ Collect deployment evidence
3. ✅ Monitor for 30 minutes
4. ✅ Document any issues
5. ✅ Update runbook if needed

### Weekly Maintenance
1. ✅ Run full test suite
2. ✅ Check for dependency updates
3. ✅ Review error logs
4. ✅ Update documentation
5. ✅ Plan next sprint priorities

---

## 🆘 Emergency Contacts

**Critical Issues:**
- Database down → Check Railway PostgreSQL logs
- API unreachable → Check Railway service status
- Frontend down → Check Vercel deployment logs
- Security incident → Escalate immediately

**Quick Rollback:**
```bash
# Railway
railway rollback

# Vercel  
vercel ls
vercel promote [previous-deployment-url]
```

---

**Last Updated**: November 18, 2025
**Version**: 1.0
