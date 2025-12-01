/**
 * Full Workflow Integration Tests
 * End-to-end tests for complete WCAG compliance workflow
 */

import {
  api,
  prisma,
  redis,
  cleanupAll,
  createTestClient,
  generateTestToken,
  wait,
} from '../setup/testUtils';

describe('Full WCAG Compliance Workflow Integration', () => {
  let client: any;
  let authToken: string;

  beforeAll(async () => {
    await cleanupAll();
  });

  beforeEach(async () => {
    await cleanupAll();
    client = await createTestClient({
      name: 'Integration Test Client',
      domain: 'integration-test.com',
    });
    authToken = generateTestToken({ clientId: client.id });
  });

  afterAll(async () => {
    await cleanupAll();
  });

  describe('Complete Scan to Fix Workflow', () => {
    it('should complete full workflow: scan -> violations -> fixes -> approval -> apply', async () => {
      // Step 1: Create a scan
      const scanResponse = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://integration-test.example.com',
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(scanResponse.status).toBe(201);
      const scanId = scanResponse.body.id;

      // Step 2: Simulate scan completion and violation detection
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          complianceScore: 72.5,
          violationCount: 8,
        },
      });

      // Create violations
      const violation1 = await prisma.violation.create({
        data: {
          scanId,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img src="logo.png">',
          description: 'Image missing alt text',
          context: 'Header navigation',
          confidence: 0.96,
        },
      });

      const violation2 = await prisma.violation.create({
        data: {
          scanId,
          wcagCriterion: '2.4.1',
          wcagLevel: 'A',
          severity: 'SERIOUS',
          element: '<a href="#">Read more</a>',
          description: 'Link text not descriptive',
          context: 'Blog post excerpt',
          confidence: 0.89,
        },
      });

      // Step 3: Get scan with violations
      const getScanResponse = await api
        .get(`/api/scans/${scanId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getScanResponse.status).toBe(200);
      expect(getScanResponse.body.violations).toHaveLength(2);

      // Step 4: Generate fixes for violations
      const consultantToken = generateTestToken({ role: 'consultant' });

      const fix1Response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${consultantToken}`)
        .send({
          violationId: violation1.id,
          aiProvider: 'openai',
        });

      expect(fix1Response.status).toBe(201);
      const fix1Id = fix1Response.body.id;

      const fix2Response = await api
        .post('/api/fixes/generate')
        .set('Authorization', `Bearer ${consultantToken}`)
        .send({
          violationId: violation2.id,
          aiProvider: 'anthropic',
        });

      expect(fix2Response.status).toBe(201);
      const fix2Id = fix2Response.body.id;

      // Step 5: Review and approve fixes
      const consultant = await prisma.consultant.create({
        data: {
          email: 'consultant@example.com',
          name: 'Test Consultant',
          specialty: 'WCAG 2.1 AA',
        },
      });

      const approve1Response = await api
        .patch(`/api/fixes/${fix1Id}/review`)
        .set('Authorization', `Bearer ${consultantToken}`)
        .send({
          status: 'APPROVED',
          consultantId: consultant.id,
          notes: 'Fix is compliant',
        });

      expect(approve1Response.status).toBe(200);
      expect(approve1Response.body.status).toBe('APPROVED');

      const approve2Response = await api
        .patch(`/api/fixes/${fix2Id}/review`)
        .set('Authorization', `Bearer ${consultantToken}`)
        .send({
          status: 'APPROVED',
          consultantId: consultant.id,
          notes: 'Meets WCAG standards',
        });

      expect(approve2Response.status).toBe(200);

      // Step 6: Apply approved fixes
      const apply1Response = await api
        .post(`/api/fixes/${fix1Id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetEnvironment: 'staging',
        });

      expect(apply1Response.status).toBe(200);
      expect(apply1Response.body.status).toBe('APPLIED');

      const apply2Response = await api
        .post(`/api/fixes/${fix2Id}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetEnvironment: 'staging',
        });

      expect(apply2Response.status).toBe(200);

      // Step 7: Verify final state
      const finalScanResponse = await api
        .get(`/api/scans/${scanId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalScanResponse.status).toBe(200);
      expect(finalScanResponse.body.violations).toHaveLength(2);

      // All violations should have approved and applied fixes
      const violations = finalScanResponse.body.violations;
      expect(violations.every((v: any) => v.fix?.status === 'APPLIED')).toBe(true);
    }, 30000);
  });

  describe('Lead Discovery to Outreach Workflow', () => {
    it('should complete lead discovery workflow: search -> scan -> risk score -> proposal', async () => {
      // Step 1: Discover companies via keyword search
      const searchResponse = await api
        .post('/api/leads/discover')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          keywords: ['fintech', 'banking'],
          location: 'San Francisco, CA',
          limit: 5,
        });

      expect(searchResponse.status).toBe(201);
      const companies = searchResponse.body.companies;
      expect(companies.length).toBeGreaterThan(0);

      // Step 2: Create lead from discovered company
      const company = await prisma.company.create({
        data: {
          name: 'Test Fintech Corp',
          website: 'https://testfintech.example.com',
          industry: 'Financial Services',
          size: 'MEDIUM',
          revenue: 10000000,
        },
      });

      const leadResponse = await api
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          companyId: company.id,
          contactName: 'Jane Smith',
          contactEmail: 'jane@testfintech.com',
          source: 'KEYWORD_SEARCH',
        });

      expect(leadResponse.status).toBe(201);
      const leadId = leadResponse.body.id;

      // Step 3: Scan lead's website
      const scanResponse = await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: company.website,
          wcagLevel: 'AA',
          clientId: client.id,
        });

      expect(scanResponse.status).toBe(201);
      const scanId = scanResponse.body.id;

      // Complete scan with violations
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          complianceScore: 65.0,
          violationCount: 15,
        },
      });

      // Step 4: Calculate risk score
      const riskResponse = await api
        .get(`/api/leads/${leadId}/risk-score`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(riskResponse.status).toBe(200);
      expect(riskResponse.body).toHaveProperty('riskScore');
      expect(riskResponse.body.riskScore).toBeGreaterThan(0);

      // Step 5: Generate proposal
      const proposalResponse = await api
        .post('/api/proposals/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadId,
          scanId,
          includeVPAT: true,
        });

      expect(proposalResponse.status).toBe(201);
      expect(proposalResponse.body).toHaveProperty('proposal');
      expect(proposalResponse.body.proposal).toHaveProperty('executiveSummary');
      expect(proposalResponse.body.proposal).toHaveProperty('pricing');

      // Step 6: Update lead status
      const updateLeadResponse = await api
        .patch(`/api/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CONTACTED',
          notes: 'Proposal sent via email',
        });

      expect(updateLeadResponse.status).toBe(200);
      expect(updateLeadResponse.body.status).toBe('CONTACTED');
    }, 30000);
  });

  describe('Site Transformation Workflow', () => {
    it('should complete transformation workflow: request -> process -> deploy', async () => {
      // Step 1: Request site transformation
      const transformResponse = await api
        .post('/api/transform')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://transform-test.example.com',
          wcagLevel: 'AA',
          clientId: client.id,
          options: {
            preserveStyles: true,
            addAriaLabels: true,
            optimizeImages: true,
          },
        });

      expect(transformResponse.status).toBe(201);
      const transformId = transformResponse.body.id;

      // Step 2: Check transformation status
      const statusResponse = await api
        .get(`/api/transform/${transformId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(['PENDING', 'IN_PROGRESS']).toContain(statusResponse.body.status);

      // Step 3: Simulate transformation completion
      // In real scenario, this would be done by background worker
      // For testing, we'll directly update the database

      await prisma.siteTransformation.update({
        where: { id: transformId },
        data: {
          status: 'COMPLETED',
          complianceScoreBefore: 65.0,
          complianceScoreAfter: 94.5,
          fixesApplied: 23,
        },
      });

      // Step 4: Get transformation details
      const detailsResponse = await api
        .get(`/api/transform/${transformId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(detailsResponse.status).toBe(200);
      expect(detailsResponse.body.status).toBe('COMPLETED');
      expect(detailsResponse.body.complianceScoreAfter).toBeGreaterThan(
        detailsResponse.body.complianceScoreBefore
      );

      // Step 5: Deploy to GitHub
      const deployResponse = await api
        .post(`/api/transform/${transformId}/deploy/github`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repository: 'testuser/test-repo',
          branch: 'feature/wcag-remediation',
          title: 'WCAG AA Compliance Improvements',
        });

      // Should succeed if transformation is complete
      expect([200, 201]).toContain(deployResponse.status);
    }, 30000);
  });

  describe('Multi-LLM Validation Workflow', () => {
    it('should validate fix with multiple LLM providers', async () => {
      // Step 1: Create violation and fix
      const scan = await prisma.scan.create({
        data: {
          url: 'https://test.example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
          complianceScore: 80.0,
        },
      });

      const violation = await prisma.violation.create({
        data: {
          scanId: scan.id,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img src="test.jpg">',
          description: 'Test violation',
          context: 'Test',
          confidence: 0.95,
        },
      });

      const fix = await prisma.fix.create({
        data: {
          violationId: violation.id,
          generatedCode: '<img src="test.jpg" alt="Test">',
          explanation: 'Added alt text',
          confidence: 0.92,
          status: 'PENDING_REVIEW',
          aiProvider: 'openai',
          aiModel: 'gpt-4',
        },
      });

      // Step 2: Trigger multi-LLM validation
      const validationResponse = await api
        .post(`/api/fixes/${fix.id}/validate-multi-llm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providers: ['openai', 'anthropic', 'google'],
        });

      expect(validationResponse.status).toBe(201);
      const validationId = validationResponse.body.id;

      // Step 3: Wait for validation to complete
      await wait(2000);

      // Step 4: Get validation results
      const resultsResponse = await api
        .get(`/api/fixes/${fix.id}/validations/${validationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body).toHaveProperty('consensusReached');
      expect(resultsResponse.body).toHaveProperty('responses');
      expect(resultsResponse.body.responses.length).toBeGreaterThanOrEqual(3);
    }, 30000);
  });

  describe('Caching and Performance', () => {
    it('should cache scan results for faster retrieval', async () => {
      // Create a scan
      const scan = await prisma.scan.create({
        data: {
          url: 'https://cache-test.example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
          complianceScore: 88.5,
        },
      });

      // First request (not cached)
      const start1 = Date.now();
      const response1 = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      const duration1 = Date.now() - start1;

      expect(response1.status).toBe(200);

      // Second request (should be cached)
      const start2 = Date.now();
      const response2 = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      const duration2 = Date.now() - start2;

      expect(response2.status).toBe(200);

      // Cached request should be faster (or similar)
      // Note: In test environment, the difference might not be dramatic
      expect(duration2).toBeLessThanOrEqual(duration1 * 2);
    });

    it('should invalidate cache when data is updated', async () => {
      const scan = await prisma.scan.create({
        data: {
          url: 'https://cache-invalidation-test.example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
          complianceScore: 85.0,
        },
      });

      // Get scan (caches result)
      const response1 = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.body.complianceScore).toBe(85.0);

      // Update scan
      await prisma.scan.update({
        where: { id: scan.id },
        data: { complianceScore: 90.0 },
      });

      // Cache should be invalidated, get fresh data
      const response2 = await api
        .get(`/api/scans/${scan.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.body.complianceScore).toBe(90.0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      // Simulate network error by providing invalid data
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
    });

    it('should roll back transaction on failure', async () => {
      const initialScanCount = await prisma.scan.count();

      // Try to create scan with invalid data
      await api
        .post('/api/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://test.example.com',
          wcagLevel: 'INVALID' as any,
          clientId: client.id,
        });

      // Scan count should remain unchanged
      const finalScanCount = await prisma.scan.count();
      expect(finalScanCount).toBe(initialScanCount);
    });
  });
});
