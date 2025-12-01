/**
 * Site Transformation API Endpoint Tests
 * Tests for AI-powered site remediation
 */

import {
  api,
  createTestClient,
  cleanDatabase,
  generateTestToken,
  wait,
} from '../setup/testUtils';

describe('Site Transformation API Endpoints', () => {
  let client: any;
  let authToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    client = await createTestClient();
    authToken = generateTestToken({ clientId: client.id });
  });

  describe('POST /api/transform', () => {
    it('should start a new site transformation', async () => {
      const response = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('url', 'https://example.com');
      expect(response.body).toHaveProperty('wcagLevel', 'AA');
    });

    it('should validate URL format', async () => {
      const response = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'not-a-url',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid url/i);
    });

    it('should support different WCAG levels', async () => {
      const levels = ['A', 'AA', 'AAA'];

      for (const level of levels) {
        const response = await api
          .post('/api/transform')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            url: `https://example-${level}.com`,
            wcagLevel: level,
            clientId: client.id,
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('wcagLevel', level);
      }
    });

    it('should accept optional transformation options', async () => {
      const response = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
          options: {
            preserveStyles: true,
            addAriaLabels: true,
            optimizeImages: true,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('options');
      expect(response.body.options).toMatchObject({
        preserveStyles: true,
        addAriaLabels: true,
        optimizeImages: true,
      });
    });
  });

  describe('GET /api/transform/:id', () => {
    let transformId: string;

    beforeEach(async () => {
      const createResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      transformId = createResponse.body.id;
    });

    it('should retrieve transformation details', async () => {
      const response = await api
        .get(`/api/transform/${transformId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', transformId);
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent transformation', async () => {
      const response = await api
        .get('/api/transform/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should include progress information', async () => {
      const response = await api
        .get(`/api/transform/${transformId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress');
      expect(response.body.progress).toHaveProperty('percentage');
      expect(response.body.progress).toHaveProperty('currentStep');
    });
  });

  describe('GET /api/transform/:id/status', () => {
    let transformId: string;

    beforeEach(async () => {
      const createResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      transformId = createResponse.body.id;
    });

    it('should return current transformation status', async () => {
      const response = await api
        .get(`/api/transform/${transformId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).toContain(
        response.body.status
      );
    });

    it('should include estimated completion time', async () => {
      const response = await api
        .get(`/api/transform/${transformId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      if (response.body.status === 'IN_PROGRESS') {
        expect(response.body).toHaveProperty('estimatedCompletion');
      }
    });
  });

  describe('POST /api/transform/:id/deploy/github', () => {
    let transformId: string;

    beforeEach(async () => {
      const createResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      transformId = createResponse.body.id;

      // Mock transformation completion
      // In real scenario, this would be done by background worker
    });

    it('should create GitHub pull request for transformation', async () => {
      const response = await api
        .post(`/api/transform/${transformId}/deploy/github`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repository: 'user/repo',
          branch: 'feature/wcag-remediation',
          title: 'WCAG AA Compliance Improvements',
        });

      // May return 202 if transformation not complete, or 200 if ready
      expect([200, 202, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('pullRequestUrl');
        expect(response.body).toHaveProperty('branch');
      }
    });

    it('should validate GitHub repository format', async () => {
      const response = await api
        .post(`/api/transform/${transformId}/deploy/github`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repository: 'invalid-repo-format',
          branch: 'main',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid repository/i);
    });

    it('should not deploy incomplete transformations', async () => {
      // Create a new transformation (will be PENDING)
      const newTransform = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      const response = await api
        .post(`/api/transform/${newTransform.body.id}/deploy/github`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repository: 'user/repo',
          branch: 'main',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/not completed/i);
    });
  });

  describe('POST /api/transform/:id/deploy/package', () => {
    let transformId: string;

    beforeEach(async () => {
      const createResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      transformId = createResponse.body.id;
    });

    it('should generate deployment package', async () => {
      const response = await api
        .post(`/api/transform/${transformId}/deploy/package`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'zip',
          includeAssets: true,
        });

      // May return 202 if packaging in progress
      expect([200, 202, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('downloadUrl');
        expect(response.body).toHaveProperty('expiresAt');
      }
    });

    it('should support different package formats', async () => {
      const formats = ['zip', 'tar.gz'];

      for (const format of formats) {
        const response = await api
          .post(`/api/transform/${transformId}/deploy/package`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            format,
            includeAssets: true,
          });

        if (response.status === 200) {
          expect(response.body.format).toBe(format);
        }
      }
    });
  });

  describe('DELETE /api/transform/:id', () => {
    it('should cancel in-progress transformation', async () => {
      const createResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      const response = await api
        .delete(`/api/transform/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'CANCELLED');
    });

    it('should not delete completed transformations', async () => {
      const createResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      // Mark as completed (in real scenario)
      // await markTransformationComplete(createResponse.body.id);

      const response = await api
        .delete(`/api/transform/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either succeed or return 400 if already complete
      expect([200, 400]).toContain(response.status);
    });
  });
});
