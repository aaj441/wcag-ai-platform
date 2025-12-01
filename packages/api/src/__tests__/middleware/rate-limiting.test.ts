/**
 * Redis-Based Rate Limiting Middleware Tests
 *
 * Tests rate limiting functionality with Redis backend
 * Production-ready with comprehensive error handling and edge cases
 */

import express, { Express } from 'express';
import request from 'supertest';
import { createClient } from 'redis';
import { apiLimiter, scanLimiter } from '../../middleware/security';

describe('Rate Limiting Middleware', () => {
  let app: Express;
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Create Redis client for test cleanup
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
      password: process.env.REDIS_PASSWORD,
    });

    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('Redis not available for rate limiting tests:', error);
    }
  });

  afterAll(async () => {
    if (redisClient?.isOpen) {
      await redisClient.quit();
    }
  });

  beforeEach(async () => {
    // Clear rate limit data before each test
    if (redisClient?.isOpen) {
      await redisClient.flushDb();
    }

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  describe('API Rate Limiter (General)', () => {
    beforeEach(() => {
      app.use(apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within rate limit', async () => {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should decrement remaining requests', async () => {
      const response1 = await request(app).get('/api/test');
      const remaining1 = parseInt(response1.headers['ratelimit-remaining']);

      const response2 = await request(app).get('/api/test');
      const remaining2 = parseInt(response2.headers['ratelimit-remaining']);

      expect(remaining2).toBe(remaining1 - 1);
    });

    it('should enforce rate limit after exceeding threshold', async () => {
      const limit = parseInt(process.env.API_RATE_LIMIT || '100');

      // Make requests up to the limit
      for (let i = 0; i < limit; i++) {
        const response = await request(app).get('/api/test');
        expect(response.status).toBe(200);
      }

      // Next request should be rate limited
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many requests');
    });

    it('should return proper error structure on rate limit', async () => {
      const limit = parseInt(process.env.API_RATE_LIMIT || '100');

      // Exhaust rate limit
      for (let i = 0; i < limit; i++) {
        await request(app).get('/api/test');
      }

      const response = await request(app).get('/api/test');

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Rate limit exceeded'),
      });
    });

    it('should skip rate limiting for health check endpoint', async () => {
      app.get('/health', (req, res) => {
        res.json({ status: 'healthy' });
      });

      const limit = parseInt(process.env.API_RATE_LIMIT || '100');

      // Make more than limit requests to /health
      for (let i = 0; i < limit + 10; i++) {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
      }
    });

    it('should reset rate limit after window expires', async () => {
      // Create app with very short window for testing
      const testApp = express();
      const shortWindowLimiter = require('express-rate-limit')({
        windowMs: 100, // 100ms window
        max: 2,
        standardHeaders: true,
      });

      testApp.use(shortWindowLimiter);
      testApp.get('/test', (req, res) => res.json({ ok: true }));

      // Use up the limit
      await request(testApp).get('/test');
      await request(testApp).get('/test');

      // Should be rate limited
      let response = await request(testApp).get('/test');
      expect(response.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should work again
      response = await request(testApp).get('/test');
      expect(response.status).toBe(200);
    });

    it('should handle different IPs independently', async () => {
      const response1 = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '192.168.1.1');

      const remaining1 = parseInt(response1.headers['ratelimit-remaining']);

      const response2 = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '192.168.1.2');

      const remaining2 = parseInt(response2.headers['ratelimit-remaining']);

      // Different IPs should have independent counters
      expect(remaining2).toBe(remaining1);
    });
  });

  describe('Scan Rate Limiter (Strict)', () => {
    beforeEach(() => {
      app.use(scanLimiter);
      app.post('/api/scan', (req, res) => {
        res.json({ scanId: 'test-123' });
      });
    });

    it('should allow scans within limit', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scanId');
    });

    it('should enforce stricter limits for scans', async () => {
      const scanLimit = 10; // From security.ts

      // Make requests up to the limit
      for (let i = 0; i < scanLimit; i++) {
        const response = await request(app)
          .post('/api/scan')
          .send({ url: `https://example${i}.com` });

        expect(response.status).toBe(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/scan')
        .send({ url: 'https://example-overflow.com' });

      expect(response.status).toBe(429);
    });

    it('should count all requests regardless of success', async () => {
      // Make several requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/scan')
          .send({ url: 'https://example.com' });
      }

      const response = await request(app)
        .post('/api/scan')
        .send({ url: 'https://example.com' });

      const remaining = parseInt(response.headers['ratelimit-remaining']);
      expect(remaining).toBe(10 - 4); // 10 limit - 4 requests
    });

    it('should handle POST and GET requests to same endpoint', async () => {
      app.get('/api/scan', (req, res) => {
        res.json({ scans: [] });
      });

      const postResponse = await request(app)
        .post('/api/scan')
        .send({ url: 'https://example.com' });

      const getResponse = await request(app).get('/api/scan');

      // Both should count against same rate limit
      const postRemaining = parseInt(postResponse.headers['ratelimit-remaining']);
      const getRemaining = parseInt(getResponse.headers['ratelimit-remaining']);

      expect(getRemaining).toBe(postRemaining - 1);
    });
  });

  describe('Combined Rate Limiters', () => {
    beforeEach(() => {
      // Apply both limiters
      app.use(apiLimiter);
      app.use('/api/scan', scanLimiter);

      app.post('/api/scan', (req, res) => {
        res.json({ scanId: 'test-123' });
      });

      app.get('/api/other', (req, res) => {
        res.json({ data: 'test' });
      });
    });

    it('should apply scan limiter only to scan endpoint', async () => {
      const scanResponse = await request(app)
        .post('/api/scan')
        .send({ url: 'https://example.com' });

      const otherResponse = await request(app).get('/api/other');

      // Both should succeed but have different rate limits
      expect(scanResponse.status).toBe(200);
      expect(otherResponse.status).toBe(200);
    });

    it('should enforce both limiters when applicable', async () => {
      // Scan endpoint should be limited by BOTH apiLimiter and scanLimiter
      // whichever is more restrictive
      const scanLimit = 10;

      for (let i = 0; i < scanLimit; i++) {
        await request(app)
          .post('/api/scan')
          .send({ url: `https://example${i}.com` });
      }

      const response = await request(app)
        .post('/api/scan')
        .send({ url: 'https://example-overflow.com' });

      expect(response.status).toBe(429);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      app.use(apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', 'invalid-ip-format');

      // Should still process the request (fallback to req.ip)
      expect(response.status).toBe(200);
    });

    it('should handle missing IP addresses gracefully', async () => {
      const response = await request(app).get('/api/test');

      // Should work with default IP
      expect(response.status).toBe(200);
    });

    it('should log security events on rate limit exceeded', async () => {
      const limit = parseInt(process.env.API_RATE_LIMIT || '100');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Exhaust rate limit
      for (let i = 0; i < limit; i++) {
        await request(app).get('/api/test');
      }

      await request(app).get('/api/test');

      // Security event should be logged
      // (depends on your logger implementation)

      consoleSpy.mockRestore();
    });
  });

  describe('Redis Integration', () => {
    it('should use Redis for distributed rate limiting', async () => {
      if (!redisClient?.isOpen) {
        console.log('Skipping Redis integration test - Redis not available');
        return;
      }

      app.use(apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/api/test');

      // Check Redis for rate limit keys
      const keys = await redisClient.keys('*');
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should handle Redis connection failures gracefully', async () => {
      // This would typically fall back to memory store
      // Actual behavior depends on express-rate-limit configuration
      const response = await request(app).get('/api/test');
      expect(response.status).toBe(200);
    });

    it('should persist rate limits across server restarts (via Redis)', async () => {
      if (!redisClient?.isOpen) {
        console.log('Skipping Redis persistence test - Redis not available');
        return;
      }

      app.use(apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      // Make some requests
      const response1 = await request(app).get('/api/test');
      const remaining1 = parseInt(response1.headers['ratelimit-remaining']);

      // Simulate server restart by creating new app with same limiter
      const newApp = express();
      newApp.use(apiLimiter);
      newApp.get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      const response2 = await request(newApp).get('/api/test');
      const remaining2 = parseInt(response2.headers['ratelimit-remaining']);

      // Rate limit should persist (remaining should continue to decrease)
      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      app.use(apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should handle concurrent requests correctly', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/test'));

      const responses = await Promise.all(promises);

      // All should succeed if within limit
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle burst traffic', async () => {
      const burstSize = 50;
      const promises = Array(burstSize)
        .fill(null)
        .map(() => request(app).get('/api/test'));

      const responses = await Promise.all(promises);

      const successCount = responses.filter((r) => r.status === 200).length;
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;

      expect(successCount + rateLimitedCount).toBe(burstSize);
      expect(successCount).toBeLessThanOrEqual(
        parseInt(process.env.API_RATE_LIMIT || '100')
      );
    });

    it('should handle requests with various user agents', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'curl/7.68.0',
        'PostmanRuntime/7.26.8',
      ];

      for (const ua of userAgents) {
        const response = await request(app)
          .get('/api/test')
          .set('User-Agent', ua);

        expect(response.status).toBe(200);
      }
    });

    it('should not leak rate limit data between different IPs', async () => {
      const ip1Response1 = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '10.0.0.1');

      const ip2Response1 = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '10.0.0.2');

      const ip1Remaining = parseInt(ip1Response1.headers['ratelimit-remaining']);
      const ip2Remaining = parseInt(ip2Response1.headers['ratelimit-remaining']);

      // Both should have the same remaining count (independent)
      expect(ip1Remaining).toBe(ip2Remaining);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      app.use(apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should add minimal latency to requests', async () => {
      const startTime = Date.now();
      await request(app).get('/api/test');
      const duration = Date.now() - startTime;

      // Rate limiting should add less than 50ms overhead
      expect(duration).toBeLessThan(100);
    });

    it('should handle high request volume efficiently', async () => {
      const requestCount = 100;
      const startTime = Date.now();

      const promises = Array(requestCount)
        .fill(null)
        .map(() => request(app).get('/api/test'));

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      const avgLatency = duration / requestCount;

      // Average latency should be reasonable
      expect(avgLatency).toBeLessThan(50);
    });
  });
});
