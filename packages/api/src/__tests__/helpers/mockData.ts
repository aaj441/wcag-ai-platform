/**
 * Mock Data Factory
 * Factory functions for creating test data
 */

import { CompanyData } from '../../services/CompanyDiscoveryService';
import { RiskFactors } from '../../services/RiskScoringService';
import { FixRequest, GeneratedFix } from '../../services/RemediationEngine';
import { AuditResult } from '../../services/BatchAuditService';

/**
 * Create mock company data
 */
export function createMockCompany(overrides: Partial<CompanyData> = {}): CompanyData {
  return {
    name: 'Test Company Inc',
    website: 'testcompany.com',
    domain: 'testcompany.com',
    industry: 'Technology',
    description: 'A test company for testing purposes',
    employeeCount: 150,
    revenue: '10M-50M',
    contactEmail: 'contact@testcompany.com',
    contactPhone: '555-0123',
    linkedinUrl: 'linkedin.com/company/testcompany',
    crunchbaseUrl: 'crunchbase.com/organization/testcompany',
    source: 'mock',
    sourceId: 'mock_123',
    ...overrides,
  };
}

/**
 * Create mock risk factors
 */
export function createMockRiskFactors(overrides: Partial<RiskFactors> = {}): RiskFactors {
  return {
    complianceScore: 65,
    violationCount: 12,
    industry: 'medical',
    employeeCount: 100,
    revenue: '$10M',
    redFlags: ['critical_violations_2'],
    websiteAge: 3,
    hasHttps: true,
    mobileResponsive: false,
    ...overrides,
  };
}

/**
 * Create mock fix request
 */
export function createMockFixRequest(overrides: Partial<FixRequest> = {}): FixRequest {
  return {
    violationId: 'v_123',
    wcagCriteria: '1.1.1',
    issueType: 'missing_alt_text',
    description: 'Image missing alt text',
    elementSelector: 'img.logo',
    codeSnippet: '<img src="/logo.png" class="logo">',
    codeLanguage: 'html',
    pageContext: 'Homepage header',
    ...overrides,
  };
}

/**
 * Create mock generated fix
 */
export function createMockGeneratedFix(overrides: Partial<GeneratedFix> = {}): GeneratedFix {
  return {
    wcagCriteria: '1.1.1',
    issueType: 'missing_alt_text',
    originalCode: '<img src="/logo.png" class="logo">',
    fixedCode: '<img src="/logo.png" class="logo" alt="Company Logo">',
    explanation: 'Added descriptive alt text to improve accessibility',
    confidenceScore: 0.95,
    codeLanguage: 'html',
    ...overrides,
  };
}

/**
 * Create mock audit result
 */
export function createMockAuditResult(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    website: 'https://example.com',
    status: 'success',
    complianceScore: 75,
    violationCount: 8,
    violations: [
      {
        id: 'image-alt',
        impact: 'critical',
        description: 'Images missing alt text',
        nodes: [{}, {}, {}],
      },
    ],
    passes: [
      { id: 'page-title', description: 'Page has a title' },
      { id: 'headings', description: 'Page has headings' },
    ],
    redFlags: ['critical_violations_1'],
    technicalMetrics: {
      mobile: true,
      https: true,
      pageLoadTime: 1500,
      lighthouseScore: 85,
    },
    auditedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Create mock WCAG violation
 */
export function createMockViolation(overrides: any = {}) {
  return {
    id: 'v_' + Math.random().toString(36).substr(2, 9),
    wcagCriteria: '1.1.1',
    description: 'Image missing alt text',
    severity: 'critical',
    wcagLevel: 'A',
    elementSelector: 'img',
    codeSnippet: '<img src="/test.png">',
    pageUrl: 'https://example.com/page',
    detected: new Date(),
    ...overrides,
  };
}

/**
 * Create mock Prisma client
 */
export function createMockPrismaClient() {
  return {
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fix: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    fixTemplate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fixApplication: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn),
  };
}

/**
 * Create multiple mock companies
 */
export function createMockCompanies(count: number): CompanyData[] {
  return Array.from({ length: count }, (_, i) => createMockCompany({
    name: `Company ${i + 1}`,
    domain: `company${i + 1}.com`,
    website: `company${i + 1}.com`,
    employeeCount: 50 + i * 10,
  }));
}
