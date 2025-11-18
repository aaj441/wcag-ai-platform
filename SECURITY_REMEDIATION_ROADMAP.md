# Security Audit Remediation Roadmap
**WCAG AI Platform - November 18, 2025**

## Executive Summary

This document outlines the remaining security remediation tasks from the CodeAnt AI security audit. **3 CRITICAL and HIGH issues have been resolved**. This roadmap covers 7 additional medium and infrastructure items.

---

## Completed Items ✅

### 1. CRITICAL: Secrets in Template Files
- **Status**: COMPLETED
- **Changes**:
  - Reviewed all .env.example files - verified no actual secrets present
  - Confirmed proper use of placeholders (e.g., `sk-...`, `AKIA...`)
  - All credentials use environment variables properly

### 2. CRITICAL: Hardcoded Credentials Detection
- **Status**: COMPLETED (FALSE POSITIVE)
- **Analysis**: `automation/insurance_lead_import.py:226` correctly uses `os.getenv()`
- **No action required**: Code already secure

### 3. HIGH: Path Traversal Vulnerabilities
- **Status**: COMPLETED
- **Files Fixed**:
  1. `automation/ai_email_generator.js` (lines 335, 342, 375)
  2. `automation/vpat_generator.js` (line 52)
  3. `backend/src/services/replayEngine.js` (lines 370, 371, 396, 425, 439)
  4. `backend/src/services/workerIdentity.js` (lines 290, 316)
- **Implementation**:
  - Created `/backend/src/utils/securityUtils.js` with sanitization functions
  - Applied `sanitizeIdentifier()` and `safePathJoin()` throughout
  - Added error handling for path validation failures

---

## Remaining Items to Address 📋

### HIGH: Async Loop Performance Issues (23 instances)

**Priority**: HIGH - Performance & Scalability
**Effort**: Medium (2-3 hours)
**Impact**: Improved performance, better user experience

#### Issues Identified
- Await in loops block sequential processing when parallel is possible
- Examples: file processing, batch operations, API calls
- Affects: Multiple service files, automation scripts

#### Remediation Steps

1. **Search for patterns**:
   ```bash
   grep -r "for.*of\|for.*in" --include="*.js" --include="*.ts" | grep -v "node_modules"
   ```

2. **For each loop with await**:
   ```javascript
   // BEFORE (slow - sequential)
   for (const item of items) {
     const result = await processItem(item);
     results.push(result);
   }

   // AFTER (fast - parallel)
   const results = await Promise.all(
     items.map(item => processItem(item))
   );
   ```

3. **Files to Review** (estimated locations):
   - `packages/api/src/services/*.ts` - Batch operations
   - `automation/*.js` - Email/report generation
   - `backend/src/services/*.js` - Replay engine, workers
   - `scripts/*.js` - Accessibility scanning

4. **Testing**:
   - Add performance benchmarks
   - Verify results are identical
   - Monitor for memory usage spikes

5. **Commit Message**:
   ```
   🚀 Perf: Optimize async operations with Promise.all()

   Refactor 23 await-in-loop patterns to use Promise.all() for parallel execution.
   Improves performance and reduces execution time significantly.
   ```

---

### MEDIUM: ReDoS (Regular Expression Denial of Service)

**Priority**: MEDIUM - Security
**Effort**: Small (1-2 hours)
**Impact**: Prevents algorithmic complexity attacks

#### Issues Identified
- Dynamic RegExp creation from user input (3 instances)
- Vulnerable patterns in:
  - `automation/ai_email_generator.js:267`
  - `packages/api/src/services/keywordExtractor.ts:272`
  - `packages/api/src/services/orchestration/DeadLetterQueue.ts:208`

#### Remediation Steps

1. **Identify dynamic RegExp**:
   ```bash
   grep -r "new RegExp\|RegExp(" --include="*.js" --include="*.ts" | grep -v "node_modules"
   ```

2. **For each dynamic RegExp**:
   - **Option A** (Recommended): Use hardcoded patterns
     ```typescript
     // BEFORE (vulnerable)
     const pattern = new RegExp(userInput, 'g');

     // AFTER (safe)
     const pattern = /^[a-zA-Z0-9\-_]+$/; // hardcoded
     if (!pattern.test(userInput)) throw new Error('Invalid input');
     ```

   - **Option B**: Escape special characters
     ```typescript
     const escaped = escapeRegExp(userInput); // from securityUtils.js
     const pattern = new RegExp(escaped, 'g');
     ```

   - **Option C**: Use string methods
     ```typescript
     // BEFORE (vulnerable)
     if (userInput.match(new RegExp(pattern, 'g'))) { ... }

     // AFTER (safe)
     if (userInput.includes(safeString)) { ... }
     ```

