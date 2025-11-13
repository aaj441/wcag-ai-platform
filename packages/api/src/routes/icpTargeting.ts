/**
 * ICP-Based Lead Targeting API
 * Advanced search and filtering for ideal customer profiles across geographic regions
 * Includes decision maker targeting and multi-metro analysis
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ============================================================================
// ICP & BUSINESS SEARCH
// ============================================================================

/**
 * GET /api/icp-targeting/search-by-icp
 * Find businesses matching a specific ICP (Industry + Metro combination)
 * Example: Find all dental practices in Pittsburgh Metro matching profile
 */
router.get('/search-by-icp', async (req: Request, res: Response) => {
  try {
    const {
      icpProfileId,
      minMatchScore = 0.7,
      limit = 50,
      offset = 0,
      includeContacts = false,
    } = req.query;

    if (!icpProfileId) {
      return res.status(400).json({
        success: false,
        error: 'icpProfileId required',
      });
    }

    // Find ICP and its characteristics
    const icp = await prisma.idealCustomerProfile.findUnique({
      where: { id: icpProfileId as string },
      include: {
        industry: true,
        metropolitanArea: true,
      },
    });

    if (!icp) {
      return res.status(404).json({
        success: false,
        error: 'ICP not found',
      });
    }

    // Find businesses matching this ICP
    const businesses = await prisma.targetBusiness.findMany({
      where: {
        industryId: icp.industryId,
        metadata: {
          metropolitanAreaId: icp.metropolitanAreaId,
          icpMatchScore: {
            gte: parseFloat(minMatchScore as string),
          },
        },
      },
      include: {
        industry: true,
        metadata: true,
        violations: { take: 3 },
        contactPersons: includeContacts === 'true' ? true : false,
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const totalCount = await prisma.targetBusiness.count({
      where: {
        industryId: icp.industryId,
        metadata: {
          metropolitanAreaId: icp.metropolitanAreaId,
          icpMatchScore: {
            gte: parseFloat(minMatchScore as string),
          },
        },
      },
    });

    return res.json({
      success: true,
      icp: {
        name: icp.name,
        industry: icp.industry.name,
        metro: icp.metropolitanArea.name,
        estimatedTAM: icp.estimatedTAM,
        estimatedSOM: icp.estimatedSOM,
      },
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        website: b.website,
        location: b.location,
        revenue: b.revenue,
        employees: b.employeeCount,
        wcagScore: b.wcagScore,
        icpMatchScore: b.metadata?.icpMatchScore || 0,
        outreachStatus: b.outreachStatus,
      })),
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error in ICP search:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search by ICP',
    });
  }
});

// ============================================================================
// MULTI-METRO GEOGRAPHIC SEARCH
// ============================================================================

/**
 * POST /api/icp-targeting/geographic-cluster
 * Find best SMB prospects across multiple metropolitan areas
 * Useful for identifying expansion markets or geographic hotspots
 */
router.post('/geographic-cluster', async (req: Request, res: Response) => {
  try {
    const {
      industryIds,
      metroIds,
      minTechMaturity = 0.2,
      maxTechMaturity = 0.6,
      minTAM = 100,
      sortBy = 'estimatedTAM',
    } = req.body;

    if (!industryIds || !Array.isArray(industryIds) || !metroIds || !Array.isArray(metroIds)) {
      return res.status(400).json({
        success: false,
        error: 'industryIds and metroIds arrays required',
      });
    }

    // Find matching ICP profiles
    const icpProfiles = await prisma.idealCustomerProfile.findMany({
      where: {
        industryId: {
          in: industryIds,
        },
        metropolitanAreaId: {
          in: metroIds,
        },
        techMaturityScore: {
          gte: minTechMaturity,
          lte: maxTechMaturity,
        },
        estimatedTAM: {
          gte: minTAM,
        },
      },
      include: {
        industry: true,
        metropolitanArea: true,
        targetBusinesses: {
          take: 5,
          select: {
            id: true,
            name: true,
            website: true,
            wcagScore: true,
            matchScore: true,
          },
        },
      },
      orderBy:
        sortBy === 'estimatedTAM'
          ? { estimatedTAM: 'desc' }
          : { estimatedSOM: 'desc' },
    });

    // Calculate market opportunity summary
    const summary = {
      totalICPs: icpProfiles.length,
      totalTAM: icpProfiles.reduce((sum, icp) => sum + icp.estimatedTAM, 0),
      totalSOM: icpProfiles.reduce((sum, icp) => sum + icp.estimatedSOM, 0),
      totalProspects: icpProfiles.reduce((sum, icp) => sum + icp.targetBusinesses.length, 0),
    };

    return res.json({
      success: true,
      summary,
      icpProfiles: icpProfiles.map((icp) => ({
        id: icp.id,
        name: icp.name,
        industry: icp.industry.name,
        metro: icp.metropolitanArea.name,
        tam: icp.estimatedTAM,
        som: icp.estimatedSOM,
        closingRate: icp.closingRate,
        topProspects: icp.targetBusinesses,
      })),
    });
  } catch (error) {
    console.error('Error in geographic cluster:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find geographic clusters',
    });
  }
});

