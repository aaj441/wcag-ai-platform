/**
 * Health Check Endpoint Tests
 * Tests for /health and /health/* endpoints
 */

import { api, redis, prisma } from '../setup/testUtils';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 with healthy status', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include uptime information', async () => {
      const response = await api.get('/health');

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/database', () => {
    it('should verify database connectivity', async () => {
      const response = await api.get('/health/database');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status', 'connected');
    });

    it('should handle database disconnection gracefully', async () => {
      // Disconnect database
      await prisma.$disconnect();

      const response = await api.get('/health/database');

      // Expect error status
      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status', 'disconnected');

      // Reconnect for other tests
      await prisma.$connect();
    });
  });

  describe('GET /health/redis', () => {
    it('should verify Redis connectivity', async () => {
      const response = await api.get('/health/redis');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('redis');
      expect(response.body.redis).toHaveProperty('status', 'connected');
    });

    it('should include Redis memory info', async () => {
      const response = await api.get('/health/redis');

      expect(response.body.redis).toHaveProperty('memory');
      expect(typeof response.body.redis.memory).toBe('object');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return comprehensive health status', async () => {
      const response = await api.get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('redis');
      expect(response.body).toHaveProperty('queue');
      expect(response.body).toHaveProperty('services');
    });

    it('should include service-specific health checks', async () => {
      const response = await api.get('/health/detailed');

      expect(response.body.services).toHaveProperty('ai');
      expect(response.body.services).toHaveProperty('scanning');
      expect(response.body.services).toHaveProperty('cache');
    });
  });
});
