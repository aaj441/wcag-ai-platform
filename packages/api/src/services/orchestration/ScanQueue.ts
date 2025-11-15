import Bull, { Job } from 'bull';
import { prisma } from '../../lib/prisma';
import { getPuppeteerService, ScanOptions } from './PuppeteerService';
import { log } from '../../utils/logger';

export interface ScanJobData {
  prospectId: string;
  url: string;
  clientId?: string;
  priority?: number;
  maxRetries?: number;
}

export interface ScanJobResult {
  prospectId: string;
  url: string;
  complianceScore: number;
  violations: any[];
  scanTime: number;
  status: 'completed' | 'failed';
  error?: string;
}

/**
 * Scan queue orchestration using Bull and Redis
 * Handles persistent job storage, retries, and monitoring
 */
export class ScanQueue {
  private queue: Bull.Queue<ScanJobData>;
  private puppeteer = getPuppeteerService();
  private isInitialized = false;

  constructor() {
    this.queue = new Bull<ScanJobData>('compliance-scans', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3, // Default: 3 retries
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s...
        },
        removeOnComplete: true, // Remove successful jobs to save memory
        removeOnFail: false, // Keep failed jobs for debugging
      },
      settings: {
        lockDuration: 120000, // 2 minutes lock time
        lockRenewTime: 30000, // Renew lock every 30 seconds
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize queue processors
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Process high priority scans with 2 workers
      await this.queue.process('high', 2, this.processJob.bind(this));

      // Process low priority scans with 1 worker
      await this.queue.process('low', 1, this.processJob.bind(this));

      log.info('✅ ScanQueue initialized and ready');
      this.isInitialized = true;
    } catch (error) {
      log.error('❌ Failed to initialize ScanQueue:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Job processor function
   */
  private async processJob(job: Bull.Job<ScanJobData>): Promise<ScanJobResult> {
    const { prospectId, url, clientId, maxRetries = 2 } = job.data;

    log.info(
      `🔄 Processing scan [Job ${job.id}]: ${url} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
    );

    try {
      // Run scan with Puppeteer
      const scanOptions: ScanOptions = {
        url,
        timeout: 30000,
        maxRetries: 1, // Let Bull handle retries
      };

      const scanResult = await this.puppeteer.scanUrl(scanOptions);

      // Calculate compliance score (0-100)
      const complianceScore = scanResult.score;

      // Save scan to database
      const scan = await prisma.scan.create({
        data: {
          websiteUrl: url,
          clientId: clientId,
          scanResults: JSON.stringify({
            score: scanResult.score,
            violations: scanResult.violations,
            scanTime: scanResult.scanTime,
            timestamp: new Date().toISOString(),
          }),
          aiConfidenceScore: complianceScore / 100, // Convert to 0-1 scale
        },
      });

      // TODO: Update prospect with latest compliance score
      // This would depend on how prospects are linked to scans in your schema

      log.info(
        `✅ Scan completed [Job ${job.id}]: ${url} (Score: ${complianceScore}/100)`
      );

      return {
        prospectId,
        url,
        complianceScore,
        violations: scanResult.violations,
        scanTime: scanResult.scanTime,
        status: 'completed',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      log.error(
        `❌ Scan failed [Job ${job.id}]: ${url} - ${errorMessage} (Attempt ${job.attemptsMade + 1})`
      );

      // Create failure record in database
      try {
        await prisma.scan.create({
          data: {
            websiteUrl: url,
            clientId: clientId,
            scanResults: JSON.stringify({
              error: errorMessage,
              attempts: job.attemptsMade + 1,
              timestamp: new Date().toISOString(),
            }),
            aiConfidenceScore: 0,
          },
        });
      } catch (dbError) {
        log.error('Failed to save failed scan to database:', dbError instanceof Error ? dbError : new Error(String(dbError)));
      }

      // If this is the last attempt, return failure result
      if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
        return {
          prospectId,
          url,
          complianceScore: 0,
          violations: [],
          scanTime: 0,
          status: 'failed',
          error: errorMessage,
        };
      }

      // Throw error to let Bull retry
      throw error;
    }
  }

  /**
   * Add a single scan to the queue
   */
  async addScan(jobData: ScanJobData & { queue?: 'high' | 'low' }): Promise<Job<ScanJobData>> {
    await this.initialize();

    const queue = jobData.queue || 'low';
    const priority = jobData.priority || 5;

    const job = await this.queue.add(queue, jobData, {
      priority,
      jobId: `scan-${jobData.prospectId}-${Date.now()}`, // Deduplicate
      removeOnComplete: true,
      removeOnFail: false,
    });

    log.info(
      `➕ Added scan to ${queue} queue: ${jobData.url} (Priority: ${priority}, JobID: ${job.id})`
    );

    return job;
  }

  /**
   * Add multiple scans to the queue (bulk operation)
   */
  async addScansBulk(
    jobs: ScanJobData[],
    options?: { queue?: 'high' | 'low'; progressCallback?: (index: number) => void }
  ): Promise<Job<ScanJobData>[]> {
    await this.initialize();

    const results: Job<ScanJobData>[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = await this.addScan({
        ...jobs[i],
        queue: options?.queue,
      });
      results.push(job);

      if (options?.progressCallback) {
        options.progressCallback(i + 1);
      }
    }

    log.info(`✅ Bulk added ${jobs.length} scans to queue`);
    return results;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    await this.initialize();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(
    limit: number = 10,
    status: 'completed' | 'failed' | 'active' | 'waiting' = 'completed'
  ): Promise<Job<ScanJobData>[]> {
    await this.initialize();

    switch (status) {
      case 'completed':
        return this.queue.getCompleted(0, limit - 1);
      case 'failed':
        return this.queue.getFailed(0, limit - 1);
      case 'active':
        return this.queue.getActive(0, limit - 1);
      case 'waiting':
        return this.queue.getWaiting(0, limit - 1);
      default:
        return [];
    }
  }

  /**
   * Get failed jobs with details
   */
  async getFailedJobs(limit: number = 20): Promise<
    Array<{
      id: string;
      data: ScanJobData;
      failedReason?: string;
      attemptsMade: number;
    }>
  > {
    await this.initialize();

    const jobs = await this.queue.getFailed(0, limit - 1);

    return jobs.map((job) => ({
      id: job.id as string,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    }));
  }

  /**
   * Retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<void> {
    await this.initialize();

    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.retry();
    log.info(`🔄 Retrying failed job: ${jobId}`);
  }

  /**
   * Clear all jobs from the queue
   */
  async clear(): Promise<void> {
    await this.initialize();
    await this.queue.clean(0, 'completed');
    await this.queue.clean(0, 'failed');
    log.info('🧹 Queue cleared');
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    // Job completed successfully
    this.queue.on('completed', (job: Job<ScanJobData>) => {
      log.debug(`✅ Job ${job.id} completed: ${job.data.url}`);
    });

    // Job failed
    this.queue.on('failed', (job: Job<ScanJobData>, error: Error) => {
      log.error(
        `❌ Job ${job.id} FAILED after ${job.attemptsMade} attempts: ${error.message}`
      );

      // Alert if critical (high priority jobs)
      if ((job.opts.priority || 0) >= 8) {
        this.sendFailureAlert(job, error).catch((alertError) => {
          log.error('Failed to send failure alert:', alertError);
        });
      }
    });

    // Job stalled (took too long)
    this.queue.on('stalled', (job: Job<ScanJobData>) => {
      log.warn(`⚠️ Job ${job.id} stalled: ${job.data.url}`);
    });

    // Queue error
    this.queue.on('error', (error: Error) => {
      log.error('🚨 Queue error:', error);
    });
  }

  /**
   * Send failure alert for critical jobs
   */
  private async sendFailureAlert(job: Job<ScanJobData>, error: Error): Promise<void> {
    log.error(
      `🚨 ALERT: Critical scan failure - Job ${job.id}, URL: ${job.data.url}, Error: ${error.message}`
    );

    // TODO: Integrate with your alerting system (Slack, PagerDuty, Opsgenie, etc.)
    // Example:
    // await sendSlackAlert({
    //   channel: '#alerts',
    //   message: `❌ Scan failed: ${job.data.url}\nError: ${error.message}`,
    // });
  }

  /**
   * Get health status of the queue
   */
  async getHealth(): Promise<{
    healthy: boolean;
    message: string;
    stats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    const stats = await this.getStats();
    const totalFailed = stats.failed;
    const healthy = totalFailed < 10; // Less than 10 failures = healthy

    return {
      healthy,
      message: healthy
        ? `✅ Queue is healthy (${stats.active} active, ${stats.waiting} waiting)`
        : `⚠️ Queue has high failure rate (${stats.failed} failed jobs)`,
      stats: {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
      },
    };
  }

  /**
   * Close the queue gracefully
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      log.info('✅ ScanQueue closed');
    }
  }
}

// Singleton instance
let scanQueueInstance: ScanQueue | null = null;

export function getScanQueue(): ScanQueue {
  if (!scanQueueInstance) {
    scanQueueInstance = new ScanQueue();
  }
  return scanQueueInstance;
}
