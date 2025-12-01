# Production Deployment Verification Checklist

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, E2E)
- [ ] Test coverage meets minimum thresholds (85%+)
- [ ] No ESLint warnings or errors
- [ ] TypeScript compilation successful with no errors
- [ ] Code reviewed and approved by at least one team member
- [ ] All critical and high-priority bugs resolved

### Database
- [ ] Database migrations tested in staging environment
- [ ] Migration rollback scripts prepared and tested
- [ ] Database backup completed before migration
- [ ] Index performance verified for new queries
- [ ] Foreign key constraints validated
- [ ] Database connection pool settings optimized

### Environment Configuration
- [ ] All environment variables documented in `.env.example`
- [ ] Production environment variables set in deployment platform
- [ ] API keys and secrets rotated if necessary
- [ ] Database connection strings verified
- [ ] Redis connection URL configured
- [ ] AWS S3 bucket credentials configured
- [ ] SendGrid API key configured
- [ ] Stripe API keys (production mode) configured
- [ ] Sentry DSN configured for error tracking

### Dependencies
- [ ] All dependencies up to date (no critical vulnerabilities)
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Production dependencies separated from dev dependencies
- [ ] Lock file (`package-lock.json`) committed
- [ ] Docker images built and tested

### Security
- [ ] SSL/TLS certificates valid and up to date
- [ ] CORS settings configured correctly
- [ ] Rate limiting enabled and configured
- [ ] Helmet.js security headers configured
- [ ] JWT secret keys rotated
- [ ] SQL injection prevention verified
- [ ] XSS protection verified
- [ ] CSRF tokens implemented where needed
- [ ] Sensitive data not logged or exposed
- [ ] API authentication working correctly

### Performance
- [ ] Load testing completed (500+ concurrent users)
- [ ] Database query performance optimized (<100ms for 95th percentile)
- [ ] Redis cache hit rate >80%
- [ ] API response times <500ms for 95th percentile
- [ ] Frontend bundle size optimized (<500KB initial load)
- [ ] Images optimized and served from CDN
- [ ] Lazy loading implemented for large components
- [ ] Memory leaks tested and resolved

---

## Deployment Steps

### 1. Backend Deployment (Railway)

#### Database Migration
- [ ] Connect to production database
- [ ] Run `npx prisma migrate deploy` to apply migrations
- [ ] Verify migration success in database
- [ ] Run `npx prisma db seed` if needed for reference data

```bash
cd packages/api
npx prisma migrate deploy
npx prisma generate
```

#### Backend Build
- [ ] Build backend with `npm run build`
- [ ] Verify build output in `dist/` directory
- [ ] Test build locally with `node dist/server.js`

```bash
cd packages/api
npm run build
node dist/server.js # Test locally
```

#### Railway Deployment
- [ ] Push to `main` branch (triggers auto-deployment)
- [ ] Monitor deployment logs in Railway dashboard
- [ ] Verify environment variables in Railway
- [ ] Check service health endpoint: `https://api.yourapp.com/health`
- [ ] Verify database connectivity: `https://api.yourapp.com/health/database`
- [ ] Verify Redis connectivity: `https://api.yourapp.com/health/redis`

```bash
git push origin main
# Railway auto-deploys from main branch
```

### 2. Frontend Deployment (Vercel)

#### Frontend Build
- [ ] Build frontend with `npm run build`
- [ ] Verify build output in `dist/` directory
- [ ] Test build locally with `npm run preview`
- [ ] Check bundle size and optimize if needed

```bash
cd packages/webapp
npm run build
npm run preview # Test production build locally
```

#### Vercel Deployment
- [ ] Push to `main` branch (triggers auto-deployment)
- [ ] Monitor deployment logs in Vercel dashboard
- [ ] Verify environment variables in Vercel
- [ ] Check that API_URL points to production backend
- [ ] Verify domain configuration and SSL

```bash
git push origin main
# Vercel auto-deploys from main branch
```

### 3. Redis/Queue Deployment

#### Redis Configuration
- [ ] Verify Redis instance is running (Railway Redis)
- [ ] Test Redis connectivity from backend
- [ ] Clear test data from Redis if any
- [ ] Verify Redis persistence enabled

```bash
redis-cli -h <redis-host> -p <redis-port> -a <password> PING
```

#### Queue Setup
- [ ] Verify Bull queue workers are running
- [ ] Check queue health: `GET /api/monitoring/queue-stats`
- [ ] Monitor queue processing rate
- [ ] Verify dead letter queue is empty

---

## Post-Deployment Verification

### API Health Checks
- [ ] `GET /health` returns 200 OK
- [ ] `GET /health/database` shows database connected
- [ ] `GET /health/redis` shows Redis connected
- [ ] `GET /health/detailed` shows all services healthy

```bash
curl https://api.yourapp.com/health
curl https://api.yourapp.com/health/database
curl https://api.yourapp.com/health/redis
curl https://api.yourapp.com/health/detailed
```

### Critical User Flows
- [ ] User can create a new scan
- [ ] Scan results are displayed correctly
- [ ] Violations are listed with correct details
- [ ] Fixes can be generated for violations
- [ ] Consultant can approve/reject fixes
- [ ] Fixes can be applied to codebase
- [ ] Lead discovery returns results
- [ ] Proposals can be generated
- [ ] Site transformations can be initiated

### API Endpoint Tests
- [ ] `POST /api/scans` creates scan successfully
- [ ] `GET /api/scans/:id` retrieves scan details
- [ ] `GET /api/violations` lists violations
- [ ] `POST /api/fixes/generate` generates fixes
- [ ] `PATCH /api/fixes/:id/review` approves/rejects fixes
- [ ] `POST /api/fixes/:id/apply` applies fixes
- [ ] `POST /api/transform` starts site transformation
- [ ] `GET /api/leads` lists leads
- [ ] `POST /api/proposals/generate` generates proposals

