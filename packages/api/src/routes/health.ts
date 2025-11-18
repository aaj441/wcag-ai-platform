/**
 * Health Check Routes
 * Enhanced health checks for monitoring and alerting
 *
 * MEGA PROMPT 1 Enhancements:
 * - Circuit breaker health monitoring
 * - Queue capacity tracking
 * - System resource monitoring
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getCircuitBreakerHealth } from '../services/orchestration/ExternalAPIClient';
import { getScanQueue } from '../services/orchestration/ScanQueue';

const router = Router();

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
    const scanQueueInstance = getScanQueue();
    if (scanQueueInstance) {
      // Try to get stats as a health check for Redis
      await scanQueueInstance.getStats();
      checks.checks.redis = { status: 'healthy' };
    } else {
      checks.checks.redis = { status: 'not_configured' };
    }
  } catch (error) {
    checks.status = 'degraded';
    checks.checks.redis = { status: 'unhealthy' };
  }

  // Circuit Breaker Health (MEGA PROMPT 1)
  try {
    const breakerHealth = getCircuitBreakerHealth();
    checks.circuitBreakers = {
      healthy: breakerHealth.healthy,
      services: breakerHealth.services,
    };

    // Mark system as degraded if any breakers are OPEN
    if (!breakerHealth.healthy) {
      checks.status = 'degraded';
    }
  } catch (error) {
    // Circuit breaker monitoring not critical
    checks.circuitBreakers = { healthy: true, services: {} };
  }

  // Queue Capacity Tracking (MEGA PROMPT 1)
  try {
    const scanQueueInstance = getScanQueue();
    if (scanQueueInstance) {
      const stats = await scanQueueInstance.getStats();

      const maxCapacity = 100; // Configure based on your system
      const totalJobs = stats.waiting + stats.active;
      const utilizationPercent = Math.round((totalJobs / maxCapacity) * 100);

      checks.queue = {
        capacity: utilizationPercent < 80 ? 'healthy' : utilizationPercent < 95 ? 'warning' : 'critical',
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        utilizationPercent,
        maxCapacity,
        stats,
      };

      // Mark as degraded if queue is near capacity
      if (utilizationPercent >= 95) {
        checks.status = 'degraded';
      }
    }
  } catch (error) {
    // Queue monitoring not critical
    checks.queue.capacity = 'unknown';
  }

  // System Resource Monitoring
  const mem = process.memoryUsage();
  checks.system.memory = {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
    rss: Math.round(mem.rss / 1024 / 1024), // MB
    external: Math.round(mem.external / 1024 / 1024), // MB
  };

  // Determine final status code
  const statusCode = checks.status === 'healthy' ? 200 :
                     checks.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(checks);
});

// Readiness check (for Kubernetes/Railway)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

// Liveness check (for Kubernetes/Railway)
router.get('/live', (req: Request, res: Response) => {
  res.json({ alive: true });
});

// Metrics endpoint (Prometheus-compatible)
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
