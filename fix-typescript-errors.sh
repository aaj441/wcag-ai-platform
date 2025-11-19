#!/bin/bash
set -e

echo "🔧 Fixing TypeScript errors in WCAG AI Platform..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Update tsconfig.json to ES2022
echo "📝 Updating tsconfig.json..."
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
    "allowSyntheticDefaultImports": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF
echo -e "${GREEN}✅ Updated tsconfig.json to ES2022${NC}"

# 2. Fix ProblemDetails.ts - Add Error.cause declaration
echo "📝 Fixing ProblemDetails.ts..."
if ! grep -q "declare global" packages/api/src/errors/ProblemDetails.ts; then
  # Add after the imports
  sed -i '/import { getRequestId }/a\\n// Add Error interface extension for cause property (ES2022)\ndeclare global {\n  interface Error {\n    cause?: Error;\n  }\n}' packages/api/src/errors/ProblemDetails.ts
  echo -e "${GREEN}✅ Added Error.cause declaration to ProblemDetails.ts${NC}"
else
  echo -e "${YELLOW}⚠️  Error.cause declaration already exists${NC}"
fi

# 3. Fix health.ts - Safe import of scanQueue
echo "📝 Fixing health.ts..."
cat > /tmp/health_fix.ts << 'EOF'
/**
 * Health Check Routes
 * Enhanced health checks for monitoring and alerting
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCircuitBreakerHealth } from '../services/orchestration/ExternalAPIClient';

const router = Router();

// Import scanQueue safely to avoid circular dependency
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

// Detailed health check with database connectivity
router.get('/detailed', async (req: Request, res: Response) => {
  const checks: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    status: 'healthy',
    checks: {
      database: { status: 'unknown', responseTime: 0 },
      stripe: { status: 'unknown' },
      sendgrid: { status: 'unknown' },
      clerk: { status: 'unknown' },
      redis: { status: 'unknown' },
    },
    circuitBreakers: {},
    queue: {
      capacity: 'unknown',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      utilizationPercent: 0,
    },
    system: {
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
      },
      uptime: process.uptime(),
    },
  };

  try {
    // Database check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    checks.status = 'unhealthy';
    checks.checks.database = {
      status: 'unhealthy',
      responseTime: 0
    };
  }

  // Stripe check
  checks.checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
  };

  // SendGrid check
  checks.checks.sendgrid = {
    status: process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured'
  };

  // Clerk check
  checks.checks.clerk = {
    status: process.env.CLERK_SECRET_KEY ? 'configured' : 'not_configured'
  };

  // Redis check (via queue)
  try {
    if (scanQueue) {
      const queueClient = await scanQueue.client;
      await queueClient.ping();
      checks.checks.redis = { status: 'healthy' };
    } else {
      checks.checks.redis = { status: 'not_configured' };
    }
  } catch (error) {
    checks.status = 'degraded';
    checks.checks.redis = { status: 'unhealthy' };
  }

  // Circuit Breaker Health
  try {
    const breakerHealth = getCircuitBreakerHealth();
    checks.circuitBreakers = {
      healthy: breakerHealth.healthy,
      services: breakerHealth.services,
    };

    if (!breakerHealth.healthy) {
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.circuitBreakers = { healthy: true, services: {} };
  }

  // Queue Capacity Tracking
  try {
    if (scanQueue) {
      const counts = await scanQueue.getJobCounts();
      const stats = scanQueue.getStats();

      const maxCapacity = 100;
      const totalJobs = counts.waiting + counts.active;
      const utilizationPercent = Math.round((totalJobs / maxCapacity) * 100);

      checks.queue = {
        capacity: utilizationPercent < 80 ? 'healthy' : utilizationPercent < 95 ? 'warning' : 'critical',
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        utilizationPercent,
        maxCapacity,
        stats,
      };

      if (utilizationPercent >= 95) {
        checks.status = 'degraded';
      }
    }
  } catch (error) {
    checks.queue.capacity = 'unknown';
  }

  // System Resource Monitoring
  const mem = process.memoryUsage();
  checks.system.memory = {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    rss: Math.round(mem.rss / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
  };

  const statusCode = checks.status === 'healthy' ? 200 :
                     checks.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(checks);
});

// Readiness check
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

// Liveness check
router.get('/live', (req: Request, res: Response) => {
  res.json({ alive: true });
});

// Metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const [clientCount, scanCount] = await Promise.all([
      prisma.client.count(),
      prisma.scan.count()
    ]);

    const metrics = [
      `# HELP wcag_clients_total Total number of clients`,
      `# TYPE wcag_clients_total gauge`,
      `wcag_clients_total ${clientCount}`,
      ``,
      `# HELP wcag_scans_total Total number of scans`,
      `# TYPE wcag_scans_total counter`,
      `wcag_scans_total ${scanCount}`,
      ``,
      `# HELP wcag_api_health API health status (1 = healthy, 0 = unhealthy)`,
      `# TYPE wcag_api_health gauge`,
      `wcag_api_health 1`
    ].join('\n');

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).send('# Error generating metrics');
  }
});

export default router;
EOF

cp /tmp/health_fix.ts packages/api/src/routes/health.ts
echo -e "${GREEN}✅ Fixed health.ts with safe scanQueue import${NC}"

# 4. Create type definitions file for ExternalAPIClient
echo "📝 Creating type definitions for ExternalAPIClient..."
cat > packages/api/src/services/orchestration/types.ts << 'EOF'
/**
 * Type definitions for External API Client
 * Prevents deep type instantiation errors
 */

import { AxiosRequestConfig } from 'axios';

// Safe response type to avoid deep instantiation
export interface SafeAxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, any>;
  config: AxiosRequestConfig;
}

// Request options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}
EOF
echo -e "${GREEN}✅ Created type definitions${NC}"

echo ""
echo -e "${GREEN}🎉 All TypeScript fixes applied!${NC}"
echo ""
echo "Next steps:"
echo "1. cd packages/api"
echo "2. npm install (if needed)"
echo "3. npm run build"
echo ""
echo "To verify:"
echo "  npx tsc --noEmit"