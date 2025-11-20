import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/utils/database';
import { 
  ValidationError, 
  NotFoundError, 
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { generateReport } from '@/services/reportService';

const router = Router();

// Validation rules
const createReportValidation = [
  body('scanId')
    .isUUID()
    .withMessage('Invalid scan ID format'),
  body('name')
    .isLength({ min: 1, max: 200 })
    .trim()
    .withMessage('Report name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage('Description must be less than 1000 characters'),
  body('format')
    .optional()
    .isIn(['PDF', 'HTML', 'CSV', 'JSON'])
    .withMessage('Invalid format. Supported: PDF, HTML, CSV, JSON'),
];

// Create new report
router.post('/', createReportValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { scanId, name, description, format = 'PDF' } = req.body;

  // Verify user has access to the scan
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

  if (scan.status !== 'COMPLETED') {
    throw new ValidationError('Cannot generate report for incomplete scan');
  }

  // Check if report already exists for this scan
  const existingReport = await prisma.report.findUnique({
    where: { scanId },
  });

  if (existingReport) {
    throw new ValidationError('A report already exists for this scan');
  }

  // Create report record
  const report = await prisma.report.create({
    data: {
      id: uuidv4(),
      scanId,
      userId: req.user.id,
      name,
      description,
      format: format as any,
      status: 'PENDING',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
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
  });

  // Queue report generation
  await queueReportGeneration(report.id);

  logger.info(`New report created: ${report.id} for scan: ${scanId} by user: ${req.user.id}`);

  res.status(201).json({
    success: true,
    message: 'Report generation started',
    data: report,
  });
}));

// Get reports
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const format = req.query.format as string;
  const status = req.query.status as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { userId: req.user.id };
  
  if (format && ['PDF', 'HTML', 'CSV', 'JSON'].includes(format)) {
    where.format = format;
  }
  
  if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
    where.status = status;
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
            completedAt: true,
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

// Get report by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const reportId = req.params.id;

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      OR: [
        { userId: req.user.id },
        { scan: { organization: { members: { some: { userId: req.user.id } } } } },
      ],
    },
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
      scan: {
        select: {
          id: true,
          url: true,
          title: true,
          description: true,
          score: true,
          totalIssues: true,
          criticalIssues: true,
          seriousIssues: true,
          moderateIssues: true,
          minorIssues: true,
          completedAt: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  res.json({
    success: true,
    data: report,
  });
}));

// Download report
router.get('/:id/download', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const reportId = req.params.id;

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      OR: [
        { userId: req.user.id },
        { scan: { organization: { members: { some: { userId: req.user.id } } } } },
      ],
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.status !== 'COMPLETED' || !report.fileUrl) {
    throw new ValidationError('Report is not ready for download');
  }

  // In a real implementation, you would serve the file from storage
  // For now, we'll redirect to the file URL
  res.redirect(report.fileUrl);
}));

// Regenerate report
router.post('/:id/regenerate', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const reportId = req.params.id;
  const { format } = req.body;

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      userId: req.user.id,
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.status === 'PROCESSING') {
    throw new ValidationError('Report is currently being generated');
  }

  // Update report status
  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'PENDING',
      format: format || report.format,
      fileUrl: null,
      fileSize: null,
    },
  });

  // Queue report generation
  await queueReportGeneration(reportId);

  logger.info(`Report regeneration initiated: ${reportId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Report regeneration started',
    data: updatedReport,
  });
}));

// Delete report
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const reportId = req.params.id;

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      userId: req.user.id,
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.status === 'PROCESSING') {
    throw new ValidationError('Cannot delete a report that is currently being generated');
  }

  // Delete report
  await prisma.report.delete({
    where: { id: reportId },
  });

  // In a real implementation, you would also delete the file from storage
  
  logger.info(`Report deleted: ${reportId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Report deleted successfully',
  });
}));

