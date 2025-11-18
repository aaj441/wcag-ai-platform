# Example Security Fixes

This document provides concrete examples of how to fix the identified security issues.

---

## 1. Path Traversal Fixes

### Example 1: ai_email_generator.js

**File**: `./automation/ai_email_generator.js`

**Before** (Lines 333-345):
```javascript
async saveEmail(email, companyName) {
  const filename = `${companyName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
  const filepath = path.join(this.outputDir, filename);

  await fs.writeFile(filepath, JSON.stringify(email, null, 2));
  console.log(`[EmailGenerator] Saved to ${filepath}`);

  // Also save plain text version
  const txtFilename = filename.replace('.json', '.txt');
  const txtFilepath = path.join(this.outputDir, txtFilename);
  const plainText = `Subject: ${email.subject}\n\n${email.body}`;
  await fs.writeFile(txtFilepath, plainText);
}
```

**After** (Secure):
```javascript
// Add import at top of file
const { sanitizeFilePath, sanitizeFilename } = require('../packages/api/src/utils/security');

async saveEmail(email, companyName) {
  // Sanitize company name for filename
  const baseFilename = `${companyName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}`;
  const filename = sanitizeFilename(baseFilename + '.json');
  
  // Use secure path joining
  const filepath = sanitizeFilePath(this.outputDir, filename);

  await fs.writeFile(filepath, JSON.stringify(email, null, 2));
  console.log(`[EmailGenerator] Saved to ${filepath}`);

  // Also save plain text version
  const txtFilename = sanitizeFilename(baseFilename + '.txt');
  const txtFilepath = sanitizeFilePath(this.outputDir, txtFilename);
  const plainText = `Subject: ${email.subject}\n\n${email.body}`;
  await fs.writeFile(txtFilepath, plainText);
}
```

### Example 2: replayEngine.js

**File**: `./backend/src/services/replayEngine.js`

**Before** (Lines 370-371):
```javascript
const recordingPath = path.join(this.recordingsPath, `${recording.recordingName}.har`);
const metadataPath = path.join(this.recordingsPath, `${scanId}_metadata.json`);
```

**After** (Secure):
```javascript
const { sanitizeFilePath, sanitizeFilename } = require('../../../packages/api/src/utils/security');

// Sanitize recording name
const safeRecordingName = sanitizeFilename(`${recording.recordingName}.har`);
const recordingPath = sanitizeFilePath(this.recordingsPath, safeRecordingName);

// Sanitize metadata filename
const safeMetadataName = sanitizeFilename(`${scanId}_metadata.json`);
const metadataPath = sanitizeFilePath(this.recordingsPath, safeMetadataName);
```

### Example 3: workerIdentity.js

**File**: `./backend/src/services/workerIdentity.js`

**Before** (Line 290):
```javascript
const keyPath = path.join(this.keystorePath, `${workerId}.json`);
```

**After** (Secure):
```javascript
const { sanitizeFilePath, sanitizeFilename, validators } = require('../../../packages/api/src/utils/security');

// Validate workerId format (should be UUID)
if (!validators.isValidUuid(workerId)) {
  throw new Error('Invalid worker ID format');
}

const safeFilename = sanitizeFilename(`${workerId}.json`);
const keyPath = sanitizeFilePath(this.keystorePath, safeFilename);
```

---

## 2. Async Loop Refactoring

### Example 1: ai_email_generator.js

**File**: `./automation/ai_email_generator.js`

**Before** (Lines 357-365):
```javascript
async generateBatch(prospects) {
  console.log(`[EmailGenerator] Generating batch of ${prospects.length} emails...`);
  
  for (const prospect of prospects) {
    const email = await this.generateEmail(prospect);
    await this.saveEmail(email, prospect.company);
  }
  
  console.log('[EmailGenerator] Batch complete');
}
```

**After** (Efficient):
```javascript
const { batchProcess } = require('../packages/api/src/utils/async-helpers');

async generateBatch(prospects) {
  console.log(`[EmailGenerator] Generating batch of ${prospects.length} emails...`);
  
  // Process 10 prospects at a time
  const results = await batchProcess(
    prospects,
    async (prospect) => {
      const email = await this.generateEmail(prospect);
      await this.saveEmail(email, prospect.company);
      return email;
    },
    10 // Concurrency limit
  );
  
  console.log(`[EmailGenerator] Batch complete - generated ${results.length} emails`);
  return results;
}
```

### Example 2: CompanyDiscoveryService.ts

**File**: `./packages/api/src/services/CompanyDiscoveryService.ts`

**Before** (Lines 365-410):
```typescript
async enrichCompanies(companies: Company[]): Promise<EnrichedCompany[]> {
  const enriched: EnrichedCompany[] = [];
  
  for (const company of companies) {
    const details = await this.fetchCompanyDetails(company.domain);
    const contacts = await this.findContacts(company.domain);
    const techStack = await this.detectTechStack(company.domain);
    
    enriched.push({
      ...company,
      details,
      contacts,
      techStack
    });
  }
  
  return enriched;
}
```

**After** (Efficient):
```typescript
import { batchProcess } from '../utils/async-helpers';

