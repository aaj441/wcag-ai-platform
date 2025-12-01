import { Worker, Job } from 'bullmq'
import { ScanJobData } from '@infinitysoul/scanner'
import { logger } from './logger'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

/**
 * Process a scan job
 */
async function processScanJob(job: Job<ScanJobData>): Promise<void> {
  const { url, wcagLevel, scanType, tenantId } = job.data

  logger.info('Processing scan job', {
    jobId: job.id,
    url,
    wcagLevel,
    scanType,
    tenantId,
  })

  try {
    // Update progress
    await job.updateProgress(10)

    // TODO: Implement actual scan processing
    // 1. Launch Puppeteer browser
    // 2. Run axe-core scan
    // 3. Analyze violations with AI
    // 4. Calculate confidence scores
    // 5. Generate executive summary
    // 6. Save results to database

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await job.updateProgress(50)

    await new Promise((resolve) => setTimeout(resolve, 2000))
    await job.updateProgress(90)

    logger.info('Scan job completed', {
      jobId: job.id,
      url,
    })

    await job.updateProgress(100)
  } catch (error) {
    logger.error('Error processing scan job', {
      jobId: job.id,
      error,
    })
    throw error
  }
}

/**
 * Create and start the scan worker
 */
export function startScanWorker(): Worker {
  const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '5')

  const worker = new Worker('scans', processScanJob, {
    connection,
    concurrency,
  })

  worker.on('completed', (job) => {
    logger.info('Job completed', {
      jobId: job.id,
      returnValue: job.returnvalue,
    })
  })

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      jobId: job?.id,
      error: err.message,
    })
  })

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err })
  })

  logger.info('Scan worker started', { concurrency })

  return worker
}

// If this file is run directly, start the worker
if (require.main === module) {
  logger.info('Starting standalone scan worker')
  const worker = startScanWorker()

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing worker')
    await worker.close()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing worker')
    await worker.close()
    process.exit(0)
  })
}