3. **Add timeout protection**:
   ```typescript
   const executeRegExp = (pattern: RegExp, input: string, timeout = 1000) => {
     return new Promise((resolve, reject) => {
       const timer = setTimeout(() => reject(new Error('RegExp timeout')), timeout);
       try {
         const result = pattern.test(input);
         clearTimeout(timer);
         resolve(result);
       } catch (error) {
         clearTimeout(timer);
         reject(error);
       }
     });
   };
   ```

4. **Testing**:
   - Test with benign inputs
   - Test with malicious patterns (evil regex)
   - Measure execution time

5. **Commit Message**:
   ```
   🔒 Security: Fix ReDoS vulnerabilities in RegExp patterns

   - Replace 3 dynamic RegExp patterns with safe alternatives
   - Add input validation for keyword extraction
   - Implement regex timeout protection
   - Prevents algorithmic complexity attacks
   ```

---

### MEDIUM: SRI Integrity Attributes

**Priority**: MEDIUM - Security
**Effort**: Small (30-45 minutes)
**Impact**: Detects tampering with external resources

#### Issues Identified
- Missing SRI hashes in 2 HTML files:
  - `deployment/dashboard/index.html`
  - `docs/adhd-ui-demo.html`

#### Remediation Steps

1. **Generate SRI hashes**:
   ```bash
   # For each external resource, generate SRI
   npm install -g sri-hash
   sri-hash https://cdn.example.com/library.js
   ```

2. **Update HTML files**:
   ```html
   <!-- BEFORE -->
   <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>

   <!-- AFTER -->
   <script
     src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"
     integrity="sha384-..."
     crossorigin="anonymous">
   </script>
   ```

3. **Resources to update**:
   - Check `deployment/dashboard/index.html` for all `<script src=...>` tags
   - Check `docs/adhd-ui-demo.html` for all external resources
   - Include CSS files, fonts, images

4. **Add build automation**:
   ```javascript
   // scripts/generate-sri.js
   const generateSRI = async (url) => {
     // Use package like 'sri-hash' or 'ssri'
     // Generate hashes for all external resources
   };
   ```

5. **Commit Message**:
   ```
   🔒 Security: Add SRI integrity attributes to external resources

   - Generate and add integrity hashes for CDN resources
   - Prevent MITM attacks on external dependencies
   - Updated: deployment/dashboard/index.html
   - Updated: docs/adhd-ui-demo.html
   ```

---

### MEDIUM: XSS Vulnerability in CDNReportService

**Priority**: MEDIUM - Security
**Effort**: Small (1 hour)
**Impact**: Prevents stored XSS attacks

#### Issues Identified
- innerHTML usage without sanitization (1 instance)
- Location: `packages/api/src/services/reports/CDNReportService.ts:710`

#### Remediation Steps

1. **Install DOMPurify**:
   ```bash
   npm install dompurify
   npm install --save-dev @types/dompurify
   ```

2. **Create sanitization utility**:
   ```typescript
   // backend/src/utils/htmlSanitizer.ts
   import DOMPurify from 'dompurify';
   import { JSDOM } from 'jsdom';

   export const sanitizeHTML = (dirty: string): string => {
     const window = new JSDOM('').window;
     const purify = DOMPurify(window);

     return purify.sanitize(dirty, {
       ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'li'],
       ALLOWED_ATTR: ['href'],
     });
   };
   ```

3. **Fix CDNReportService**:
   ```typescript
   // BEFORE (vulnerable)
   reportElement.innerHTML = userContent;

   // AFTER (safe)
   const sanitized = sanitizeHTML(userContent);
   reportElement.innerHTML = sanitized;
   // OR better:
   reportElement.textContent = userContent; // if no HTML needed
   ```

4. **Add CSP Headers**:
   ```typescript
   // middleware/securityHeaders.ts
   app.use((req, res, next) => {
     res.setHeader('Content-Security-Policy',
       "default-src 'self'; " +
       "script-src 'self' 'unsafe-inline'; " +
       "style-src 'self' 'unsafe-inline'; " +
       "img-src 'self' data: https:; " +
       "font-src 'self' data:;"
     );
     next();
   });
   ```

