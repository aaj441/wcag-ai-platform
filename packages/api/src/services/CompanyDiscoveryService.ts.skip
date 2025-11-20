import axios from 'axios';
import { prisma } from '../lib/db';
import { log } from '../utils/logger';

export interface CompanyData {
  name: string;
  website: string;
  domain: string;
  industry: string;
  description?: string;
  employeeCount?: number;
  revenue?: string;
  contactEmail?: string;
  contactPhone?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  source: string;
  sourceId?: string;
}

/**
 * Company Discovery Service
 *
 * Searches for companies by keywords using Apollo.io API
 * Falls back to mock data if API key not configured
 */
export class CompanyDiscoveryService {
  /**
   * Search for companies by keywords
   * Uses Apollo.io API (https://www.apollo.io)
   */
  static async searchByKeywords(
    keywords: string[],
    filters?: {
      minEmployees?: number;
      maxEmployees?: number;
      countries?: string[];
      industryExclusions?: string[];
    }
  ): Promise<CompanyData[]> {
    if (!process.env.APOLLO_API_KEY) {
      log.warn('APOLLO_API_KEY not set, using mock data');
      return this.getMockCompanies(keywords);
    }

    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_companies/search',
        {
          q_organization_keywords: keywords,
          organization_num_employees_range: [
            filters?.minEmployees || 50,
            filters?.maxEmployees || 500,
          ],
          page: 1,
          per_page: 50,
        },
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'X-Api-Key': process.env.APOLLO_API_KEY,
          },
          timeout: 10000,
        }
      );

      if (!response.data.organizations) {
        return this.getMockCompanies(keywords);
      }

      return response.data.organizations.map((org: any) =>
        this.mapApolloToCompanyData(org)
      );
    } catch (error) {
      log.error(
        'Apollo API error',
        error instanceof Error ? error : new Error(String(error)),
        { keywords }
      );
      return this.getMockCompanies(keywords);
    }
  }

  /**
   * Search by industry
   */
  static async searchByIndustry(
    industry: string,
    filters?: {
      minEmployees?: number;
      maxEmployees?: number;
    }
  ): Promise<CompanyData[]> {
    if (!process.env.APOLLO_API_KEY) {
      return this.getMockCompaniesByIndustry(industry);
    }

    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_companies/search',
        {
          organization_industry: industry,
          organization_num_employees_range: [
            filters?.minEmployees || 50,
            filters?.maxEmployees || 500,
          ],
          page: 1,
          per_page: 50,
        },
        {
          headers: {
            'X-Api-Key': process.env.APOLLO_API_KEY,
          },
          timeout: 10000,
        }
      );

      return response.data.organizations?.map((org: any) =>
        this.mapApolloToCompanyData(org)
      ) || [];
    } catch (error) {
      log.error(
        'Industry search error',
        error instanceof Error ? error : new Error(String(error)),
        { industry }
      );
      return this.getMockCompaniesByIndustry(industry);
    }
  }

  /**
   * Map Apollo response to our schema
   */
  private static mapApolloToCompanyData(org: any): CompanyData {
    return {
      name: org.name || 'Unknown',
      website: org.website_url || org.domain || '',
      domain: org.domain || '',
      industry: org.industry || 'Unknown',
      description: org.short_description,
      employeeCount: org.num_employees,
      revenue: org.annual_revenue,
      contactEmail: org.email,
      contactPhone: org.phone,
      linkedinUrl: org.linkedin_url,
      crunchbaseUrl: org.crunchbase_url,
      source: 'apollo',
      sourceId: org.id,
    };
  }

  /**
   * Get mock data for testing (when API key not available)
   */
  private static getMockCompanies(keywords: string[]): CompanyData[] {
    const mockDatabase: Record<string, CompanyData[]> = {
      fintech: [
        {
          name: 'PaymentHub Inc',
          website: 'paymenthub.com',
          domain: 'paymenthub.com',
          industry: 'Financial Services',
          description: 'Digital payment platform for SMBs',
          employeeCount: 120,
          revenue: '10M-50M',
          contactEmail: 'sales@paymenthub.com',
          linkedinUrl: 'linkedin.com/company/paymenthub',
          source: 'mock',
        },
        {
          name: 'LoanStack',
          website: 'loanstack.io',
          domain: 'loanstack.io',
          industry: 'FinTech',
          description: 'Peer-to-peer lending platform',
          employeeCount: 85,
          revenue: '5M-10M',
          contactEmail: 'hello@loanstack.io',
          linkedinUrl: 'linkedin.com/company/loanstack',
          source: 'mock',
        },
        {
          name: 'CryptoVault',
          website: 'cryptovault.io',
          domain: 'cryptovault.io',
          industry: 'FinTech',
          description: 'Secure cryptocurrency wallet for enterprises',
          employeeCount: 150,
          revenue: '15M-50M',
          contactEmail: 'enterprise@cryptovault.io',
          linkedinUrl: 'linkedin.com/company/cryptovault',
          source: 'mock',
        },
      ],
      healthcare: [
        {
          name: 'MediConnect',
          website: 'mediconnect.health',
          domain: 'mediconnect.health',
          industry: 'Healthcare',
          description: 'Healthcare data platform for patient management',
          employeeCount: 150,
          revenue: '10M-50M',
          contactEmail: 'sales@mediconnect.health',
          linkedinUrl: 'linkedin.com/company/mediconnect',
          source: 'mock',
        },
        {
          name: 'ClinicalTech',
          website: 'clinicaltech.io',
          domain: 'clinicaltech.io',
          industry: 'Healthcare',
          description: 'Electronic health records and clinical workflows',
          employeeCount: 200,
          revenue: '20M-50M',
          contactEmail: 'info@clinicaltech.io',
          linkedinUrl: 'linkedin.com/company/clinicaltech',
          source: 'mock',
        },
      ],
      saas: [
        {
          name: 'CloudSync Pro',
          website: 'cloudsyncpro.com',
          domain: 'cloudsyncpro.com',
          industry: 'Software',
          description: 'Enterprise synchronization platform',
          employeeCount: 180,
          revenue: '15M-50M',
          contactEmail: 'enterprise@cloudsyncpro.com',
          linkedinUrl: 'linkedin.com/company/cloudsyncpro',
          source: 'mock',
        },
        {
          name: 'DataFlow',
          website: 'dataflow.io',
          domain: 'dataflow.io',
          industry: 'Software',
          description: 'Real-time data integration platform',
          employeeCount: 120,
          revenue: '10M-30M',
          contactEmail: 'sales@dataflow.io',
          linkedinUrl: 'linkedin.com/company/dataflow',
          source: 'mock',
        },
      ],
      ecommerce: [
        {
          name: 'ShopFlow',
          website: 'shopflow.io',
          domain: 'shopflow.io',
          industry: 'E-Commerce',
          description: 'Multi-channel e-commerce platform',
          employeeCount: 95,
          revenue: '5M-15M',
          contactEmail: 'sales@shopflow.io',
          linkedinUrl: 'linkedin.com/company/shopflow',
          source: 'mock',
        },
      ],
      education: [
        {
          name: 'EduConnect',
          website: 'educonnect.io',
          domain: 'educonnect.io',
          industry: 'Education',
          description: 'Learning management system for enterprises',
          employeeCount: 140,
          revenue: '10M-30M',
          contactEmail: 'sales@educonnect.io',
          linkedinUrl: 'linkedin.com/company/educonnect',
          source: 'mock',
        },
      ],
    };

    // Collect results for all matching keywords
    let results: CompanyData[] = [];
    const seenDomains = new Set<string>();

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const companies = mockDatabase[keywordLower] || [];

      for (const company of companies) {
        if (!seenDomains.has(company.domain)) {
          results.push(company);
          seenDomains.add(company.domain);
        }
      }
    }

    // If no results, return at least one example
    return results.length > 0
      ? results
      : [
          {
            name: 'Example Corp',
            website: 'example.com',
            domain: 'example.com',
            industry: 'Technology',
            description: 'Sample company for demonstration',
            employeeCount: 200,
            source: 'mock',
          },
        ];
  }

  /**
   * Get mock data filtered by industry
   */
  private static getMockCompaniesByIndustry(industry: string): CompanyData[] {
    const allMock = this.getMockCompanies(['fintech', 'healthcare', 'saas', 'ecommerce', 'education']);
    return allMock.filter((c) =>
      c.industry.toLowerCase().includes(industry.toLowerCase())
    );
  }

  /**
   * Score company relevance based on keyword match
   */
  static scoreRelevance(
    company: CompanyData,
    keywords: string[]
  ): number {
    let score = 0.5; // Base score

    const companyText = `${company.name} ${company.industry} ${company.description || ''}`
      .toLowerCase();

    // Keyword matches (each match increases score)
    const matches = keywords.filter((kw) =>
      companyText.includes(kw.toLowerCase())
    );
    score += Math.min(matches.length * 0.2, 0.4); // Max +0.4

    // Size preference (50-500 employees = ideal)
    if (company.employeeCount) {
      if (company.employeeCount >= 50 && company.employeeCount <= 500) {
        score += 0.2;
      } else if (company.employeeCount < 50 || company.employeeCount > 1000) {
        score -= 0.1;
      }
    }

    // Contact info bonus
    if (company.contactEmail && company.linkedinUrl) {
      score += 0.1;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Create leads from discovered companies
   */
  static async createLeads(
    tenantId: string,
    companies: CompanyData[],
    keywords: string[]
  ) {
    const leads = [];

    for (const companyData of companies) {
      try {
        // Check if company exists
        let company = await prisma.company.findUnique({
          where: { website: companyData.website || 'unknown' },
        });

        // Create company if not exists
        if (!company) {
          company = await prisma.company.create({
            data: {
              name: companyData.name,
              website: companyData.website || `${companyData.domain}`,
              domain: companyData.domain,
              industry: companyData.industry,
              description: companyData.description,
              employeeCount: companyData.employeeCount,
              revenue: companyData.revenue,
              contactEmail: companyData.contactEmail,
              contactPhone: companyData.contactPhone,
              linkedinUrl: companyData.linkedinUrl,
              crunchbaseUrl: companyData.crunchbaseUrl,
              source: companyData.source,
              sourceId: companyData.sourceId,
              tenantId: null, // Global company database
            },
          });

          log.info('Company created', {
            companyId: company.id,
            name: company.name,
          });
        }

        // Score relevance
        const relevanceScore = this.scoreRelevance(companyData, keywords);
        const priorityTier =
          relevanceScore > 0.8
            ? 'high'
            : relevanceScore > 0.6
              ? 'medium'
              : 'low';

        // Create lead
        const lead = await prisma.lead.create({
          data: {
            tenantId,
            companyId: company.id,
            name: companyData.contactEmail?.split('@')[0] || 'Unknown',
            email: companyData.contactEmail || `contact@${companyData.domain}`,
            title: 'Decision Maker',
            linkedinUrl: companyData.linkedinUrl,
            keywordMatches: keywords,
            relevanceScore,
            priorityTier,
            status: 'new',
          },
        });

        leads.push(lead);
      } catch (error) {
        log.error(
          'Failed to create lead',
          error instanceof Error ? error : new Error(String(error)),
          { company: companyData.name }
        );
      }
    }

    return leads;
  }
}
