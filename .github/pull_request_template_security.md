## Security Remediation PR Template

**Use this template for all security-related pull requests**

---

## 🔒 Security Issue Being Fixed

**Issue Type**: [ ] Path Traversal [ ] XSS [ ] ReDoS [ ] Async Loop [ ] Dependency [ ] Other

**Reference**: [Link to issue or audit item]

**Severity**: [ ] CRITICAL [ ] HIGH [ ] MEDIUM [ ] LOW

---

## 📝 Changes Made

Describe the security fix in detail:

### Problem
- What was the vulnerability?
- Where was it located?
- What was the impact?

### Solution
- How was it fixed?
- Why is this approach secure?
- Were there alternative approaches considered?

### Files Modified
- [ ] List all files changed
- [ ] Explain the purpose of each change

---

## 🧪 Testing

### Security Testing
- [ ] Tested with known attack payloads
- [ ] Verified vulnerability is fixed
- [ ] No regressions introduced
- [ ] Performance impact verified (if applicable)

### Functional Testing
- [ ] Existing functionality preserved
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Build completes successfully

### Test Cases Added
```
// Include any new security test cases
Example:
- Test path traversal prevention
- Test XSS payload rejection
- Test ReDoS timeout handling
```

---

## ✅ Security Checklist

- [ ] No hardcoded secrets or credentials introduced
- [ ] All user inputs validated and sanitized
- [ ] Output properly encoded (HTML, SQL, etc.)
- [ ] Path operations use security utilities (if applicable)
- [ ] Error messages don't leak sensitive information
- [ ] No dangerous functions used (eval, innerHTML without sanitization, etc.)
- [ ] Dependencies reviewed (no new vulnerable packages)
- [ ] Logging doesn't include sensitive data

---

## 📚 Documentation

- [ ] Security implications documented
- [ ] Comments explain why security measure is needed
- [ ] SECURITY_REMEDIATION_ROADMAP.md updated (if needed)
- [ ] README or docs updated
- [ ] Team notified of changes

---

## 🔍 Code Review Checklist

**For Reviewers:**

- [ ] Changes address the stated vulnerability
- [ ] Implementation follows security best practices
- [ ] No new vulnerabilities introduced
- [ ] Code quality is acceptable
- [ ] Tests are adequate
- [ ] Documentation is clear
- [ ] Team communication is thorough

---

## 🚀 Deployment Considerations

- [ ] Backward compatible
- [ ] Database migrations needed? (Yes/No)
- [ ] Environment variables need updating? (Yes/No)
- [ ] Configuration changes required? (Yes/No)
- [ ] Rollback plan documented

---

## 📊 Impact Analysis

### Security Impact
- Fixes: [List vulnerabilities fixed]
- Risk Reduction: [Quantify if possible]
- Compliance: [OWASP, GDPR, etc.]

### Performance Impact
- Memory: [increase/decrease/none]
- CPU: [increase/decrease/none]
- Response Time: [increase/decrease/none]

### Breaking Changes
- [ ] None
- [ ] Yes - documented below

If yes, describe:
```
```

---

## 🔗 Related Resources

- Security Standards: [Links to OWASP, CWE, etc.]
- Audit Report: [Link to relevant audit findings]
- Discussion: [Link to GitHub discussion if applicable]

---

## ✨ Additional Notes

Add any additional context or considerations:

---

## 📋 Final Checklist

- [ ] PR title clearly indicates it's a security fix
- [ ] PR description is clear and detailed
- [ ] All tests passing
- [ ] Code review requested from @security-team
- [ ] No merge conflicts
- [ ] Branch is up-to-date with main

---

**Submitted by**: @[Your GitHub Handle]
**Date**: [YYYY-MM-DD]
**Security Review Required**: [ ] Yes [ ] No
