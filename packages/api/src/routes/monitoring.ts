import { Router, Request, Response } from 'express';
import { getScanQueue } from '../services/orchestration/ScanQueue';
import { getHealthCheckService } from '../services/orchestration/HealthCheckService';
import { getPuppeteerService } from '../services/orchestration/PuppeteerService';
import { SafetyService } from '../services/orchestration/SafetyService';
import { prisma } from '../lib/prisma';
import { log } from '../utils/logger';

const router = Router();
const scanQueue = getScanQueue();
const healthCheckService = getHealthCheckService();
const puppeteerService = getPuppeteerService();

/**
 * GET /api/monitoring/health
 * Comprehensive health check of all components
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const report = await healthCheckService.runHealthCheck();
    const statusCode = report.status === 'healthy' ? 200 : report.status === 'warning' ? 202 : 503;

    res.status(statusCode).json(report);
  } catch (error) {
    log.error('Health check failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * GET /api/monitoring/queue/health
 * Queue-specific health status
 */
router.get('/queue/health', async (req: Request, res: Response) => {
  try {
    const health = await scanQueue.getHealth();
    const statusCode = health.healthy ? 200 : 202;

    res.status(statusCode).json({
      healthy: health.healthy,
      message: health.message,
      stats: health.stats,
      recommendedAction: health.healthy
        ? 'None - queue is operating normally'
        : 'Monitor failed jobs and consider manual intervention',
    });
  } catch (error) {
    log.error('Queue health check failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Queue health check failed',
    });
  }
});

/**
 * GET /api/monitoring/queue/stats
 * Queue statistics and job counts
 */
router.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const stats = await scanQueue.getStats();

    res.json({
      timestamp: new Date(),
      stats,
      total: stats.waiting + stats.active + stats.completed + stats.failed,
      healthStatus:
        stats.failed < 10 ? '✅ Healthy' : stats.failed < 20 ? '⚠️ Warning' : '🚨 Critical',
    });
  } catch (error) {
    log.error('Failed to get queue stats:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get queue stats',
    });
  }
});

/**
 * GET /api/monitoring/queue/failed
 * List failed jobs with error details
 */
router.get('/queue/failed', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const failedJobs = await scanQueue.getFailedJobs(limit);

    res.json({
      count: failedJobs.length,
      jobs: failedJobs.map((job) => ({
        id: job.id,
        url: job.data.url,
        prospectId: job.data.prospectId,
        attempts: job.attemptsMade,
        error: job.failedReason,
      })),
    });
  } catch (error) {
    log.error('Failed to get failed jobs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get failed jobs',
    });
  }
});

/**
 * POST /api/monitoring/queue/retry/:jobId
 * Retry a specific failed job
 */
router.post('/queue/retry/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    await scanQueue.retryFailedJob(jobId);

    res.json({
      success: true,
      message: `Job ${jobId} queued for retry`,
    });
  } catch (error) {
    log.error('Failed to retry job:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retry job',
    });
  }
});

/**
 * GET /api/monitoring/reliability
 * Scan reliability metrics and insights
 */
router.get('/reliability', async (req: Request, res: Response) => {
  try {
    const days = Math.min(Number(req.query.days) || 7, 90);
    const insights = await healthCheckService.getReliabilityInsights(days);

    res.json({
      period: insights.period,
      summary: {
        totalScans: insights.totalScans,
        successfulScans: insights.successfulScans,
        failedScans: insights.failedScans,
        successRate: insights.successRate,
        averageScore: insights.averageScore,
      },
      failureAnalysis: {
        reasons: insights.failureReasons,
        recommendations: this.getFailureRecommendations(insights.failureReasons),
      },
      healthy: parseFloat(insights.successRate) > 90,
    });
  } catch (error) {
    log.error('Failed to get reliability metrics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get reliability metrics',
    });
  }
});

/**
 * GET /api/monitoring/puppeteer
 * Puppeteer-specific metrics
 */
