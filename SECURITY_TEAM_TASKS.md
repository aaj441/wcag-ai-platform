# Security Remediation - Team Task Breakdown

**Project**: WCAG AI Platform Security Audit Remediation
**Status**: Phase 1 Complete - Phase 2 Ready to Start
**Overall Completion**: 43% (3 of 7 issues)

---

## 📋 Task Assignments

### **TASK 1: Async/Await Loop Optimization**
- **Assigned to**: Developer 1
- **Priority**: HIGH 🔴
- **Deadline**: November 22, 2025
- **Effort**: 2-3 hours
- **Status**: 🔄 NOT STARTED

#### Description
Refactor 23+ instances of await-in-loop patterns to use Promise.all() for parallel execution. This improves performance and reduces execution time significantly.

#### What to Do
1. **Search for patterns**:
   ```bash
   grep -r "for.*of\|for.*in" --include="*.js" --include="*.ts" packages/ | grep -v node_modules
   ```

2. **Identify locations** (See SECURITY_REMEDIATION_ROADMAP.md, Section "HIGH: Async Loop Performance Issues")

3. **For each loop with await**:
   ```javascript
   // BEFORE (sequential - slow)
   for (const item of items) {
     const result = await processItem(item);
     results.push(result);
   }

   // AFTER (parallel - fast)
   const results = await Promise.all(
     items.map(item => processItem(item))
   );
   ```

4. **Files to modify** (estimated):
   - `packages/api/src/services/*.ts` - Batch operations
   - `automation/*.js` - Email/report generation
   - `backend/src/services/*.js` - Replay engine

5. **Testing**:
   - Verify results are identical
   - Run performance benchmarks
   - Check for memory usage

#### Deliverables
- [ ] All 23+ instances refactored
- [ ] Tests passing
- [ ] Performance improvement verified
- [ ] PR created with description
- [ ] Code review approved

#### Resources
- `SECURITY_REMEDIATION_ROADMAP.md` - Section 2
- `packages/api/src/services/` - Example services

---

### **TASK 2: ReDoS Vulnerability Fixes**
- **Assigned to**: Developer 2
- **Priority**: HIGH 🔴
- **Deadline**: November 22, 2025
- **Effort**: 1-2 hours
- **Status**: 🔄 NOT STARTED

#### Description
Fix 3 instances of Regular Expression Denial of Service (ReDoS) vulnerabilities by replacing dynamic RegExp patterns with safe alternatives.

#### Vulnerable Files
1. `automation/ai_email_generator.js:267`
   - Issue: Dynamic RegExp from user input
   - Fix: Use hardcoded patterns with input validation

2. `packages/api/src/services/keywordExtractor.ts:272`
   - Issue: RegExp from user-provided keywords
   - Fix: Escape special characters or use string methods

3. `packages/api/src/services/orchestration/DeadLetterQueue.ts:208`
   - Issue: Pattern matching with dynamic input
   - Fix: Add regex timeout protection

#### Solutions

**Option A (Recommended): Use hardcoded patterns**
```typescript
// BEFORE (vulnerable)
const pattern = new RegExp(userInput, 'g');
if (pattern.test(userInput)) { ... }

// AFTER (safe)
const safePattern = /^[a-zA-Z0-9\-_]+$/;
if (safePattern.test(userInput)) { ... }
```

**Option B: Escape special characters**
```typescript
import { escapeRegExp } from 'backend/src/utils/securityUtils';

const escaped = escapeRegExp(userInput);
const pattern = new RegExp(escaped, 'g');
```

**Option C: Use string methods**
```typescript
// BEFORE (vulnerable)
if (userInput.match(new RegExp(pattern, 'g'))) { ... }

// AFTER (safe)
if (userInput.includes(safeString)) { ... }
```

#### Deliverables
- [ ] All 3 ReDoS vulnerabilities fixed
- [ ] Input validation implemented
- [ ] Tests passing with malicious payloads
- [ ] PR created with explanation
- [ ] Security review approved

#### Resources
- `SECURITY_REMEDIATION_ROADMAP.md` - Section 3
- `backend/src/utils/securityUtils.js` - escapeRegExp()

---

### **TASK 3: SRI Integrity Attributes**
- **Assigned to**: Developer 3
- **Priority**: HIGH 🔴
- **Deadline**: November 20, 2025 (Quick win!)
- **Effort**: 30-45 minutes
- **Status**: 🔄 NOT STARTED

#### Description
Add SubResource Integrity (SRI) hashes to external resources in 2 HTML files. This prevents MITM attacks on CDN resources.

#### Files to Update
1. `deployment/dashboard/index.html`
   - Search for all `<script src=...>` and `<link href=...>` tags
   - Generate integrity hashes for each

2. `docs/adhd-ui-demo.html`
   - Same as above

#### Steps

1. **Install tool**:
   ```bash
   npm install -g sri-hash
   ```

2. **Generate hash for each resource**:
   ```bash
   sri-hash https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js
   # Output: sha384-...
   ```

3. **Update HTML**:
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

