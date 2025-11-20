/**
 * Hunter.io API Client
 * Email verification and finding
 * https://hunter.io/api-documentation
 */

import axios from 'axios';
import { log } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface HunterEmail {
  value: string;
  type: string; // "personal" or "generic"
  confidence: number; // 0-100
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  linkedin: string;
  twitter: string;
}

export interface HunterDomainSearch {
  domain: string;
  organization: string;
  pattern: string; // email pattern like "{first}.{last}@domain.com"
  emails: HunterEmail[];
}

export class HunterClient {
  private static apiKey = process.env.HUNTER_API_KEY || '';
  private static baseUrl = 'https://api.hunter.io/v2';

  /**
   * Find emails for a domain
   */
  static async findEmails(domain: string, limit: number = 10): Promise<HunterDomainSearch | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.baseUrl}/domain-search`, {
        params: {
          domain,
          api_key: this.apiKey,
          limit,
        },
      });

      await this.logApiCall('findEmails', { domain, limit }, response.data, 'success', Date.now() - startTime);

      return response.data.data || null;
    } catch (error) {
      log.error('Hunter email search failed', error as Error);
      await this.logApiCall('findEmails', { domain, limit }, null, 'failed', Date.now() - startTime, (error as Error).message);
      return null;
    }
  }

  /**
   * Verify an email address
   */
  static async verifyEmail(email: string): Promise<{
    result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
    score: number; // 0-100
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
  } | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.baseUrl}/email-verifier`, {
        params: {
          email,
          api_key: this.apiKey,
        },
      });

      await this.logApiCall('verifyEmail', { email }, response.data, 'success', Date.now() - startTime);

      return response.data.data || null;
    } catch (error) {
      log.error('Hunter email verification failed', error as Error);
      await this.logApiCall('verifyEmail', { email }, null, 'failed', Date.now() - startTime, (error as Error).message);
      return null;
    }
  }

  /**
   * Find email for a specific person
   */
  static async findPersonEmail(params: {
    domain: string;
    firstName: string;
    lastName: string;
  }): Promise<HunterEmail | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.baseUrl}/email-finder`, {
        params: {
          domain: params.domain,
          first_name: params.firstName,
          last_name: params.lastName,
          api_key: this.apiKey,
        },
      });

      await this.logApiCall('findPersonEmail', params, response.data, 'success', Date.now() - startTime);

      return response.data.data?.email ? response.data.data : null;
    } catch (error) {
      log.error('Hunter person email search failed', error as Error);
      await this.logApiCall('findPersonEmail', params, null, 'failed', Date.now() - startTime, (error as Error).message);
      return null;
    }
  }

  /**
   * Get email pattern for domain
   */
  static async getEmailPattern(domain: string): Promise<string | null> {
    const domainData = await this.findEmails(domain, 1);
    return domainData?.pattern || null;
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
          provider: 'hunter',
          endpoint,
          requestData,
          responseData,
          status,
          responseTimeMs,
          errorMessage,
          costUsd: this.calculateCost(endpoint),
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
      findEmails: 0.01,
      verifyEmail: 0.005,
      findPersonEmail: 0.01,
    };
    return costs[endpoint] || 0.0;
  }
}
