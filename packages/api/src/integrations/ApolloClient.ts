/**
 * Apollo.io API Client
 * B2B contact enrichment and company intelligence
 * https://apolloapi.com/docs
 */

import axios from 'axios';
import { log } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  organization_name: string;
  organization_website: string;
  phone: string;
  linkedin_url: string;
  employment_history: Array<{
    organization_name: string;
    title: string;
    start_date: string;
    end_date?: string;
  }>;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string;
  industry: string;
  estimated_num_employees: number;
  annual_revenue: number;
  founded_year: number;
  phone: string;
  linkedin_url: string;
  city: string;
  state: string;
  country: string;
}

export class ApolloClient {
  private static apiKey = process.env.APOLLO_API_KEY || '';
  private static baseUrl = 'https://api.apollo.io/v1';

  /**
   * Search for organizations by location and industry
   */
  static async searchOrganizations(params: {
    city?: string;
    state?: string;
    industry?: string[];
    employeeMin?: number;
    employeeMax?: number;
    revenueMin?: number;
    revenueMax?: number;
    limit?: number;
  }): Promise<ApolloOrganization[]> {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/mixed_companies/search`,
        {
          q_organization_city: params.city,
          q_organization_state: params.state,
          q_organization_industry_tag_ids: params.industry,
          organization_num_employees_ranges: params.employeeMin && params.employeeMax
            ? [`${params.employeeMin},${params.employeeMax}`]
            : undefined,
          page: 1,
          per_page: params.limit || 25,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apiKey,
          },
        }
      );

      // Log API usage
      await this.logApiCall('searchOrganizations', params, response.data, 'success', Date.now() - startTime);

      return response.data.organizations || [];
    } catch (error) {
      log.error('Apollo API search failed', error as Error);
      await this.logApiCall('searchOrganizations', params, null, 'failed', Date.now() - startTime, (error as Error).message);
      return [];
    }
  }

  /**
   * Enrich organization data by domain
   */
  static async enrichOrganization(domain: string): Promise<ApolloOrganization | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.baseUrl}/organizations/enrich`,
        {
          params: { domain },
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
          },
        }
      );

      await this.logApiCall('enrichOrganization', { domain }, response.data, 'success', Date.now() - startTime);

      return response.data.organization || null;
    } catch (error) {
      log.error('Apollo enrich failed', error as Error);
      await this.logApiCall('enrichOrganization', { domain }, null, 'failed', Date.now() - startTime, (error as Error).message);
      return null;
    }
  }

  /**
   * Find contacts at a specific organization
   */
  static async findContacts(organizationId: string, titles?: string[]): Promise<ApolloContact[]> {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/mixed_people/search`,
        {
          q_organization_ids: [organizationId],
          person_titles: titles,
          page: 1,
          per_page: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.apiKey,
          },
        }
      );

      await this.logApiCall('findContacts', { organizationId, titles }, response.data, 'success', Date.now() - startTime);

      return response.data.people || [];
    } catch (error) {
      log.error('Apollo contacts search failed', error as Error);
      await this.logApiCall('findContacts', { organizationId, titles }, null, 'failed', Date.now() - startTime, (error as Error).message);
      return [];
    }
  }

  /**
   * Log API call to database
   */
  private static async logApiCall(
    endpoint: string,
    requestData: any,
    responseData: any,
    status: 'success' | 'failed' | 'rate_limited',
    responseTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.aPIIntegrationLog.create({
        data: {
          provider: 'apollo',
          endpoint,
          requestData,
          responseData,
          status,
          responseTimeMs,
          errorMessage,
          costUsd: this.calculateCost(endpoint), // $0.01 per enrichment, $0.005 per search
        },
      });
    } catch (error) {
      log.error('Failed to log API call', error as Error);
    }
  }

  /**
   * Calculate cost per API call
   */
  private static calculateCost(endpoint: string): number {
    const costs: { [key: string]: number } = {
      searchOrganizations: 0.005,
      enrichOrganization: 0.01,
      findContacts: 0.01,
    };
    return costs[endpoint] || 0.0;
  }
}
