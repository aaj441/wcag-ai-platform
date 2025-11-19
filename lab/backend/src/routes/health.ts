/**
 * Health check endpoints for Railway and K8s
 * 
 * GET /health - Liveness probe
 * GET /health/ready - Readiness probe with dependency checks
 * GET /health/detailed - Full system status
 */

import { Router, Request, Response } from 'express';
import { config, getConfigSummary } from '../config';

const router = Router();

// Basic liveness check
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check with dependency validation
router.get('/ready', async (req: Request, res: Response) => {
  const checks = {
    server: true,
    redis: config.redis.enabled ? await checkRedis() : null,
    // Add more dependency checks here
  };

  const allHealthy = Object.values(checks).every(v => v === null || v === true);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Detailed system status
router.get('/detailed', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    config: getConfigSummary(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Helper to check Redis connection
async function checkRedis(): Promise<boolean> {
  // Implement actual Redis ping if enabled
  // For now, return true if configured
  return config.redis.enabled;
}

export { router as healthRouter };