```bash
# Test scan creation
curl -X POST https://api.yourapp.com/api/scans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","wcagLevel":"AA","clientId":"client-id"}'
```

### Database Verification
- [ ] All tables exist and are accessible
- [ ] Indexes are created correctly
- [ ] Foreign key constraints are working
- [ ] Query performance is acceptable
- [ ] Data integrity checks pass

```sql
-- Check table existence
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify recent scans
SELECT id, url, status, "createdAt"
FROM "Scan"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check violation counts
SELECT COUNT(*) as total FROM "Violation";
```

### Redis/Cache Verification
- [ ] Redis is accepting connections
- [ ] Cache writes are successful
- [ ] Cache reads are working
- [ ] TTL expiration is functioning
- [ ] Queue jobs are being processed

```bash
redis-cli -h <redis-host> -p <redis-port> -a <password>
> PING
> INFO stats
> KEYS *
> GET scan:test-id
```

### Queue Processing
- [ ] Queue is accepting new jobs
- [ ] Workers are processing jobs
- [ ] Failed jobs are being retried
- [ ] Dead letter queue is monitored
- [ ] Queue metrics are being collected

```bash
# Check queue stats
curl https://api.yourapp.com/api/monitoring/queue-stats
```

### Performance Metrics
- [ ] API response times <500ms (p95)
- [ ] Database queries <100ms (p95)
- [ ] Cache hit rate >80%
- [ ] Frontend load time <3s
- [ ] Time to Interactive <5s
- [ ] Core Web Vitals passing (LCP, FID, CLS)

### Error Monitoring
- [ ] Sentry is receiving error reports
- [ ] Error rates are acceptable (<0.1%)
- [ ] No critical errors in last hour
- [ ] Alert channels are working
- [ ] Error notification emails are being sent

### Security Verification
- [ ] SSL/TLS certificate is valid
- [ ] Security headers are present (Helmet.js)
- [ ] CORS is configured correctly
- [ ] Rate limiting is active
- [ ] Authentication is working
- [ ] No sensitive data exposed in responses
- [ ] API keys are not visible in frontend

```bash
# Check security headers
curl -I https://api.yourapp.com/health

# Should include:
# Strict-Transport-Security
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

### Monitoring Setup
- [ ] Prometheus is scraping metrics
- [ ] Grafana dashboards are displaying data
- [ ] Alert rules are configured
- [ ] Uptime monitoring is active
- [ ] Log aggregation is working
- [ ] Performance monitoring is active

---

## Rollback Procedure

### When to Rollback
- [ ] Critical bugs discovered in production
- [ ] Database corruption or data loss
- [ ] Security vulnerabilities exposed
- [ ] Performance degradation >50%
- [ ] >5% error rate
- [ ] Unable to complete critical user flows

### Rollback Steps

#### 1. Backend Rollback
```bash
# Railway: Revert to previous deployment
# Go to Railway dashboard -> Deployments -> Select previous working deployment -> Redeploy
```

#### 2. Frontend Rollback
```bash
# Vercel: Revert to previous deployment
# Go to Vercel dashboard -> Deployments -> Select previous deployment -> Promote to Production
```

#### 3. Database Rollback
```bash
# Restore from backup
psql $DATABASE_URL < backup-$(date +%Y%m%d).sql

# Or rollback specific migration
npx prisma migrate resolve --rolled-back "migration_name"
```

#### 4. Clear Cache
```bash
# Clear Redis cache to prevent stale data
redis-cli -h <redis-host> -p <redis-port> -a <password> FLUSHDB
```

---

## Monitoring Post-Deployment

### First 24 Hours
- [ ] Monitor error rates every hour
- [ ] Check performance metrics every 2 hours
- [ ] Review user feedback and support tickets
- [ ] Monitor database performance
- [ ] Check queue processing rates
- [ ] Verify cache hit rates
- [ ] Monitor API usage patterns

### First Week
- [ ] Daily error rate review
- [ ] Performance trend analysis
- [ ] User engagement metrics
- [ ] Database growth monitoring
- [ ] Cost analysis (API calls, database storage)
- [ ] Security audit review

### Key Metrics to Monitor
- **Error Rate**: <0.1%
- **API Response Time (p95)**: <500ms
- **Database Query Time (p95)**: <100ms
- **Cache Hit Rate**: >80%
- **Queue Processing Rate**: >100 jobs/minute
- **Uptime**: >99.9%
- **User Satisfaction**: >4.5/5

---

## Emergency Contacts

### On-Call Engineers
- **Primary**: [Name] - [Phone] - [Email]
- **Secondary**: [Name] - [Phone] - [Email]

### Service Providers
- **Railway Support**: support@railway.app
- **Vercel Support**: support@vercel.com
- **Database Admin**: [Contact]
- **Security Team**: [Contact]

### Escalation Path
1. On-call engineer (immediate)
2. Tech lead (30 minutes)
3. Engineering manager (1 hour)
4. CTO (2 hours)

---

## Sign-Off

### Deployment Team
- [ ] Backend Engineer: _________________ Date: _______
- [ ] Frontend Engineer: _________________ Date: _______
- [ ] DevOps Engineer: _________________ Date: _______
- [ ] QA Engineer: _________________ Date: _______

### Approvals
- [ ] Tech Lead: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] Engineering Manager: _________________ Date: _______

---

## Notes

### Deployment Date: _______________________
### Version: _______________________
### Git Commit SHA: _______________________

### Issues Encountered:
_______________________________________
_______________________________________
_______________________________________

### Lessons Learned:
_______________________________________
_______________________________________
_______________________________________