4. **Test**:
   - Open HTML in browser
   - Verify console shows no integrity errors
   - Test with invalid hash (should fail)

#### Deliverables
- [ ] SRI hashes added to all external scripts/styles
- [ ] `crossorigin="anonymous"` present on all external resources
- [ ] HTML validates in W3C validator
- [ ] Browser console has no integrity warnings
- [ ] PR created and reviewed

#### Resources
- `sri-hash` npm package
- `https://www.srihash.org/` - Online SRI hash generator

---

### **TASK 4: XSS Vulnerability Fix**
- **Assigned to**: Developer 2
- **Priority**: MEDIUM 🟡
- **Deadline**: November 24, 2025
- **Effort**: 1 hour
- **Status**: 🔄 NOT STARTED

#### Description
Fix XSS vulnerability in CDNReportService by implementing HTML sanitization and adding CSP headers.

#### File
- `packages/api/src/services/reports/CDNReportService.ts:710`
- Issue: Unsafe innerHTML usage

#### Steps

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
   ```

4. **Add CSP Headers** (backend/src/middleware/securityHeaders.ts):
   ```typescript
   app.use((req, res, next) => {
     res.setHeader('Content-Security-Policy',
       "default-src 'self'; " +
       "script-src 'self'; " +
       "style-src 'self' 'unsafe-inline'; " +
       "img-src 'self' data: https:;"
     );
     next();
   });
   ```

5. **Testing**:
   - Test with XSS payload: `<script>alert('xss')</script>`
   - Verify it's sanitized
   - Test legitimate HTML content
   - Check CSP headers in browser DevTools

#### Deliverables
- [ ] DOMPurify installed and integrated
- [ ] HTML sanitization utility created
- [ ] innerHTML replaced with safe method
- [ ] CSP headers implemented
- [ ] Tests with XSS payloads passing
- [ ] Browser DevTools shows security headers
- [ ] PR created and reviewed

#### Resources
- `SECURITY_REMEDIATION_ROADMAP.md` - Section 5
- DOMPurify docs: https://github.com/cure53/DOMPurify

---

### **TASK 5: NPM Audit & Dependency Updates**
- **Assigned to**: DevOps Engineer
- **Priority**: MEDIUM 🟡
- **Deadline**: November 24, 2025
- **Effort**: 2-4 hours
- **Status**: 🔄 NOT STARTED

#### Description
Run npm audit across the monorepo and fix all high/critical vulnerabilities. Update outdated packages.

#### Steps

1. **Root audit**:
   ```bash
   npm audit
   npm audit --json > audit-root.json
   ```

2. **Packages audit**:
   ```bash
   cd packages/api && npm audit
   cd ../webapp && npm audit
   ```

3. **Review findings**:
   - Document critical issues
   - Check for false positives
   - Verify fixes exist

4. **Apply fixes**:
   ```bash
   npm audit fix
   # For major updates:
   npm update
   ```

5. **Check outdated**:
   ```bash
   npm outdated
   ```

6. **Update security-critical**:
   - axios
   - express
   - prisma
   - puppeteer

7. **Testing**:
   - Run full test suite
   - Verify no breaking changes
   - Test critical paths

#### Deliverables
- [ ] npm audit clean (no high/critical)
- [ ] All tests passing
- [ ] No breaking changes
- [ ] Changelog updated
- [ ] Dependencies.json reviewed
- [ ] PR created with audit report

#### Resources
- `npm audit` documentation
- `SECURITY_REMEDIATION_ROADMAP.md` - Section "NPM Audit"

---

### **TASK 6: Pre-Commit Hooks Setup**
- **Assigned to**: DevOps Engineer
- **Priority**: INFRASTRUCTURE 🔧
- **Deadline**: November 27, 2025
- **Effort**: 30 minutes
- **Status**: ✅ PARTIALLY DONE (`.husky/pre-commit` created)

#### Description
Install and configure Husky + git-secrets for automatic secret detection and code quality checks on every commit.

#### Steps

1. **Install Husky**:
   ```bash
   npm install husky --save-dev
   npx husky install
   ```

2. **Install git-secrets**:
   ```bash
   # macOS
   brew install git-secrets

   # Linux
   git clone https://github.com/awslabs/git-secrets.git
   cd git-secrets
   make install
   ```

3. **Configure patterns**:
   ```bash
   git secrets --install
   git secrets --register-aws

   # Add custom patterns
   git config --global secrets.patterns 'sk_[a-z]{20}'  # Stripe
   git config --global secrets.patterns 'AKIA[0-9A-Z]{16}'  # AWS
   git config --global secrets.patterns 'ghp_[A-Za-z0-9_]{36}'  # GitHub
   ```

4. **Setup hook** (already created in `.husky/pre-commit`):
   - Checks for secrets
   - Runs ESLint
   - Runs Prettier
   - Auto-fixes where possible

5. **Testing**:
   ```bash
   # Try to commit with fake secret (should fail)
   echo "AKIA1234567890ABCDEF" >> test.txt
   git add test.txt
   git commit -m "test"  # Should fail
   rm test.txt
   ```

#### Deliverables
- [ ] Husky installed
- [ ] git-secrets installed
- [ ] Pre-commit hook configured
- [ ] Team documentation updated
- [ ] PR created with setup instructions
- [ ] All team members have hooks installed

#### Resources
- `.husky/pre-commit` - Already created
- git-secrets: https://github.com/awslabs/git-secrets
- Husky: https://husky.js.org/

---

### **TASK 7: GitHub Actions Security Workflow**
- **Assigned to**: DevOps Engineer
- **Priority**: INFRASTRUCTURE 🔧
- **Deadline**: November 29, 2025
- **Effort**: 1-2 hours
- **Status**: ✅ DONE (`.github/workflows/security.yml` created)

#### Description
Set up automated security scanning in GitHub Actions for CodeQL, secrets, and dependency checks.

#### Components (Already created in `.github/workflows/security.yml`)
1. **CodeQL Analysis**
   - Automatic on push/PR
   - JavaScript/TypeScript

2. **Secret Detection**
   - Using Gitleaks
   - Prevents secret commits

3. **Dependency Audit**
   - npm audit in root and workspaces
   - Detects known vulnerabilities

4. **ESLint Security**
   - Runs security rules
   - Auto-fixes issues

5. **Snyk Integration** (optional, requires token)
   - Advanced dependency analysis
   - Vulnerability prioritization

#### Steps to Enable

1. **Verify workflow file**:
   ```bash
   cat .github/workflows/security.yml
   ```

2. **Configure secrets** (in GitHub Settings):
   - `SNYK_TOKEN` (optional, for Snyk integration)
   - `SONAR_TOKEN` (optional, for SonarQube)

3. **Test workflow**:
   - Create test PR
   - Verify all checks pass
   - Review action logs

4. **Update branch protection** (GitHub Settings):
   - Require security workflow to pass
   - Require pull request reviews
   - Require up-to-date branches

#### Deliverables
- [ ] Workflow file in place
- [ ] All jobs configured
- [ ] Secrets configured (if applicable)
- [ ] Branch protection updated
- [ ] Team notified of new checks
- [ ] Documentation updated

#### Resources
- `.github/workflows/security.yml` - Already created
- GitHub Actions: https://docs.github.com/en/actions

---

## 📊 Task Status Board

| Task | Assignee | Priority | Deadline | Status |
|------|----------|----------|----------|--------|
| Async/Await Loops | Dev 1 | HIGH | Nov 22 | 🔄 NOT STARTED |
| ReDoS Fixes | Dev 2 | HIGH | Nov 22 | 🔄 NOT STARTED |
| SRI Integrity | Dev 3 | HIGH | Nov 20 | 🔄 NOT STARTED |
| XSS Prevention | Dev 2 | MEDIUM | Nov 24 | 🔄 NOT STARTED |
| NPM Audit | DevOps | MEDIUM | Nov 24 | 🔄 NOT STARTED |
| Pre-Commit Hooks | DevOps | INFRA | Nov 27 | ⏳ IN PROGRESS |
| GitHub Actions | DevOps | INFRA | Nov 29 | ✅ COMPLETE |

---

## 🚀 Getting Started Checklist

### For All Team Members
- [ ] Read `SECURITY_REMEDIATION_ROADMAP.md`
- [ ] Review assigned task above
- [ ] Understand security concepts involved
- [ ] Ask questions in #security-team Slack

### For Developers
- [ ] Set up local development environment
- [ ] Install Husky pre-commit hooks
  ```bash
  npx husky install
  ```
- [ ] Run existing tests
  ```bash
  npm test
  ```
- [ ] Create feature branch from assigned task

### For DevOps
- [ ] Review `.github/workflows/security.yml`
- [ ] Review `.husky/pre-commit` script
- [ ] Install git-secrets locally
- [ ] Test secret detection

---

## 📞 Support & Questions

| Question | Where to Ask |
|----------|--------------|
| Task questions | #security-team Slack |
| Technical help | GitHub Issues (security label) |
| Blockers | Post in #security-team immediately |
| Code review | Tag @security-team |

---

## 🎯 Success Criteria

Each task must meet these before marking complete:

- ✅ Code changes implemented
- ✅ All tests passing (npm test, npm run build)
- ✅ No new vulnerabilities introduced
- ✅ Security review approved
- ✅ Documentation updated
- ✅ PR merged to main
- ✅ Changes deployed (if applicable)

---

## 📈 Progress Tracking

**Week of Nov 18**: ✅ Phase 1 Complete (Path Traversal Fixes)
**Week of Nov 25**: 🔄 Phase 2 In Progress (High Priority Items)
**Week of Dec 2**: 🔄 Phase 2 Continued (Medium Priority Items)
**Week of Dec 9**: ✅ Phase 2 Complete + Infrastructure Setup

---

**Document Version**: 1.0
**Last Updated**: November 18, 2025
**Maintained By**: Security Team