router.get('/puppeteer', async (req: Request, res: Response) => {
  try {
    const health = puppeteerService.getHealth();

    res.json({
      timestamp: new Date(),
      initialized: health.initialized,
      activePages: health.activePages,
      memoryUsageMB: health.memoryUsageMB,
      limits: {
        maxMemoryMB: 800,
        maxConcurrentPages: 3,
      },
      healthStatus:
        health.memoryUsageMB > 800
          ? '🚨 Critical'
          : health.memoryUsageMB > 500
            ? '⚠️ Warning'
            : '✅ Healthy',
    });
  } catch (error) {
    log.error('Failed to get Puppeteer metrics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get Puppeteer metrics',
    });
  }
});

/**
 * GET /api/monitoring/safety
 * Safety metrics and guardrails status
 */
router.get('/safety', async (req: Request, res: Response) => {
  try {
    const metrics = SafetyService.getSafetyMetrics();

    res.json({
      timestamp: metrics.timestamp,
      memoryUsageMB: metrics.memoryUsageMB,
      limits: metrics.limits,
      warnings: metrics.warnings,
      safe: metrics.warnings.length === 0,
    });
  } catch (error) {
    log.error('Failed to get safety metrics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get safety metrics',
    });
  }
});

/**
 * GET /api/monitoring/rate-limit/:clientId
 * Rate limit status for a specific client
 */
router.get('/rate-limit/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const status = await SafetyService.getRateLimitStatus(clientId);

    res.json({
      clientId,
      ...status,
      allowedToScan: status.remaining > 0,
    });
  } catch (error) {
    log.error('Failed to get rate limit status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get rate limit status',
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * Unified dashboard view combining all metrics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [health, queueStats, puppeteerHealth, safetyMetrics, reliability] =
      await Promise.all([
        healthCheckService.runHealthCheck(),
        scanQueue.getStats(),
        Promise.resolve(puppeteerService.getHealth()),
        Promise.resolve(SafetyService.getSafetyMetrics()),
        healthCheckService.getReliabilityInsights(7),
      ]);

    res.json({
      timestamp: new Date(),
      overallHealth: health.status,
      queue: {
        waiting: queueStats.waiting,
        active: queueStats.active,
        failed: queueStats.failed,
        completed: queueStats.completed,
      },
      puppeteer: {
        initialized: puppeteerHealth.initialized,
        activePages: puppeteerHealth.activePages,
        memoryUsageMB: puppeteerHealth.memoryUsageMB,
      },
      safety: {
        memoryUsageMB: safetyMetrics.memoryUsageMB,
        warnings: safetyMetrics.warnings.length,
      },
      reliability: {
        successRate: reliability.successRate,
        averageScore: reliability.averageScore,
        totalScans: reliability.totalScans,
      },
    });
  } catch (error) {
    log.error('Failed to get dashboard:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get dashboard',
    });
  }
});

/**
 * POST /api/monitoring/recover
 * Manually trigger auto-recovery
 */
router.post('/recover', async (req: Request, res: Response) => {
  try {
    log.info('🚀 Manual recovery triggered');
    await healthCheckService.autoRecover();

    const health = await healthCheckService.runHealthCheck();

    res.json({
      success: true,
      message: 'Recovery process completed',
      newStatus: health.status,
      components: health.components,
    });
  } catch (error) {
    log.error('Recovery failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Recovery failed',
    });
  }
});

/**
 * Helper function to get recommendations based on failure reasons
 */
function getFailureRecommendations(
  failureReasons: Record<string, number>
): Record<string, string> {
  const recommendations: Record<string, string> = {};

  if (failureReasons.timeout) {
    recommendations.timeout =
      '⏱️ Increase timeout duration or use retry logic for slow-loading sites';
  }

  if (failureReasons.blocked) {
    recommendations.blocked =
      '🚫 Rotate user agents, add delays, or use proxy services to avoid blocking';
  }

  if (failureReasons.memory) {
    recommendations.memory =
      '💾 Reduce concurrent scans, increase server memory, or restart browser more frequently';
  }

  if (failureReasons.other) {
    recommendations.other = '❓ Review logs for specific error details';
  }

  return recommendations;
}

export default router;
