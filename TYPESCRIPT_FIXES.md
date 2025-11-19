# TypeScript Error Fixes - WCAG AI Platform

**Date**: November 18, 2025  
**Target**: Fix TypeScript compilation errors  

---

## 🎯 Identified Errors & Fixes

### Error 1: ProblemDetails.ts(100,12): error TS2339

**Location**: `packages/api/src/errors/ProblemDetails.ts` line 100

**Error**: Property 'cause' does not exist on type 'Error'

**Problem**: The `cause` property is only available in ES2022+, but your TypeScript target might be lower.

**Fix Option 1: Update tsconfig.json (Recommended)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

**Fix Option 2: Type assertion**

Update line 100 in `ProblemDetails.ts`:

```typescript
// Before (line 100)
if (options.cause) {
  this.cause = options.cause;
}

// After
if (options.cause) {
  (this as any).cause = options.cause;
}
```

**Fix Option 3: Extend Error interface**

Add at the top of `ProblemDetails.ts`:

```typescript
// Add this interface extension at the top
declare global {
  interface Error {
    cause?: Error;
  }
}
```

---

### Error 2: health.ts(14,10): error TS2724

**Location**: `packages/api/src/routes/health.ts` line 14

**Error**: Module has no exported member 'scanQueue' or circular dependency

**Problem**: The import `import { scanQueue } from '../services/orchestration/ScanQueue';` is failing.

**Fix Option 1: Check ScanQueue exports**

Update `packages/api/src/services/orchestration/ScanQueue.ts`:

```typescript
// Ensure this is exported
export const scanQueue = new ScanQueue();

// Or if using getScanQueue pattern:
export function getScanQueue() {
  return scanQueue;
}
```

**Fix Option 2: Update health.ts import**

```typescript
// Before (line 14)
import { scanQueue } from '../services/orchestration/ScanQueue';

// After - use dynamic import or optional
import { getScanQueue } from '../services/orchestration/ScanQueue';

// Then in the code:
const scanQueue = getScanQueue();
```

**Fix Option 3: Make it optional**

```typescript
// At the top of health.ts
let scanQueue: any;
try {
  scanQueue = require('../services/orchestration/ScanQueue').scanQueue;
} catch (error) {
  console.warn('ScanQueue not available');
}

// Then check before using:
if (scanQueue) {
  const queueClient = await scanQueue.client;
  // ...
}
```

---

### Error 3: ExternalAPIClient.ts - Type instantiation errors

**Location**: `packages/api/src/services/orchestration/ExternalAPIClient.ts`

**Error**: Type instantiation is excessively deep and possibly infinite

**Problem**: Circular type references or overly complex generic types in Axios responses.

**Fix Option 1: Simplify generic types**

```typescript
// Before
static async request<T = any>(
  service: string,
  config: AxiosRequestConfig,
  options?: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  }
): Promise<AxiosResponse<T>> {
  // ...
}

// After - use explicit types
static async request<T = any>(
  service: string,
  config: AxiosRequestConfig,
  options?: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  }
): Promise<AxiosResponse<T, any>> {
  // ...
}
```

**Fix Option 2: Add type constraints**

```typescript
// Add at the top of ExternalAPIClient.ts
type SafeAxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
};

// Then use SafeAxiosResponse instead of AxiosResponse
static async request<T = any>(
  service: string,
  config: AxiosRequestConfig,
  options?: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  }
): Promise<SafeAxiosResponse<T>> {
  const response = await axios.request<T>(finalConfig);
  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config: response.config
  };
}
```

**Fix Option 3: Update Axios types**

```bash
# Update axios to latest version
npm install axios@latest --save
```

---

## 🔧 Complete Fix Implementation

### Step 1: Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Step 2: Fix ProblemDetails.ts

```typescript
/**
 * RFC 7807 Problem Details for HTTP APIs
 */

import { getRequestId } from '../middleware/correlationId';

// Add Error interface extension for cause property
declare global {
  interface Error {
    cause?: Error;
  }
}

// ... rest of the file remains the same
```

### Step 3: Fix health.ts

```typescript
/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCircuitBreakerHealth } from '../services/orchestration/ExternalAPIClient';

const router = Router();

// Import scanQueue safely
let scanQueue: any;
try {
  const ScanQueueModule = require('../services/orchestration/ScanQueue');
  scanQueue = ScanQueueModule.scanQueue || ScanQueueModule.getScanQueue?.();
} catch (error) {
  console.warn('ScanQueue module not available:', error);
}

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  res.json(health);
});

// ... rest of the file
```

