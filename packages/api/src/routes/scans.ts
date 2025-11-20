import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/utils/database';
import { setCache, getCache } from '@/utils/redis';
import { 
  ValidationError, 
  NotFoundError, 
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { scanWebsite } from '@/services/scanService';
import { updateScanProgress, notifyScanComplete, notifyScanError } from '@/utils/websocket';

const router = Router();

// Validation rules
const createScanValidation = [
  body('url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL with http or https protocol'),
  body('title')
    .optional()
    .isLength({ max: 200 })
    .trim()
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .trim()
    .withMessage('Description must be less than 1000 characters'),
  body('projectId')
    .optional()
    .isUUID()
    .withMessage('Invalid project ID format'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be a valid object'),
];

const getScansValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .withMessage('Invalid status'),
  query('projectId')
    .optional()
    .isUUID()
    .withMessage('Invalid project ID format'),
];

// Create new scan
router.post('/', createScanValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { url, title, description, projectId, options = {} } = req.body;

  // Check if user has access to the project
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: req.user.id },
          { organization: { members: { some: { userId: req.user.id } } } },
        ],
      },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }
  }

  // Check if there's already a running scan for this URL by this user
  const existingScan = await prisma.scan.findFirst({
    where: {
      url,
      userId: req.user.id,
      status: { in: ['PENDING', 'RUNNING'] },
    },
  });

  if (existingScan) {
    throw new ValidationError('A scan for this URL is already in progress');
  }

  // Create scan record
  const scan = await prisma.scan.create({
    data: {
      id: uuidv4(),
      url,
      title: title || extractTitleFromUrl(url),
      description,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      projectId: projectId || null,
      status: 'PENDING',
      options,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Queue the scan for processing
  await queueScan(scan.id);

  logger.info(`New scan created: ${scan.id} for URL: ${url} by user: ${req.user.id}`);

  res.status(201).json({
    success: true,
    message: 'Scan created successfully',
    data: scan,
  });
}));

// Get scans
router.get('/', getScansValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const projectId = req.query.projectId as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { userId: req.user.id };
  
  if (status && ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
    where.status = status;
  }
  
  if (projectId) {
    where.projectId = projectId;
  }

  // Get scans
  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            issues: true,
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

// Get scan by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const scanId = req.params.id;

  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      OR: [
        { userId: req.user.id },
        { organization: { members: { some: { userId: req.user.id } } } },
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
      project: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      issues: {
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
      },
      _count: {
        select: {
          issues: true,
        },
      },
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan');
  }

  res.json({
    success: true,
    data: scan,
  });
}));

// Cancel scan
router.post('/:id/cancel', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const scanId = req.params.id;

  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      userId: req.user.id,
      status: { in: ['PENDING', 'RUNNING'] },
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan or scan cannot be cancelled');
  }

  // Update scan status
  const updatedScan = await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  // Update cache
  await setCache(`scan_status:${scanId}`, 'CANCELLED', 3600);

  // Notify via WebSocket
  updateScanProgress({
    scanId,
    progress: 0,
    status: 'CANCELLED',
    currentStep: 'Scan cancelled by user',
  });

  logger.info(`Scan cancelled: ${scanId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Scan cancelled successfully',
    data: updatedScan,
  });
}));

// Retry failed scan
router.post('/:id/retry', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const scanId = req.params.id;

  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      userId: req.user.id,
      status: 'FAILED',
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan or scan cannot be retried');
  }

  // Reset scan status and progress
  const updatedScan = await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: 'PENDING',
      progress: 0,
      totalIssues: 0,
      criticalIssues: 0,
      seriousIssues: 0,
      moderateIssues: 0,
      minorIssues: 0,
      score: 0,
      startedAt: null,
      completedAt: null,
    },
  });

  // Delete existing issues
  await prisma.issue.deleteMany({
    where: { scanId },
  });

  // Queue the scan for processing
  await queueScan(scanId);

  logger.info(`Scan retry initiated: ${scanId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Scan retry initiated successfully',
    data: updatedScan,
  });
}));

