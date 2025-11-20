/**
 * Lawsuit Tracking Service
 * Real-time ADA lawsuit monitoring and trend analysis
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { log } from '../utils/logger';

const prisma = new PrismaClient();

export interface LawsuitData {
  caseNumber: string;
  plaintiffName: string;
  defendantName: string;
  defendantWebsite?: string;
  defendantIndustry?: string;
  court: string;
  state: string;
  filedDate: Date;
  status?: string;
  settlementAmount?: number;
  violations?: string[];
  plaintiffLawFirm?: string;
  defendantLawFirm?: string;
  dataSource: string;
  sourceUrl?: string;
}

export interface LawsuitTrend {
  metro: string;
  count: number;
  change: number; // % change from previous period
  topIndustries: Array<{ industry: string; count: number }>;
  topLawFirms: Array<{ firm: string; count: number }>;
  averageSettlement?: number;
}

export class LawsuitTrackingService {
  /**
   * Scrape Seyfarth ADA lawsuit database
   */
  static async scrapeSeyfarth(params: {
    state?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LawsuitData[]> {
    const lawsuits: LawsuitData[] = [];

    try {
      log.info('Scraping Seyfarth ADA lawsuit database', params);

      // Seyfarth Shaw ADA Title III News & Insights
      const url = 'https://www.adatitleiii.com/ada-title-iii-lawsuits/';

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Parse lawsuit entries (this is a simplified example)
      $('.lawsuit-entry').each((i, elem) => {
        const caseNumber = $(elem).find('.case-number').text().trim();
        const defendant = $(elem).find('.defendant').text().trim();
        const court = $(elem).find('.court').text().trim();
        const filedDateStr = $(elem).find('.filed-date').text().trim();

        if (caseNumber && defendant) {
          lawsuits.push({
            caseNumber,
            plaintiffName: 'Unknown', // Parse from entry
            defendantName: defendant,
            court: court || 'Unknown',
            state: this.extractStateFromCourt(court),
            filedDate: new Date(filedDateStr || Date.now()),
            dataSource: 'seyfarth',
            sourceUrl: url,
          });
        }
      });

      log.info('Seyfarth scrape complete', { count: lawsuits.length });

      return lawsuits.slice(0, params.limit || 100);
    } catch (error) {
      log.error('Seyfarth scrape failed', error as Error);
      return [];
    }
  }

  /**
   * Scrape UsableNet ADA lawsuit tracker
   */
  static async scrapeUsableNet(params: {
    year?: number;
    limit?: number;
  }): Promise<LawsuitData[]> {
    const lawsuits: LawsuitData[] = [];

    try {
      log.info('Scraping UsableNet lawsuit tracker', params);

      // UsableNet publishes annual reports
      const year = params.year || new Date().getFullYear();
      const url = `https://blog.usablenet.com/ada-digital-accessibility-lawsuit-tracker-${year}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Parse lawsuit data from tables
      $('table.lawsuit-data tr').each((i, row) => {
        if (i === 0) return; // Skip header

        const cells = $(row).find('td');
        const defendant = $(cells[0]).text().trim();
        const state = $(cells[1]).text().trim();
        const date = $(cells[2]).text().trim();

        if (defendant) {
          lawsuits.push({
            caseNumber: `USABLENET-${year}-${i}`,
            plaintiffName: 'Various',
            defendantName: defendant,
            court: `${state} District Court`,
            state: state,
            filedDate: new Date(date || `${year}-01-01`),
            dataSource: 'usablenet',
            sourceUrl: url,
          });
        }
      });

      log.info('UsableNet scrape complete', { count: lawsuits.length });

      return lawsuits.slice(0, params.limit || 100);
    } catch (error) {
      log.error('UsableNet scrape failed', error as Error);
      return [];
    }
  }

  /**
   * Import lawsuits to database
   */
  static async importLawsuits(lawsuits: LawsuitData[]): Promise<{
    imported: number;
    updated: number;
    skipped: number;
  }> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const lawsuit of lawsuits) {
      try {
        // Try to match metro by state
        const metro = await prisma.metro.findFirst({
          where: { state: lawsuit.state },
        });

        const existing = await prisma.lawsuit.findUnique({
          where: { caseNumber: lawsuit.caseNumber },
        });

        if (existing) {
          // Update if needed
          await prisma.lawsuit.update({
            where: { caseNumber: lawsuit.caseNumber },
            data: {
              status: lawsuit.status || existing.status,
              settlementAmount: lawsuit.settlementAmount || existing.settlementAmount,
            },
          });
          updated++;
        } else {
          // Create new
          await prisma.lawsuit.create({
            data: {
              caseNumber: lawsuit.caseNumber,
              plaintiffName: lawsuit.plaintiffName,
              defendantName: lawsuit.defendantName,
              defendantWebsite: lawsuit.defendantWebsite,
              defendantIndustry: lawsuit.defendantIndustry,
              metroId: metro?.id,
              court: lawsuit.court,
              state: lawsuit.state,
              filedDate: lawsuit.filedDate,
              status: lawsuit.status || 'active',
              settlementAmount: lawsuit.settlementAmount,
              violations: lawsuit.violations || [],
              allegationType: 'Title III ADA',
              plaintiffLawFirm: lawsuit.plaintiffLawFirm,
              defendantLawFirm: lawsuit.defendantLawFirm,
              dataSource: lawsuit.dataSource,
              sourceUrl: lawsuit.sourceUrl,
            },
          });
          imported++;
        }
      } catch (error) {
        log.error('Failed to import lawsuit', { caseNumber: lawsuit.caseNumber, error });
        skipped++;
      }
    }

    log.info('Lawsuit import complete', { imported, updated, skipped });

    return { imported, updated, skipped };
  }

  /**
   * Get lawsuit trends by metro
   */
  static async getTrendsByMetro(params: {
    metroId?: string;
    days?: number;
  }): Promise<LawsuitTrend[]> {
    const days = params.days || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const lawsuits = await prisma.lawsuit.findMany({
      where: {
        metroId: params.metroId,
        filedDate: {
          gte: startDate,
        },
      },
      include: {
        metro: true,
      },
    });

    // Group by metro
    const metroGroups = new Map<string, any[]>();

    for (const lawsuit of lawsuits) {
      if (!lawsuit.metro) continue;

      const key = lawsuit.metro.metroId;
      if (!metroGroups.has(key)) {
        metroGroups.set(key, []);
      }

      metroGroups.get(key)!.push(lawsuit);
    }

    // Calculate trends
    const trends: LawsuitTrend[] = [];

    for (const [metroId, metroLawsuits] of metroGroups.entries()) {
      const metro = metroLawsuits[0].metro;

      // Count by industry
      const industryCounts = new Map<string, number>();
      for (const lawsuit of metroLawsuits) {
        const industry = lawsuit.defendantIndustry || 'Unknown';
        industryCounts.set(industry, (industryCounts.get(industry) || 0) + 1);
      }

      // Count by law firm
      const lawFirmCounts = new Map<string, number>();
      for (const lawsuit of metroLawsuits) {
        const firm = lawsuit.plaintiffLawFirm || 'Unknown';
        lawFirmCounts.set(firm, (lawFirmCounts.get(firm) || 0) + 1);
      }

      // Average settlement
      const settlements = metroLawsuits
        .filter(l => l.settlementAmount && l.settlementAmount > 0)
        .map(l => l.settlementAmount!);

      const averageSettlement = settlements.length > 0
        ? settlements.reduce((sum, amt) => sum + amt, 0) / settlements.length
        : undefined;

      trends.push({
        metro: metro.name,
        count: metroLawsuits.length,
        change: 0, // TODO: Calculate % change from previous period
        topIndustries: Array.from(industryCounts.entries())
          .map(([industry, count]) => ({ industry, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topLawFirms: Array.from(lawFirmCounts.entries())
          .map(([firm, count]) => ({ firm, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        averageSettlement,
      });
    }

    return trends.sort((a, b) => b.count - a.count);
  }

  /**
   * Get recent lawsuits
   */
  static async getRecentLawsuits(params: {
    metroId?: string;
    state?: string;
    industry?: string;
    days?: number;
    limit?: number;
  }): Promise<any[]> {
    const days = params.days || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await prisma.lawsuit.findMany({
      where: {
        metroId: params.metroId,
        state: params.state,
        defendantIndustry: params.industry,
        filedDate: {
          gte: startDate,
        },
      },
      include: {
        metro: true,
      },
      orderBy: {
        filedDate: 'desc',
      },
      take: params.limit || 50,
    });
  }

  /**
   * Track metro for lawsuit alerts
   */
  static async trackMetro(metroId: string, email: string): Promise<void> {
    // TODO: Add to alert subscription table
    log.info('Metro tracking enabled', { metroId, email });
  }

  /**
   * Daily lawsuit scrape job (run via cron)
   */
  static async dailyLawsuitScrapeJob(): Promise<void> {
    log.info('Running daily lawsuit scrape job');

    try {
      // Scrape Seyfarth
      const seyfarthLawsuits = await this.scrapeSeyfarth({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: 100,
      });

      // Scrape UsableNet
      const usablenetLawsuits = await this.scrapeUsableNet({
        year: new Date().getFullYear(),
        limit: 100,
      });

      // Import all
      const allLawsuits = [...seyfarthLawsuits, ...usablenetLawsuits];
      const result = await this.importLawsuits(allLawsuits);

      log.info('Daily scrape job complete', result);

      // TODO: Send alerts for new lawsuits
    } catch (error) {
      log.error('Daily scrape job failed', error as Error);
    }
  }

  /**
   * Extract state code from court name
   */
  private static extractStateFromCourt(court: string): string {
    const stateMatch = court.match(/\b([A-Z]{2})\b/);
    return stateMatch ? stateMatch[1] : 'XX';
  }

  /**
   * Get lawsuit statistics
   */
  static async getStatistics(): Promise<{
    totalLawsuits: number;
    last30Days: number;
    last90Days: number;
    topStates: Array<{ state: string; count: number }>;
    topIndustries: Array<{ industry: string; count: number }>;
    averageSettlement: number;
  }> {
    const total = await prisma.lawsuit.count();

    const last30 = await prisma.lawsuit.count({
      where: {
        filedDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const last90 = await prisma.lawsuit.count({
      where: {
        filedDate: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Top states
    const lawsuitsByState = await prisma.lawsuit.groupBy({
      by: ['state'],
      _count: true,
      orderBy: {
        _count: {
          state: 'desc',
        },
      },
      take: 10,
    });

    const topStates = lawsuitsByState.map(g => ({
      state: g.state,
      count: g._count,
    }));

    // Top industries
    const lawsuitsByIndustry = await prisma.lawsuit.groupBy({
      by: ['defendantIndustry'],
      _count: true,
      where: {
        defendantIndustry: {
          not: null,
        },
      },
      orderBy: {
        _count: {
          defendantIndustry: 'desc',
        },
      },
      take: 10,
    });

    const topIndustries = lawsuitsByIndustry.map(g => ({
      industry: g.defendantIndustry || 'Unknown',
      count: g._count,
    }));

    // Average settlement
    const settlements = await prisma.lawsuit.aggregate({
      _avg: {
        settlementAmount: true,
      },
      where: {
        settlementAmount: {
          gt: 0,
        },
      },
    });

    return {
      totalLawsuits: total,
      last30Days: last30,
      last90Days: last90,
      topStates,
      topIndustries,
      averageSettlement: settlements._avg.settlementAmount || 0,
    };
  }
}
