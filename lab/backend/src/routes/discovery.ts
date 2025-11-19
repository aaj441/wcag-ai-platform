/**
 * Keyword Discovery API - Core competitive advantage
 * 
 * POST /api/discovery/search - Discover vertical markets via keywords
 * POST /api/discovery/queue-batch - Queue discovered sites for scanning
 * GET /api/discovery/tam - Calculate total addressable market
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pino } from 'pino';

const router = Router();
const logger = pino();

// Request validation schemas
const searchSchema = z.object({
  keywords: z.array(z.string()).min(1, 'At least one keyword required'),
  location: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

const queueBatchSchema = z.object({
  websites: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    companySize: z.enum(['smb', 'mid-market', 'enterprise']).optional(),
    estimatedRevenue: z.number().optional(),
  })).min(1),
});

/**
 * POST /api/discovery/search
 * Discover websites in a vertical using keyword search
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { keywords, location, limit } = searchSchema.parse(req.body);

    logger.info({ keywords, location, limit }, 'Discovery search initiated');

    // In production: integrate with SerpAPI
    // For lab: generate realistic mock data
    const results = await discoverWebsites(keywords, location, limit);

    const tam = calculateTAM(results);
    const industryBreakdown = analyzeIndustries(results);

    res.json({
      success: true,
      data: {
        query: keywords.join(' + '),
        location: location || 'Global',
        totalFound: results.length,
        websites: results,
        tam,
        industryBreakdown,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    logger.error({ error }, 'Discovery search failed');
    res.status(500).json({
      success: false,
      error: 'Discovery failed',
    });
  }
});

/**
 * POST /api/discovery/queue-batch
 * Queue discovered sites for WCAG scanning
 */
router.post('/queue-batch', async (req: Request, res: Response) => {
  try {
    const { websites } = queueBatchSchema.parse(req.body);

    logger.info({ count: websites.length }, 'Queueing batch scan');

    // Create scan jobs
    const jobs = websites.map((site, index) => ({
      id: `scan_${Date.now()}_${index}`,
      url: site.url,
      title: site.title,
      status: 'queued',
      priority: site.companySize === 'enterprise' ? 'high' : 'normal',
      estimatedRevenue: site.estimatedRevenue || 0,
      queuedAt: new Date().toISOString(),
    }));

    // In production: add to BullMQ queue
    // For lab: return job list

    res.json({
      success: true,
      data: {
        queued: jobs.length,
        jobs,
        estimatedCompletionTime: `${jobs.length * 2} minutes`,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    logger.error({ error }, 'Batch queue failed');
    res.status(500).json({
      success: false,
      error: 'Failed to queue batch',
    });
  }
});

/**
 * GET /api/discovery/tam
 * Calculate total addressable market for a query
 */
router.get('/tam', (req: Request, res: Response) => {
  const { siteCount = 100, conversionRate = 0.15, avgDealSize = 25000 } = req.query;

  const sites = Number(siteCount);
  const conversion = Number(conversionRate);
  const dealSize = Number(avgDealSize);

  const estimatedDeals = Math.floor(sites * conversion);
  const totalTAM = sites * dealSize * conversion;

  res.json({
    success: true,
    data: {
      totalSites: sites,
      conversionRate: `${(conversion * 100).toFixed(1)}%`,
      avgDealSize: `$${dealSize.toLocaleString()}`,
      estimatedDeals,
      totalAddressableMarket: `$${totalTAM.toLocaleString()}`,
    },
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Discover websites (mock implementation)
 * In production: integrate with SerpAPI
 */
async function discoverWebsites(
  keywords: string[],
  location: string | undefined,
  limit: number
) {
  const results = [];
  const primaryKeyword = keywords[0];

  for (let i = 0; i < limit; i++) {
    results.push({
      url: `https://example-${primaryKeyword}-${i + 1}.com`,
      title: `${capitalize(primaryKeyword)} Company ${i + 1}`,
      description: `Leading ${primaryKeyword} provider${location ? ` in ${location}` : ''}`,
      industry: primaryKeyword,
      companySize: i % 3 === 0 ? 'enterprise' : i % 3 === 1 ? 'mid-market' : 'smb',
      estimatedRevenue: (i + 1) * 1000000,
      location: location || 'Unknown',
      discoveredAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Calculate Total Addressable Market
 */
function calculateTAM(websites: any[]) {
  const avgDealSize = 25000;
  const conversionRate = 0.15;

  const estimatedDeals = Math.floor(websites.length * conversionRate);
  const totalTAM = websites.length * avgDealSize * conversionRate;

  return {
    totalSites: websites.length,
    conversionRate: `${(conversionRate * 100).toFixed(1)}%`,
    avgDealSize: `$${avgDealSize.toLocaleString()}`,
    estimatedDeals,
    totalAddressableMarket: `$${totalTAM.toLocaleString()}`,
  };
}

/**
 * Analyze industry distribution
 */
function analyzeIndustries(websites: any[]) {
  const breakdown: Record<string, number> = {};

  websites.forEach(site => {
    const industry = site.industry || 'Unknown';
    breakdown[industry] = (breakdown[industry] || 0) + 1;
  });

  return Object.entries(breakdown).map(([industry, count]) => ({
    industry: capitalize(industry),
    count,
    percentage: `${((count / websites.length) * 100).toFixed(1)}%`,
  }));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export { router as discoveryRouter };