### Step 4: Fix ExternalAPIClient.ts

```typescript
/**
 * External API Client with Circuit Breaker Protection
 */

import axios, { AxiosRequestConfig } from 'axios';
import { CircuitBreaker, CircuitBreakerOptions } from './CircuitBreaker';
import { log } from '../../utils/logger';

// Define safe response type to avoid deep instantiation
interface SafeAxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, any>;
  config: AxiosRequestConfig;
}

// ... rest of the configuration

export class ProtectedHTTPClient {
  /**
   * Make a protected HTTP request with circuit breaker
   */
  static async request<T = any>(
    service: string,
    config: AxiosRequestConfig,
    options?: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<SafeAxiosResponse<T>> {
    const breaker = circuitBreakerRegistry.get(service);

    return breaker.call(async () => {
      const finalConfig: AxiosRequestConfig = {
        ...config,
        timeout: options?.timeout || config.timeout || 30000,
      };

      let lastError: any;
      const retries = options?.retries || 0;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const startTime = Date.now();
          const response = await axios.request<T>(finalConfig);
          const duration = Date.now() - startTime;

          log.info(`🌐 ${service} API call succeeded`, {
            method: config.method,
            url: config.url,
            status: response.status,
            duration,
            attempt: attempt + 1,
          });

          // Return safe response
          return {
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, any>,
            config: response.config
          };
        } catch (error: any) {
          lastError = error;
          const duration = Date.now();

          log.warn(`🌐 ${service} API call failed (attempt ${attempt + 1}/${retries + 1})`, {
            method: config.method,
            url: config.url,
            status: error.response?.status,
            error: error.message,
            duration,
          });

          // Don't retry on 4xx errors (client errors)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            throw error;
          }

          // Wait before retry
          if (attempt < retries && options?.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, options.retryDelay));
          }
        }
      }

      // All retries failed
      throw lastError;
    });
  }

  /**
   * Protected GET request
   */
  static async get<T = any>(
    service: string,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<SafeAxiosResponse<T>> {
    return this.request<T>(service, {
      ...config,
      method: 'GET',
      url,
    });
  }

  /**
   * Protected POST request
   */
  static async post<T = any>(
    service: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<SafeAxiosResponse<T>> {
    return this.request<T>(service, {
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  // ... rest of the methods
}
```

---

## 🚀 Quick Fix Script

Create a script to apply all fixes automatically:

```bash
#!/bin/bash
# fix-typescript-errors.sh

echo "🔧 Fixing TypeScript errors..."

# 1. Update tsconfig.json
cat > packages/api/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF

echo "✅ Updated tsconfig.json"

# 2. Add Error.cause declaration to ProblemDetails.ts
sed -i '20a\\n// Add Error interface extension for cause property\ndeclare global {\n  interface Error {\n    cause?: Error;\n  }\n}\n' packages/api/src/errors/ProblemDetails.ts

echo "✅ Fixed ProblemDetails.ts"

# 3. Update axios
cd packages/api && npm install axios@latest --save

echo "✅ Updated axios"

echo "🎉 All fixes applied! Run 'npm run build' to verify."
```

---

## ✅ Verification

After applying fixes, verify with:

```bash
cd packages/api

# Install dependencies
npm install

# Check TypeScript compilation
npx tsc --noEmit

# Build the project
npm run build

# Check for errors
echo $?  # Should be 0 if successful
```

---

## 📋 Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `tsconfig.json` | Update target to ES2022 | Support Error.cause |
| `ProblemDetails.ts` | Add Error interface extension | Fix TS2339 error |
| `health.ts` | Safe import of scanQueue | Fix TS2724 error |
| `ExternalAPIClient.ts` | Use SafeAxiosResponse type | Fix deep instantiation |
| `package.json` | Update axios to latest | Fix type compatibility |

---

## 🆘 If Errors Persist

### Check Node.js Version
```bash
node --version  # Should be 18+ for ES2022
```

### Clear Build Cache
```bash
rm -rf packages/api/dist
rm -rf packages/api/node_modules
npm install
npm run build
```

### Check for Circular Dependencies
```bash
npx madge --circular packages/api/src
```

### Enable Verbose TypeScript Errors
```bash
npx tsc --noEmit --extendedDiagnostics
```

---

**Last Updated**: November 18, 2025  
**Status**: Ready for Implementation