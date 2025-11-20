import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/utils/database';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';

const router = Router();

// Validation rules
const createProjectValidation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Description must be less than 500 characters'),
  body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),
  body('organizationId')
    .optional()
    .isUUID()
    .withMessage('Invalid organization ID format'),
];

const updateProjectValidation = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Description must be less than 500 characters'),
  body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),
];

// Create new project
router.post('/', createProjectValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { name, description, url, organizationId } = req.body;

  // Check if user has access to the organization
  if (organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ValidationError('Access denied to this organization');
    }
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      id: uuidv4(),
      name,
      description,
      url,
      organizationId: organizationId || null,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  logger.info(`New project created: ${project.id} by user: ${req.user.id}`);

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project,
  });
}));

// Get projects
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const organizationId = req.query.organizationId as string;
  const isActive = req.query.isActive;
  const search = req.query.search as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  
  if (organizationId) {
    // Check if user has access to this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ValidationError('Access denied to this organization');
    }
    
    where.organizationId = organizationId;
  } else {
    // Get personal projects or projects from user's organizations
    where.OR = [
      { organizationId: null }, // Personal projects
      { 
        organization: {
          members: {
            some: {
              userId: req.user.id,
            },
          },
        },
      },
    ];
  }
  
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { url: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get projects
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            scans: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}));

// Get project by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const projectId = req.params.id;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project - check if user owns it
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
              },
            },
          },
        },
      ],
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      scans: {
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          url: true,
          title: true,
          status: true,
          score: true,
          totalIssues: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          scans: true,
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  res.json({
    success: true,
    data: project,
  });
}));

// Update project
router.put('/:id', updateProjectValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const projectId = req.params.id;
  const { name, description, url, isActive } = req.body;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  // Check if user has access to the project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project - check if user owns it
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      ],
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if project belongs to organization and user has appropriate permissions
  if (project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: project.organizationId,
        },
      },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ValidationError('Only organization owners and admins can update projects');
    }
  }

  // Update project
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (url !== undefined) updateData.url = url;
  if (isActive !== undefined) updateData.isActive = isActive;

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  logger.info(`Project updated: ${projectId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: updatedProject,
  });
}));

// Delete project
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const projectId = req.params.id;

  // Check if user has access to the project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project - check if user owns it
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      ],
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Check if project belongs to organization and user has appropriate permissions
  if (project.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: project.organizationId,
        },
      },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ValidationError('Only organization owners and admins can delete projects');
    }
  }

  // Delete project (this will cascade delete related scans)
  await prisma.project.delete({
    where: { id: projectId },
  });

  logger.info(`Project deleted: ${projectId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Project deleted successfully',
  });
}));

// Get project scans
router.get('/:id/scans', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const projectId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Verify user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
              },
            },
          },
        },
      ],
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Build where clause
  const where: any = { projectId };
  if (status && ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
    where.status = status;
  }

  // Get scans
  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        url: true,
        title: true,
        status: true,
        progress: true,
        totalIssues: true,
        criticalIssues: true,
        seriousIssues: true,
        moderateIssues: true,
        minorIssues: true,
        score: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.scan.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      scans,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}));

// Get project statistics
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const projectId = req.params.id;

  // Verify user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
              },
            },
          },
        },
      ],
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Get project statistics
  const [
    totalScans,
    completedScans,
    runningScans,
    scanStats,
    recentScans,
    topUrls,
  ] = await Promise.all([
    // Total scans
    prisma.scan.count({
      where: { projectId },
    }),
    
    // Completed scans
    prisma.scan.count({
      where: { 
        projectId,
        status: 'COMPLETED',
      },
    }),
    
    // Running scans
    prisma.scan.count({
      where: { 
        projectId,
        status: 'RUNNING',
      },
    }),
    
    // Scan statistics
    prisma.scan.aggregate({
      where: {
        projectId,
        status: 'COMPLETED',
      },
      _avg: {
        score: true,
      },
      _sum: {
        totalIssues: true,
        criticalIssues: true,
        seriousIssues: true,
        moderateIssues: true,
        minorIssues: true,
      },
    }),
    
    // Recent scans (last 30 days)
    prisma.scan.count({
      where: {
        projectId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Top scanned URLs
    prisma.scan.groupBy({
      by: ['url'],
      where: {
        projectId,
        status: 'COMPLETED',
      },
      _count: {
        id: true,
      },
      _avg: {
        score: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  // Get monthly scan trends
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const monthlyTrends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as scan_count,
      AVG(score) as avg_score,
      SUM(total_issues) as total_issues
    FROM scans 
    WHERE project_id = ${projectId} 
      AND created_at >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;

  const stats = {
    overview: {
      totalScans,
      completedScans,
      runningScans,
      recentScans,
      completionRate: totalScans > 0 ? (completedScans / totalScans) * 100 : 0,
    },
    performance: {
      averageScore: scanStats._avg.score || 0,
      totalIssuesFound: scanStats._sum.totalIssues || 0,
      criticalIssuesFound: scanStats._sum.criticalIssues || 0,
      seriousIssuesFound: scanStats._sum.seriousIssues || 0,
      moderateIssuesFound: scanStats._sum.moderateIssues || 0,
      minorIssuesFound: scanStats._sum.minorIssues || 0,
    },
    trends: monthlyTrends,
    topUrls: topUrls.map(url => ({
      url: url.url,
      scanCount: url._count.id,
      averageScore: url._avg.score || 0,
    })),
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// Add scan to project
router.post('/:id/scans', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const projectId = req.params.id;
  const { scanId } = req.body;

  if (!scanId) {
    throw new ValidationError('Scan ID is required');
  }

  // Verify user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      ],
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Verify scan ownership
  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      OR: [
        { userId: req.user.id },
        { organization: { members: { some: { userId: req.user.id } } } },
      ],
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan');
  }

  // Update scan project
  const updatedScan = await prisma.scan.update({
    where: { id: scanId },
    data: { projectId },
  });

  logger.info(`Scan ${scanId} added to project ${projectId} by user ${req.user.id}`);

  res.json({
    success: true,
    message: 'Scan added to project successfully',
    data: updatedScan,
  });
}));

// Remove scan from project
router.delete('/:id/scans/:scanId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const { id: projectId, scanId } = req.params;

  // Verify user has access to this project
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { organizationId: null }, // Personal project
        {
          organization: {
            members: {
              some: {
                userId: req.user.id,
                role: { in: ['OWNER', 'ADMIN'] },
              },
            },
          },
        },
      ],
    },
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  // Verify scan belongs to this project
  const scan = await prisma.scan.findUnique({
    where: { id: scanId, projectId },
  });

  if (!scan) {
    throw new NotFoundError('Scan');
  }

  // Remove scan from project
  const updatedScan = await prisma.scan.update({
    where: { id: scanId },
    data: { projectId: null },
  });

  logger.info(`Scan ${scanId} removed from project ${projectId} by user ${req.user.id}`);

  res.json({
    success: true,
    message: 'Scan removed from project successfully',
    data: updatedScan,
  });
}));

export default router;