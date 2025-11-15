# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions of the WCAG AI Platform:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of the WCAG AI Platform seriously. If you discover a security vulnerability, please follow these guidelines:

### Where to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities through one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Navigate to the Security tab in this repository
   - Click "Report a vulnerability"
   - Fill out the vulnerability report form

2. **Email**
   - Send details to: security@wcag-ai-platform.com
   - Use PGP encryption if possible (key available upon request)
   - Include "SECURITY" in the subject line

### What to Include

Please provide the following information in your report:

- **Description**: A clear description of the vulnerability
- **Impact**: Potential impact and severity assessment
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Components**: Which parts of the system are affected
- **Proof of Concept**: Code, screenshots, or logs demonstrating the issue
- **Suggested Fix**: If you have recommendations for addressing the vulnerability
- **Your Contact Info**: How we can reach you for follow-up questions

### Response Timeline

We are committed to responding to security reports promptly:

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: Within 5 business days with an assessment of the report
- **Fix Timeline**: Varies based on severity:
  - **Critical**: 7 days
  - **High**: 14 days
  - **Medium**: 30 days
  - **Low**: 60 days

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report
2. **Investigation**: We will investigate and validate the reported vulnerability
3. **Communication**: We will keep you informed of our progress
4. **Resolution**: Once fixed, we will:
   - Release a security patch
   - Publish a security advisory
   - Credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices

### For Contributors

If you're contributing to this project, please follow these security practices:

#### Secrets Management

- **NEVER** commit sensitive information:
  - API keys, tokens, or passwords
  - Database connection strings with credentials
  - Private keys or certificates
  - `.env` files with real credentials

- Use environment variables for all sensitive configuration
- Review the `.env.example` file for required variables
- Use tools like `git-secrets` to prevent accidental commits

#### Code Security

- **Input Validation**: Always validate and sanitize user input
- **SQL Injection**: Use parameterized queries (Prisma handles this)
- **XSS Prevention**: Sanitize output, use React's built-in XSS protection
- **Authentication**: Never implement custom crypto; use established libraries
- **Dependencies**: Keep dependencies up to date and review security advisories

#### Pre-Commit Checks

Our CI/CD pipeline includes:
- GitGuardian secret scanning
- Trivy vulnerability scanning
- SARIF security analysis
- Dependency vulnerability checks

Make sure these pass before submitting PRs.

### For Deployment

#### Production Security Checklist

- [ ] All environment variables are set securely
- [ ] Database uses strong, unique passwords
- [ ] SSL/TLS certificates are valid and properly configured
- [ ] CORS is properly configured (not set to `*` in production)
- [ ] Rate limiting is enabled
- [ ] Logging excludes sensitive information
- [ ] Security headers are configured (CSP, HSTS, etc.)
- [ ] Secrets are rotated regularly (automated via workflows)
- [ ] Database backups are encrypted
- [ ] Monitoring and alerting are configured (Sentry, PagerDuty)

#### Infrastructure Security

- **Railway/Vercel**: Use platform security features
- **Database**: Enable encryption at rest and in transit
- **S3 Buckets**: Ensure proper IAM policies and bucket policies
- **API Keys**: Rotate regularly (see `.github/workflows/secret-rotation.yml`)

## Known Security Features

### Implemented Protections

- **Authentication**: Clerk-based authentication with JWT
- **Authorization**: Role-based access control (RBAC)
- **API Security**:
  - Rate limiting middleware
  - Request validation
  - CORS configuration
- **Database**:
  - Prisma ORM (SQL injection protection)
  - Row-level security via tenant isolation
- **Monitoring**:
  - Sentry error tracking
  - OpenTelemetry observability
  - Structured logging with Winston
- **Secrets Management**:
  - Automated secret rotation workflows
  - Environment-based configuration
- **Dependency Scanning**:
  - Automated vulnerability scanning in CI/CD
  - GitGuardian secret scanning

### Security Headers

The following security headers are configured in production:

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Compliance

This platform handles accessibility compliance data and may process information subject to:

- **ADA (Americans with Disabilities Act)**: Accessibility compliance data
- **GDPR**: If processing EU user data
- **CCPA**: If processing California resident data
- **WCAG 2.1 AA/AAA**: Accessibility standards compliance

### Data Protection

- **Encryption in Transit**: All API communication uses HTTPS/TLS 1.2+
- **Encryption at Rest**: Database and file storage use encryption
- **Data Retention**: Configurable per tenant requirements
- **Data Deletion**: Supports right to erasure (GDPR Article 17)
- **Access Logs**: All data access is logged for audit purposes

## Third-Party Security

### Dependency Management

- Dependencies are scanned regularly using:
  - `npm audit`
  - Trivy vulnerability scanner
  - GitHub Dependabot
- Critical vulnerabilities are patched within 7 days

### Third-Party Services

This platform integrates with the following third-party services:

| Service | Purpose | Security Documentation |
|---------|---------|----------------------|
| Clerk | Authentication | https://clerk.com/security |
| Stripe | Payment processing | https://stripe.com/docs/security |
| SendGrid | Email delivery | https://www.twilio.com/en-us/legal/data-protection |
| AWS S3 | File storage | https://aws.amazon.com/s3/security/ |
| Sentry | Error monitoring | https://sentry.io/security/ |
| Railway | Infrastructure | https://railway.app/legal/security |
| Vercel | Frontend hosting | https://vercel.com/security |

## Security Updates

Security patches and updates are released as needed:

- **Critical**: Immediate patch release
- **High**: Within 7 days
- **Medium**: Included in next minor release
- **Low**: Included in next major/minor release

Subscribe to security advisories:
- Watch this repository for security alerts
- Enable GitHub Security Advisories notifications
- Monitor our changelog for security-related updates

## Bug Bounty Program

Currently, we do not have a formal bug bounty program. However:

- Responsible disclosure is appreciated and recognized
- Contributors who report valid security issues will be credited
- We may offer recognition in our Hall of Fame (coming soon)

## Security Contacts

- **General Security**: security@wcag-ai-platform.com
- **Platform Incidents**: incidents@wcag-ai-platform.com
- **Privacy Concerns**: privacy@wcag-ai-platform.com

## PGP Key

Our PGP public key for encrypted communications is available upon request. Contact security@wcag-ai-platform.com to obtain the key.

## Acknowledgments

We would like to thank the following security researchers and contributors:

- (Hall of Fame coming soon)

---

**Last Updated**: 2025-11-15

**Security Policy Version**: 1.0

Thank you for helping keep WCAG AI Platform and our users safe!
