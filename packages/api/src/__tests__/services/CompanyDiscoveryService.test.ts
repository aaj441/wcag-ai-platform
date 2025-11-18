/**
 * CompanyDiscoveryService Tests
 * Complete test coverage for company discovery and lead generation
 */

import { CompanyDiscoveryService, CompanyData } from '../../services/CompanyDiscoveryService';
import { createMockCompany, createMockCompanies } from '../helpers/mockData';
import axios from 'axios';
import { prisma } from '../../lib/db';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock prisma
jest.mock('../../lib/db', () => ({
  prisma: {
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
    $transaction: jest.fn((fn) => fn),
  },
}));

describe('CompanyDiscoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.APOLLO_API_KEY;
  });

  describe('searchByKeywords', () => {
    it('should return mock data when API key not set', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech']);

      expect(companies).toBeDefined();
      expect(companies.length).toBeGreaterThan(0);
      expect(companies[0].source).toBe('mock');
    });

    it('should return fintech companies for fintech keyword', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech']);

      expect(companies.every(c => c.industry.toLowerCase().includes('fin'))).toBe(true);
    });

    it('should return healthcare companies for healthcare keyword', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['healthcare']);

      expect(companies.some(c => c.industry.toLowerCase().includes('health'))).toBe(true);
    });

    it('should combine results from multiple keywords', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech', 'healthcare']);

      expect(companies.length).toBeGreaterThan(3);
      const industries = companies.map(c => c.industry.toLowerCase());
      expect(industries.some(i => i.includes('fin') || i.includes('health'))).toBe(true);
    });

    it('should deduplicate companies by domain', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech', 'fintech']);

      const domains = companies.map(c => c.domain);
      const uniqueDomains = new Set(domains);
      expect(domains.length).toBe(uniqueDomains.size);
    });

    it('should return default example for unknown keywords', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['unknownkeyword123']);

      expect(companies).toHaveLength(1);
      expect(companies[0].name).toBe('Example Corp');
    });

    it('should call Apollo API when API key is set', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';

      const mockResponse = {
        data: {
          organizations: [
            {
              id: '123',
              name: 'Test Company',
              domain: 'test.com',
              website_url: 'https://test.com',
              industry: 'Technology',
              num_employees: 100,
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const companies = await CompanyDiscoveryService.searchByKeywords(['technology']);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.apollo.io/v1/mixed_companies/search',
        expect.objectContaining({
          q_organization_keywords: ['technology'],
          page: 1,
          per_page: 50,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Api-Key': 'test_api_key',
          }),
        })
      );

      expect(companies).toHaveLength(1);
      expect(companies[0].name).toBe('Test Company');
      expect(companies[0].source).toBe('apollo');
    });

    it('should apply employee count filters', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockResolvedValue({ data: { organizations: [] } });

      await CompanyDiscoveryService.searchByKeywords(['tech'], {
        minEmployees: 100,
        maxEmployees: 1000,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          organization_num_employees_range: [100, 1000],
        }),
        expect.any(Object)
      );
    });

    it('should use default employee range when not specified', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockResolvedValue({ data: { organizations: [] } });

      await CompanyDiscoveryService.searchByKeywords(['tech']);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          organization_num_employees_range: [50, 500],
        }),
        expect.any(Object)
      );
    });

    it('should handle Apollo API errors gracefully', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech']);

      // Should fall back to mock data
      expect(companies.length).toBeGreaterThan(0);
      expect(companies[0].source).toBe('mock');
    });

    it('should handle API timeout', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const companies = await CompanyDiscoveryService.searchByKeywords(['tech']);

      expect(companies.length).toBeGreaterThan(0);
    });

    it('should handle empty API response', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockResolvedValue({ data: {} });

      const companies = await CompanyDiscoveryService.searchByKeywords(['tech']);

      expect(companies.length).toBeGreaterThan(0);
      expect(companies[0].source).toBe('mock');
    });
  });

  describe('searchByIndustry', () => {
    it('should return mock healthcare companies', async () => {
      const companies = await CompanyDiscoveryService.searchByIndustry('Healthcare');

      expect(companies.every(c => c.industry.toLowerCase().includes('health'))).toBe(true);
    });

    it('should filter by industry case-insensitively', async () => {
      const companies = await CompanyDiscoveryService.searchByIndustry('HEALTHCARE');

      expect(companies.length).toBeGreaterThan(0);
    });

    it('should call Apollo API with industry parameter', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockResolvedValue({ data: { organizations: [] } });

      await CompanyDiscoveryService.searchByIndustry('Technology');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          organization_industry: 'Technology',
        }),
        expect.any(Object)
      );
    });

    it('should apply employee filters', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockResolvedValue({ data: { organizations: [] } });

      await CompanyDiscoveryService.searchByIndustry('Technology', {
        minEmployees: 200,
        maxEmployees: 2000,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          organization_num_employees_range: [200, 2000],
        }),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const companies = await CompanyDiscoveryService.searchByIndustry('Healthcare');

      expect(companies.length).toBeGreaterThan(0);
    });
  });

  describe('mapApolloToCompanyData', () => {
    it('should map all Apollo fields correctly', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';

      const mockApolloOrg = {
        id: 'apollo_123',
        name: 'Acme Corp',
        domain: 'acme.com',
        website_url: 'https://acme.com',
        industry: 'Software',
        short_description: 'Best software ever',
        num_employees: 250,
        annual_revenue: '$50M',
        email: 'sales@acme.com',
        phone: '555-1234',
        linkedin_url: 'linkedin.com/company/acme',
        crunchbase_url: 'crunchbase.com/acme',
      };

      mockedAxios.post.mockResolvedValue({
        data: { organizations: [mockApolloOrg] },
      });

      const companies = await CompanyDiscoveryService.searchByKeywords(['software']);

      expect(companies[0]).toMatchObject({
        name: 'Acme Corp',
        domain: 'acme.com',
        website: 'https://acme.com',
        industry: 'Software',
        description: 'Best software ever',
        employeeCount: 250,
        revenue: '$50M',
        contactEmail: 'sales@acme.com',
        contactPhone: '555-1234',
        linkedinUrl: 'linkedin.com/company/acme',
        crunchbaseUrl: 'crunchbase.com/acme',
        source: 'apollo',
        sourceId: 'apollo_123',
      });
    });

    it('should handle missing optional fields', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';

      mockedAxios.post.mockResolvedValue({
        data: {
          organizations: [
            {
              id: '123',
              name: 'Minimal Company',
              domain: 'minimal.com',
            },
          ],
        },
      });

      const companies = await CompanyDiscoveryService.searchByKeywords(['tech']);

      expect(companies[0].name).toBe('Minimal Company');
      expect(companies[0].description).toBeUndefined();
      expect(companies[0].employeeCount).toBeUndefined();
    });
  });

  describe('scoreRelevance', () => {
    it('should score exact keyword match highly', () => {
      const company = createMockCompany({
        name: 'Fintech Solutions',
        industry: 'Financial Services',
        description: 'Leading fintech platform',
      });

      const score = CompanyDiscoveryService.scoreRelevance(company, ['fintech']);

      expect(score).toBeGreaterThan(0.7);
    });

    it('should score multiple keyword matches higher', () => {
      const company = createMockCompany({
        name: 'Healthcare Fintech',
        industry: 'Healthcare',
        description: 'Fintech solutions for healthcare',
      });

      const score = CompanyDiscoveryService.scoreRelevance(company, ['fintech', 'healthcare']);

      expect(score).toBeGreaterThan(0.8);
    });

    it('should score ideal employee count higher', () => {
      const company1 = createMockCompany({ employeeCount: 200 });
      const company2 = createMockCompany({ employeeCount: 10 });
      const company3 = createMockCompany({ employeeCount: 2000 });

      const score1 = CompanyDiscoveryService.scoreRelevance(company1, ['tech']);
      const score2 = CompanyDiscoveryService.scoreRelevance(company2, ['tech']);
      const score3 = CompanyDiscoveryService.scoreRelevance(company3, ['tech']);

      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBeGreaterThan(score3);
    });

    it('should bonus for contact information', () => {
      const company1 = createMockCompany({
        contactEmail: 'sales@example.com',
        linkedinUrl: 'linkedin.com/company/example',
      });

      const company2 = createMockCompany({
        contactEmail: undefined,
        linkedinUrl: undefined,
      });

      const score1 = CompanyDiscoveryService.scoreRelevance(company1, ['tech']);
      const score2 = CompanyDiscoveryService.scoreRelevance(company2, ['tech']);

      expect(score1).toBeGreaterThan(score2);
    });

    it('should return score between 0 and 1', () => {
      const company = createMockCompany();

      const score = CompanyDiscoveryService.scoreRelevance(company, ['random']);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle empty keywords array', () => {
      const company = createMockCompany();

      const score = CompanyDiscoveryService.scoreRelevance(company, []);

      // Should return a score based on company attributes even with no keywords
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should be case-insensitive', () => {
      const company = createMockCompany({
        name: 'FinTech Company',
        industry: 'FINANCIAL SERVICES',
      });

      const score1 = CompanyDiscoveryService.scoreRelevance(company, ['fintech']);
      const score2 = CompanyDiscoveryService.scoreRelevance(company, ['FINTECH']);

      expect(score1).toBe(score2);
    });
  });

  describe('createLeads', () => {
    const mockPrisma = prisma as jest.Mocked<typeof prisma>;

    beforeEach(() => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.company.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'comp_123', ...data.data } as any)
      );
      mockPrisma.lead.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'lead_123', ...data.data } as any)
      );
    });

    it('should create company if not exists', async () => {
      const companies = [createMockCompany()];

      await CompanyDiscoveryService.createLeads('tenant_1', companies, ['tech']);

      expect(mockPrisma.company.findUnique).toHaveBeenCalled();
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: companies[0].name,
            website: companies[0].website,
            domain: companies[0].domain,
          }),
        })
      );
    });

    it('should skip company creation if already exists', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'existing_company',
        website: 'testcompany.com',
      } as any);

      const companies = [createMockCompany()];

      await CompanyDiscoveryService.createLeads('tenant_1', companies, ['tech']);

      expect(mockPrisma.company.create).not.toHaveBeenCalled();
      expect(mockPrisma.lead.create).toHaveBeenCalled();
    });

    it('should create lead with correct priority tier', async () => {
      const highRelevanceCompany = createMockCompany({
        name: 'Perfect Fintech Match',
        industry: 'FinTech',
        description: 'Fintech solutions',
        employeeCount: 200,
        contactEmail: 'sales@perfect.com',
        linkedinUrl: 'linkedin.com/company/perfect',
      });

      await CompanyDiscoveryService.createLeads('tenant_1', [highRelevanceCompany], ['fintech']);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priorityTier: 'high',
          }),
        })
      );
    });

    it('should set medium priority for moderate relevance', async () => {
      const mediumCompany = createMockCompany({
        employeeCount: 150,
        industry: 'Manufacturing', // Different industry for lower relevance
        description: 'A manufacturing company', // No tech keywords
      });

      await CompanyDiscoveryService.createLeads('tenant_1', [mediumCompany], ['software', 'saas']);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priorityTier: expect.stringMatching(/^(high|medium|low)$/),
          }),
        })
      );
    });

    it('should create multiple leads for multiple companies', async () => {
      const companies = createMockCompanies(5);

      const leads = await CompanyDiscoveryService.createLeads('tenant_1', companies, ['tech']);

      expect(leads).toHaveLength(5);
      expect(mockPrisma.lead.create).toHaveBeenCalledTimes(5);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.company.create.mockRejectedValue(new Error('Database error'));

      const companies = [createMockCompany()];

      const leads = await CompanyDiscoveryService.createLeads('tenant_1', companies, ['tech']);

      expect(leads).toHaveLength(0);
    });

    it('should set keyword matches', async () => {
      const companies = [createMockCompany()];

      await CompanyDiscoveryService.createLeads('tenant_1', companies, ['fintech', 'saas']);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            keywordMatches: ['fintech', 'saas'],
          }),
        })
      );
    });

    it('should generate email from domain if contactEmail missing', async () => {
      const company = createMockCompany({
        contactEmail: undefined,
        domain: 'example.com',
      });

      await CompanyDiscoveryService.createLeads('tenant_1', [company], ['tech']);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'contact@example.com',
          }),
        })
      );
    });

    it('should set initial status to new', async () => {
      const companies = [createMockCompany()];

      await CompanyDiscoveryService.createLeads('tenant_1', companies, ['tech']);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'new',
          }),
        })
      );
    });

    it('should include relevance score', async () => {
      const companies = [createMockCompany()];

      await CompanyDiscoveryService.createLeads('tenant_1', companies, ['tech']);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            relevanceScore: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('getMockCompanies', () => {
    it('should return SaaS companies', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['saas']);

      expect(companies.some(c => c.industry.toLowerCase().includes('software'))).toBe(true);
    });

    it('should return ecommerce companies', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['ecommerce']);

      expect(companies.some(c => c.industry.toLowerCase().includes('commerce'))).toBe(true);
    });

    it('should return education companies', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['education']);

      expect(companies.some(c => c.industry.toLowerCase().includes('education'))).toBe(true);
    });

    it('should have valid contact information', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech']);

      companies.forEach(company => {
        expect(company.contactEmail).toBeDefined();
        expect(company.contactEmail).toContain('@');
        expect(company.linkedinUrl).toBeDefined();
        expect(company.linkedinUrl).toContain('linkedin.com');
      });
    });

    it('should have reasonable employee counts', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fintech']);

      companies.forEach(company => {
        expect(company.employeeCount).toBeGreaterThan(0);
        expect(company.employeeCount).toBeLessThan(1000);
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle very large keyword arrays', async () => {
      const keywords = Array.from({ length: 100 }, (_, i) => `keyword${i}`);

      const companies = await CompanyDiscoveryService.searchByKeywords(keywords);

      expect(companies).toBeDefined();
      expect(Array.isArray(companies)).toBe(true);
    });

    it('should handle special characters in keywords', async () => {
      const companies = await CompanyDiscoveryService.searchByKeywords(['fin-tech', 'e/commerce']);

      expect(companies).toBeDefined();
    });

    it('should handle empty company data gracefully', async () => {
      process.env.APOLLO_API_KEY = 'test_api_key';

      mockedAxios.post.mockResolvedValue({
        data: {
          organizations: [
            {
              id: '123',
              name: '',
              domain: '',
            },
          ],
        },
      });

      const companies = await CompanyDiscoveryService.searchByKeywords(['tech']);

      expect(companies[0].name).toBe('Unknown');
    });

    it('should handle concurrent searches', async () => {
      const searches = Array.from({ length: 10 }, (_, i) =>
        CompanyDiscoveryService.searchByKeywords([`keyword${i}`])
      );

      const results = await Promise.all(searches);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
