/**
 * Advanced Health Check Endpoints
 * Implements Kubernetes-style readiness/liveness probes
 * with comprehensive dependency checking
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Cache for dependency status (1-minute TTL)
const healthCache = new Map<string, { status: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Basic Health Check (Fast, No Dependencies)
 * Use for: Load balancer health checks
 * Expected response time: < 10ms
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Readiness Check (Includes Dependencies)
 * Use for: Kubernetes readiness probe, deployment validation
 * Expected response time: < 1000ms
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  const checks: Record<string, string> = {
    api: 'ok',
    database: 'unknown',
    openai: 'unknown'
  };

  const startTime = Date.now();

  try {
    // Database check
    const dbCheck = await checkWithCache('database', async () => {
      await prisma.$queryRaw`SELECT 1 as result`;
      return 'ok';
    });
    checks.database = dbCheck;

  } catch (error) {
    checks.database = 'error';
    console.error('Database health check failed:', error);
  }

  try {
    // OpenAI API check
    const openaiCheck = await checkWithCache('openai', async () => {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      return response.ok ? 'ok' : 'error';
    });
    checks.openai = openaiCheck;

  } catch (error) {
    checks.openai = 'error';
    console.error('OpenAI health check failed:', error);
  }

  const duration = Date.now() - startTime;
  const allHealthy = Object.values(checks).every(v => v === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    duration_ms: duration,
    timestamp: new Date().toISOString()
  });
});

/**
 * Liveness Check (Process Health)
 * Use for: Kubernetes liveness probe, detect deadlocks
 * Expected response time: < 5ms
 */
router.get('/health/live', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };

  // Check for memory leaks (heap used > 1GB)
  const isHealthy = memoryMB.heapUsed < 1024;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'alive' : 'unhealthy',
    pid: process.pid,
    uptime: process.uptime(),
    memory_mb: memoryMB,
    cpu_usage: process.cpuUsage(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Smoke Test (Critical User Flows)
 * Use for: Post-deployment validation, canary testing
 * Expected response time: < 5000ms
 */
router.get('/smoke-test', async (req: Request, res: Response) => {
  const tests: Array<{ name: string; status: 'pass' | 'fail'; duration_ms?: number; error?: string }> = [];

  // Test 1: Database connectivity and operations
  try {
    const start = Date.now();

    // Create test scan
    const scan = await prisma.scan.create({
      data: {
        url: 'https://example.com/smoke-test',
        status: 'queued',
        wcagLevel: 'AA'
      }
    });

    // Query scan
    const found = await prisma.scan.findUnique({
      where: { id: scan.id }
    });

    // Delete test scan
    await prisma.scan.delete({
      where: { id: scan.id }
    });

    const duration = Date.now() - start;
    tests.push({
      name: 'database_operations',
      status: found ? 'pass' : 'fail',
      duration_ms: duration
    });

  } catch (error) {
    tests.push({
      name: 'database_operations',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: OpenAI API connectivity
  try {
    const start = Date.now();

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      signal: AbortSignal.timeout(5000)
    });

    const duration = Date.now() - start;
    tests.push({
      name: 'openai_api',
      status: response.ok ? 'pass' : 'fail',
      duration_ms: duration
    });

  } catch (error) {
    tests.push({
      name: 'openai_api',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Environment variables check
  const requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'NODE_ENV'
  ];

  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  tests.push({
    name: 'environment_variables',
    status: missingEnvVars.length === 0 ? 'pass' : 'fail',
    error: missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(', ')}` : undefined
  });

  // Test 4: File system access
  try {
    const fs = require('fs');
    const testFile = '/tmp/smoke-test.txt';
    fs.writeFileSync(testFile, 'test');
    fs.readFileSync(testFile);
    fs.unlinkSync(testFile);

    tests.push({ name: 'filesystem_access', status: 'pass' });
  } catch (error) {
    tests.push({
      name: 'filesystem_access',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  const allPassed = tests.every(t => t.status === 'pass');
  const failedTests = tests.filter(t => t.status === 'fail');

  res.status(allPassed ? 200 : 500).json({
    status: allPassed ? 'smoke_test_passed' : 'smoke_test_failed',
    tests,
    summary: {
      total: tests.length,
      passed: tests.length - failedTests.length,
      failed: failedTests.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Detailed Metrics Endpoint
 * Use for: Monitoring dashboards, alerting
 * Expected response time: < 100ms
 */
router.get('/health/metrics', async (req: Request, res: Response) => {
  const metrics = {
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform
    },
    database: {
      status: 'unknown' as string,
      connections: 0,
      response_time_ms: 0
    },
    application: {
      version: process.env.APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    metrics.database.response_time_ms = Date.now() - dbStart;
    metrics.database.status = 'connected';

    // Get connection pool info (if available)
    // metrics.database.connections = prisma._engineConfig?.connection?.poolSize || 0;

  } catch (error) {
    metrics.database.status = 'error';
  }

  res.json(metrics);
});

/**
 * Dependency Status Check
 * Use for: Troubleshooting, debugging
 * Expected response time: < 2000ms
 */
router.get('/health/dependencies', async (req: Request, res: Response) => {
  const dependencies = [];

  // Database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT version()`;
    dependencies.push({
      name: 'PostgreSQL',
      status: 'available',
      response_time_ms: Date.now() - dbStart
    });
  } catch (error) {
    dependencies.push({
      name: 'PostgreSQL',
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // OpenAI
  try {
    const openaiStart = Date.now();
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(3000)
    });
    dependencies.push({
      name: 'OpenAI API',
      status: response.ok ? 'available' : 'degraded',
      response_time_ms: Date.now() - openaiStart
    });
  } catch (error) {
    dependencies.push({
      name: 'OpenAI API',
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  res.json({
    dependencies,
    timestamp: new Date().toISOString()
  });
});

/**
 * Helper: Check with caching
 */
async function checkWithCache<T>(
  key: string,
  checkFn: () => Promise<T>
): Promise<T> {
  const cached = healthCache.get(key);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.status;
  }

  const status = await checkFn();
  healthCache.set(key, { status, timestamp: now });

  return status;
}

export default router;
