/**
 * Enhanced Prospect Discovery Service V2
 * Uses real API integrations (Apollo, Hunter, Google Maps) instead of mock data
 */

import { log } from '../utils/logger';
import { INDUSTRY_VERTICALS } from '../data/nationalMetros';
import { ApolloClient } from '../integrations/ApolloClient';
import { HunterClient } from '../integrations/HunterClient';
import { GoogleMapsClient } from '../integrations/GoogleMapsClient';

export interface DiscoveryOptions {
  metro: string;
  industries: string[];
  limit?: number;
  enrichData?: boolean;
  useRealAPIs?: boolean; // Toggle between real APIs and mock data
}

export interface DiscoveredProspect {
  businessName: string;
  website: string;
  industry: string;
  contact?: {
    email?: string;
    phone?: string;
    ownerName?: string;
  };
  businessIntel?: {
    foundedYear?: number;
    revenue?: string;
    employeeCount?: number;
  };
  source: string;
  sourceUrl?: string;
  confidence: number; // 0-1, how confident we are in the data
}

export class ProspectDiscoveryServiceV2 {
  /**
   * Discover prospects using real API integrations
   */
  static async discoverProspects(options: DiscoveryOptions): Promise<DiscoveredProspect[]> {
    log.info('Starting V2 prospect discovery (real APIs)', options);

    const prospects: DiscoveredProspect[] = [];
    const useRealAPIs = options.useRealAPIs !== false && process.env.ENABLE_REAL_APIS === 'true';

    for (const verticalId of options.industries) {
      const industry = INDUSTRY_VERTICALS.find(i => i.verticalId === verticalId);
      if (!industry) continue;

      if (useRealAPIs) {
        // Google Maps discovery
        const googleResults = await this.discoverViaGoogleMaps(
          options.metro,
          industry,
          Math.floor((options.limit || 50) / 2)
        );
        prospects.push(...googleResults);

        // Apollo.io discovery
        const apolloResults = await this.discoverViaApollo(
          options.metro,
          industry,
          Math.floor((options.limit || 50) / 2)
        );
        prospects.push(...apolloResults);
      } else {
        // Fallback to mock data (original implementation)
        const mockResults = this.generateMockResults(options.metro, industry, options.limit || 50);
        prospects.push(...mockResults);
      }
    }

    // Enrich with Hunter.io if requested
    if (options.enrichData && useRealAPIs) {
      return await this.enrichProspectsWithHunter(prospects);
    }

    return prospects.slice(0, options.limit || 50);
  }

  /**
   * Discover via Google Maps Places API
   */
  private static async discoverViaGoogleMaps(
    metro: string,
    industry: any,
    limit: number
  ): Promise<DiscoveredProspect[]> {
    const prospects: DiscoveredProspect[] = [];

    // Use search queries from industry config
    for (const searchQuery of industry.searchQueries.slice(0, 2)) {
      const query = `${searchQuery} in ${metro}`;
      log.debug('Google Maps search', { query });

      const places = await GoogleMapsClient.searchPlaces({
        query,
        type: this.getGooglePlaceType(industry.verticalId),
        limit: limit / 2,
      });

      for (const place of places) {
        const website = GoogleMapsClient.extractWebsite(place);
        if (!website) continue;

        prospects.push({
          businessName: place.name,
          website,
          industry: industry.verticalId,
          contact: {
            phone: place.formatted_phone_number,
          },
          source: 'google_maps',
          sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          confidence: place.rating ? Math.min(place.rating / 5, 1.0) : 0.5,
        });
      }
    }

    return prospects;
  }

  /**
   * Discover via Apollo.io B2B database
   */
  private static async discoverViaApollo(
    metro: string,
    industry: any,
    limit: number
  ): Promise<DiscoveredProspect[]> {
    const prospects: DiscoveredProspect[] = [];

    // Parse metro for city/state
    const [city, state] = metro.split(',').map(s => s.trim());

    const organizations = await ApolloClient.searchOrganizations({
      city,
      state,
      industry: [industry.name],
      employeeMin: industry.typicalEmployeeMin || 5,
      employeeMax: industry.typicalEmployeeMax || 100,
      limit,
    });

    for (const org of organizations) {
      prospects.push({
        businessName: org.name,
        website: org.website_url,
        industry: industry.verticalId,
        contact: {
          phone: org.phone,
        },
        businessIntel: {
          employeeCount: org.estimated_num_employees,
          revenue: this.formatRevenue(org.annual_revenue),
          foundedYear: org.founded_year,
        },
        source: 'apollo',
        sourceUrl: org.linkedin_url,
        confidence: 0.9, // Apollo data is highly accurate
      });
    }

    return prospects;
  }

  /**
   * Enrich prospects with Hunter.io email data
   */
  private static async enrichProspectsWithHunter(
    prospects: DiscoveredProspect[]
  ): Promise<DiscoveredProspect[]> {
    const enriched: DiscoveredProspect[] = [];

    for (const prospect of prospects) {
      try {
        // Find emails for domain
        const domainData = await HunterClient.findEmails(prospect.website, 3);

        if (domainData && domainData.emails.length > 0) {
          // Find decision maker (CEO, Owner, President, etc.)
          const decisionMaker = domainData.emails.find(e =>
            ['CEO', 'Owner', 'President', 'Founder', 'Managing Director'].some(title =>
              e.position?.includes(title)
            )
          );

          const contact = decisionMaker || domainData.emails[0];

          enriched.push({
            ...prospect,
            contact: {
              ...prospect.contact,
              email: contact.value,
              ownerName: `${contact.first_name} ${contact.last_name}`,
            },
            confidence: Math.min(prospect.confidence + 0.1, 1.0), // Boost confidence with verified email
          });
        } else {
          enriched.push(prospect);
        }
      } catch (error) {
        log.error('Hunter enrichment failed', error as Error);
        enriched.push(prospect);
      }
    }

    return enriched;
  }

  /**
   * Map industry to Google Place type
   */
  private static getGooglePlaceType(verticalId: string): string | undefined {
    const mapping: { [key: string]: string } = {
      medical: 'dentist',
      legal: 'lawyer',
      financial: 'accounting',
      hospitality: 'restaurant',
    };
    return mapping[verticalId];
  }

  /**
   * Format revenue for display
   */
  private static formatRevenue(revenue: number): string {
    if (revenue < 1000000) return '$0-$1M';
    if (revenue < 5000000) return '$1M-$5M';
    if (revenue < 10000000) return '$5M-$10M';
    if (revenue < 50000000) return '$10M-$50M';
    return '$50M+';
  }

  /**
   * Generate mock results (fallback)
   */
  private static generateMockResults(
    metro: string,
    industry: any,
    limit: number
  ): DiscoveredProspect[] {
    const count = Math.floor(Math.random() * 15) + 5;
    const prospects: DiscoveredProspect[] = [];

    for (let i = 0; i < count && i < limit; i++) {
      prospects.push({
        businessName: `${industry.name} ${i + 1} - ${metro}`,
        website: `www.business${i}.com`,
        industry: industry.verticalId,
        contact: {
          email: `info@business${i}.com`,
          phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        },
        businessIntel: {
          foundedYear: Math.floor(Math.random() * 30) + 1990,
          employeeCount: Math.floor(Math.random() * 50) + 5,
          revenue: this.formatRevenue(Math.random() * 10000000),
        },
        source: 'mock',
        confidence: 0.3, // Low confidence for mock data
      });
    }

    return prospects;
  }
}
