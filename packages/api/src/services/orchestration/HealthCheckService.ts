import { getPuppeteerService } from './PuppeteerService';
import { getScanQueue } from './ScanQueue';
import { prisma } from '../../lib/prisma';
import { log } from '../../utils/logger';

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastChecked: Date;
  details?: Record<string, any>;
}

export interface HealthReport {
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
  components: Record<string, ComponentHealth>;
  metrics: {
    successRate: string;
    averageScanTime: number;
    memoryUsageMB: number;
  };
}

/**
 * Comprehensive health check service for monitoring all components
 */
export class HealthCheckService {
  private puppeteer = getPuppeteerService();
  private scanQueue = getScanQueue();

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthReport> {
    const timestamp = new Date();
    const report: HealthReport = {
      timestamp,
      status: 'healthy',
      components: {},
      metrics: {
        successRate: '0%',
        averageScanTime: 0,
        memoryUsageMB: 0,
      },
    };

    log.info('🏥 Starting health check...');

    // Check Redis/Queue connection
    report.components.queue = await this.checkQueue();
    if (report.components.queue.status === 'critical') {
      report.status = 'critical';
    } else if (report.components.queue.status === 'warning') {
      report.status = report.status === 'critical' ? 'critical' : 'warning';
    }

    // Check Puppeteer
    report.components.puppeteer = await this.checkPuppeteer();
    if (report.components.puppeteer.status === 'critical') {
      report.status = 'critical';
    } else if (report.components.puppeteer.status === 'warning') {
      report.status = report.status === 'critical' ? 'critical' : 'warning';
    }

    // Check Database
    report.components.database = await this.checkDatabase();
    if (report.components.database.status === 'critical') {
      report.status = 'critical';
    } else if (report.components.database.status === 'warning') {
      report.status = report.status === 'critical' ? 'critical' : 'warning';
    }

    // Calculate metrics
    await this.calculateMetrics(report);

    log.info(`🏥 Health check complete: ${report.status}`);

    return report;
  }

