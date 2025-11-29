/**
 * API Endpoint Integration Tests
 * Test API routes end-to-end
 */

import express, { Express } from 'express';
import request from 'supertest';
import violationsRouter from '../../routes/violations';
import draftsRouter from '../../routes/drafts';

// Mock data store
jest.mock('../../data/store', () => {
  const mockViolations = [
    {
      id: 'v1',
      wcagCriteria: '1.1.1',
      description: 'Image missing alt text',
      severity: 'critical',
      wcagLevel: 'A',
    },
    {
      id: 'v2',
      wcagCriteria: '1.4.3',
      description: 'Insufficient color contrast',
      severity: 'high',
      wcagLevel: 'AA',
    },
  ];

  const mockDrafts = [
    {
      id: 'd1',
      recipient: 'test@example.com',
      subject: 'WCAG Violations Found',
      body: 'We found some issues...',
      status: 'pending_review',
      violations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return {
    getAllViolations: jest.fn(() => [...mockViolations]),
    getAllDrafts: jest.fn(() => [...mockDrafts]),
    getDraftById: jest.fn((id) => mockDrafts.find(d => d.id === id) || null),
    createDraft: jest.fn((data) => ({
      id: 'd_new',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    updateDraft: jest.fn((id, updates) => {
      const draft = mockDrafts.find(d => d.id === id);
      if (!draft) return null;
      return { ...draft, ...updates };
    }),
    deleteDraft: jest.fn((id) => !!mockDrafts.find(d => d.id === id)),
  };
});

// Mock keyword services
jest.mock('../../services/keywordExtractor', () => ({
  autoTagDraft: jest.fn(() => ({ keywords: ['test', 'keyword'] })),
}));

jest.mock('../../services/keywordAlerting', () => ({
  generateAlertsForDraft: jest.fn(() => []),
  getDraftsNeedingAttention: jest.fn((drafts) => drafts),
  getAlertStats: jest.fn(() => ({ total: 0, critical: 0 })),
}));

describe('API Endpoints', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/violations', violationsRouter);
    app.use('/api/drafts', draftsRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/violations', () => {
    it('should return all violations', async () => {
      const response = await request(app).get('/api/violations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.message).toContain('2 violation(s)');
    });

    it('should filter by severity', async () => {
      const response = await request(app).get('/api/violations?severity=critical');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].severity).toBe('critical');
    });

    it('should filter by WCAG level', async () => {
      const response = await request(app).get('/api/violations?wcagLevel=AA');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].wcagLevel).toBe('AA');
    });

    it('should handle errors gracefully', async () => {
      const { getAllViolations } = require('../../data/store');
      getAllViolations.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/violations');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve violations');
    });
  });

  describe('GET /api/violations/stats', () => {
    it('should return violation statistics', async () => {
      const response = await request(app).get('/api/violations/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.bySeverity).toBeDefined();
      expect(response.body.data.byLevel).toBeDefined();
    });

    it('should count violations by severity', async () => {
      const response = await request(app).get('/api/violations/stats');

      const stats = response.body.data;
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.medium).toBe(0);
      expect(stats.bySeverity.low).toBe(0);
    });

    it('should count violations by WCAG level', async () => {
      const response = await request(app).get('/api/violations/stats');

      const stats = response.body.data;
      expect(stats.byLevel.A).toBe(1);
      expect(stats.byLevel.AA).toBe(1);
      expect(stats.byLevel.AAA).toBe(0);
    });
  });

  describe('GET /api/drafts', () => {
    it('should return all drafts', async () => {
      const response = await request(app).get('/api/drafts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const response = await request(app).get('/api/drafts?status=pending_review');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle search query', async () => {
      const response = await request(app).get('/api/drafts?search=test');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should filter by keywords', async () => {
      const response = await request(app).get('/api/drafts?keywords=test,keyword');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/drafts/:id', () => {
    it('should return specific draft', async () => {
      const response = await request(app).get('/api/drafts/d1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('d1');
    });

    it('should return 404 for non-existent draft', async () => {
      const response = await request(app).get('/api/drafts/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Draft not found');
    });
  });

  describe('POST /api/drafts', () => {
    it('should create new draft', async () => {
      const newDraft = {
        recipient: 'new@example.com',
        subject: 'New Draft',
        body: 'Draft body content',
      };

      const response = await request(app).post('/api/drafts').send(newDraft);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recipient).toBe('new@example.com');
      expect(response.body.message).toBe('Draft created successfully');
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/api/drafts').send({
        subject: 'Missing recipient',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should auto-extract keywords', async () => {
      const newDraft = {
        recipient: 'test@example.com',
        subject: 'Test',
        body: 'Test content',
      };

      const response = await request(app).post('/api/drafts').send(newDraft);

      expect(response.status).toBe(201);
      expect(response.body.data.keywords).toEqual(['test', 'keyword']);
    });

    it('should include violations if provided', async () => {
      const newDraft = {
        recipient: 'test@example.com',
        subject: 'Test',
        body: 'Test content',
        violations: [{ id: 'v1' }],
      };

      const response = await request(app).post('/api/drafts').send(newDraft);

      expect(response.status).toBe(201);
      expect(response.body.data.violations).toHaveLength(1);
    });
  });

  describe('PUT /api/drafts/:id', () => {
    it('should update draft', async () => {
      const updates = {
        subject: 'Updated Subject',
        body: 'Updated body',
      };

      const response = await request(app).put('/api/drafts/d1').send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft updated successfully');
    });

    it('should return 404 for non-existent draft', async () => {
      const response = await request(app)
        .put('/api/drafts/nonexistent')
        .send({ subject: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Draft not found');
    });

    it('should re-extract keywords on body update', async () => {
      const { autoTagDraft } = require('../../services/keywordExtractor');

      const response = await request(app)
        .put('/api/drafts/d1')
        .send({ body: 'New body with different content' });

      expect(autoTagDraft).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/drafts/:id/approve', () => {
    it('should approve draft', async () => {
      const response = await request(app)
        .patch('/api/drafts/d1/approve')
        .send({ approvedBy: 'admin@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft approved successfully');
    });

    it('should set default approver if not provided', async () => {
      const response = await request(app).patch('/api/drafts/d1/approve').send({});

      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/drafts/:id/reject', () => {
    it('should reject draft', async () => {
      const response = await request(app).patch('/api/drafts/d1/reject');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft rejected');
    });

    it('should return 404 for non-existent draft', async () => {
      const response = await request(app).patch('/api/drafts/nonexistent/reject');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/drafts/approve-all', () => {
    it('should approve all pending drafts', async () => {
      const response = await request(app)
        .post('/api/drafts/approve-all')
        .send({ approvedBy: 'admin@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved successfully');
    });

    it('should handle no pending drafts', async () => {
      const { getAllDrafts } = require('../../data/store');
      getAllDrafts.mockReturnValue([]);

      const response = await request(app).post('/api/drafts/approve-all').send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No pending drafts to approve');
    });
  });

  describe('DELETE /api/drafts/:id', () => {
    it('should delete draft', async () => {
      const response = await request(app).delete('/api/drafts/d1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft deleted successfully');
    });

    it('should return 404 for non-existent draft', async () => {
      const { deleteDraft } = require('../../data/store');
      deleteDraft.mockReturnValue(false);

      const response = await request(app).delete('/api/drafts/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/drafts/:id/alerts', () => {
    it('should generate alerts for draft', async () => {
      const response = await request(app).get('/api/drafts/d1/alerts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
    });

    it('should return 404 for non-existent draft', async () => {
      const response = await request(app).get('/api/drafts/nonexistent/alerts');

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/drafts')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle database errors', async () => {
      const { getAllDrafts } = require('../../data/store');
      getAllDrafts.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app).get('/api/drafts');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long subject lines', async () => {
      const newDraft = {
        recipient: 'test@example.com',
        subject: 'A'.repeat(1000),
        body: 'Test body',
      };

      const response = await request(app).post('/api/drafts').send(newDraft);

      expect(response.status).toBe(201);
    });

    it('should handle empty search query', async () => {
      const response = await request(app).get('/api/drafts?search=');

      expect(response.status).toBe(200);
    });

    it('should handle multiple filters simultaneously', async () => {
      const response = await request(app)
        .get('/api/drafts?status=pending_review&search=test&keywords=keyword');

      expect(response.status).toBe(200);
    });
  });
});
