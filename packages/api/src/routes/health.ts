/**
 * Health Check Routes
 * Enhanced health checks for monitoring and alerting
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

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
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    status: 'healthy',
    checks: {
      database: { status: 'unknown', responseTime: 0 },
      stripe: { status: 'unknown' },
      sendgrid: { status: 'unknown' },
      clerk: { status: 'unknown' }
    }
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

  const statusCode = checks.status === 'healthy' ? 200 : 503;
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
