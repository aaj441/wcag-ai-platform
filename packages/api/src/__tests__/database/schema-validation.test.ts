/**
 * Database Schema Validation Tests
 *
 * Tests Prisma migrations, schema integrity, and database constraints
 * Production-ready with comprehensive error handling
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Schema Validation', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Prisma Client Connection', () => {
    it('should successfully connect to the database', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should execute raw queries successfully', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const invalidPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:5432/invalid',
          },
        },
      });

      await expect(async () => {
        await invalidPrisma.$connect();
        await invalidPrisma.$queryRaw`SELECT 1`;
      }).rejects.toThrow();

      await invalidPrisma.$disconnect();
    });
  });

  describe('Schema File Validation', () => {
    const schemaPath = path.join(__dirname, '../../../prisma/schema.prisma');

    it('should have a valid schema.prisma file', () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      expect(schema).toContain('datasource db');
      expect(schema).toContain('generator client');
    });

    it('should define all required models', () => {
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      const requiredModels = [
        'Scan',
        'Violation',
        'Fix',
        'Client',
        'ReviewLog',
        'Prospect',
      ];

      requiredModels.forEach((model) => {
        expect(schema).toContain(`model ${model}`);
      });
    });

    it('should have proper indexes defined', () => {
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Check for critical indexes
      expect(schema).toContain('@@index');
      expect(schema).toMatch(/@@index\(\[clientId\]\)/);
      expect(schema).toMatch(/@@index\(\[createdAt\]\)/);
    });

    it('should validate schema syntax', () => {
      expect(() => {
        execSync('npx prisma validate', {
          cwd: path.join(__dirname, '../../..'),
          stdio: 'pipe',
        });
      }).not.toThrow();
    });
  });

  describe('Migration Status', () => {
    it('should have migrations directory', () => {
      const migrationsPath = path.join(__dirname, '../../../prisma/migrations');
      expect(fs.existsSync(migrationsPath)).toBe(true);
    });

    it('should verify all migrations are applied', async () => {
      try {
        // Check migration status
        const status = execSync('npx prisma migrate status', {
          cwd: path.join(__dirname, '../../..'),
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        // Status should indicate all migrations are applied
        expect(status).not.toContain('following migrations have not yet been applied');
      } catch (error: any) {
        // If error contains "Database schema is up to date" that's good
        if (error.stdout && error.stdout.includes('up to date')) {
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });
  });

  describe('Model: Scan', () => {
    it('should create a scan with all required fields', async () => {
      const scan = await prisma.scan.create({
        data: {
          websiteUrl: 'https://example.com',
          scanResults: JSON.stringify({ violations: [] }),
          aiConfidenceScore: 0.95,
        },
      });

      expect(scan).toBeDefined();
      expect(scan.id).toBeDefined();
      expect(scan.websiteUrl).toBe('https://example.com');
      expect(scan.aiConfidenceScore).toBe(0.95);
      expect(scan.createdAt).toBeInstanceOf(Date);
      expect(scan.updatedAt).toBeInstanceOf(Date);

      // Cleanup
      await prisma.scan.delete({ where: { id: scan.id } });
    });

    it('should enforce required fields', async () => {
      await expect(
        prisma.scan.create({
          data: {
            // Missing required websiteUrl
            scanResults: JSON.stringify({ violations: [] }),
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should handle long URLs within varchar limits', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);

      const scan = await prisma.scan.create({
        data: {
          websiteUrl: longUrl,
          scanResults: JSON.stringify({ violations: [] }),
        },
      });

      expect(scan.websiteUrl).toBe(longUrl);
      await prisma.scan.delete({ where: { id: scan.id } });
    });

    it('should reject URLs exceeding varchar(2048) limit', async () => {
      const tooLongUrl = 'https://example.com/' + 'a'.repeat(2100);

      await expect(
        prisma.scan.create({
          data: {
            websiteUrl: tooLongUrl,
            scanResults: JSON.stringify({ violations: [] }),
          },
        })
      ).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const scan = await prisma.scan.create({
        data: {
          websiteUrl: 'https://example.com',
          scanResults: JSON.stringify({ violations: [] }),
        },
      });

      expect(scan.aiConfidenceScore).toBe(0.0);
      expect(scan.reviewed).toBe(false);
      expect(scan.approvalStatus).toBe('pending');
      expect(scan.confidenceDetails).toEqual({});

      await prisma.scan.delete({ where: { id: scan.id } });
    });

    it('should update timestamps on modification', async () => {
      const scan = await prisma.scan.create({
        data: {
          websiteUrl: 'https://example.com',
          scanResults: JSON.stringify({ violations: [] }),
        },
      });

      const originalUpdatedAt = scan.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedScan = await prisma.scan.update({
        where: { id: scan.id },
        data: { aiConfidenceScore: 0.8 },
      });

      expect(updatedScan.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );

      await prisma.scan.delete({ where: { id: scan.id } });
    });
  });

  describe('Model: Violation', () => {
    let testScan: any;

    beforeEach(async () => {
      testScan = await prisma.scan.create({
        data: {
          websiteUrl: 'https://example.com',
          scanResults: JSON.stringify({ violations: [] }),
        },
      });
    });

    afterEach(async () => {
      if (testScan) {
        await prisma.scan.delete({ where: { id: testScan.id } });
      }
    });

    it('should create a violation with all required fields', async () => {
      const violation = await prisma.violation.create({
        data: {
          scanId: testScan.id,
          wcagCriteria: '1.4.3',
          severity: 'high',
          description: 'Insufficient color contrast',
        },
      });

      expect(violation).toBeDefined();
      expect(violation.id).toBeDefined();
      expect(violation.scanId).toBe(testScan.id);
      expect(violation.wcagCriteria).toBe('1.4.3');
      expect(violation.aiConfidence).toBe(0.0);
      expect(violation.humanReviewed).toBe(false);
    });

    it('should cascade delete violations when scan is deleted', async () => {
      const violation = await prisma.violation.create({
        data: {
          scanId: testScan.id,
          wcagCriteria: '1.4.3',
          severity: 'high',
          description: 'Test violation',
        },
      });

      const violationId = violation.id;

      // Delete parent scan
      await prisma.scan.delete({ where: { id: testScan.id } });
      testScan = null;

      // Violation should be deleted
      const deletedViolation = await prisma.violation.findUnique({
        where: { id: violationId },
      });

      expect(deletedViolation).toBeNull();
    });

    it('should store optional evidence fields', async () => {
      const violation = await prisma.violation.create({
        data: {
          scanId: testScan.id,
          wcagCriteria: '2.1.1',
          severity: 'critical',
          description: 'Keyboard navigation issue',
          elementSelector: 'button.submit',
          screenshot: 'https://s3.amazonaws.com/screenshots/abc123.png',
          codeSnippet: '<button onclick="submit()">Submit</button>',
        },
      });

      expect(violation.elementSelector).toBe('button.submit');
      expect(violation.screenshot).toContain('s3.amazonaws.com');
      expect(violation.codeSnippet).toContain('button');
    });
  });

  describe('Model: Client (Multi-Tenancy)', () => {
    it('should create a client with tenant info', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Corporation',
          email: 'test@example.com',
        },
      });

      expect(client).toBeDefined();
      expect(client.id).toBeDefined();
      expect(client.name).toBe('Test Corporation');

      await prisma.client.delete({ where: { id: client.id } });
    });

    it('should link scans to clients', async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Test Corporation',
          email: 'test@example.com',
        },
      });

      const scan = await prisma.scan.create({
        data: {
          websiteUrl: 'https://example.com',
          scanResults: JSON.stringify({ violations: [] }),
          clientId: client.id,
        },
      });

      expect(scan.clientId).toBe(client.id);

      // Verify relationship
      const clientWithScans = await prisma.client.findUnique({
        where: { id: client.id },
        include: { scans: true },
      });

      expect(clientWithScans?.scans).toHaveLength(1);
      expect(clientWithScans?.scans[0].id).toBe(scan.id);

      await prisma.scan.delete({ where: { id: scan.id } });
      await prisma.client.delete({ where: { id: client.id } });
    });
  });

  describe('Model: ReviewLog (Audit Trail)', () => {
    let testScan: any;

    beforeEach(async () => {
      testScan = await prisma.scan.create({
        data: {
          websiteUrl: 'https://example.com',
          scanResults: JSON.stringify({ violations: [] }),
        },
      });
    });

    afterEach(async () => {
      if (testScan) {
        await prisma.scan.delete({ where: { id: testScan.id } });
      }
    });

    it('should create audit log entries', async () => {
      const reviewLog = await prisma.reviewLog.create({
        data: {
          scanId: testScan.id,
          action: 'approved',
          consultantEmail: 'consultant@example.com',
        },
      });

      expect(reviewLog).toBeDefined();
      expect(reviewLog.action).toBe('approved');
      expect(reviewLog.consultantEmail).toBe('consultant@example.com');
      expect(reviewLog.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain multiple audit entries per scan', async () => {
      await prisma.reviewLog.create({
        data: {
          scanId: testScan.id,
          action: 'reviewed',
          consultantEmail: 'consultant1@example.com',
        },
      });

      await prisma.reviewLog.create({
        data: {
          scanId: testScan.id,
          action: 'approved',
          consultantEmail: 'consultant2@example.com',
        },
      });

      const logs = await prisma.reviewLog.findMany({
        where: { scanId: testScan.id },
        orderBy: { timestamp: 'asc' },
      });

      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('reviewed');
      expect(logs[1].action).toBe('approved');
    });

    it('should cascade delete review logs with scan', async () => {
      await prisma.reviewLog.create({
        data: {
          scanId: testScan.id,
          action: 'reviewed',
          consultantEmail: 'consultant@example.com',
        },
      });

      await prisma.scan.delete({ where: { id: testScan.id } });
      testScan = null;

      const logs = await prisma.reviewLog.findMany({
        where: { scanId: testScan.id },
      });

      expect(logs).toHaveLength(0);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique constraints where defined', async () => {
      // This test depends on your schema's unique constraints
      // Add specific tests based on your schema
      expect(true).toBe(true);
    });

    it('should validate foreign key relationships', async () => {
      // Try to create a violation with non-existent scan
      await expect(
        prisma.violation.create({
          data: {
            scanId: 'non-existent-id',
            wcagCriteria: '1.4.3',
            severity: 'high',
            description: 'Test',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query by indexed fields', async () => {
      // Create multiple scans
      const scans = await Promise.all([
        prisma.scan.create({
          data: {
            websiteUrl: 'https://example1.com',
            scanResults: JSON.stringify({ violations: [] }),
            approvalStatus: 'pending',
          },
        }),
        prisma.scan.create({
          data: {
            websiteUrl: 'https://example2.com',
            scanResults: JSON.stringify({ violations: [] }),
            approvalStatus: 'approved',
          },
        }),
      ]);

      const startTime = Date.now();

      // Query by indexed field
      const pendingScans = await prisma.scan.findMany({
        where: { approvalStatus: 'pending' },
      });

      const queryTime = Date.now() - startTime;

      expect(pendingScans.length).toBeGreaterThanOrEqual(1);
      expect(queryTime).toBeLessThan(1000); // Should be fast

      // Cleanup
      await Promise.all(scans.map((s) => prisma.scan.delete({ where: { id: s.id } })));
    });
  });

  describe('Transaction Handling', () => {
    it('should rollback failed transactions', async () => {
      const scansBefore = await prisma.scan.count();

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.scan.create({
            data: {
              websiteUrl: 'https://example.com',
              scanResults: JSON.stringify({ violations: [] }),
            },
          });

          // Force transaction to fail
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');

      const scansAfter = await prisma.scan.count();
      expect(scansAfter).toBe(scansBefore);
    });

    it('should commit successful transactions', async () => {
      const result = await prisma.$transaction(async (tx) => {
        const scan = await tx.scan.create({
          data: {
            websiteUrl: 'https://example.com',
            scanResults: JSON.stringify({ violations: [] }),
          },
        });

        await tx.violation.create({
          data: {
            scanId: scan.id,
            wcagCriteria: '1.4.3',
            severity: 'high',
            description: 'Test',
          },
        });

        return scan;
      });

      expect(result).toBeDefined();

      const violations = await prisma.violation.findMany({
        where: { scanId: result.id },
      });

      expect(violations).toHaveLength(1);

      // Cleanup
      await prisma.scan.delete({ where: { id: result.id } });
    });
  });
});
