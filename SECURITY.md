# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in the WCAG AI Platform, please follow these steps:

### 1. **Do NOT** create a public GitHub issue

Security vulnerabilities should be reported privately to protect our users.

### 2. Report via GitHub Security Advisories

1. Go to the [Security tab](https://github.com/aaj441/wcag-ai-platform/security)
2. Click "Report a vulnerability"
3. Fill out the advisory form with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### 3. Alternative: Email Report

If you prefer, email security reports to: **security@wcagai.com**

Include:
- Subject line: "SECURITY: [Brief description]"
- Detailed description of the vulnerability
- Proof of concept (if applicable)
- Your contact information for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours
- **Vulnerability Assessment**: Within 7 days
- **Fix Development**: Based on severity (Critical: 24-48h, High: 7 days, Medium: 30 days)
- **Public Disclosure**: After fix is deployed and users have been notified

### Severity Levels

- **Critical**: Remote code execution, authentication bypass, data breach
- **High**: Privilege escalation, XSS, CSRF in sensitive areas
- **Medium**: Information disclosure, denial of service
- **Low**: Minor configuration issues

### Recognition

We maintain a **Security Acknowledgments** page to recognize researchers who responsibly disclose vulnerabilities. With your permission, we'll list your name/handle and the date of disclosure.

### Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Follow OWASP Top 10 security guidelines
- Enable 2FA on your GitHub account
- Review dependencies for known vulnerabilities
- Run `npm audit` before submitting PRs

### Security Features

This platform implements:
- ✅ HTTPS/TLS 1.3 encryption
- ✅ Secrets management (1Password/AWS Secrets Manager)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (Content Security Policy)
- ✅ CSRF token validation
- ✅ Rate limiting on API endpoints
- ✅ Database encryption at rest
- ✅ Regular security audits

### Compliance

- WCAG 2.1 AA accessibility compliance
- GDPR data protection standards
- SOC 2 Type II controls (in progress)
- OWASP Top 10 mitigation

## Questions?

For general security questions (not vulnerability reports), open a GitHub Discussion or contact us at support@wcagai.com.

---

**Last Updated**: November 15, 2025
