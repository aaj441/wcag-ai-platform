/**
 * Violations API Endpoint Tests
 * Tests for violation management and fix generation
 */

import {
  api,
  createTestClient,
  createTestScan,
  createTestViolation,
  createTestFix,
  cleanDatabase,
  generateTestToken,
} from '../setup/testUtils';

describe('Violations API Endpoints', () => {
  let client: any;
  let scan: any;
  let authToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    client = await createTestClient();
    scan = await createTestScan(client.id);
    authToken = generateTestToken({ clientId: client.id });
  });

  describe('GET /api/violations', () => {
    it('should list all violations for a scan', async () => {
      await createTestViolation(scan.id, { wcagCriterion: '1.1.1' });
      await createTestViolation(scan.id, { wcagCriterion: '2.4.1' });

      const response = await api
        .get(`/api/violations?scanId=${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('violations');
      expect(response.body.violations).toHaveLength(2);
    });

    it('should filter by severity', async () => {
      await createTestViolation(scan.id, { severity: 'CRITICAL' });
      await createTestViolation(scan.id, { severity: 'MODERATE' });
      await createTestViolation(scan.id, { severity: 'CRITICAL' });

      const response = await api
        .get(`/api/violations?scanId=${scan.id}&severity=CRITICAL`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.violations).toHaveLength(2);
      expect(response.body.violations.every((v: any) => v.severity === 'CRITICAL')).toBe(true);
    });

    it('should filter by WCAG level', async () => {
      await createTestViolation(scan.id, { wcagLevel: 'A' });
      await createTestViolation(scan.id, { wcagLevel: 'AA' });
      await createTestViolation(scan.id, { wcagLevel: 'AAA' });

      const response = await api
        .get(`/api/violations?scanId=${scan.id}&wcagLevel=AA`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.violations.every((v: any) => v.wcagLevel === 'AA')).toBe(true);
    });

    it('should sort by confidence score', async () => {
      await createTestViolation(scan.id, { confidence: 0.95 });
      await createTestViolation(scan.id, { confidence: 0.80 });
      await createTestViolation(scan.id, { confidence: 0.90 });

      const response = await api
        .get(`/api/violations?scanId=${scan.id}&sortBy=confidence&order=desc`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const confidences = response.body.violations.map((v: any) => v.confidence);
      expect(confidences).toEqual([0.95, 0.90, 0.80]);
    });
  });

  describe('GET /api/violations/:id', () => {
    it('should retrieve a single violation', async () => {
      const violation = await createTestViolation(scan.id, {
        wcagCriterion: '1.1.1',
        description: 'Image missing alt text',
      });

      const response = await api
        .get(`/api/violations/${violation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', violation.id);
      expect(response.body).toHaveProperty('wcagCriterion', '1.1.1');
      expect(response.body).toHaveProperty('description', 'Image missing alt text');
    });

    it('should include fix if available', async () => {
      const violation = await createTestViolation(scan.id);
      const fix = await createTestFix(violation.id);

      const response = await api
        .get(`/api/violations/${violation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fix');
      expect(response.body.fix).toHaveProperty('id', fix.id);
    });
  });

  describe('PATCH /api/violations/:id', () => {
    it('should update violation status', async () => {
      const violation = await createTestViolation(scan.id, { status: 'OPEN' });

      const response = await api
        .patch(`/api/violations/${violation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'RESOLVED' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'RESOLVED');
    });

    it('should validate status values', async () => {
      const violation = await createTestViolation(scan.id);

      const response = await api
        .patch(`/api/violations/${violation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/violations/:id/retest', () => {
    it('should trigger violation retest', async () => {
      const violation = await createTestViolation(scan.id);

      const response = await api
        .post(`/api/violations/${violation.id}/retest`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('retestId');
    });

    it('should not retest already resolved violations', async () => {
      const violation = await createTestViolation(scan.id, { status: 'RESOLVED' });

      const response = await api
        .post(`/api/violations/${violation.id}/retest`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already resolved/i);
    });
  });
});