  /**
   * Check queue health
   */
  private async checkQueue(): Promise<ComponentHealth> {
    try {
      const health = await this.scanQueue.getHealth();
      const stats = health.stats;

      const status: 'healthy' | 'warning' | 'critical' = health.healthy
        ? 'healthy'
        : stats.failed > 20
          ? 'critical'
          : 'warning';

      return {
        status,
        message: health.message,
        lastChecked: new Date(),
        details: {
          waiting: stats.waiting,
          active: stats.active,
          completed: stats.completed,
          failed: stats.failed,
        },
      };
    } catch (error) {
      log.error('❌ Queue health check failed:', error instanceof Error ? error : new Error(String(error)));
      return {
        status: 'critical',
        message: `Queue error: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check Puppeteer health
   */
  private async checkPuppeteer(): Promise<ComponentHealth> {
    try {
      const health = this.puppeteer.getHealth();

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let message = '✅ Puppeteer operational';

      if (!health.initialized) {
        status = 'warning';
        message = '⚠️ Puppeteer not initialized';
      } else if (health.memoryUsageMB > 800) {
        status = 'critical';
        message = `🚨 Memory critical: ${health.memoryUsageMB}MB`;
      } else if (health.memoryUsageMB > 500) {
        status = 'warning';
        message = `⚠️ High memory: ${health.memoryUsageMB}MB`;
      } else if (health.activePages > 5) {
        status = 'warning';
        message = `⚠️ High concurrent pages: ${health.activePages}`;
      }

      return {
        status,
        message,
        lastChecked: new Date(),
        details: {
          initialized: health.initialized,
          activePages: health.activePages,
          memoryUsageMB: health.memoryUsageMB,
        },
      };
    } catch (error) {
      log.error('❌ Puppeteer health check failed:', error instanceof Error ? error : new Error(String(error)));
      return {
        status: 'critical',
        message: `Puppeteer error: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    try {
      // Simple ping to check database connection
      const result = await prisma.$queryRaw`SELECT 1`;

      if (!result) {
        return {
          status: 'critical',
          message: '❌ Database connection failed',
          lastChecked: new Date(),
        };
      }

      // Get scan count
      const scanCount = await prisma.scan.count();

      return {
        status: 'healthy',
        message: `✅ Database operational (${scanCount} scans)`,
        lastChecked: new Date(),
        details: { scanCount },
      };
    } catch (error) {
      log.error('❌ Database health check failed:', error instanceof Error ? error : new Error(String(error)));
      return {
        status: 'critical',
        message: `Database error: ${error instanceof Error ? error.message : String(error)}`,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Calculate reliability metrics
   */
  private async calculateMetrics(report: HealthReport): Promise<void> {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const scans = await prisma.scan.findMany({
        where: {
          createdAt: {
            gte: last24h,
          },
        },
        select: {
          aiConfidenceScore: true,
          scanResults: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (scans.length === 0) {
        report.metrics.successRate = 'N/A (no scans)';
        report.metrics.averageScanTime = 0;
        return;
      }

      // Calculate success rate
      const successful = scans.filter((s: any) => s.aiConfidenceScore > 0).length;
      const successRate = ((successful / scans.length) * 100).toFixed(2);
      report.metrics.successRate = `${successRate}%`;

      // Calculate average scan time
      const totalTime = scans.reduce((sum: number, s: any) => {
        const time = s.updatedAt.getTime() - s.createdAt.getTime();
        return sum + time;
      }, 0);
      report.metrics.averageScanTime = Math.round(totalTime / scans.length);

      // Get current memory usage
      const usage = process.memoryUsage();
      report.metrics.memoryUsageMB = Math.round(usage.heapUsed / 1024 / 1024);
    } catch (error) {
      log.error('Failed to calculate metrics:', error instanceof Error ? error : new Error(String(error)));
      report.metrics.successRate = 'error';
      report.metrics.averageScanTime = 0;
    }
  }

  /**
   * Auto-recover from failures
   */
  async autoRecover(): Promise<void> {
    const report = await this.runHealthCheck();

    if (report.status === 'critical') {
      log.error('🚨 Critical health issue detected, attempting recovery...');

      for (const [component, health] of Object.entries(report.components)) {
        if (health.status === 'critical') {
          log.info(`🔧 Attempting recovery for: ${component}`);

          try {
            switch (component) {
              case 'puppeteer':
                await this.puppeteer.close();
                await this.puppeteer.initialize();
                log.info(`✅ Recovered Puppeteer`);
                break;

              case 'database':
                // Reconnect to database by using a fresh query
                await prisma.$disconnect();
                log.info(`✅ Reconnected to database`);
                break;

              case 'queue':
                // Queue issues typically require manual intervention
                log.warn(`⚠️ Queue critical - manual intervention may be needed`);
                break;
            }
          } catch (error) {
            log.error(`❌ Recovery failed for ${component}:`, error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    } else if (report.status === 'warning') {
      log.warn('⚠️ Health warning detected, monitoring...');
    }
  }

  /**
   * Get reliability insights from the last N days
   */
  async getReliabilityInsights(days: number = 7): Promise<{
    period: string;
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    successRate: string;
    averageScore: number;
    failureReasons: Record<string, number>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scans = await prisma.scan.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        aiConfidenceScore: true,
        scanResults: true,
        createdAt: true,
      },
    });

    const successful = scans.filter((s: any) => s.aiConfidenceScore > 0).length;
    const failed = scans.length - successful;
    const successRate = ((successful / scans.length) * 100).toFixed(2);
    const averageScore =
      scans.reduce((sum: number, s: any) => sum + s.aiConfidenceScore, 0) / scans.length;

    // Parse failure reasons from scan results
    const failureReasons: Record<string, number> = {};
    scans.forEach((scan: any) => {
      try {
        const results = typeof scan.scanResults === 'string'
          ? JSON.parse(scan.scanResults)
          : scan.scanResults;

        if (results.error) {
          const reason = results.error.includes('timeout')
            ? 'timeout'
            : results.error.includes('blocked')
              ? 'blocked'
              : results.error.includes('memory')
                ? 'memory'
                : 'other';

          failureReasons[reason] = (failureReasons[reason] || 0) + 1;
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    return {
      period: `Last ${days} days`,
      totalScans: scans.length,
      successfulScans: successful,
      failedScans: failed,
      successRate: `${successRate}%`,
      averageScore: Math.round(averageScore * 100) / 100,
      failureReasons,
    };
  }
}

// Singleton instance
let healthCheckServiceInstance: HealthCheckService | null = null;

export function getHealthCheckService(): HealthCheckService {
  if (!healthCheckServiceInstance) {
    healthCheckServiceInstance = new HealthCheckService();
  }
  return healthCheckServiceInstance;
}
