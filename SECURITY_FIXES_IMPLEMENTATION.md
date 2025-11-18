# Security Fixes Implementation Guide

## Executive Summary

This document provides a comprehensive guide to implementing security fixes identified in the security audit conducted on November 18, 2025. The audit identified **2 critical**, **2 high**, and **3 medium** priority security issues that require immediate attention.

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Implementation Steps](#implementation-steps)
5. [Testing & Verification](#testing--verification)
6. [Continuous Security](#continuous-security)

---

## Critical Issues

### 1. Secrets in Template Files

**Status**: ⚠️ FALSE POSITIVE (Mostly)

**Finding**: The audit detected "secrets" in template files, but these are actually placeholder examples in `.env.example` and template files.

**Action Required**:
- ✅ Verify all template files contain only placeholders (e.g., `sk-...`, `your-api-key-here`)
- ✅ Ensure no actual API keys are committed
- ✅ Add pre-commit hooks to prevent real secrets

**Files to Review**:
```bash
# These files are SAFE (contain only placeholders):
- config/.env.example
- RAILWAY_ENV_TEMPLATE.txt
- consultant-site/.env.example
- deployment/config/.env.template
- packages/api/.env.example
- packages/webapp/.env.example
```

**Verification Command**:
```bash
# Check for actual API keys (should return nothing)
git grep -E "sk_live_[a-zA-Z0-9]{48}|pk_live_[a-zA-Z0-9]{48}" -- "*.example" "*.template" "*TEMPLATE*"
```

### 2. Hardcoded Credentials

**Status**: ✅ FALSE POSITIVE

**Finding**: Line 226 in `./automation/insurance_lead_import.py` was flagged.

**Analysis**: This is correctly using `os.getenv('AGED_LEADS_API_KEY')` - NOT hardcoded.

```python
# Line 226 - CORRECT USAGE
api_key = os.getenv('AGED_LEADS_API_KEY')
```

**No action required** - this is proper environment variable usage.

---

## High Priority Issues

### 1. Path Traversal Vulnerabilities

**Status**: ⚠️ NEEDS REVIEW

**Risk**: Attackers could potentially access files outside intended directories.

**Affected Files** (20 instances):
- `./automation/ai_email_generator.js` (lines 335, 342, 375)
- `./automation/vpat_generator.js` (line 52)
- `./backend/src/services/replayEngine.js` (lines 277, 370, 371, 396, 425, 439)
- `./backend/src/services/workerIdentity.js` (lines 290, 316)
- `./packages/webapp/server.js` (lines 8, 12)
- Various script files

**Solution**: Use the new `sanitizeFilePath()` utility function.

#### Example Fix:

**Before** (Vulnerable):
```javascript
const filepath = path.join(this.outputDir, filename);
```

**After** (Secure):
```javascript
import { sanitizeFilePath, sanitizeFilename } from '../utils/security';

const safeFilename = sanitizeFilename(filename);
const filepath = sanitizeFilePath(this.outputDir, safeFilename);
```

#### Implementation Steps:

1. **Install the security utility**:
   - Already created at `packages/api/src/utils/security.ts`

2. **Update each affected file**:
   ```bash
   # For JavaScript files
   # Add import at top:
   const { sanitizeFilePath, sanitizeFilename } = require('./utils/security');
   
   # For TypeScript files
   import { sanitizeFilePath, sanitizeFilename } from '../utils/security';
   ```

3. **Replace unsafe path operations**:
   ```javascript
   // Pattern to find:
   path.join(baseDir, userInput)
   
   // Replace with:
   sanitizeFilePath(baseDir, sanitizeFilename(userInput))
   ```

### 2. Async Loop Performance Issues

**Status**: ⚠️ NEEDS REFACTORING

**Risk**: Performance degradation, potential timeouts, poor scalability.

**Finding**: 44 instances of `await` inside loops detected.

**Critical Files**:
- `./automation/ai_email_generator.js` (lines 359, 363)
- `./packages/api/src/services/AIService.ts` (line 292)
- `./packages/api/src/services/BatchAuditService.ts` (line 96)
- `./packages/api/src/services/CompanyDiscoveryService.ts` (lines 368, 374, 409)
- `./packages/api/src/services/ProspectDiscoveryService.ts` (lines 49, 58, 200)
- `./packages/api/src/services/SiteTransformationService.ts` (line 243)

**Solution**: Use the new async helpers module.

#### Example Fix:

**Before** (Slow):
```javascript
for (const prospect of prospects) {
  const email = await generateEmail(prospect);
  await saveEmail(email);
}
```

**After** (Fast):
```javascript
import { batchProcess } from '../utils/async-helpers';

await batchProcess(
  prospects,
  async (prospect) => {
    const email = await generateEmail(prospect);
    await saveEmail(email);
    return email;
  },
  10 // Process 10 at a time
);
```

#### Priority Files to Fix:

1. **High Impact** (User-facing):
   - `packages/api/src/services/BatchAuditService.ts`
   - `packages/api/src/services/CompanyDiscoveryService.ts`
   - `packages/api/src/services/ProspectDiscoveryService.ts`

2. **Medium Impact** (Background jobs):
   - `automation/ai_email_generator.js`
   - `packages/api/src/services/SiteTransformationService.ts`

3. **Low Impact** (Tests/Seeds):
   - `packages/api/prisma/seed.ts`
   - Test files in `__tests__` directories

---

## Medium Priority Issues

### 1. ReDoS (Regular Expression Denial of Service)

**Status**: ⚠️ NEEDS REVIEW

**Risk**: Malicious input could cause regex to hang, leading to DoS.

**Affected Files**:
- `./automation/ai_email_generator.js:267`
- `./packages/api/src/services/keywordExtractor.ts:272`
- `./packages/api/src/services/orchestration/DeadLetterQueue.ts:208`

**Solution**: Use safe regex utilities.

#### Example Fix:

**Before** (Vulnerable):
```javascript
prompt = prompt.replace(new RegExp(key, 'g'), value);
```

**After** (Safe):
```javascript
import { createSafeRegex, safeRegexExec } from '../utils/security';

// Option 1: Use hardcoded regex (preferred)
const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
prompt = prompt.replace(new RegExp(escapedKey, 'g'), value);

// Option 2: Use safe regex helper
const regex = createSafeRegex(key, 'g');
if (regex) {
  prompt = prompt.replace(regex, value);
}
```

### 2. Missing SRI Integrity Attributes

**Status**: ⚠️ NEEDS IMPLEMENTATION

**Risk**: CDN compromise could inject malicious code.

**Affected Files**:
- `./deployment/dashboard/index.html`
- `./docs/adhd-ui-demo.html`

**Solution**: Add SRI hashes to all external resources.

#### Example Fix:

**Before**:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
```

**After**:
```html
<script 
  src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

#### Generate SRI Hashes:

```bash
# Using openssl
curl -s https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js | \
  openssl dgst -sha384 -binary | \
  openssl base64 -A

# Or use online tool: https://www.srihash.org/
```

### 3. XSS Vulnerability Review

**Status**: ⚠️ NEEDS REVIEW

**Risk**: Potential cross-site scripting if innerHTML is used with user input.

**Affected File**:
- `./packages/api/src/services/reports/CDNReportService.ts:710`

**Solution**: Review and sanitize HTML content.

#### Example Fix:

**Before** (Potentially Vulnerable):
```typescript
const div = { innerHTML: userContent };
```

**After** (Safe):
```typescript
import { sanitizeHtml } from '../utils/security';

const div = { innerHTML: sanitizeHtml(userContent) };

// Or better: Use textContent for plain text
const div = { textContent: userContent };
```

---

## Implementation Steps

### Phase 1: Immediate Actions (Day 1)

1. **Install Security Utilities**:
   ```bash
   # Already created:
   # - packages/api/src/utils/security.ts
   # - packages/api/src/utils/async-helpers.ts
   ```

2. **Fix Critical Path Traversal Issues**:
   ```bash
   # Priority files (user-facing):
   - packages/webapp/server.js
   - backend/src/services/replayEngine.js
   - backend/src/services/workerIdentity.js
   ```

3. **Add Pre-commit Hooks**:
   ```bash
   npm install --save-dev husky lint-staged
   npx husky install
   npx husky add .husky/pre-commit "npm run lint-staged"
   ```

### Phase 2: High Priority Fixes (Week 1)

1. **Refactor Async Loops**:
   - Start with user-facing services
   - Use `batchProcess()` for parallel operations
   - Add performance monitoring

2. **Fix ReDoS Vulnerabilities**:
   - Review all dynamic RegExp usage
   - Replace with safe alternatives
   - Add input validation

3. **Add SRI Attributes**:
   - Generate hashes for all CDN resources
   - Update HTML files
   - Add to build process

### Phase 3: Security Infrastructure (Week 2)

1. **Set Up Continuous Monitoring**:
   ```yaml
   # .github/workflows/security.yml
   name: Security Scan
   on: [push, pull_request]
   jobs:
     security:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Run security audit
           run: ./security-audit.sh
   ```

2. **Implement Rate Limiting**:
   ```typescript
   import { RateLimiter } from './utils/security';
   
   const limiter = new RateLimiter(100, 60000); // 100 req/min
   
   app.use((req, res, next) => {
     if (!limiter.isAllowed(req.ip)) {
       return res.status(429).json({ error: 'Too many requests' });
     }
     next();
   });
   ```

3. **Add Security Headers**:
   ```typescript
   import helmet from 'helmet';
   
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'", "'unsafe-inline'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
       },
     },
   }));
   ```

---

## Testing & Verification

### Automated Testing

```bash
# Run security audit
./security-audit.sh

# Run npm audit
npm audit --audit-level=moderate

# Run tests
npm test

# Check for secrets
git secrets --scan
```

### Manual Testing

1. **Path Traversal**:
   ```bash
   # Test with malicious input
   curl -X POST http://localhost:3000/api/file \
     -d '{"filename":"../../../etc/passwd"}'
   
   # Should return error, not file contents
   ```

2. **ReDoS**:
   ```bash
   # Test with complex input
   curl -X POST http://localhost:3000/api/search \
     -d '{"pattern":"(a+)+b", "text":"aaaaaaaaaaaaaaaaaaaaaaaaa"}'
   
   # Should timeout or reject, not hang
   ```

3. **Rate Limiting**:
   ```bash
   # Send 101 requests rapidly
   for i in {1..101}; do
     curl http://localhost:3000/api/endpoint
   done
   
   # Last request should return 429
   ```

---

## Continuous Security

### Daily Automated Scans

```yaml
# .github/workflows/daily-security.yml
name: Daily Security Scan
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run security audit
        run: ./security-audit.sh
      - name: Run npm audit
        run: npm audit
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Security Scan Failed',
              body: 'Daily security scan detected issues. Please review.',
              labels: ['security', 'urgent']
            })
```

### Dependency Updates

```bash
# Install Dependabot or Renovate
# Add to .github/dependabot.yml:
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Security Training

1. **Developer Guidelines**:
   - Review SECURITY.md before contributing
   - Use security utilities for all user input
   - Never commit secrets
   - Run security audit before PR

2. **Code Review Checklist**:
   - [ ] No hardcoded secrets
   - [ ] Input validation on all endpoints
   - [ ] Path operations use sanitization
   - [ ] Async operations use batch processing
   - [ ] No dynamic RegExp with user input
   - [ ] External resources have SRI

---

## Summary

### Current Status

| Category | Count | Status |
|----------|-------|--------|
| Critical Issues | 2 | ✅ False Positives |
| High Priority | 2 | ⚠️ Needs Action |
| Medium Priority | 3 | ⚠️ Needs Review |
| **Total** | **7** | **In Progress** |

### Next Steps

1. ✅ Security utilities created
2. ⏳ Fix path traversal issues (20 files)
3. ⏳ Refactor async loops (44 instances)
4. ⏳ Review ReDoS patterns (3 files)
5. ⏳ Add SRI attributes (2 files)
6. ⏳ Review XSS vulnerability (1 file)
7. ⏳ Set up continuous monitoring

### Timeline

- **Week 1**: Fix all high priority issues
- **Week 2**: Implement security infrastructure
- **Week 3**: Complete medium priority fixes
- **Week 4**: Full security audit and sign-off

---

## Resources

- [Security Utilities Module](./packages/api/src/utils/security.ts)
- [Async Helpers Module](./packages/api/src/utils/async-helpers.ts)
- [Security Audit Script](./security-audit.sh)
- [Todo List](./todo.md)

---

**Last Updated**: November 18, 2025  
**Next Review**: November 25, 2025