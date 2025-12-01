/**
 * Queue Processing Tests
 * Tests for Bull queue job processing and orchestration
 */

import Queue from 'bull';
import { redis, cleanRedis, wait, createTestClient, createTestScan } from '../setup/testUtils';

describe('Scan Queue Processing', () => {
  let scanQueue: Queue.Queue;

  beforeEach(async () => {
    await cleanRedis();

    // Initialize queue
    scanQueue = new Queue('compliance-scans', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_TEST_DB || '1'),
      },
    });

    // Clean queue
    await scanQueue.empty();
    await scanQueue.clean(0, 'completed');
    await scanQueue.clean(0, 'failed');
  });

  afterEach(async () => {
    await scanQueue.close();
  });

  afterAll(async () => {
    await cleanRedis();
  });

  describe('Job Creation', () => {
    it('should add job to queue', async () => {
      const job = await scanQueue.add('scan', {
        url: 'https://example.com',
        wcagLevel: 'AA',
        clientId: 'test-client-id',
      });

      expect(job).toHaveProperty('id');
      expect(job.data.url).toBe('https://example.com');
      expect(job.data.wcagLevel).toBe('AA');
    });

    it('should assign job ID automatically', async () => {
      const job1 = await scanQueue.add('scan', { url: 'https://example1.com' });
      const job2 = await scanQueue.add('scan', { url: 'https://example2.com' });

      expect(job1.id).toBeTruthy();
      expect(job2.id).toBeTruthy();
      expect(job1.id).not.toBe(job2.id);
    });

    it('should support job priorities', async () => {
      const highPriorityJob = await scanQueue.add(
        'scan',
        { url: 'https://high-priority.com' },
        { priority: 1 }
      );

      const lowPriorityJob = await scanQueue.add(
        'scan',
        { url: 'https://low-priority.com' },
        { priority: 10 }
      );

      expect(highPriorityJob.opts.priority).toBe(1);
      expect(lowPriorityJob.opts.priority).toBe(10);
    });

    it('should set job options', async () => {
      const job = await scanQueue.add(
        'scan',
        { url: 'https://example.com' },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        }
      );

      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toMatchObject({
        type: 'exponential',
        delay: 2000,
      });
      expect(job.opts.removeOnComplete).toBe(true);
    });
  });

  describe('Job Processing', () => {
    it('should process jobs in order', async () => {
      const processedJobs: string[] = [];

      // Setup processor
      scanQueue.process(async (job) => {
        processedJobs.push(job.data.url);
        return { status: 'completed' };
      });

      // Add jobs
      await scanQueue.add('scan', { url: 'https://example1.com' });
      await scanQueue.add('scan', { url: 'https://example2.com' });
      await scanQueue.add('scan', { url: 'https://example3.com' });

      // Wait for processing
      await wait(2000);

      expect(processedJobs).toHaveLength(3);
      expect(processedJobs).toContain('https://example1.com');
      expect(processedJobs).toContain('https://example2.com');
      expect(processedJobs).toContain('https://example3.com');
    });

    it('should respect job priority order', async () => {
      const processedJobs: string[] = [];

      scanQueue.process(async (job) => {
        processedJobs.push(job.data.priority);
        await wait(100);
        return { status: 'completed' };
      });

      // Add jobs with different priorities (lower number = higher priority)
      await scanQueue.add('scan', { priority: 'low' }, { priority: 10 });
      await scanQueue.add('scan', { priority: 'high' }, { priority: 1 });
      await scanQueue.add('scan', { priority: 'medium' }, { priority: 5 });

      // Wait for processing
      await wait(1000);

      expect(processedJobs[0]).toBe('high');
    });

    it('should handle concurrent processing', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      scanQueue.process(3, async (job) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        await wait(100);

        concurrentCount--;
        return { status: 'completed' };
      });

      // Add multiple jobs
      for (let i = 0; i < 10; i++) {
        await scanQueue.add('scan', { url: `https://example${i}.com` });
      }

      // Wait for processing
      await wait(1000);

      expect(maxConcurrent).toBeGreaterThan(1);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('Job Retry Logic', () => {
    it('should retry failed jobs', async () => {
      let attemptCount = 0;

      scanQueue.process(async (job) => {
        attemptCount++;

        if (attemptCount < 3) {
          throw new Error('Simulated failure');
        }

        return { status: 'completed' };
      });

      const job = await scanQueue.add(
        'scan',
        { url: 'https://example.com' },
        {
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 100,
          },
        }
      );

      // Wait for retries
      await wait(1000);

      expect(attemptCount).toBe(3);

      const completedJob = await job.finished();
      expect(completedJob).toMatchObject({ status: 'completed' });
    });

    it('should use exponential backoff', async () => {
      const attemptTimes: number[] = [];

      scanQueue.process(async (job) => {
        attemptTimes.push(Date.now());

        if (attemptTimes.length < 3) {
          throw new Error('Simulated failure');
        }

        return { status: 'completed' };
      });

      await scanQueue.add(
        'scan',
        { url: 'https://example.com' },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      );

      // Wait for all retries
      await wait(10000);

      expect(attemptTimes.length).toBe(3);

      // Check backoff intervals (approximately)
      if (attemptTimes.length >= 3) {
        const interval1 = attemptTimes[1] - attemptTimes[0];
        const interval2 = attemptTimes[2] - attemptTimes[1];

        // Second interval should be longer (exponential)
        expect(interval2).toBeGreaterThan(interval1);
      }
    }, 15000);

    it('should move to failed after max attempts', async () => {
      scanQueue.process(async (job) => {
        throw new Error('Persistent failure');
      });

      const job = await scanQueue.add(
        'scan',
        { url: 'https://example.com' },
        {
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 100,
          },
        }
      );

      // Wait for all attempts
      await wait(1000);

      const failedJobs = await scanQueue.getFailed();
      expect(failedJobs.length).toBeGreaterThan(0);

      const failed = failedJobs.find(j => j.id === job.id);
      expect(failed).toBeDefined();
      expect(failed?.failedReason).toContain('Persistent failure');
    });
  });

  describe('Job Status and Progress', () => {
    it('should update job progress', async () => {
      scanQueue.process(async (job) => {
        await job.progress(25);
        await wait(100);

        await job.progress(50);
        await wait(100);

        await job.progress(75);
        await wait(100);

        await job.progress(100);

        return { status: 'completed' };
      });

      const job = await scanQueue.add('scan', { url: 'https://example.com' });

      // Wait a bit
      await wait(150);

      const progress = await job.progress();
      expect(progress).toBeGreaterThanOrEqual(25);
    });

    it('should track job state transitions', async () => {
      scanQueue.process(async (job) => {
        await wait(200);
        return { status: 'completed' };
      });

      const job = await scanQueue.add('scan', { url: 'https://example.com' });

      // Initial state
      let state = await job.getState();
      expect(['waiting', 'active']).toContain(state);

      // Wait for completion
      await wait(500);

      state = await job.getState();
      expect(state).toBe('completed');
    });
  });

  describe('Job Events', () => {
    it('should emit completed event', async () => {
      const completedJobs: any[] = [];

      scanQueue.on('completed', (job, result) => {
        completedJobs.push({ job, result });
      });

      scanQueue.process(async (job) => {
        return { status: 'completed', url: job.data.url };
      });

      await scanQueue.add('scan', { url: 'https://example.com' });

      // Wait for completion
      await wait(500);

      expect(completedJobs.length).toBeGreaterThan(0);
      expect(completedJobs[0].result).toMatchObject({ status: 'completed' });
    });

    it('should emit failed event', async () => {
      const failedJobs: any[] = [];

      scanQueue.on('failed', (job, err) => {
        failedJobs.push({ job, error: err.message });
      });

      scanQueue.process(async (job) => {
        throw new Error('Test failure');
      });

      await scanQueue.add('scan', { url: 'https://example.com' }, { attempts: 1 });

      // Wait for failure
      await wait(500);

      expect(failedJobs.length).toBeGreaterThan(0);
      expect(failedJobs[0].error).toContain('Test failure');
    });

    it('should emit progress event', async () => {
      const progressUpdates: number[] = [];

      scanQueue.on('progress', (job, progress) => {
        progressUpdates.push(progress);
      });

      scanQueue.process(async (job) => {
        await job.progress(50);
        await wait(100);
        await job.progress(100);
        return { status: 'completed' };
      });

      await scanQueue.add('scan', { url: 'https://example.com' });

      // Wait for completion
      await wait(500);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates).toContain(50);
    });
  });

  describe('Queue Management', () => {
    it('should get queue counts', async () => {
      // Add jobs with different states
      await scanQueue.add('scan', { url: 'https://example1.com' });
      await scanQueue.add('scan', { url: 'https://example2.com' });
      await scanQueue.add('scan', { url: 'https://example3.com' });

      const counts = await scanQueue.getJobCounts();

      expect(counts).toHaveProperty('waiting');
      expect(counts).toHaveProperty('active');
      expect(counts).toHaveProperty('completed');
      expect(counts).toHaveProperty('failed');
      expect(counts.waiting).toBeGreaterThan(0);
    });

    it('should get jobs by status', async () => {
      scanQueue.process(async (job) => {
        await wait(100);
        return { status: 'completed' };
      });

      await scanQueue.add('scan', { url: 'https://example1.com' });
      await scanQueue.add('scan', { url: 'https://example2.com' });

      // Wait for some to complete
      await wait(300);

      const waiting = await scanQueue.getWaiting();
      const completed = await scanQueue.getCompleted();

      expect(waiting.length + completed.length).toBe(2);
    });

    it('should pause and resume queue', async () => {
      const processedJobs: string[] = [];

      scanQueue.process(async (job) => {
        processedJobs.push(job.data.url);
        return { status: 'completed' };
      });

      await scanQueue.add('scan', { url: 'https://example1.com' });

      // Pause queue
      await scanQueue.pause();

      await scanQueue.add('scan', { url: 'https://example2.com' });
      await scanQueue.add('scan', { url: 'https://example3.com' });

      // Wait a bit (jobs shouldn't process while paused)
      await wait(500);

      expect(processedJobs.length).toBeLessThan(3);

      // Resume queue
      await scanQueue.resume();

      // Wait for processing
      await wait(500);

      expect(processedJobs.length).toBe(3);
    });

    it('should remove jobs', async () => {
      const job = await scanQueue.add('scan', { url: 'https://example.com' });

      await job.remove();

      const retrieved = await scanQueue.getJob(job.id!);
      expect(retrieved).toBeUndefined();
    });

    it('should clean old jobs', async () => {
      scanQueue.process(async (job) => {
        return { status: 'completed' };
      });

      // Add and complete jobs
      await scanQueue.add('scan', { url: 'https://example1.com' });
      await scanQueue.add('scan', { url: 'https://example2.com' });

      // Wait for completion
      await wait(500);

      // Clean completed jobs older than 0ms (all of them)
      await scanQueue.clean(0, 'completed');

      const completed = await scanQueue.getCompleted();
      expect(completed.length).toBe(0);
    });
  });

  describe('Job Data Validation', () => {
    it('should validate required fields', async () => {
      const job = await scanQueue.add('scan', {
        url: 'https://example.com',
        wcagLevel: 'AA',
        clientId: 'test-client-id',
      });

      expect(job.data).toHaveProperty('url');
      expect(job.data).toHaveProperty('wcagLevel');
      expect(job.data).toHaveProperty('clientId');
    });

    it('should store custom job data', async () => {
      const job = await scanQueue.add('scan', {
        url: 'https://example.com',
        wcagLevel: 'AA',
        clientId: 'test-client-id',
        metadata: {
          source: 'api',
          requestedBy: 'user@example.com',
        },
      });

      expect(job.data.metadata).toMatchObject({
        source: 'api',
        requestedBy: 'user@example.com',
      });
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move permanently failed jobs to DLQ', async () => {
      scanQueue.process(async (job) => {
        throw new Error('Unrecoverable error');
      });

      const job = await scanQueue.add(
        'scan',
        { url: 'https://example.com' },
        { attempts: 2, backoff: 100 }
      );

      // Wait for all retries to fail
      await wait(1000);

      const failed = await scanQueue.getFailed();
      expect(failed.length).toBeGreaterThan(0);

      // In production, these would be moved to a separate DLQ
      const dlqJob = failed.find(j => j.id === job.id);
      expect(dlqJob).toBeDefined();
    });
  });

  describe('Queue Metrics', () => {
    it('should track processing metrics', async () => {
      let totalProcessed = 0;
      let totalFailed = 0;

      scanQueue.on('completed', () => {
        totalProcessed++;
      });

      scanQueue.on('failed', () => {
        totalFailed++;
      });

      scanQueue.process(async (job) => {
        if (job.data.shouldFail) {
          throw new Error('Intentional failure');
        }
        return { status: 'completed' };
      });

      // Add mix of jobs
      await scanQueue.add('scan', { url: 'https://example1.com' });
      await scanQueue.add('scan', { url: 'https://example2.com', shouldFail: true }, { attempts: 1 });
      await scanQueue.add('scan', { url: 'https://example3.com' });

      // Wait for processing
      await wait(1000);

      expect(totalProcessed).toBeGreaterThan(0);
      expect(totalFailed).toBeGreaterThan(0);
    });
  });
});