// Delete scan
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const scanId = req.params.id;

  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      userId: req.user.id,
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan');
  }

  // Check if scan is running
  if (scan.status === 'RUNNING') {
    throw new ValidationError('Cannot delete a running scan. Please cancel it first.');
  }

  // Delete scan (this will cascade delete related issues and reports)
  await prisma.scan.delete({
    where: { id: scanId },
  });

  // Clean up cache
  await deleteCache(`scan_status:${scanId}`);

  logger.info(`Scan deleted: ${scanId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Scan deleted successfully',
  });
}));

// Get scan issues
router.get('/:id/issues', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const scanId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const severity = req.query.severity as string;
  const type = req.query.type as string;
  const search = req.query.search as string;

  const skip = (page - 1) * limit;

  // Verify user has access to this scan
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

  // Build where clause
  const where: any = { scanId };
  
  if (severity && ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'].includes(severity)) {
    where.severity = severity;
  }
  
  if (type && ['VIOLATION', 'WARNING', 'INFO', 'PASS'].includes(type)) {
    where.type = type;
  }
  
  if (search) {
    where.OR = [
      { message: { contains: search, mode: 'insensitive' } },
      { rule: { contains: search, mode: 'insensitive' } },
      { selector: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get issues
  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    prisma.issue.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: {
      issues,
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

// Export scan results
router.get('/:id/export', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const scanId = req.params.id;
  const format = req.query.format as string || 'json';

  if (!['json', 'csv', 'xml'].includes(format)) {
    throw new ValidationError('Invalid export format. Supported formats: json, csv, xml');
  }

  // Verify user has access to this scan
  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      OR: [
        { userId: req.user.id },
        { organization: { members: { some: { userId: req.user.id } } } },
      ],
    },
    include: {
      issues: {
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan');
  }

  if (scan.status !== 'COMPLETED') {
    throw new ValidationError('Cannot export scan that has not completed');
  }

  // Generate export based on format
  let exportData: any;
  let contentType: string;
  let filename: string;

  switch (format) {
    case 'json':
      exportData = JSON.stringify(scan, null, 2);
      contentType = 'application/json';
      filename = `scan-${scanId}.json`;
      break;
    
    case 'csv':
      exportData = generateCSV(scan);
      contentType = 'text/csv';
      filename = `scan-${scanId}.csv`;
      break;
    
    case 'xml':
      exportData = generateXML(scan);
      contentType = 'application/xml';
      filename = `scan-${scanId}.xml`;
      break;
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(exportData);
}));

// Helper functions
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
}

async function queueScan(scanId: string): Promise<void> {
  // Add to Redis queue for processing
  const { addToQueue } = await import('@/utils/redis');
  await addToQueue('scans', { scanId }, 1);
}

function generateCSV(scan: any): string {
  const headers = [
    'ID',
    'Severity',
    'Type',
    'Rule',
    'Message',
    'Selector',
    'WCAG Level',
    'WCAG Section',
    'Created At',
  ];

  const rows = scan.issues.map((issue: any) => [
    issue.id,
    issue.severity,
    issue.type,
    issue.rule,
    issue.message,
    issue.selector || '',
    issue.wcagLevel || '',
    issue.wcagSection || '',
    issue.createdAt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

function generateXML(scan: any): string {
  const issuesXML = scan.issues.map((issue: any) => `
    <issue>
      <id>${issue.id}</id>
      <severity>${issue.severity}</severity>
      <type>${issue.type}</type>
      <rule>${issue.rule}</rule>
      <message><![CDATA[${issue.message}]]></message>
      <selector>${issue.selector || ''}</selector>
      <wcagLevel>${issue.wcagLevel || ''}</wcagLevel>
      <wcagSection>${issue.wcagSection || ''}</wcagSection>
      <createdAt>${issue.createdAt}</createdAt>
    </issue>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
  <scan>
    <id>${scan.id}</id>
    <url>${scan.url}</url>
    <title>${scan.title || ''}</title>
    <status>${scan.status}</status>
    <score>${scan.score}</score>
    <totalIssues>${scan.totalIssues}</totalIssues>
    <criticalIssues>${scan.criticalIssues}</criticalIssues>
    <seriousIssues>${scan.seriousIssues}</seriousIssues>
    <moderateIssues>${scan.moderateIssues}</moderateIssues>
    <minorIssues>${scan.minorIssues}</minorIssues>
    <createdAt>${scan.createdAt}</createdAt>
    <completedAt>${scan.completedAt || ''}</completedAt>
    <issues>
      ${issuesXML}
    </issues>
  </scan>`;
}

export default router;