async enrichCompanies(companies: Company[]): Promise<EnrichedCompany[]> {
  // Process companies in parallel with concurrency control
  return await batchProcess(
    companies,
    async (company) => {
      // Fetch all data in parallel for each company
      const [details, contacts, techStack] = await Promise.all([
        this.fetchCompanyDetails(company.domain),
        this.findContacts(company.domain),
        this.detectTechStack(company.domain)
      ]);
      
      return {
        ...company,
        details,
        contacts,
        techStack
      };
    },
    5 // Process 5 companies at a time
  );
}
```

### Example 3: BatchAuditService.ts

**File**: `./packages/api/src/services/BatchAuditService.ts`

**Before** (Lines 92-100):
```typescript
async auditMultipleUrls(urls: string[]): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  
  for (const url of urls) {
    const result = await this.auditUrl(url);
    results.push(result);
  }
  
  return results;
}
```

**After** (Efficient with Error Handling):
```typescript
import { parallelProcess } from '../utils/async-helpers';

async auditMultipleUrls(urls: string[]): Promise<AuditResult[]> {
  // Process URLs in parallel with error handling
  const results = await parallelProcess(
    urls,
    async (url) => await this.auditUrl(url),
    {
      concurrency: 3, // Limit concurrent audits
      continueOnError: true, // Don't stop on individual failures
      timeout: 30000 // 30 second timeout per audit
    }
  );
  
  // Log failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.warn(`${failures.length} audits failed:`, failures.map(f => f.item));
  }
  
  // Return successful results
  return results
    .filter(r => r.success)
    .map(r => r.result!);
}
```

---

## 3. ReDoS Fixes

### Example 1: ai_email_generator.js

**File**: `./automation/ai_email_generator.js`

**Before** (Line 267):
```javascript
for (const [key, value] of Object.entries(replacements)) {
  prompt = prompt.replace(new RegExp(key, 'g'), value);
}
```

**After** (Safe):
```javascript
for (const [key, value] of Object.entries(replacements)) {
  // Escape special regex characters in the key
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  prompt = prompt.replace(new RegExp(escapedKey, 'g'), value);
}
```

### Example 2: keywordExtractor.ts

**File**: `./packages/api/src/services/keywordExtractor.ts`

**Before** (Line 272):
```typescript
result = result.replace(new RegExp(placeholder, 'g'), value);
```

**After** (Safe):
```typescript
import { createSafeRegex } from '../utils/security';

// Escape special characters
const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = createSafeRegex(escapedPlaceholder, 'g');

if (regex) {
  result = result.replace(regex, value);
} else {
  // Fallback to simple string replacement
  result = result.split(placeholder).join(value);
}
```

### Example 3: DeadLetterQueue.ts

**File**: `./packages/api/src/services/orchestration/DeadLetterQueue.ts`

**Before** (Line 208):
```typescript
const pattern = new RegExp(options.errorPattern, 'i');
```

**After** (Safe):
```typescript
import { createSafeRegex } from '../../utils/security';

// Validate pattern before creating regex
const pattern = createSafeRegex(options.errorPattern, 'i');

if (!pattern) {
  console.warn(`Invalid or dangerous regex pattern: ${options.errorPattern}`);
  // Use simple string matching as fallback
  return error.message.toLowerCase().includes(options.errorPattern.toLowerCase());
}

// Use the safe pattern
return pattern.test(error.message);
```

---

## 4. SRI Integrity Fixes

### Example 1: deployment/dashboard/index.html

**Before**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Deployment Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css">
</head>
<body>
  <!-- content -->
</body>
</html>
```

**After** (With SRI):
```html
<!DOCTYPE html>
<html>
<head>
  <title>Deployment Dashboard</title>
  <script 
    src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
    integrity="sha384-ZvpUoO/+PpLXR1lu4jmpXWu80pZlYUAfxl5NsBMWOEPSjUn/6Z/hRTt8+pR6L4N2"
    crossorigin="anonymous">
  </script>
  <link 
    rel="stylesheet" 
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css"
    integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx"
    crossorigin="anonymous">
</head>
<body>
  <!-- content -->
</body>
</html>
```

