import { Router, Response } from 'express';
import { prisma } from '@/utils/database';
import { 
  NotFoundError, 
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest, requireRole } from '@/middleware/auth';

const router = Router();

// Get audit logs
router.get('/logs', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const action = req.query.action as string;
  const resource = req.query.resource as string;
  const userId = req.query.userId as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  
  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }
  
  if (resource) {
    where.resource = { contains: resource, mode: 'insensitive' };
  }
  
  if (userId) {
    where.userId = userId;
  }
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // Get audit logs
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      logs,
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

// Get audit log by ID
router.get('/logs/:id', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const logId = req.params.id;

  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!log) {
    throw new NotFoundError('Audit log');
  }

  res.json({
    success: true,
    data: log,
  });
}));

// Get audit statistics
router.get('/stats', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get audit statistics
  const [
    totalLogs,
    actionStats,
    resourceStats,
    userStats,
    dailyTrends,
    recentActivity,
  ] = await Promise.all([
    // Total logs in period
    prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),
    
    // Action statistics
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    }),
    
    // Resource statistics
    prisma.auditLog.groupBy({
      by: ['resource'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    }),
    
    // User statistics
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    }),
    
    // Daily trends
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT ${days}
    `,
    
    // Recent activity (last 24 hours)
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  // Get user details for user stats
  const userIds = userStats.map(stat => stat.userId).filter(Boolean);
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  }) : [];

  const userMap = new Map(users.map(user => [user.id, user]));

  const stats = {
    overview: {
      totalLogs,
      recentActivity,
      averagePerDay: Math.round(totalLogs / days),
      period: `${days} days`,
    },
    topActions: actionStats.map(stat => ({
      action: stat.action,
      count: stat._count.id,
    })),
    topResources: resourceStats.map(stat => ({
      resource: stat.resource,
      count: stat._count.id,
    })),
    topUsers: userStats.map(stat => {
      const user = stat.userId ? userMap.get(stat.userId) : null;
      return {
        user: user || { id: stat.userId, username: 'Unknown User' },
        count: stat._count.id,
      };
    }),
    dailyTrends,
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// Get security events
router.get('/security', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const severity = req.query.severity as string;
  const days = parseInt(req.query.days as string) || 7;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Security-related actions
  const securityActions = [
    'LOGIN_FAILED',
    'LOGIN_SUCCESS',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET',
    'TOKEN_REFRESH',
    'UNAUTHORIZED_ACCESS',
    'PERMISSION_DENIED',
    'RATE_LIMIT_EXCEEDED',
    'SECURITY_VIOLATION',
    'SUSPICIOUS_ACTIVITY',
  ];

  // Build where clause
  const where: any = {
    action: { in: securityActions },
    createdAt: { gte: startDate },
  };
  
  if (severity) {
    // This would require adding a severity field to audit logs
    // For now, we'll filter by action types that indicate severity
    switch (severity.toLowerCase()) {
      case 'critical':
        where.action = { in: ['UNAUTHORIZED_ACCESS', 'SECURITY_VIOLATION', 'SUSPICIOUS_ACTIVITY'] };
        break;
      case 'high':
        where.action = { in: ['LOGIN_FAILED', 'PERMISSION_DENIED', 'RATE_LIMIT_EXCEEDED'] };
        break;
      case 'medium':
        where.action = { in: ['PASSWORD_RESET', 'TOKEN_REFRESH'] };
        break;
      case 'low':
        where.action = { in: ['LOGIN_SUCCESS', 'PASSWORD_CHANGE'] };
        break;
    }
  }

  const skip = (page - 1) * limit;

  // Get security events
  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Categorize events by severity
  const categorizedEvents = events.map(event => ({
    ...event,
    severity: categorizeSeverity(event.action),
  }));

  res.json({
    success: true,
    data: {
      events: categorizedEvents,
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

// Get compliance report
router.get('/compliance', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get compliance data
  const [
    totalAudits,
    userRegistrations,
    loginAttempts,
    passwordChanges,
    dataAccessEvents,
    failedLogins,
    successfulLogins,
    organizationChanges,
    scanActivities,
  ] = await Promise.all([
    // Total audit events
    prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),
    
    // User registrations
    prisma.auditLog.count({
      where: {
        action: 'USER_REGISTERED',
        createdAt: { gte: startDate },
      },
    }),
    
    // Login attempts
    prisma.auditLog.count({
      where: {
        action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] },
        createdAt: { gte: startDate },
      },
    }),
    
    // Password changes
    prisma.auditLog.count({
      where: {
        action: { in: ['PASSWORD_CHANGE', 'PASSWORD_RESET'] },
        createdAt: { gte: startDate },
      },
    }),
    
    // Data access events
    prisma.auditLog.count({
      where: {
        action: { in: ['DATA_ACCESSED', 'DATA_EXPORTED', 'REPORT_GENERATED'] },
        createdAt: { gte: startDate },
      },
    }),
    
    // Failed logins
    prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        createdAt: { gte: startDate },
      },
    }),
    
    // Successful logins
    prisma.auditLog.count({
      where: {
        action: 'LOGIN_SUCCESS',
        createdAt: { gte: startDate },
      },
    }),
    
    // Organization changes
    prisma.auditLog.count({
      where: {
        action: { in: ['ORGANIZATION_CREATED', 'ORGANIZATION_UPDATED', 'ORGANIZATION_DELETED', 'MEMBER_INVITED', 'MEMBER_REMOVED', 'ROLE_CHANGED'] },
        createdAt: { gte: startDate },
      },
    }),
    
    // Scan activities
    prisma.auditLog.count({
      where: {
        action: { in: ['SCAN_CREATED', 'SCAN_COMPLETED', 'SCAN_FAILED', 'SCAN_CANCELLED', 'REPORT_GENERATED'] },
        createdAt: { gte: startDate },
      },
    }),
  ]);

  // Get user activity breakdown
  const userActivity = await prisma.auditLog.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: startDate },
      userId: { not: null },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 20,
  });

  // Get user details for activity breakdown
  const userIds = userActivity.map(activity => activity.userId).filter(Boolean);
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      lastLogin: true,
    },
  }) : [];

  const userMap = new Map(users.map(user => [user.id, user]));

  const complianceReport = {
    period: {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      days,
    },
    overview: {
      totalEvents: totalAudits,
      averageEventsPerDay: Math.round(totalAudits / days),
    },
    userActivity: {
      registrations: userRegistrations,
      loginAttempts,
      successfulLogins,
      failedLogins,
      passwordChanges,
      loginSuccessRate: loginAttempts > 0 ? ((successfulLogins / loginAttempts) * 100).toFixed(2) : '0',
    },
    dataActivity: {
      dataAccessEvents,
      scanActivities,
      organizationChanges,
    },
    topActiveUsers: userActivity.map(activity => {
      const user = userMap.get(activity.userId);
      return {
        user: user || { id: activity.userId, username: 'Unknown User' },
        eventCount: activity._count.id,
        averagePerDay: Math.round(activity._count.id / days),
      };
    }),
  };

  res.json({
    success: true,
    data: complianceReport,
  });
}));

// Export audit logs
router.get('/export', requireRole('ADMIN'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const format = req.query.format as string || 'json';
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const action = req.query.action as string;

  if (!['json', 'csv'].includes(format)) {
    throw new ValidationError('Invalid export format. Supported formats: json, csv');
  }

  // Build where clause
  const where: any = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }
  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }

  // Get audit logs (limit to reasonable amount for export)
  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000, // Limit to 10k records for export
  });

  // Generate export based on format
  let exportData: any;
  let contentType: string;
  let filename: string;

  switch (format) {
    case 'json':
      exportData = JSON.stringify(logs, null, 2);
      contentType = 'application/json';
      filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      break;
    
    case 'csv':
      exportData = generateAuditCSV(logs);
      contentType = 'text/csv';
      filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      break;
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(exportData);
}));

// Helper functions
function categorizeSeverity(action: string): string {
  const criticalActions = ['UNAUTHORIZED_ACCESS', 'SECURITY_VIOLATION', 'SUSPICIOUS_ACTIVITY'];
  const highActions = ['LOGIN_FAILED', 'PERMISSION_DENIED', 'RATE_LIMIT_EXCEEDED'];
  const mediumActions = ['PASSWORD_RESET', 'TOKEN_REFRESH'];
  const lowActions = ['LOGIN_SUCCESS', 'PASSWORD_CHANGE'];

  if (criticalActions.includes(action)) return 'critical';
  if (highActions.includes(action)) return 'high';
  if (mediumActions.includes(action)) return 'medium';
  if (lowActions.includes(action)) return 'low';
  return 'info';
}

function generateAuditCSV(logs: any[]): string {
  const headers = [
    'ID',
    'User ID',
    'User Email',
    'Action',
    'Resource',
    'IP Address',
    'User Agent',
    'Created At',
    'Details',
  ];

  const rows = logs.map(log => [
    log.id,
    log.userId || '',
    log.user?.email || '',
    log.action,
    log.resource,
    log.ipAddress || '',
    log.userAgent || '',
    log.createdAt,
    log.details ? JSON.stringify(log.details) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export default router;