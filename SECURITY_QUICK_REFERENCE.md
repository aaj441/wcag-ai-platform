# Security Remediation - Quick Reference Guide

**For the WCAG AI Platform Security Team**

---

## 🚀 Getting Started (5 minutes)

### 1. Clone/Update Repository
```bash
git clone https://github.com/aaj441/wcag-ai-platform.git
cd wcag-ai-platform
git fetch origin
git checkout claude/security-audit-remediation-0161WAJXaJqZUvVUwazF5C23
```

### 2. Run Security Setup
```bash
./scripts/setup-security.sh
```

This automatically installs:
- Husky (git hooks)
- git-secrets (secret detection)
- DOMPurify (HTML sanitization)
- Pre-commit hooks

### 3. Read Documentation
1. **SECURITY_AUDIT_SUMMARY.md** - Current status (5 min read)
2. **SECURITY_TEAM_TASKS.md** - Your assigned task (10 min read)
3. **SECURITY_REMEDIATION_ROADMAP.md** - Detailed guide (20 min read)

---

## 📋 Your Task

### Find Your Name
Look in `SECURITY_TEAM_TASKS.md` for your name:

| Name | Task | Deadline |
|------|------|----------|
| Dev 1 | Async/Await Loops | Nov 22 |
| Dev 2 | ReDoS Fixes + XSS | Nov 22/24 |
| Dev 3 | SRI Integrity | Nov 20 |
| DevOps | NPM Audit + Infra | Nov 24/29 |

### Read Your Task Details
Each task has:
- ✅ Description
- ✅ Files to modify
- ✅ Step-by-step guide
- ✅ Deliverables
- ✅ Resources

---

## 💻 Development Workflow

### Create Feature Branch
```bash
git checkout -b fix/security-<task-name>
# Example: fix/security-async-loops
```

### Make Changes
1. Follow the step-by-step guide in your task
2. Test thoroughly
3. Run pre-commit hook (automatic on commit)

### Pre-Commit Hook Runs Automatically
```bash
# When you commit:
git add .
git commit -m "Fix security issue"

# The hook will:
✓ Check for secrets
✓ Run ESLint
✓ Format code
✓ Run tests
```

### Test Your Changes
```bash
# Run all tests
npm test

# Run specific tests
npm test -- --testNamePattern="security"

# Build
npm run build

# Lint
npm run lint
```

### Commit with Clear Message
```bash
git commit -m "🔒 Security: [Brief description]

- Explain what was fixed
- Explain why it's secure
- Reference the security issue"
```

### Push Branch
```bash
git push -u origin fix/security-<task-name>
```

### Create Pull Request
1. Go to GitHub
2. Create PR from your branch
3. Use `.github/pull_request_template_security.md`
4. Request review from @security-team
5. Add security label

---

## 🧪 Testing Security Fixes

### Test for Common Attacks

**Path Traversal Test**:
```javascript
// Try to escape directory
const malicious = '../../../etc/passwd';
sanitizeIdentifier(malicious); // Should be safe
```

**XSS Test**:
```javascript
// Try XSS payload
const xss = '<script>alert("xss")</script>';
sanitizeHTML(xss); // Should remove script
```

**ReDoS Test**:
```javascript
// Try catastrophic regex
const evilInput = 'a'.repeat(100) + '!';
// Should timeout or fail gracefully
```

**Async Performance**:
```bash
# Before optimization
time npm run scan:batch
# After optimization
time npm run scan:batch
# Should be significantly faster
```

---

## 📊 Status Tracking

### Update Progress
1. Update `SECURITY_TEAM_TASKS.md` with your status
2. Add checkmarks as you complete items
3. Note any blockers in Slack #security-team

### Weekly Check-ins
Every Friday:
- Report status in #security-team
- Highlight blockers
- Ask for help if needed

---

## 🔒 Security Best Practices

### Always:
- ✅ Validate all user input
- ✅ Sanitize all output
- ✅ Use established security utilities (securityUtils.js)
- ✅ Never hardcode secrets
- ✅ Test with attack payloads
- ✅ Review OWASP Top 10 for your task type

### Never:
- ❌ Hardcode API keys or passwords
- ❌ Use eval() or equivalent
- ❌ Trust user input
- ❌ Skip security reviews
- ❌ Commit unreviewed code
- ❌ Use innerHTML with untrusted content

