# Security Testing Guide

This guide explains how to run the security test suite to verify all security fixes are working correctly.

## Prerequisites

- Node.js 18+ installed
- API server running (locally or deployed)
- Access to environment variables (JWT_SECRET, CORS_ORIGIN)

## Quick Start

### Option 1: Bash Script (Recommended for CI/CD)

```bash
# Start your API server first
cd packages/api
npm run dev

# In another terminal, run the security tests
cd packages/api
./scripts/test-security.sh
```

### Option 2: JavaScript/Node.js Script

```bash
# Install axios if not already installed
cd packages/api
npm install --save-dev axios

# Start your API server
npm run dev

# In another terminal, run the tests
cd packages/api
node scripts/test-security.js
```

## Test Configuration

### Environment Variables

```bash
# Required for JWT tests
export JWT_SECRET="your-test-secret-key"

# Optional: Test against deployed API
export API_URL="https://your-api.railway.app"

# Optional: For webhook signature tests
export WEBHOOK_SECRET="your-webhook-secret"
```

### Testing Against Production

```bash
# Test production deployment
API_URL="https://your-production-api.com" \
JWT_SECRET="your-production-secret" \
./scripts/test-security.sh
```

## Test Coverage

The security test suite covers:

### 1. **Health Check** ✅
- Basic health endpoint returns 200
- Server is responding correctly

### 2. **Security Headers** ✅
- Strict-Transport-Security (HSTS)
- X-Frame-Options
- Content-Security-Policy (CSP)
- X-Content-Type-Options
- Referrer-Policy

### 3. **CORS Protection** ✅
- Blocks unauthorized origins
- Allows configured origins
- Proper CORS headers

### 4. **Rate Limiting** ✅
- API rate limit (100 req/15min)
- Returns 429 when limit exceeded
- Scan-specific rate limits

### 5. **JWT Authentication** ✅
- Rejects requests without tokens
- Accepts valid JWT tokens
- Rejects expired tokens (TOKEN_EXPIRED)
- Rejects invalid/malformed tokens
- Proper error codes and messages

### 6. **Input Validation** ✅
- Rejects invalid email addresses
- Rejects missing required fields
- Rejects oversized payloads (>10MB)
- Returns structured validation errors

### 7. **Error Handling** ✅
- No stack trace leakage
- Sanitized error messages
- Proper error codes

### 8. **Environment Variable Exposure** ✅
- Health endpoint doesn't leak config
- No API key status disclosure

### 9. **SSRF Protection** ✅
- Blocks requests to localhost
- Blocks requests to private IPs
- Validates URLs before processing

### 10. **Webhook Signature Verification** ✅
- Rejects webhooks without signature
- Rejects webhooks with invalid signature
- Uses constant-time comparison

## Understanding Test Results

### Pass Rates

- **80-100%**: ✅ GOOD - Production ready
- **60-79%**: ⚠️ NEEDS IMPROVEMENT - Fix before production
- **<60%**: ❌ CRITICAL ISSUES - Do not deploy

### Common Issues

#### JWT Tests Failing

**Issue**: "JWT_SECRET not configured"
**Fix**:
```bash
export JWT_SECRET="test-secret-key"
```

#### Rate Limit Not Triggering

**Issue**: Rate limit test doesn't return 429
**Fix**:
- Check if rate limiting is enabled in server.ts
- Verify apiLimiter is applied to /api routes
- Wait 15 minutes and retry (rate limit window)

#### CORS Tests Failing

**Issue**: CORS allows unauthorized origins
**Fix**:
```bash
# Set explicit CORS origin
export CORS_ORIGIN="http://localhost:3000"
```

#### Security Headers Missing

**Issue**: HSTS or CSP headers not present
**Fix**:
- Verify helmet middleware is applied in server.ts
- Check that helmet is before route handlers
- Ensure helmet package is installed

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd packages/api
          npm install

      - name: Start API server
        run: |
          cd packages/api
          JWT_SECRET=test-secret npm run dev &
          sleep 5

      - name: Run security tests
        run: |
          cd packages/api
          JWT_SECRET=test-secret ./scripts/test-security.sh
        env:
          API_URL: http://localhost:3001
```

### Railway/Docker

```bash
# Add to your Dockerfile
COPY scripts/test-security.sh /app/scripts/
RUN chmod +x /app/scripts/test-security.sh

# Run during health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD ./scripts/test-security.sh || exit 1
```

## Manual Security Testing

### 1. Test Rate Limiting Manually

```bash
# Bash one-liner
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/drafts
done

# Should see 429 after 100 requests
```

### 2. Test JWT Authentication

```bash
# Generate a test token
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test', email: 'test@example.com' },
  'your-secret',
  { expiresIn: '1h' }
);
console.log(token);
"

# Test with token
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/drafts
```

### 3. Test Security Headers

```bash
# Check all headers
curl -I http://localhost:3001/health

# Check specific header
curl -I http://localhost:3001/health | grep "Strict-Transport-Security"
```

### 4. Test CORS

```bash
# Test unauthorized origin
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  http://localhost:3001/api/drafts \
  -v

# Should NOT see: Access-Control-Allow-Origin: https://evil.com
```

### 5. Test Input Validation

```bash
# Test invalid email
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{"recipient":"not-an-email","subject":"Test","body":"Test"}'

# Should return 400 with validation error
```

## Troubleshooting

### Tests Won't Run

```bash
# Check if server is running
curl http://localhost:3001/health

# Check Node.js version
node --version  # Should be 18+

# Check if scripts are executable
ls -la scripts/test-security.sh
chmod +x scripts/test-security.sh
```

### All Tests Failing

```bash
# Verify environment variables
echo $JWT_SECRET
echo $API_URL

# Check server logs
cd packages/api
npm run dev
# Look for startup errors
```

### Intermittent Failures

- **Rate limiting tests**: Wait 15 minutes between runs
- **Network issues**: Check API_URL is correct
- **Timeouts**: Increase timeout in test scripts

## Security Testing Checklist

Before production deployment:

- [ ] All security tests passing (>80%)
- [ ] Rate limiting verified
- [ ] JWT authentication working
- [ ] Security headers present
- [ ] CORS properly configured
- [ ] Input validation active
- [ ] Error handling sanitized
- [ ] No env var exposure
- [ ] SSRF protection enabled
- [ ] Tests run in CI/CD pipeline

## Additional Security Tools

### OWASP ZAP

```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3001
```

### npm audit

```bash
cd packages/api
npm audit
npm audit fix
```

### Snyk

```bash
npx snyk test
npx snyk monitor
```

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review server logs for errors
3. Verify environment variables are set
4. Ensure all dependencies are installed
5. Open an issue on GitHub with test output

## License

These security tests are part of the WCAG AI Platform and follow the same license.
