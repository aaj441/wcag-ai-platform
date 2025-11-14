/**
 * Target Demographics API Routes
 * Handles searching and managing target businesses for outreach
 * Enables filtering by industry, tech-orientation, location, and other characteristics
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ============================================================================
// INDUSTRY ROUTES
// ============================================================================

// GET /api/target-demographics/industries - List all industries
router.get('/industries', async (req: Request, res: Response) => {
  try {
    const {
      location,
      riskLevel,
      techOrientationMin,
      techOrientationMax,
      techAdoptionSpeed,
      isBlueCollar,
    } = req.query;

    const where: any = {};

    if (location) {
      where.location = location;
    }

    if (riskLevel) {
      where.adariskLevel = riskLevel;
    }

    if (techAdoptionSpeed) {
      where.techAdoptionSpeed = techAdoptionSpeed;
    }

    if (isBlueCollar !== undefined) {
      where.isBlueCollar = isBlueCollar === 'true';
    }

    if (techOrientationMin || techOrientationMax) {
      where.techOrientationScore = {};
      if (techOrientationMin) {
        where.techOrientationScore.gte = parseFloat(techOrientationMin as string);
      }
      if (techOrientationMax) {
        where.techOrientationScore.lte = parseFloat(techOrientationMax as string);
      }
    }

    const industries = await prisma.industry.findMany({
      where,
      include: {
        _count: {
          select: { targetBusinesses: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      count: industries.length,
      industries,
    });
  } catch (error) {
    console.error('Error fetching industries:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch industries',
    });
  }
});

// POST /api/target-demographics/industries - Create industry
router.post('/industries', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      adariskLevel,
      typicalRevenueMin,
      typicalRevenueMax,
      typicalEmployeeMin,
      typicalEmployeeMax,
      techOrientationScore,
      techAdoptionSpeed,
      isBlueCollar,
      location,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Industry name is required',
      });
    }

    const industry = await prisma.industry.create({
      data: {
        name,
        description,
        adariskLevel: adariskLevel || 'medium',
        typicalRevenueMin: typicalRevenueMin || 1000000,
        typicalRevenueMax: typicalRevenueMax || 10000000,
        typicalEmployeeMin: typicalEmployeeMin || 5,
        typicalEmployeeMax: typicalEmployeeMax || 100,
        techOrientationScore: techOrientationScore || 0.5,
        techAdoptionSpeed: techAdoptionSpeed || 'slow',
        isBlueCollar: isBlueCollar !== false,
        location,
        notes,
      },
    });

    return res.status(201).json({
      success: true,
      industry,
    });
  } catch (error: any) {
    console.error('Error creating industry:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Industry with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create industry',
    });
  }
});

// GET /api/target-demographics/industries/:id - Get industry details
router.get('/industries/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const industry = await prisma.industry.findUnique({
      where: { id },
      include: {
        targetBusinesses: {
          take: 10,
          orderBy: { matchScore: 'desc' },
        },
        _count: {
          select: { targetBusinesses: true },
        },
      },
    });

    if (!industry) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
      });
    }

    return res.json({
      success: true,
      industry,
    });
  } catch (error) {
    console.error('Error fetching industry:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch industry',
    });
  }
});

// ============================================================================
// TARGET BUSINESS ROUTES
// ============================================================================

// GET /api/target-demographics/businesses - Search target businesses
router.get('/businesses', async (req: Request, res: Response) => {
  try {
    const {
      industryId,
      city,
      state,
      outreachStatus,
      minMatchScore,
      maxMatchScore,
      hasWcagScore,
      sortBy = 'matchScore',
      sortOrder = 'desc',
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (industryId) {
      where.industryId = industryId;
    }

    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    if (state) {
      where.state = state;
    }

    if (outreachStatus) {
      where.outreachStatus = outreachStatus;
    }

    if (minMatchScore || maxMatchScore) {
      where.matchScore = {};
      if (minMatchScore) {
        where.matchScore.gte = parseFloat(minMatchScore as string);
      }
      if (maxMatchScore) {
        where.matchScore.lte = parseFloat(maxMatchScore as string);
      }
    }

    if (hasWcagScore === 'true') {
      where.wcagScore = { not: null };
    } else if (hasWcagScore === 'false') {
      where.wcagScore = null;
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';

    const [businesses, totalCount] = await Promise.all([
      prisma.targetBusiness.findMany({
        where,
        include: {
          industry: true,
          violations: {
            orderBy: { severity: 'desc' },
            take: 5,
          },
        },
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.targetBusiness.count({ where }),
    ]);

    return res.json({
      success: true,
      count: businesses.length,
      totalCount,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string),
      businesses,
    });
  } catch (error) {
    console.error('Error searching businesses:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search businesses',
    });
  }
});

// POST /api/target-demographics/businesses/search - Advanced search
router.post('/businesses/search', async (req: Request, res: Response) => {
  try {
    const {
      industryNames,
      techOrientationMax,
      techAdoptionSpeed,
      isBlueCollar,
      location,
      minRevenueMatch,
      minEmployeeMatch,
      excludeOutreachStatus,
      minWcagScore,
      maxWcagScore,
      sortBy = 'matchScore',
      limit = 100,
      offset = 0,
    } = req.body;

    const where: any = {
      AND: [],
    };

    // Filter by industry names
    if (industryNames && Array.isArray(industryNames)) {
      where.AND.push({
        industry: {
          name: {
            in: industryNames,
          },
        },
      });
    }

    // Filter by tech characteristics
    if (techOrientationMax !== undefined || techAdoptionSpeed || isBlueCollar !== undefined) {
      const industryWhere: any = {};
      if (techOrientationMax !== undefined) {
        industryWhere.techOrientationScore = { lte: techOrientationMax };
      }
      if (techAdoptionSpeed) {
        industryWhere.techAdoptionSpeed = techAdoptionSpeed;
      }
      if (isBlueCollar !== undefined) {
        industryWhere.isBlueCollar = isBlueCollar;
      }
      where.AND.push({ industry: industryWhere });
    }

    // Filter by location
    if (location) {
      where.AND.push({
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { state: location },
        ],
      });
    }

    // Filter by revenue/employee match (optional)
    if (minRevenueMatch !== undefined || minEmployeeMatch !== undefined) {
      const matchWhere: any = {};
      if (minRevenueMatch !== undefined) {
        matchWhere.matchScore = { gte: minRevenueMatch };
      }
      if (minEmployeeMatch !== undefined) {
        matchWhere.matchScore = { gte: minEmployeeMatch };
      }
      where.AND.push(matchWhere);
    }

    // Exclude already contacted/rejected
    if (excludeOutreachStatus) {
      where.AND.push({
        outreachStatus: {
          notIn: excludeOutreachStatus,
        },
      });
    }

    // Filter by WCAG score
    if (minWcagScore !== undefined || maxWcagScore !== undefined) {
      const wcagWhere: any = {};
      if (minWcagScore !== undefined) {
        wcagWhere.wcagScore = { gte: minWcagScore };
      }
      if (maxWcagScore !== undefined) {
        wcagWhere.wcagScore = { lte: maxWcagScore };
      }
      where.AND.push(wcagWhere);
    }

    const orderBy: any = {};
    orderBy[sortBy] = 'desc';

    const [businesses, totalCount] = await Promise.all([
      prisma.targetBusiness.findMany({
        where: where.AND.length > 0 ? where : {},
        include: {
          industry: true,
          violations: {
            orderBy: { severity: 'desc' },
            take: 3,
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.targetBusiness.count({
        where: where.AND.length > 0 ? where : {},
      }),
    ]);

    return res.json({
      success: true,
      count: businesses.length,
      totalCount,
      offset,
      limit,
      businesses,
    });
  } catch (error) {
    console.error('Error in advanced search:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform search',
    });
  }
});

// POST /api/target-demographics/businesses - Add business
router.post('/businesses', async (req: Request, res: Response) => {
  try {
    const {
      name,
      website,
      industryId,
      location,
      city,
      state,
      revenue,
      employeeCount,
      ownerName,
      email,
      phone,
      matchScore,
      notes,
    } = req.body;

    if (!name || !industryId || !city || !state) {
      return res.status(400).json({
        success: false,
        error: 'Name, industryId, city, and state are required',
      });
    }

    // Calculate match score if not provided
    let finalMatchScore = matchScore || 0;
    if (!matchScore) {
      // Simple scoring logic:
      // - Perfect match if company has all ideal characteristics
      // - Partial match otherwise
      const industry = await prisma.industry.findUnique({
        where: { id: industryId },
      });

      if (industry) {
        // Score based on how well they match the ideal profile
        let score = 0.5; // Base score

        // Adjust for revenue match
        if (revenue && industry.typicalRevenueMin && industry.typicalRevenueMax) {
          if (revenue >= industry.typicalRevenueMin && revenue <= industry.typicalRevenueMax) {
            score += 0.25;
          }
        }

        // Adjust for employee count match
        if (employeeCount && industry.typicalEmployeeMin && industry.typicalEmployeeMax) {
          if (employeeCount >= industry.typicalEmployeeMin && employeeCount <= industry.typicalEmployeeMax) {
            score += 0.25;
          }
        }

        finalMatchScore = Math.min(score, 1.0);
      }
    }

    const business = await prisma.targetBusiness.create({
      data: {
        name,
        website: website || undefined,
        industryId,
        location: location || `${city}, ${state}`,
        city,
        state,
        revenue: revenue || undefined,
        employeeCount: employeeCount || undefined,
        ownerName: ownerName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        matchScore: finalMatchScore,
        notes: notes || undefined,
      },
      include: {
        industry: true,
      },
    });

    return res.status(201).json({
      success: true,
      business,
    });
  } catch (error: any) {
    console.error('Error creating business:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Business with this website already exists',
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid industryId',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create business',
    });
  }
});

// GET /api/target-demographics/businesses/:id - Get business details
router.get('/businesses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const business = await prisma.targetBusiness.findUnique({
      where: { id },
      include: {
        industry: true,
        violations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    return res.json({
      success: true,
      business,
    });
  } catch (error) {
    console.error('Error fetching business:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch business',
    });
  }
});

// PATCH /api/target-demographics/businesses/:id - Update business
router.patch('/businesses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      website,
      location,
      city,
      state,
      revenue,
      employeeCount,
      ownerName,
      email,
      phone,
      wcagScore,
      wcagViolationCount,
      matchScore,
      outreachStatus,
      outreachAttempts,
      lastOutreachDate,
      notes,
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (revenue !== undefined) updateData.revenue = revenue;
    if (employeeCount !== undefined) updateData.employeeCount = employeeCount;
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (wcagScore !== undefined) {
      updateData.wcagScore = wcagScore;
      updateData.lastScanned = new Date();
    }
    if (wcagViolationCount !== undefined) updateData.wcagViolationCount = wcagViolationCount;
    if (matchScore !== undefined) updateData.matchScore = matchScore;
    if (outreachStatus !== undefined) {
      updateData.outreachStatus = outreachStatus;
      if (outreachStatus !== 'not_contacted') {
        updateData.lastOutreachDate = new Date();
      }
    }
    if (outreachAttempts !== undefined) updateData.outreachAttempts = outreachAttempts;
    if (lastOutreachDate !== undefined) updateData.lastOutreachDate = lastOutreachDate;
    if (notes !== undefined) updateData.notes = notes;

    const business = await prisma.targetBusiness.update({
      where: { id },
      data: updateData,
      include: {
        industry: true,
      },
    });

    return res.json({
      success: true,
      business,
    });
  } catch (error: any) {
    console.error('Error updating business:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Business with this website already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update business',
    });
  }
});

// ============================================================================
// VIOLATION ROUTES
// ============================================================================

// POST /api/target-demographics/businesses/:id/violations - Add violations
router.post('/businesses/:id/violations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { wcagCriteria, severity, description, count = 1 } = req.body;

    if (!wcagCriteria || !severity || !description) {
      return res.status(400).json({
        success: false,
        error: 'wcagCriteria, severity, and description are required',
      });
    }

    const violation = await prisma.targetBusinessViolation.create({
      data: {
        businessId: id,
        wcagCriteria,
        severity,
        description,
        count,
      },
    });

    // Update violation count on business
    const business = await prisma.targetBusiness.findUnique({
      where: { id },
    });

    if (business) {
      const violationCount = await prisma.targetBusinessViolation.count({
        where: { businessId: id },
      });

      await prisma.targetBusiness.update({
        where: { id },
        data: { wcagViolationCount: violationCount },
      });
    }

    return res.status(201).json({
      success: true,
      violation,
    });
  } catch (error: any) {
    console.error('Error creating violation:', error);

    if (error.code === 'P2003') {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create violation',
    });
  }
});

// GET /api/target-demographics/statistics - Get targeting statistics
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const [
      totalBusinesses,
      totalIndustries,
      contactedCount,
      interestedCount,
      clientCount,
      avgMatchScore,
      avgWcagScore,
      businessesByStatus,
      topIndustries,
    ] = await Promise.all([
      prisma.targetBusiness.count(),
      prisma.industry.count(),
      prisma.targetBusiness.count({
        where: { outreachStatus: { in: ['contacted', 'interested'] } },
      }),
      prisma.targetBusiness.count({ where: { outreachStatus: 'interested' } }),
      prisma.targetBusiness.count({ where: { outreachStatus: 'client' } }),
      prisma.targetBusiness.aggregate({
        _avg: { matchScore: true },
      }),
      prisma.targetBusiness.aggregate({
        _avg: { wcagScore: true },
      }),
      prisma.targetBusiness.groupBy({
        by: ['outreachStatus'],
        _count: true,
      }),
      prisma.industry.findMany({
        include: {
          _count: { select: { targetBusinesses: true } },
        },
        orderBy: {
          targetBusinesses: { _count: 'desc' },
        },
        take: 10,
      }),
    ]);

    return res.json({
      success: true,
      statistics: {
        totalBusinesses,
        totalIndustries,
        contactedCount,
        interestedCount,
        clientCount,
        avgMatchScore: avgMatchScore._avg.matchScore || 0,
        avgWcagScore: avgWcagScore._avg.wcagScore || 0,
        businessesByStatus: businessesByStatus.reduce(
          (acc: any, curr: any) => {
            acc[curr.outreachStatus] = curr._count;
            return acc;
          },
          {}
        ),
        topIndustries: topIndustries.map((ind) => ({
          id: ind.id,
          name: ind.name,
          businessCount: ind._count.targetBusinesses,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

export default router;