// ============================================================================
// DECISION MAKER TARGETING
// ============================================================================

/**
 * GET /api/icp-targeting/decision-makers
 * Find decision maker personas by role and filter
 */
router.get('/decision-makers', async (req: Request, res: Response) => {
  try {
    const { role, influenceLevel } = req.query;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (influenceLevel) {
      where.influenceLevel = {
        gte: parseInt(influenceLevel as string),
      };
    }

    const decisionMakers = await prisma.decisionMaker.findMany({
      where,
    });

    return res.json({
      success: true,
      count: decisionMakers.length,
      decisionMakers: decisionMakers.map((dm) => ({
        id: dm.id,
        title: dm.title,
        role: dm.role,
        influenceLevel: dm.influenceLevel,
        authority: dm.decisionMakingAuthority,
        painPoints: JSON.parse(dm.painPoints),
        motivations: JSON.parse(dm.motivations),
        preferredChannel: dm.preferredOutreachChannel,
      })),
    });
  } catch (error) {
    console.error('Error fetching decision makers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch decision makers',
    });
  }
});

/**
 * POST /api/icp-targeting/find-contacts
 * Find specific contact people matching decision maker profiles
 * Useful for building outreach lists by persona
 */
router.post('/find-contacts', async (req: Request, res: Response) => {
  try {
    const {
      decisionMakerRole,
      industryIds,
      metroIds,
      outreachStatus = 'not_contacted',
      limit = 100,
    } = req.body;

    if (!decisionMakerRole) {
      return res.status(400).json({
        success: false,
        error: 'decisionMakerRole required',
      });
    }

    // Find decision maker
    const dm = await prisma.decisionMaker.findFirst({
      where: { role: decisionMakerRole },
    });

    if (!dm) {
      return res.status(404).json({
        success: false,
        error: 'Decision maker role not found',
      });
    }

    // Find contacts for this role
    const where: any = {
      decisionMakerId: dm.id,
      outreachStatus,
    };

    if (industryIds || metroIds) {
      where.targetBusiness = {
        AND: [],
      };

      if (industryIds) {
        where.targetBusiness.AND.push({
          industryId: {
            in: industryIds,
          },
        });
      }

      if (metroIds) {
        where.targetBusiness.AND.push({
          metadata: {
            metropolitanAreaId: {
              in: metroIds,
            },
          },
        });
      }
    }

    const contacts = await prisma.contactPerson.findMany({
      where,
      include: {
        targetBusiness: {
          include: {
            industry: true,
            metadata: {
              include: {
                metropolitanArea: true,
              },
            },
          },
        },
        decisionMaker: true,
      },
      take: limit,
    });

    return res.json({
      success: true,
      decisionMaker: {
        title: dm.title,
        role: dm.role,
        influenceLevel: dm.influenceLevel,
        painPoints: JSON.parse(dm.painPoints),
        motivations: JSON.parse(dm.motivations),
        preferredChannel: dm.preferredOutreachChannel,
      },
      contacts: contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        linkedIn: c.linkedinUrl,
        business: {
          name: c.targetBusiness.name,
          industry: c.targetBusiness.industry.name,
          metro: c.targetBusiness.metadata?.metropolitanArea.name,
          wcagScore: c.targetBusiness.wcagScore,
        },
        outreachStatus: c.outreachStatus,
        engagementLevel: c.engagementLevel,
      })),
      count: contacts.length,
    });
  } catch (error) {
    console.error('Error finding contacts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find contacts',
    });
  }
});

