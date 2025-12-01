/**
 * Redis Rate Limiting Tests
 * Tests for API rate limiting using Redis
 */

import { api, redis, cleanRedis, wait, generateTestToken } from '../setup/testUtils';

describe('Redis Rate Limiting', () => {
  beforeEach(async () => {
    await cleanRedis();
  });

  afterAll(async () => {
    await cleanRedis();
  });

  describe('API Endpoint Rate Limiting', () => {
    it('should enforce rate limit on API endpoints', async () => {
      const authToken = generateTestToken();
      const endpoint = '/api/scans';

      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          api.get(endpoint).set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should succeed, some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const authToken = generateTestToken();

      const response = await api
        .get('/api/scans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should reset rate limit after window expires', async () => {
      const authToken = generateTestToken();
      const endpoint = '/api/scans';

      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        await api.get(endpoint).set('Authorization', `Bearer ${authToken}`);
      }

      // Should be rate limited
      let response = await api
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);
      expect(response.status).toBe(429);

      // Wait for rate limit window to reset (e.g., 1 minute)
      await wait(61000); // 61 seconds

      // Should work again
      response = await api.get(endpoint).set('Authorization', `Bearer ${authToken}`);
      expect(response.status).not.toBe(429);
    }, 70000); // Increase timeout for this test

    it('should apply different limits for different endpoints', async () => {
      const authToken = generateTestToken();

      // Public endpoints might have stricter limits
      const publicResponse = await api.get('/health');
      const publicLimit = parseInt(publicResponse.headers['x-ratelimit-limit'] || '0');

      // Authenticated endpoints might have higher limits
      const authResponse = await api
        .get('/api/scans')
        .set('Authorization', `Bearer ${authToken}`);
      const authLimit = parseInt(authResponse.headers['x-ratelimit-limit'] || '0');

      // Auth endpoints should typically have higher limits
      expect(authLimit).toBeGreaterThanOrEqual(publicLimit);
    });

    it('should track rate limits per user', async () => {
      const token1 = generateTestToken({ sub: 'user-1' });
      const token2 = generateTestToken({ sub: 'user-2' });

      // User 1 makes requests
      for (let i = 0; i < 50; i++) {
        await api.get('/api/scans').set('Authorization', `Bearer ${token1}`);
      }

      // User 2 should still have full limit
      const response = await api
        .get('/api/scans')
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).not.toBe(429);
      const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');
      expect(remaining).toBeGreaterThan(50);
    });
  });

  describe('AI Service Rate Limiting', () => {
    it('should enforce daily AI cost limits', async () => {
      const authToken = generateTestToken();

      // Track AI usage in Redis
      const userId = 'test-user-id';
      const today = new Date().toISOString().split('T')[0];
      const key = `ai-cost:${userId}:${today}`;

      // Set cost near daily limit
      await redis.set(key, '990'); // $990 spent, limit is $1000

      // Try to make expensive AI request
      const response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          violationId: 'test-violation-id',
          aiProvider: 'openai',
        });

      // Should succeed (under limit)
      expect(response.status).not.toBe(429);
    });

    it('should block requests when daily AI limit exceeded', async () => {
      const authToken = generateTestToken();

      // Set cost over daily limit
      const userId = 'test-user-id';
      const today = new Date().toISOString().split('T')[0];
      const key = `ai-cost:${userId}:${today}`;
      await redis.set(key, '1100'); // Over $1000 limit

      const response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          violationId: 'test-violation-id',
          aiProvider: 'openai',
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/daily ai cost limit/i);
    });

    it('should reset AI cost limits daily', async () => {
      const userId = 'test-user-id';
      const today = new Date().toISOString().split('T')[0];
      const key = `ai-cost:${userId}:${today}`;

      // Set high cost
      await redis.set(key, '1000', 'EX', 86400); // 24 hour TTL

      // Check TTL
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(86400);
    });
  });

  describe('Scan Queue Rate Limiting', () => {
    it('should limit concurrent scans per client', async () => {
      const authToken = generateTestToken();
      const clientId = 'test-client-id';

      // Track concurrent scans
      const key = `concurrent-scans:${clientId}`;
      await redis.set(key, '5'); // 5 scans already running

      const response = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId,
        });

      // Should either queue or reject based on limit
      if (response.status === 429) {
        expect(response.body.error).toMatch(/concurrent scan limit/i);
      } else {
        expect(response.status).toBe(201);
      }
    });

    it('should allow scans when under concurrent limit', async () => {
      const authToken = generateTestToken();
      const clientId = 'test-client-id';

      // Set low concurrent count
      const key = `concurrent-scans:${clientId}`;
      await redis.set(key, '2'); // Only 2 scans running

      const response = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Redis Cache Performance', () => {
    it('should cache scan results', async () => {
      const scanId = 'test-scan-id';
      const scanData = {
        id: scanId,
        url: 'https://example.com',
        complianceScore: 85.5,
        violations: [],
      };

      // Set cache
      await redis.setex(
        `scan:${scanId}`,
        3600,
        JSON.stringify(scanData)
      );

      // Retrieve from cache
      const cached = await redis.get(`scan:${scanId}`);
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.complianceScore).toBe(85.5);
    });

    it('should invalidate cache when data updates', async () => {
      const scanId = 'test-scan-id';

      // Set cache
      await redis.set(`scan:${scanId}`, JSON.stringify({ id: scanId }));

      // Invalidate
      await redis.del(`scan:${scanId}`);

      // Should be gone
      const cached = await redis.get(`scan:${scanId}`);
      expect(cached).toBeNull();
    });

    it('should use cache tags for batch invalidation', async () => {
      const clientId = 'test-client-id';

      // Set multiple scans with client tag
      await redis.set(`scan:1`, JSON.stringify({ clientId }));
      await redis.set(`scan:2`, JSON.stringify({ clientId }));
      await redis.sadd(`client:${clientId}:scans`, 'scan:1', 'scan:2');

      // Invalidate all scans for client
      const scanKeys = await redis.smembers(`client:${clientId}:scans`);
      for (const key of scanKeys) {
        await redis.del(key);
      }
      await redis.del(`client:${clientId}:scans`);

      // All should be gone
      const scan1 = await redis.get('scan:1');
      const scan2 = await redis.get('scan:2');
      expect(scan1).toBeNull();
      expect(scan2).toBeNull();
    });

    it('should handle cache misses gracefully', async () => {
      const result = await redis.get('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('Distributed Locking', () => {
    it('should acquire lock for exclusive operations', async () => {
      const lockKey = 'lock:scan:test-scan-id';
      const lockValue = 'unique-lock-id';

      // Acquire lock
      const acquired = await redis.set(lockKey, lockValue, 'EX', 30, 'NX');
      expect(acquired).toBe('OK');

      // Try to acquire again (should fail)
      const reacquired = await redis.set(lockKey, 'different-id', 'EX', 30, 'NX');
      expect(reacquired).toBeNull();
    });

    it('should release lock after operation', async () => {
      const lockKey = 'lock:scan:test-scan-id';
      const lockValue = 'unique-lock-id';

      // Acquire lock
      await redis.set(lockKey, lockValue, 'EX', 30, 'NX');

      // Release lock
      await redis.del(lockKey);

      // Should be able to acquire again
      const reacquired = await redis.set(lockKey, 'new-id', 'EX', 30, 'NX');
      expect(reacquired).toBe('OK');
    });

    it('should auto-expire locks to prevent deadlocks', async () => {
      const lockKey = 'lock:scan:test-scan-id';

      // Acquire lock with short TTL
      await redis.set(lockKey, 'lock-value', 'EX', 2);

      // Wait for expiration
      await wait(2100);

      // Lock should be gone
      const exists = await redis.exists(lockKey);
      expect(exists).toBe(0);
    });
  });

  describe('Redis Pub/Sub for Real-time Updates', () => {
    it('should publish scan completion events', async () => {
      const channel = 'scan:completed';
      const message = JSON.stringify({
        scanId: 'test-scan-id',
        status: 'COMPLETED',
        complianceScore: 85.5,
      });

      // Subscribe to channel
      const subscriber = redis.duplicate();
      await subscriber.connect();

      const receivedMessages: string[] = [];
      subscriber.subscribe(channel, (msg) => {
        receivedMessages.push(msg);
      });

      // Wait for subscription
      await wait(100);

      // Publish message
      await redis.publish(channel, message);

      // Wait for message delivery
      await wait(100);

      expect(receivedMessages.length).toBeGreaterThan(0);
      const parsed = JSON.parse(receivedMessages[0]);
      expect(parsed.scanId).toBe('test-scan-id');

      await subscriber.quit();
    });
  });

  describe('Redis Health and Monitoring', () => {
    it('should check Redis connectivity', async () => {
      const pong = await redis.ping();
      expect(pong).toBe('PONG');
    });

    it('should get Redis server info', async () => {
      const info = await redis.info();
      expect(info).toContain('redis_version');
    });

    it('should monitor memory usage', async () => {
      const info = await redis.info('memory');
      expect(info).toContain('used_memory');
    });

    it('should count keys by pattern', async () => {
      // Set some test keys
      await redis.set('scan:1', 'data');
      await redis.set('scan:2', 'data');
      await redis.set('violation:1', 'data');

      // Count scan keys
      const scanKeys = await redis.keys('scan:*');
      expect(scanKeys.length).toBeGreaterThanOrEqual(2);
    });
  });
});