---

## 🆘 Help & Support

### Quick Questions
→ Post in **#security-team** Slack

### Need Help Understanding the Task
→ Comment on the **GitHub Issue** with label `security:remediation`

### Found a Blocker
→ Post in **#security-team** immediately with:
- What you're trying to do
- What went wrong
- What you've tried

### Code Review
→ Request review from **@security-team** on your PR

---

## 📚 Key Resources

### In This Repository
- `SECURITY.md` - Security policies
- `SECURITY_REMEDIATION_ROADMAP.md` - Detailed implementation guide
- `SECURITY_TEAM_TASKS.md` - Task assignments
- `backend/src/utils/securityUtils.js` - Security utilities
- `.github/workflows/security.yml` - CI/CD security checks

### External Resources
- [OWASP Top 10](https://owasp.org/Top10/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)

---

## ⚡ Common Commands Cheatsheet

```bash
# Setup
./scripts/setup-security.sh          # One-time setup

# Development
git checkout -b fix/security-<name>  # Create branch
npm install                          # Install deps
npm run dev:api                      # Dev API
npm run dev:webapp                   # Dev webapp

# Testing
npm test                             # Run tests
npm run lint                         # Run linter
npm run build                        # Build project
git secrets --scan                   # Scan for secrets

# Git/Commits
git add .                            # Stage changes
git commit -m "message"              # Commit (hook runs)
git push -u origin branch-name       # Push

# Creating PR
# Go to GitHub and create PR
# Use security template
# Add "security" label
# Request @security-team review
```

---

## 🎯 Task Timeline

```
Week of Nov 18: ✅ Phase 1 Complete (Path Traversal)
               └─ All critical issues fixed

Week of Nov 25: 🔄 Phase 2 In Progress
               ├─ Dev 1: Async/Await loops
               ├─ Dev 2: ReDoS fixes
               └─ Dev 3: SRI integrity

Week of Dec 2:  🔄 Phase 2 Continued
               ├─ Dev 2: XSS fix
               └─ DevOps: NPM audit

Week of Dec 9:  ✅ Phase 2 Complete
               └─ Infrastructure setup done
               └─ All tests passing
               └─ Ready for production
```

---

## ✨ Success Checklist

Before submitting your PR:

**Code Quality**:
- [ ] Code follows project style
- [ ] No console.logs or debug code
- [ ] Comments explain why, not what
- [ ] Functions are well-named

**Security**:
- [ ] Tested with attack payloads
- [ ] No new vulnerabilities introduced
- [ ] Uses established security utilities
- [ ] Secrets not hardcoded

**Testing**:
- [ ] All tests pass
- [ ] New tests added for security
- [ ] Performance verified (if applicable)
- [ ] No breaking changes

**Documentation**:
- [ ] Code comments added
- [ ] README updated (if needed)
- [ ] Security implications documented
- [ ] PR description is clear

**Process**:
- [ ] Branch is up-to-date with main
- [ ] No merge conflicts
- [ ] PR uses security template
- [ ] @security-team requested to review

---

## 🎓 Learning Resources by Task

### Async/Await Optimization
- Read about [Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- Understand [async/await](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises)
- Performance: [Benchmarking Node.js](https://nodejs.org/en/docs/guides/nodejs-performance-getting-started/)

### ReDoS Prevention
- [CWE-1333: ReDoS](https://cwe.mitre.org/data/definitions/1333.html)
- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [Regex Cheat Sheet](https://www.rexegg.com/)

### SRI Integrity
- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [SRI Hash Generator](https://www.srihash.org/)

### XSS Prevention
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Docs](https://github.com/cure53/DOMPurify)
- [CWE-79: XSS](https://cwe.mitre.org/data/definitions/79.html)

### NPM Security
- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Snyk Documentation](https://docs.snyk.io/)

---

## 📞 Contact

**Security Lead**: @[security-lead-github-handle]
**DevOps Lead**: @[devops-lead-github-handle]
**Project Manager**: @[pm-github-handle]

**Slack Channels**:
- #security-team - General security discussions
- #security-blockers - Urgent issues
- #security-updates - Announcements

---

**Last Updated**: November 18, 2025
**Version**: 1.0
**Status**: Active

Start with Step 1 above and let us know if you have any questions! 🚀
