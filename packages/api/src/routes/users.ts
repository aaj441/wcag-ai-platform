import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '@/utils/database';
import { emailService } from '@/utils/email';
import { setCache, deleteCache } from '@/utils/redis';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest, requireRole } from '@/middleware/auth';

const router = Router();

// Validation rules
const updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .trim()
    .withMessage('Last name must be less than 50 characters'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
];

// Get user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      organizations: {
        select: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
          role: true,
          joinedAt: true,
        },
      },
      _count: {
        select: {
          scans: true,
          reports: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    data: user,
  });
}));

// Update user profile
router.put('/profile', updateProfileValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { firstName, lastName, username } = req.body;

  // Check if username is being changed and if it's already taken
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: req.user.id },
      },
    });

    if (existingUser) {
      throw new ConflictError('This username is already taken');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(username !== undefined && { username }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  logger.info(`User profile updated: ${updatedUser.email} (${updatedUser.id})`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
}));

// Get user statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const userId = req.user.id;

  const [
    totalScans,
    completedScans,
    totalReports,
    recentScans,
    scanStats,
  ] = await Promise.all([
    // Total scans
    prisma.scan.count({
      where: { userId },
    }),
    
    // Completed scans
    prisma.scan.count({
      where: { 
        userId,
        status: 'COMPLETED',
      },
    }),
    
    // Total reports
    prisma.report.count({
      where: { userId },
    }),
    
    // Recent scans (last 30 days)
    prisma.scan.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Scan statistics
    prisma.scan.aggregate({
      where: {
        userId,
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
  ]);

  // Get monthly scan trends (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const monthlyTrends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as scan_count,
      AVG(score) as avg_score
    FROM scans 
    WHERE user_id = ${userId} 
      AND created_at >= ${sixMonthsAgo}
      AND status = 'COMPLETED'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;

  // Get top scanned domains
  const topDomains = await prisma.$queryRaw`
    SELECT 
      SUBSTRING(url FROM 'https?://([^/]+)') as domain,
      COUNT(*) as scan_count,
      AVG(score) as avg_score
    FROM scans 
    WHERE user_id = ${userId} 
      AND status = 'COMPLETED'
    GROUP BY SUBSTRING(url FROM 'https?://([^/]+)')
    ORDER BY scan_count DESC
    LIMIT 5
  `;

  const stats = {
    overview: {
      totalScans,
      completedScans,
      totalReports,
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
    topDomains,
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// Get user's scans
router.get('/scans', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { userId: req.user.id };
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
        project: {
          select: {
            id: true,
            name: true,
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

// Get user's reports
router.get('/reports', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const format = req.query.format as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { userId: req.user.id };
  if (format && ['PDF', 'HTML', 'CSV', 'JSON'].includes(format)) {
    where.format = format;
  }

  // Get reports
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        scan: {
          select: {
            id: true,
            url: true,
            title: true,
            score: true,
            totalIssues: true,
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      reports,
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

// Delete user account
router.delete('/account', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const { password } = req.body;

  if (!password) {
    throw new ValidationError('Password is required to delete account');
  }

  // Get user with password for verification
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      password: true,
      email: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify password (we'd need to import bcrypt here)
  const bcrypt = require('bcryptjs');
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ValidationError('Invalid password');
  }

  // Delete user (this will cascade delete related records)
  await prisma.user.delete({
    where: { id: user.id },
  });

  // Clean up Redis
  await deleteCache(`refresh_token:${user.id}`);

  logger.info(`User account deleted: ${user.email} (${user.id})`);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
}));

// Admin routes - get all users
router.get('/', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const isActive = req.query.isActive;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) {
    where.role = role;
  }
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  // Get users
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            scans: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      users,
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

// Admin route - update user
router.put('/:id', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const { role, isActive } = req.body;

  // Validate input
  if (role && !['USER', 'ADMIN'].includes(role)) {
    throw new ValidationError('Invalid role');
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw new ValidationError('isActive must be a boolean');
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!existingUser) {
    throw new NotFoundError('User');
  }

  // Don't allow admin to change their own role to non-admin
  if (userId === req.user!.id && role === 'USER') {
    throw new ValidationError('Cannot change your own role to non-admin');
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  logger.info(`User updated by admin: ${updatedUser.email} (${updatedUser.id})`);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
}));

export default router;