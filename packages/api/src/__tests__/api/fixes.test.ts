/**
 * Fix API Endpoint Tests
 * Tests for AI-generated fix management and review
 */

import {
  api,
  createTestClient,
  createTestScan,
  createTestViolation,
  createTestFix,
  createTestConsultant,
  cleanDatabase,
  generateTestToken,
} from '../setup/testUtils';

describe('Fix API Endpoints', () => {
  let client: any;
  let scan: any;
  let violation: any;
  let consultant: any;
  let authToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    client = await createTestClient();
    scan = await createTestScan(client.id);
    violation = await createTestViolation(scan.id);
    consultant = await createTestConsultant();
    authToken = generateTestToken({ role: 'consultant', consultantId: consultant.id });
  });

  describe('POST /api/fixes/generate', () => {
    it('should generate a fix for a violation', async () => {
      const response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          violationId: violation.id,
          aiProvider: 'openai',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('violationId', violation.id);
      expect(response.body).toHaveProperty('generatedCode');
      expect(response.body).toHaveProperty('explanation');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('status', 'PENDING_REVIEW');
    });

    it('should validate AI provider', async () => {
      const response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          violationId: violation.id,
          aiProvider: 'invalid-provider',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid ai provider/i);
    });

    it('should not generate duplicate fixes', async () => {
      // Create existing fix
      await createTestFix(violation.id);

      const response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          violationId: violation.id,
          aiProvider: 'openai',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toMatch(/fix already exists/i);
    });

    it('should track AI provider and model used', async () => {
      const response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          violationId: violation.id,
          aiProvider: 'anthropic',
          aiModel: 'claude-3-5-sonnet',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('aiProvider', 'anthropic');
      expect(response.body).toHaveProperty('aiModel', 'claude-3-5-sonnet');
    });
  });

  describe('GET /api/fixes/:fixId', () => {
    it('should retrieve a fix by ID', async () => {
      const fix = await createTestFix(violation.id, {
        generatedCode: '<img src="test.jpg" alt="Test image">',
        confidence: 0.92,
      });

      const response = await api
        .get(`/api/fixes/${fix.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', fix.id);
      expect(response.body).toHaveProperty('generatedCode');
      expect(response.body).toHaveProperty('confidence', 0.92);
    });

    it('should include violation context', async () => {
      const fix = await createTestFix(violation.id);

      const response = await api
        .get(`/api/fixes/${fix.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('violation');
      expect(response.body.violation).toHaveProperty('id', violation.id);
    });

    it('should return 404 for non-existent fix', async () => {
      const response = await api
        .get('/api/fixes/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/fixes/:fixId/review', () => {
    it('should approve a fix', async () => {
      const fix = await createTestFix(violation.id, { status: 'PENDING_REVIEW' });

      const response = await api
        .patch(`/api/fixes/${fix.id}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'APPROVED',
          consultantId: consultant.id,
          notes: 'Looks good!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'APPROVED');
      expect(response.body).toHaveProperty('reviewedBy', consultant.id);
      expect(response.body).toHaveProperty('reviewNotes', 'Looks good!');
    });

    it('should reject a fix', async () => {
      const fix = await createTestFix(violation.id, { status: 'PENDING_REVIEW' });

      const response = await api
        .patch(`/api/fixes/${fix.id}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'REJECTED',
          consultantId: consultant.id,
          notes: 'Does not meet WCAG standards',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'REJECTED');
      expect(response.body).toHaveProperty('reviewNotes', 'Does not meet WCAG standards');
    });

    it('should require consultant authentication', async () => {
      const fix = await createTestFix(violation.id);
      const clientToken = generateTestToken({ role: 'client' });

      const response = await api
        .patch(`/api/fixes/${fix.id}/review`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(response.status).toBe(403);
    });

    it('should not allow reviewing already applied fixes', async () => {
      const fix = await createTestFix(violation.id, { status: 'APPLIED' });

      const response = await api
        .patch(`/api/fixes/${fix.id}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'APPROVED',
          consultantId: consultant.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already applied/i);
    });
  });

  describe('POST /api/fixes/:fixId/apply', () => {
    it('should apply an approved fix', async () => {
      const fix = await createTestFix(violation.id, { status: 'APPROVED' });

      const response = await api
        .post(`/api/fixes/${fix.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetEnvironment: 'staging',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'APPLIED');
      expect(response.body).toHaveProperty('application');
      expect(response.body.application).toHaveProperty('targetEnvironment', 'staging');
    });

    it('should not apply unapproved fixes', async () => {
      const fix = await createTestFix(violation.id, { status: 'PENDING_REVIEW' });

      const response = await api
        .post(`/api/fixes/${fix.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetEnvironment: 'production',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/not approved/i);
    });

    it('should track application history', async () => {
      const fix = await createTestFix(violation.id, { status: 'APPROVED' });

      // Apply to staging
      await api
        .post(`/api/fixes/${fix.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetEnvironment: 'staging' });

      // Apply to production
      await api
        .post(`/api/fixes/${fix.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetEnvironment: 'production' });

      // Get fix with applications
      const response = await api
        .get(`/api/fixes/${fix.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('applications');
      expect(response.body.applications).toHaveLength(2);
    });

    it('should validate target environment', async () => {
      const fix = await createTestFix(violation.id, { status: 'APPROVED' });

      const response = await api
        .post(`/api/fixes/${fix.id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetEnvironment: 'invalid-env',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/fixes', () => {
    it('should list all fixes with filters', async () => {
      await createTestFix(violation.id, { status: 'APPROVED' });
      const violation2 = await createTestViolation(scan.id);
      await createTestFix(violation2.id, { status: 'PENDING_REVIEW' });

      const response = await api
        .get('/api/fixes?status=APPROVED')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.fixes).toHaveLength(1);
      expect(response.body.fixes[0]).toHaveProperty('status', 'APPROVED');
    });

    it('should sort by confidence', async () => {
      await createTestFix(violation.id, { confidence: 0.85 });
      const violation2 = await createTestViolation(scan.id);
      await createTestFix(violation2.id, { confidence: 0.95 });

      const response = await api
        .get('/api/fixes?sortBy=confidence&order=desc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const confidences = response.body.fixes.map((f: any) => f.confidence);
      expect(confidences).toEqual([0.95, 0.85]);
    });
  });
});