5. **Testing**:
   - Test with XSS payloads: `<script>alert('xss')</script>`
   - Verify sanitized output
   - Test legitimate content isn't broken

6. **Commit Message**:
   ```
   🔒 Security: Add XSS protection to CDNReportService

   - Install and integrate DOMPurify for HTML sanitization
   - Replace innerHTML with safe content injection
   - Add Content-Security-Policy headers
   - Create HTML sanitization utility module
   - Prevents stored XSS attacks in reports
   ```

---

## Infrastructure Security 🛠️

### NPM Audit & Dependency Management

**Priority**: HIGH - Dependency Security
**Effort**: Medium (2-4 hours)
**Impact**: Reduces attack surface from vulnerable dependencies

#### Steps

1. **Run audit in each workspace**:
   ```bash
   # Root
   npm audit

   # Packages
   cd packages/api && npm audit
   cd ../webapp && npm audit
   ```

2. **Review findings**:
   - Document critical issues
   - Check for false positives
   - Verify fixes exist

3. **Apply fixes**:
   ```bash
   npm audit fix
   npm audit fix --force  # Use cautiously
   ```

4. **Update outdated packages**:
   ```bash
   npm outdated
   npm update
   ```

5. **Add automated checks**:
   - Enable Dependabot on GitHub
   - Configure automatic PR creation
   - Add branch protection rules

---

### Pre-Commit Hooks

**Priority**: HIGH - Prevention
**Effort**: Small (30 minutes)
**Impact**: Prevents secrets and low-quality code from being committed

#### Implementation

1. **Install husky**:
   ```bash
   npm install husky --save-dev
   npx husky install
   ```

2. **Create hook scripts**:
   ```bash
   # .husky/pre-commit
   #!/bin/sh
   . "$(dirname "$0")/_/husky.sh"

   # Check for secrets
   git-secrets --pre_commit_hook

   # Run linter
   npx eslint --fix
   npx prettier --write .

   # Run tests
   npm test
   ```

3. **Install git-secrets**:
   ```bash
   brew install git-secrets
   git secrets --install
   git secrets --register-aws
   ```

4. **Configure patterns**:
   ```bash
   git config --add secrets.patterns 'sk_[a-z]{20}'  # Stripe
   git config --add secrets.patterns 'AKIA[0-9A-Z]{16}'  # AWS
   ```

---

### GitHub Actions Security Workflow

**Priority**: HIGH - Automation
**Effort**: Medium (1-2 hours)
**Impact**: Continuous security scanning and enforcement

#### Create `.github/workflows/security.yml`

```yaml
name: Security Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  codeql:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: github/codeql-action/init@v2
        with:
          languages: 'javascript'
      - uses: github/codeql-action/autobuild@v2
      - uses: github/codeql-action/analyze@v2

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: gitleaks/gitleaks-action@v2

  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm audit --audit-level=moderate

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: dependency-check/Dependency-Check_Action@main
        with:
          path: '.'
          format: 'JSON'
```

---

## Priority Timeline

### Week 1 (Immediate)
- ✅ Path Traversal Fixes - **COMPLETED**
- 🔄 Async Loop Optimization
- 🔄 ReDoS Vulnerability Fixes
- 🔄 SRI Integrity Attributes

### Week 2
- 🔄 XSS Vulnerability Fix
- 🔄 NPM Audit & Dependency Updates
- 🔄 Pre-Commit Hooks Setup
- 🔄 GitHub Actions Workflow

### Week 3-4
- Documentation updates
- Security team training
- Final testing and validation
- Public disclosure (if applicable)

---

## Success Criteria

All items must meet these criteria before closing:

- [ ] Code changes implemented
- [ ] All tests passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] No new vulnerabilities introduced
- [ ] Changes committed with descriptive messages
- [ ] PR created with full context
- [ ] Team trained on changes

---

## References

- **OWASP Top 10**: https://owasp.org/Top10/
- **CWE/SANS Top 25**: https://cwe.mitre.org/top25/
- **NIST Secure Software Development**: https://csrc.nist.gov/publications/detail/sp/800-218/final
- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/

---

## Questions?

For questions about this roadmap:
- **Security Team**: security@wcagaiplatform.com
- **GitHub Issues**: Use label `security:remediation`
- **Slack**: #security-team (internal)

---

**Document Version**: 1.0
**Last Updated**: November 18, 2025
**Status**: ACTIVE - In Progress
