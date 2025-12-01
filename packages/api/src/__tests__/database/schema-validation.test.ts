/**
 * Database Schema Validation Tests
 * Tests for database integrity, constraints, and relationships
 */

import { prisma, cleanDatabase } from '../setup/testUtils';

describe('Database Schema Validation', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('Client Table', () => {
    it('should create client with required fields', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.example.com',
          contactEmail: 'contact@example.com',
          contactName: 'John Doe',
        },
      });

      expect(client).toHaveProperty('id');
      expect(client.name).toBe('Test Client');
      expect(client.domain).toBe('test.example.com');
    });

    it('should enforce unique email constraint', async () => {
      await prisma.client.create({
        data: {
          name: 'Client 1',
          domain: 'test1.com',
          contactEmail: 'duplicate@example.com',
          contactName: 'User 1',
        },
      });

      await expect(
        prisma.client.create({
          data: {
            name: 'Client 2',
            domain: 'test2.com',
            contactEmail: 'duplicate@example.com',
            contactName: 'User 2',
          },
        })
      ).rejects.toThrow();
    });

    it('should set default timestamps', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });

      expect(client.createdAt).toBeInstanceOf(Date);
      expect(client.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Scan Table', () => {
    let clientId: string;

    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });
      clientId = client.id;
    });

    it('should create scan with valid foreign key', async () => {
      const scan = await prisma.scan.create({
        data: {
          url: 'https://example.com',
          clientId,
          status: 'PENDING',
          wcagLevel: 'AA',
        },
      });

      expect(scan).toHaveProperty('id');
      expect(scan.clientId).toBe(clientId);
    });

    it('should enforce foreign key constraint', async () => {
      await expect(
        prisma.scan.create({
          data: {
            url: 'https://example.com',
            clientId: 'non-existent-client-id',
            status: 'PENDING',
            wcagLevel: 'AA',
          },
        })
      ).rejects.toThrow();
    });

    it('should validate WCAG level enum', async () => {
      await expect(
        prisma.scan.create({
          data: {
            url: 'https://example.com',
            clientId,
            status: 'PENDING',
            wcagLevel: 'INVALID' as any,
          },
        })
      ).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

      for (const status of validStatuses) {
        const scan = await prisma.scan.create({
          data: {
            url: `https://example-${status}.com`,
            clientId,
            status: status as any,
            wcagLevel: 'AA',
          },
        });

        expect(scan.status).toBe(status);
      }
    });

    it('should store compliance score as decimal', async () => {
      const scan = await prisma.scan.create({
        data: {
          url: 'https://example.com',
          clientId,
          status: 'COMPLETED',
          wcagLevel: 'AA',
          complianceScore: 85.75,
        },
      });

      expect(scan.complianceScore).toBe(85.75);
      expect(typeof scan.complianceScore).toBe('number');
    });
  });

  describe('Violation Table', () => {
    let scanId: string;

    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });

      const scan = await prisma.scan.create({
        data: {
          url: 'https://example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
        },
      });

      scanId = scan.id;
    });

    it('should create violation with all required fields', async () => {
      const violation = await prisma.violation.create({
        data: {
          scanId,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img src="test.jpg">',
          description: 'Image missing alt text',
          context: 'Homepage',
          confidence: 0.95,
        },
      });

      expect(violation).toHaveProperty('id');
      expect(violation.wcagCriterion).toBe('1.1.1');
      expect(violation.confidence).toBe(0.95);
    });

    it('should enforce confidence range (0-1)', async () => {
      const violation = await prisma.violation.create({
        data: {
          scanId,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img>',
          description: 'Test',
          context: 'Test',
          confidence: 0.5,
        },
      });

      expect(violation.confidence).toBeGreaterThanOrEqual(0);
      expect(violation.confidence).toBeLessThanOrEqual(1);
    });

    it('should cascade delete when scan is deleted', async () => {
      const violation = await prisma.violation.create({
        data: {
          scanId,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img>',
          description: 'Test',
          context: 'Test',
          confidence: 0.95,
        },
      });

      // Delete parent scan
      await prisma.scan.delete({ where: { id: scanId } });

      // Violation should be deleted too
      const deletedViolation = await prisma.violation.findUnique({
        where: { id: violation.id },
      });

      expect(deletedViolation).toBeNull();
    });

    it('should validate severity enum', async () => {
      const validSeverities = ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'];

      for (const severity of validSeverities) {
        const violation = await prisma.violation.create({
          data: {
            scanId,
            wcagCriterion: '1.1.1',
            wcagLevel: 'A',
            severity: severity as any,
            element: '<img>',
            description: 'Test',
            context: 'Test',
            confidence: 0.95,
          },
        });

        expect(violation.severity).toBe(severity);
      }
    });
  });

  describe('Fix Table', () => {
    let violationId: string;

    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });

      const scan = await prisma.scan.create({
        data: {
          url: 'https://example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
        },
      });

      const violation = await prisma.violation.create({
        data: {
          scanId: scan.id,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img>',
          description: 'Test',
          context: 'Test',
          confidence: 0.95,
        },
      });

      violationId = violation.id;
    });

    it('should create fix with AI metadata', async () => {
      const fix = await prisma.fix.create({
        data: {
          violationId,
          generatedCode: '<img alt="Test">',
          explanation: 'Added alt attribute',
          confidence: 0.92,
          status: 'PENDING_REVIEW',
          aiProvider: 'openai',
          aiModel: 'gpt-4',
          promptTokens: 150,
          completionTokens: 75,
          costUsd: 0.002,
        },
      });

      expect(fix).toHaveProperty('id');
      expect(fix.aiProvider).toBe('openai');
      expect(fix.aiModel).toBe('gpt-4');
      expect(fix.promptTokens).toBe(150);
      expect(fix.completionTokens).toBe(75);
    });

    it('should enforce one-to-one relationship with violation', async () => {
      // Create first fix
      await prisma.fix.create({
        data: {
          violationId,
          generatedCode: '<img alt="Test">',
          explanation: 'Added alt attribute',
          confidence: 0.92,
          status: 'PENDING_REVIEW',
          aiProvider: 'openai',
          aiModel: 'gpt-4',
        },
      });

      // Attempt to create duplicate fix for same violation
      await expect(
        prisma.fix.create({
          data: {
            violationId,
            generatedCode: '<img alt="Different">',
            explanation: 'Different explanation',
            confidence: 0.88,
            status: 'PENDING_REVIEW',
            aiProvider: 'anthropic',
            aiModel: 'claude-3-5-sonnet',
          },
        })
      ).rejects.toThrow();
    });

    it('should validate fix status enum', async () => {
      const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED'];

      for (const status of validStatuses) {
        // Create new violation for each fix
        const scan = await prisma.scan.findFirst();
        const violation = await prisma.violation.create({
          data: {
            scanId: scan!.id,
            wcagCriterion: '1.1.1',
            wcagLevel: 'A',
            severity: 'CRITICAL',
            element: `<img id="${status}">`,
            description: 'Test',
            context: 'Test',
            confidence: 0.95,
          },
        });

        const fix = await prisma.fix.create({
          data: {
            violationId: violation.id,
            generatedCode: '<img alt="Test">',
            explanation: 'Test',
            confidence: 0.92,
            status: status as any,
            aiProvider: 'openai',
            aiModel: 'gpt-4',
          },
        });

        expect(fix.status).toBe(status);
      }
    });
  });

  describe('Company and Lead Tables', () => {
    it('should create company with metadata', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Acme Corp',
          website: 'https://acme.com',
          industry: 'Technology',
          size: 'MEDIUM',
          revenue: 5000000,
        },
      });

      expect(company).toHaveProperty('id');
      expect(company.name).toBe('Acme Corp');
      expect(company.industry).toBe('Technology');
    });

    it('should link leads to companies', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Acme Corp',
          website: 'https://acme.com',
          industry: 'Technology',
        },
      });

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          contactName: 'John Doe',
          contactEmail: 'john@acme.com',
          source: 'KEYWORD_SEARCH',
          status: 'NEW',
        },
      });

      expect(lead.companyId).toBe(company.id);

      // Verify relationship
      const leadWithCompany = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { company: true },
      });

      expect(leadWithCompany?.company.name).toBe('Acme Corp');
    });
  });

  describe('Metro and Industry Profiles', () => {
    it('should create metro with demographics', async () => {
      const metro = await prisma.metro.create({
        data: {
          name: 'San Francisco-Oakland-Berkeley, CA',
          state: 'CA',
          population: 4700000,
          cbsaCode: '41860',
        },
      });

      expect(metro).toHaveProperty('id');
      expect(metro.population).toBe(4700000);
    });

    it('should link industry profiles to metros', async () => {
      const metro = await prisma.metro.create({
        data: {
          name: 'San Francisco-Oakland-Berkeley, CA',
          state: 'CA',
          population: 4700000,
          cbsaCode: '41860',
        },
      });

      const industry = await prisma.industry.create({
        data: {
          name: 'Financial Services',
          naicsCode: '52',
          description: 'Banking and financial services',
        },
      });

      const profile = await prisma.industryProfile.create({
        data: {
          metroId: metro.id,
          industryId: industry.id,
          companyCount: 1500,
          avgRevenue: 25000000,
          riskScore: 8.5,
        },
      });

      expect(profile.metroId).toBe(metro.id);
      expect(profile.industryId).toBe(industry.id);
      expect(profile.riskScore).toBe(8.5);
    });
  });

  describe('Multi-LLM Validation', () => {
    let fixId: string;

    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });

      const scan = await prisma.scan.create({
        data: {
          url: 'https://example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
        },
      });

      const violation = await prisma.violation.create({
        data: {
          scanId: scan.id,
          wcagCriterion: '1.1.1',
          wcagLevel: 'A',
          severity: 'CRITICAL',
          element: '<img>',
          description: 'Test',
          context: 'Test',
          confidence: 0.95,
        },
      });

      const fix = await prisma.fix.create({
        data: {
          violationId: violation.id,
          generatedCode: '<img alt="Test">',
          explanation: 'Test',
          confidence: 0.92,
          status: 'PENDING_REVIEW',
          aiProvider: 'openai',
          aiModel: 'gpt-4',
        },
      });

      fixId = fix.id;
    });

    it('should create multi-LLM validation with responses', async () => {
      const validation = await prisma.multiLLMValidation.create({
        data: {
          fixId,
          consensusReached: true,
          consensusConfidence: 0.94,
          validationDate: new Date(),
        },
      });

      // Add provider responses
      const providers = ['openai', 'anthropic', 'google'];

      for (const provider of providers) {
        await prisma.lLMProviderResponse.create({
          data: {
            validationId: validation.id,
            provider,
            model: `${provider}-model`,
            approved: true,
            confidence: 0.93,
            reasoning: 'Meets WCAG standards',
          },
        });
      }

      // Verify relationship
      const validationWithResponses = await prisma.multiLLMValidation.findUnique({
        where: { id: validation.id },
        include: { responses: true },
      });

      expect(validationWithResponses?.responses).toHaveLength(3);
    });
  });

  describe('Indexes and Performance', () => {
    it('should query by clientId efficiently', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });

      // Create multiple scans
      for (let i = 0; i < 10; i++) {
        await prisma.scan.create({
          data: {
            url: `https://example${i}.com`,
            clientId: client.id,
            status: 'COMPLETED',
            wcagLevel: 'AA',
          },
        });
      }

      const start = Date.now();
      const scans = await prisma.scan.findMany({
        where: { clientId: client.id },
      });
      const duration = Date.now() - start;

      expect(scans).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be fast with index
    });

    it('should query violations by severity efficiently', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Client',
          domain: 'test.com',
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        },
      });

      const scan = await prisma.scan.create({
        data: {
          url: 'https://example.com',
          clientId: client.id,
          status: 'COMPLETED',
          wcagLevel: 'AA',
        },
      });

      // Create violations with different severities
      for (let i = 0; i < 20; i++) {
        await prisma.violation.create({
          data: {
            scanId: scan.id,
            wcagCriterion: '1.1.1',
            wcagLevel: 'A',
            severity: i < 10 ? 'CRITICAL' : 'MODERATE',
            element: `<img id="${i}">`,
            description: 'Test',
            context: 'Test',
            confidence: 0.95,
          },
        });
      }

      const start = Date.now();
      const criticalViolations = await prisma.violation.findMany({
        where: {
          scanId: scan.id,
          severity: 'CRITICAL',
        },
      });
      const duration = Date.now() - start;

      expect(criticalViolations).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be fast with index
    });
  });
});