// Get report templates
router.get('/templates/list', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const templates = [
    {
      id: 'standard',
      name: 'Standard WCAG Report',
      description: 'Comprehensive report with all issues and recommendations',
      format: 'PDF',
      sections: ['summary', 'issues', 'recommendations', 'appendix'],
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level overview for stakeholders',
      format: 'PDF',
      sections: ['summary', 'scorecard', 'recommendations'],
    },
    {
      id: 'developer',
      name: 'Developer Guide',
      description: 'Technical details with code examples and fixes',
      format: 'HTML',
      sections: ['summary', 'issues', 'code-examples', 'fixes'],
    },
    {
      id: 'compliance',
      name: 'Compliance Report',
      description: 'Formal compliance documentation',
      format: 'PDF',
      sections: ['summary', 'compliance-matrix', 'issues', 'remediation-plan'],
    },
  ];

  res.json({
    success: true,
    data: templates,
  });
}));

// Create report from template
router.post('/templates/:templateId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const templateId = req.params.templateId;
  const { scanId, name, description } = req.body;

  // Validate template
  const validTemplates = ['standard', 'executive', 'developer', 'compliance'];
  if (!validTemplates.includes(templateId)) {
    throw new ValidationError('Invalid template ID');
  }

  // Verify scan access
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

  if (scan.status !== 'COMPLETED') {
    throw new ValidationError('Cannot generate report for incomplete scan');
  }

  // Check existing report
  const existingReport = await prisma.report.findUnique({
    where: { scanId },
  });

  if (existingReport) {
    throw new ValidationError('A report already exists for this scan');
  }

  // Create report from template
  const report = await prisma.report.create({
    data: {
      id: uuidv4(),
      scanId,
      userId: req.user.id,
      name: name || `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Report for ${scan.url}`,
      description,
      format: templateId === 'developer' ? 'HTML' : 'PDF',
      status: 'PENDING',
    },
    include: {
      scan: {
        select: {
          id: true,
          url: true,
          title: true,
        },
      },
    },
  });

  // Queue report generation with template
  await queueReportGeneration(report.id, templateId);

  logger.info(`Template report created: ${report.id} using template: ${templateId}`);

  res.status(201).json({
    success: true,
    message: 'Report generation started from template',
    data: report,
  });
}));

// Share report (generate shareable link)
router.post('/:id/share', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const reportId = req.params.id;
  const { expires_in = 7 * 24 * 60 * 60 } = req.body; // Default 7 days

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      userId: req.user.id,
    },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.status !== 'COMPLETED') {
    throw new ValidationError('Cannot share a report that has not completed');
  }

  // Generate share token
  const shareToken = require('jsonwebtoken').sign(
    { reportId, type: 'share', userId: req.user.id },
    process.env.JWT_SECRET!,
    { expiresIn: expires_in }
  );

  // Store share token in cache
  const { setCache } = await import('@/utils/redis');
  await setCache(`share_token:${shareToken}`, reportId, expires_in);

  const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared-report/${shareToken}`;

  res.json({
    success: true,
    message: 'Report share link generated',
    data: {
      shareUrl,
      shareToken,
      expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
    },
  });
}));

// Get shared report (public endpoint)
router.get('/shared/:shareToken', asyncHandler(async (req: Request, res: Response) => {
  const { shareToken } = req.params;

  try {
    // Verify share token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(shareToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'share' || !decoded.reportId) {
      throw new Error('Invalid share token');
    }

    // Check if token is still valid in cache
    const { getCache } = await import('@/utils/redis');
    const reportId = await getCache(`share_token:${shareToken}`);
    
    if (!reportId || reportId !== decoded.reportId) {
      throw new Error('Share token has expired or been revoked');
    }

    // Get report data (limited for public view)
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        scan: {
          select: {
            id: true,
            url: true,
            title: true,
            score: true,
            totalIssues: true,
            criticalIssues: true,
            seriousIssues: true,
            moderateIssues: true,
            minorIssues: true,
            completedAt: true,
          },
        },
      },
    });

    if (!report || report.status !== 'COMPLETED') {
      throw new Error('Report not found or not available');
    }

    res.json({
      success: true,
      data: {
        report: {
          name: report.name,
          description: report.description,
          format: report.format,
          createdAt: report.createdAt,
          scan: report.scan,
        },
      },
    });
  } catch (error) {
    throw new ValidationError('Invalid or expired share link');
  }
}));

// Helper functions
async function queueReportGeneration(reportId: string, template?: string): Promise<void> {
  const { addToQueue } = await import('@/utils/redis');
  await addToQueue('reports', { reportId, template }, 1);
}

export default router;