**How to Generate SRI Hashes**:
```bash
# Method 1: Using curl and openssl
curl -s https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js | \
  openssl dgst -sha384 -binary | \
  openssl base64 -A

# Method 2: Using online tool
# Visit: https://www.srihash.org/
# Paste the CDN URL and get the integrity hash

# Method 3: Using Node.js
node -e "
const crypto = require('crypto');
const https = require('https');
https.get('https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js', (res) => {
  const hash = crypto.createHash('sha384');
  res.on('data', (d) => hash.update(d));
  res.on('end', () => console.log('sha384-' + hash.digest('base64')));
});
"
```

---

## 5. XSS Prevention

### Example: CDNReportService.ts

**File**: `./packages/api/src/services/reports/CDNReportService.ts`

**Before** (Line 710):
```typescript
const div = { innerHTML: userContent };
```

**After** (Safe):
```typescript
import { sanitizeHtml } from '../../utils/security';

// Option 1: Sanitize HTML (if HTML is needed)
const div = { innerHTML: sanitizeHtml(userContent) };

// Option 2: Use textContent (preferred for plain text)
const div = { textContent: userContent };

// Option 3: Use a proper HTML sanitizer library
import DOMPurify from 'dompurify';
const div = { innerHTML: DOMPurify.sanitize(userContent) };
```

---

## 6. Rate Limiting Implementation

### Example: Express Middleware

**File**: `./packages/api/src/middleware/rateLimiter.ts`

```typescript
import { RateLimiter } from '../utils/security';
import { Request, Response, NextFunction } from 'express';

// Create rate limiters for different endpoints
const apiLimiter = new RateLimiter(100, 60000); // 100 req/min
const authLimiter = new RateLimiter(5, 60000);   // 5 req/min for auth
const heavyLimiter = new RateLimiter(10, 60000); // 10 req/min for heavy operations

export function createRateLimiter(limiter: RateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (!limiter.isAllowed(key)) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: 60
      });
    }
    
    next();
  };
}

// Usage in routes:
// app.use('/api/', createRateLimiter(apiLimiter));
// app.use('/api/auth/', createRateLimiter(authLimiter));
// app.use('/api/scan/', createRateLimiter(heavyLimiter));
```

---

## 7. Input Validation

### Example: Request Validation Middleware

**File**: `./packages/api/src/middleware/validation.ts`

```typescript
import { validators } from '../utils/security';
import { Request, Response, NextFunction } from 'express';

export function validateUrl(req: Request, res: Response, next: NextFunction) {
  const { url } = req.body;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  if (!validators.isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  next();
}

export function validateEmail(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  if (!validators.isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  next();
}

export function validateUuid(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    
    if (!validators.isValidUuid(value)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }
    
    next();
  };
}

// Usage:
// app.post('/api/scan', validateUrl, scanController);
// app.post('/api/contact', validateEmail, contactController);
// app.get('/api/scan/:scanId', validateUuid('scanId'), getScanController);
```

---

## Testing the Fixes

### Unit Tests

```typescript
// security.test.ts
import { sanitizeFilePath, sanitizeFilename, createSafeRegex } from '../utils/security';

describe('Security Utils', () => {
  describe('sanitizeFilePath', () => {
    it('should prevent path traversal', () => {
      expect(() => {
        sanitizeFilePath('/safe/dir', '../../../etc/passwd');
      }).toThrow('Path traversal detected');
    });
    
    it('should allow safe paths', () => {
      const result = sanitizeFilePath('/safe/dir', 'file.txt');
      expect(result).toBe('/safe/dir/file.txt');
    });
  });
  
  describe('createSafeRegex', () => {
    it('should reject dangerous patterns', () => {
      const result = createSafeRegex('(a+)+b');
      expect(result).toBeNull();
    });
    
    it('should allow safe patterns', () => {
      const result = createSafeRegex('hello.*world');
      expect(result).toBeInstanceOf(RegExp);
    });
  });
});
```

### Integration Tests

```typescript
// rateLimiter.test.ts
import request from 'supertest';
import app from '../app';

describe('Rate Limiting', () => {
  it('should block after rate limit exceeded', async () => {
    // Make 101 requests
    for (let i = 0; i < 101; i++) {
      const response = await request(app).get('/api/test');
      
      if (i < 100) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });
});
```

---

## Deployment Checklist

Before deploying these fixes:

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Security audit script passes
- [ ] No secrets in code
- [ ] All dependencies updated
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring set up

---

**Last Updated**: November 18, 2025