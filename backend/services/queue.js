// backend/services/queue.js - BullMQ Redis Queue Infrastructure
const { Queue, Worker } = require('bullmq');
const ScanService = require('./scanner');

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Initialize scan queue
const ScanQueue = new Queue('scans', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s → 4s → 8s
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
});

// Worker function (runs in separate process in production)
const createWorker = () => {
  const worker = new Worker(
    'scans',
    async (job) => {
      console.log(`[Worker] Processing scan job ${job.id}`);
      console.log(`[Worker] URL: ${job.data.url}`);

      try {
        // Update progress: 10%
        await job.updateProgress(10);

        // Initialize scanner
        const scanner = new ScanService(job.data);

        // Update progress: 30%
        await job.updateProgress(30);

        // Run scan
        const results = await scanner.scan();

        // Update progress: 100%
        await job.updateProgress(100);

        console.log(`[Worker] Scan completed for ${job.data.url}`);
        console.log(`[Worker] Found ${results.summary.totalViolations} violations`);

        return results;
      } catch (error) {
        console.error(`[Worker] Scan failed for ${job.data.url}:`, error);
        throw error; // Will trigger retry with backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000, // Per 60 seconds
      },
    }
  );

  // Worker event listeners
  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  return worker;
};

// Graceful shutdown
const shutdown = async () => {
  console.log('[Queue] Shutting down gracefully...');
  
  try {
    await ScanQueue.close();
    console.log('[Queue] Queue closed');
    
    if (global.scanWorker) {
      await global.scanWorker.close();
      console.log('[Queue] Worker closed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[Queue] Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Queue utility functions
const addScanJob = async (data) => {
  try {
    const job = await ScanQueue.add('scan', data, {
      jobId: data.scanId || undefined, // Use provided scanId or auto-generate
    });
    
    console.log(`[Queue] Added job ${job.id} for ${data.url}`);
    return job;
  } catch (error) {
    console.error('[Queue] Failed to add job:', error);
    throw error;
  }
};

const getScanJob = async (jobId) => {
  try {
    const job = await ScanQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();
    
    return {
      id: job.id,
      data: job.data,
      state,
      progress,
      result: job.returnvalue,
      createdAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    };
  } catch (error) {
    console.error('[Queue] Failed to get job:', error);
    throw error;
  }
};

const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      ScanQueue.getWaitingCount(),
      ScanQueue.getActiveCount(),
      ScanQueue.getCompletedCount(),
      ScanQueue.getFailedCount(),
      ScanQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    console.error('[Queue] Failed to get queue stats:', error);
    return null;
  }
};

module.exports = {
  ScanQueue,
  createWorker,
  addScanJob,
  getScanJob,
  getQueueStats,
  shutdown,
};
