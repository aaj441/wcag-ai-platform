// InfinitySoul Scanner - Queue Management
import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { ScanConfig } from './types'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const scanQueue = new Queue('scans', { connection })

export interface ScanJobData extends ScanConfig {
  tenantId: string
  userId?: string
}

export function createScanWorker(scanHandler: (job: Job<ScanJobData>) => Promise<void>) {
  return new Worker<ScanJobData>(
    'scans',
    async (job) => {
      console.log(`Processing scan job ${job.id}`)
      await scanHandler(job)
    },
    {
      connection,
      concurrency: parseInt(process.env.MAX_CONCURRENT_SCANS || '3'),
    }
  )
}

export async function addScanToQueue(data: ScanJobData) {
  return await scanQueue.add('scan', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  })
}