// ============================================================================
// ICP ANALYTICS & INSIGHTS
// ============================================================================

/**
 * GET /api/icp-targeting/market-analysis
 * Get market size and opportunity analysis
 */
router.get('/market-analysis', async (req: Request, res: Response) => {
  try {
    const { industryId, metroId } = req.query;

    const where: any = {};
    if (industryId) {
      where.industryId = industryId;
    }
    if (metroId) {
      where.metropolitanAreaId = metroId;
    }

    const icps = await prisma.idealCustomerProfile.findMany({
      where,
      include: {
        industry: true,
        metropolitanArea: true,
        _count: {
          select: {
            targetBusinesses: true,
          },
        },
      },
    });

    const analysis = {
      totalICPs: icps.length,
      totalTAM: icps.reduce((sum, icp) => sum + icp.estimatedTAM, 0),
      totalSOM: icps.reduce((sum, icp) => sum + icp.estimatedSOM, 0),
      totalProspects: icps.reduce((sum, icp) => sum + icp._count.targetBusinesses, 0),
      averageClosingRate: (icps.reduce((sum, icp) => sum + icp.closingRate, 0) / icps.length).toFixed(2),
      averageSalesCycle: Math.round(
        icps.reduce((sum, icp) => sum + icp.estimatedSalesCycle, 0) / icps.length
      ),
      byIndustry: {} as any,
      byMetro: {} as any,
    };

    // Aggregate by industry
    icps.forEach((icp) => {
      if (!analysis.byIndustry[icp.industry.name]) {
        analysis.byIndustry[icp.industry.name] = {
          tam: 0,
          som: 0,
          prospects: 0,
          count: 0,
        };
      }
      analysis.byIndustry[icp.industry.name].tam += icp.estimatedTAM;
      analysis.byIndustry[icp.industry.name].som += icp.estimatedSOM;
      analysis.byIndustry[icp.industry.name].prospects += icp._count.targetBusinesses;
      analysis.byIndustry[icp.industry.name].count += 1;
    });

    // Aggregate by metro
    icps.forEach((icp) => {
      if (!analysis.byMetro[icp.metropolitanArea.name]) {
        analysis.byMetro[icp.metropolitanArea.name] = {
          tam: 0,
          som: 0,
          prospects: 0,
          count: 0,
        };
      }
      analysis.byMetro[icp.metropolitanArea.name].tam += icp.estimatedTAM;
      analysis.byMetro[icp.metropolitanArea.name].som += icp.estimatedSOM;
      analysis.byMetro[icp.metropolitanArea.name].prospects += icp._count.targetBusinesses;
      analysis.byMetro[icp.metropolitanArea.name].count += 1;
    });

    return res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error in market analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze market',
    });
  }
});

/**
 * GET /api/icp-targeting/opportunity-score
 * Get top opportunities ranked by TAM × closing rate
 */
router.get('/opportunity-score', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const icps = await prisma.idealCustomerProfile.findMany({
      include: {
        industry: true,
        metropolitanArea: true,
        _count: {
          select: {
            targetBusinesses: true,
          },
        },
      },
      orderBy: [
        { estimatedTAM: 'desc' },
        { closingRate: 'desc' },
      ],
      take: parseInt(limit as string),
    });

    const scored = icps.map((icp) => ({
      id: icp.id,
      name: icp.name,
      industry: icp.industry.name,
      metro: icp.metropolitanArea.name,
      tam: icp.estimatedTAM,
      som: icp.estimatedSOM,
      prospects: icp._count.targetBusinesses,
      closingRate: icp.closingRate,
      opportunityScore: icp.estimatedTAM * icp.closingRate,
      yearlySalesOpportunity: icp.estimatedSOM * icp.estimatedAnnualWcagSpend,
    }));

    return res.json({
      success: true,
      opportunities: scored.sort(
        (a, b) => b.opportunityScore - a.opportunityScore
      ),
    });
  } catch (error) {
    console.error('Error calculating opportunity scores:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate opportunity scores',
    });
  }
});

export default router;
