/**
 * Scan API Endpoint Tests
 * Tests for scan creation, retrieval, and management
 */

import {
  api,
  createTestClient,
  createTestScan,
  createTestViolation,
  cleanDatabase,
  generateTestToken,
} from '../setup/testUtils';

describe('Scan API Endpoints', () => {
  let client: any;
  let authToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    client = await createTestClient();
    authToken = generateTestToken({ clientId: client.id });
  });

  describe('POST /api/scans', () => {
    it('should create a new scan', async () => {
      const response = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url', 'https://example.com');
      expect(response.body).toHaveProperty('wcagLevel', 'AA');
      expect(response.body).toHaveProperty('status', 'PENDING');
    });

    it('should validate URL format', async () => {
      const response = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'not-a-valid-url',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid url/i);
    });

    it('should require authentication', async () => {
      const response = await api.post('/api/scans').send({
        url: 'https://example.com',
        wcagLevel: 'AA',
        clientId: client.id,
      });

      expect(response.status).toBe(401);
    });

    it('should validate WCAG level', async () => {
      const response = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'INVALID',
          clientId: client.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/wcag level/i);
    });

    it('should enqueue scan for processing', async () => {
      const response = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('queuePosition');
    });
  });

  describe('GET /api/scans/:id', () => {
    it('should retrieve a scan by ID', async () => {
      const scan = await createTestScan(client.id, {
        url: 'https://example.com',
        status: 'COMPLETED',
        complianceScore: 85.5,
      });

      const response = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', scan.id);
      expect(response.body).toHaveProperty('url', 'https://example.com');
      expect(response.body).toHaveProperty('complianceScore', 85.5);
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await api
        .get('/api/scans/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should include violations in response', async () => {
      const scan = await createTestScan(client.id);
      await createTestViolation(scan.id, {
        wcagCriterion: '1.1.1',
        severity: 'CRITICAL',
      });
      await createTestViolation(scan.id, {
        wcagCriterion: '2.4.1',
        severity: 'MODERATE',
      });

      const response = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('violations');
      expect(response.body.violations).toHaveLength(2);
    });
  });

  describe('GET /api/scans', () => {
    it('should list all scans for client', async () => {
      await createTestScan(client.id, { url: 'https://example1.com' });
      await createTestScan(client.id, { url: 'https://example2.com' });

      const response = await api
        .get('/api/scans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('scans');
      expect(response.body.scans).toHaveLength(2);
    });

    it('should support pagination', async () => {
      // Create 15 scans
      for (let i = 0; i < 15; i++) {
        await createTestScan(client.id, { url: `https://example${i}.com` });
      }

      const response = await api
        .get('/api/scans?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scans).toHaveLength(10);
      expect(response.body).toHaveProperty('total', 15);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages', 2);
    });

    it('should filter by status', async () => {
      await createTestScan(client.id, { status: 'COMPLETED' });
      await createTestScan(client.id, { status: 'PENDING' });
      await createTestScan(client.id, { status: 'COMPLETED' });

      const response = await api
        .get('/api/scans?status=COMPLETED')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scans).toHaveLength(2);
      expect(response.body.scans.every((s: any) => s.status === 'COMPLETED')).toBe(true);
    });
  });

  describe('DELETE /api/scans/:id', () => {
    it('should delete a scan', async () => {
      const scan = await createTestScan(client.id);

      const response = await api
        .delete(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should cascade delete violations', async () => {
      const scan = await createTestScan(client.id);
      await createTestViolation(scan.id);

      await api
        .delete(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Violations should be deleted too
      const violations = await api
        .get(`/api/violations?scanId=${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(violations.body.violations).toHaveLength(0);
    });
  });
});
