import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType;

export async function connectRedis(): Promise<RedisClientType> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisPassword = process.env.REDIS_PASSWORD;
    
    redisClient = createClient({
      url: redisUrl,
      password: redisPassword,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });
    
    // Error handling
    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
    
    await redisClient.connect();
    
    // Test connection
    await redisClient.ping();
    logger.info('Redis connection test successful');
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

// Cache utilities
export async function setCache(
  key: string, 
  value: any, 
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttlSeconds, serializedValue);
    logger.debug(`Cache set for key: ${key}, TTL: ${ttlSeconds}s`);
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
    throw error;
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    
    if (value === null) {
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    }
    
    logger.debug(`Cache hit for key: ${key}`);
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
    logger.debug(`Cache deleted for key: ${key}`);
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
    throw error;
  }
}

export async function existsCache(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error(`Error checking cache existence for key ${key}:`, error);
    return false;
  }
}

// Session utilities
export async function setSession(
  sessionId: string, 
  sessionData: any, 
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  const key = `session:${sessionId}`;
  await setCache(key, sessionData, ttlSeconds);
}

export async function getSession<T>(sessionId: string): Promise<T | null> {
  const key = `session:${sessionId}`;
  return await getCache<T>(key);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const key = `session:${sessionId}`;
  await deleteCache(key);
}

// Rate limiting utilities
export async function incrementRateLimit(
  identifier: string, 
  windowSeconds: number = 900, // 15 minutes
  maxRequests: number = 100
): Promise<{ count: number; remaining: number; isLimited: boolean }> {
  try {
    const client = getRedisClient();
    const key = `rate_limit:${identifier}`;
    const pipeline = client.multi();
    
    // Increment counter
    pipeline.incr(key);
    
    // Set expiration if this is the first request in the window
    pipeline.expire(key, windowSeconds);
    
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number || 0;
    const remaining = Math.max(0, maxRequests - count);
    const isLimited = count > maxRequests;
    
    return { count, remaining, isLimited };
  } catch (error) {
    logger.error('Error incrementing rate limit:', error);
    // Fail open - allow the request if Redis is down
    return { count: 0, remaining: maxRequests, isLimited: false };
  }
}

// Queue utilities for background jobs
export async function addToQueue(
  queueName: string, 
  jobData: any, 
  priority: number = 0
): Promise<void> {
  try {
    const client = getRedisClient();
    const job = {
      id: generateJobId(),
      data: jobData,
      priority,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    
    await client.lPush(
      `queue:${queueName}`, 
      JSON.stringify(job)
    );
    
    logger.debug(`Job added to queue ${queueName}: ${job.id}`);
  } catch (error) {
    logger.error(`Error adding job to queue ${queueName}:`, error);
    throw error;
  }
}

export async function getNextJob(queueName: string): Promise<any | null> {
  try {
    const client = getRedisClient();
    const jobJson = await client.rPop(`queue:${queueName}`);
    
    if (!jobJson) {
      return null;
    }
    
    const job = JSON.parse(jobJson);
    logger.debug(`Job retrieved from queue ${queueName}: ${job.id}`);
    return job;
  } catch (error) {
    logger.error(`Error getting job from queue ${queueName}:`, error);
    return null;
  }
}

// Analytics utilities
export async function trackEvent(
  event: string, 
  properties: Record<string, any> = {},
  ttlSeconds: number = 2592000 // 30 days
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `analytics:${event}`;
    const timestamp = new Date().toISOString();
    
    const eventData = {
      timestamp,
      properties,
    };
    
    await client.lPush(key, JSON.stringify(eventData));
    await client.expire(key, ttlSeconds);
    
    logger.debug(`Event tracked: ${event}`);
  } catch (error) {
    logger.error(`Error tracking event ${event}:`, error);
  }
}

// Cleanup utilities
export async function cleanupExpiredData(): Promise<void> {
  try {
    const client = getRedisClient();
    const patterns = [
      'session:*',
      'rate_limit:*',
      'cache:*',
    ];
    
    let totalDeleted = 0;
    
    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        const deleted = await client.del(keys);
        totalDeleted += deleted;
      }
    }
    
    logger.info(`Cleaned up ${totalDeleted} expired Redis keys`);
  } catch (error) {
    logger.error('Error cleaning up expired Redis data:', error);
  }
}

// Health check for Redis
export async function redisHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> {
  try {
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;
    
    const info = await redisClient.info();
    const memory = await redisClient.info('memory');
    
    return {
      status: 'healthy',
      details: {
        responseTime: `${responseTime}ms`,
        memory: memory,
        info: info,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Helper function to generate job IDs
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
}