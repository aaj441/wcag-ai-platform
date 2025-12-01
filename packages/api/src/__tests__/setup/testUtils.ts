/**
 * Test Utilities for WCAG AI Platform
 * Provides helper functions for test setup, teardown, and common operations
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import request from 'supertest';
import { app } from '../../server';

// Test Database Client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Test Redis Client
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_TEST_DB || '1'), // Use separate DB for tests
  lazyConnect: true,
});

// API Test Client
export const api = request(app);

/**
 * Clean up all test data from database
 */
export async function cleanDatabase() {
  const tables = [
    'FixApplication',
    'Fix',
    'MultiLLMValidation',
    'LLMProviderResponse',
    'ReviewLog',
    'Violation',
    'Scan',
    'OutreachEmail',
    'AccessibilityAudit',
    'Prospect',
    'IndustryProfile',
    'Lead',
    'KeywordSearch',
    'TargetBusinessViolation',
    'TargetBusiness',
    'Company',
    'FixTemplate',
    'Industry',
    'Metro',
    'Consultant',
    'Client',
  ];

  // Delete in correct order to avoid foreign key constraints
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      console.warn(`Warning: Could not truncate ${table}:`, error);
    }
  }
}

/**
 * Clean up all test data from Redis
 */
export async function cleanRedis() {
  await redis.flushdb();
}

/**
 * Complete cleanup of all test resources
 */
export async function cleanupAll() {
  await cleanDatabase();
  await cleanRedis();
}

/**
 * Create test client
 */
export async function createTestClient(data?: Partial<any>) {
  return await prisma.client.create({
    data: {
      name: data?.name || 'Test Client',
      domain: data?.domain || 'test.example.com',
      contactEmail: data?.contactEmail || 'test@example.com',
      contactName: data?.contactName || 'Test User',
      ...data,
    },
  });
}

/**
 * Create test consultant
 */
export async function createTestConsultant(data?: Partial<any>) {
  return await prisma.consultant.create({
    data: {
      email: data?.email || 'consultant@example.com',
      name: data?.name || 'Test Consultant',
      specialty: data?.specialty || 'WCAG 2.1 AA',
      ...data,
    },
  });
}

/**
 * Create test scan
 */
export async function createTestScan(clientId: string, data?: Partial<any>) {
  return await prisma.scan.create({
    data: {
      url: data?.url || 'https://example.com',
      clientId,
      status: data?.status || 'COMPLETED',
      wcagLevel: data?.wcagLevel || 'AA',
      complianceScore: data?.complianceScore || 85.5,
      violationCount: data?.violationCount || 5,
      ...data,
    },
  });
}

/**
 * Create test violation
 */
export async function createTestViolation(scanId: string, data?: Partial<any>) {
  return await prisma.violation.create({
    data: {
      scanId,
      wcagCriterion: data?.wcagCriterion || '1.1.1',
      wcagLevel: data?.wcagLevel || 'A',
      severity: data?.severity || 'CRITICAL',
      element: data?.element || '<img src="test.jpg">',
      description: data?.description || 'Image missing alt text',
      context: data?.context || 'Homepage hero section',
      confidence: data?.confidence || 0.95,
      ...data,
    },
  });
}

/**
 * Create test fix
 */
export async function createTestFix(violationId: string, data?: Partial<any>) {
  return await prisma.fix.create({
    data: {
      violationId,
      generatedCode: data?.generatedCode || '<img src="test.jpg" alt="Test image">',
      explanation: data?.explanation || 'Added alt attribute to image',
      confidence: data?.confidence || 0.92,
      status: data?.status || 'PENDING_REVIEW',
      aiProvider: data?.aiProvider || 'openai',
      aiModel: data?.aiModel || 'gpt-4',
      ...data,
    },
  });
}

/**
 * Create test metro
 */
export async function createTestMetro(data?: Partial<any>) {
  return await prisma.metro.create({
    data: {
      name: data?.name || 'Test Metro',
      state: data?.state || 'CA',
      population: data?.population || 1000000,
      cbsaCode: data?.cbsaCode || '12345',
      ...data,
    },
  });
}

/**
 * Create test company
 */
export async function createTestCompany(data?: Partial<any>) {
  return await prisma.company.create({
    data: {
      name: data?.name || 'Test Company',
      website: data?.website || 'https://testcompany.com',
      industry: data?.industry || 'Technology',
      ...data,
    },
  });
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(payload: any = {}): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      sub: payload.sub || 'test-user-id',
      email: payload.email || 'test@example.com',
      role: payload.role || 'consultant',
      ...payload,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Mock external API calls
 */
export function mockExternalAPIs() {
  // Mock fetch for external APIs
  global.fetch = jest.fn();

  return {
    mockOpenAI: (response: any) => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      });
    },
    mockScreenshot: (imageBuffer: Buffer) => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => imageBuffer,
      });
    },
    reset: () => {
      (global.fetch as jest.Mock).mockReset();
    },
  };
}

/**
 * Setup before all tests
 */
export async function setupTests() {
  await redis.connect();
  await cleanupAll();
}

/**
 * Teardown after all tests
 */
export async function teardownTests() {
  await cleanupAll();
  await prisma.$disconnect();
  await redis.quit();
}
