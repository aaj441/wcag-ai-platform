import express, { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { RemediationEngine } from '../services/RemediationEngine';
import { authMiddleware, ensureTenantAccess } from '../middleware/auth';
import { log } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/fixes/generate
 *
 * Generate a fix for a WCAG violation
 * Body: { violationId, wcagCriteria, issueType, description, codeLanguage? }
 */
router.post('/generate', authMiddleware, ensureTenantAccess, async (req: Request, res: Response) => {
  try {
    const { violationId, wcagCriteria, issueType, description, codeLanguage } = req.body;
    const tenantId = req.tenantId!;

    if (!violationId || !wcagCriteria || !issueType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: violationId, wcagCriteria, issueType',
      });
    }

    // Get violation to check ownership and code
    const violation = await prisma.violation.findUnique({
      where: { id: violationId },
      include: { scan: true },
    });

    if (!violation || violation.scan?.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Violation not found' });
    }

    // Check if fix already exists
    const existingFix = await prisma.fix.findUnique({
      where: { violationId },
    });

    if (existingFix) {
      return res.json({
        success: true,
        data: existingFix,
        message: 'Fix already generated for this violation',
      });
    }

    // Generate fix
    const generatedFix = await RemediationEngine.generateFix({
      violationId,
      wcagCriteria,
      issueType,
      description,
      elementSelector: violation.elementSelector || undefined,
      codeSnippet: violation.codeSnippet || undefined,
      codeLanguage,
    });

    // Save to database
    const fix = await RemediationEngine.saveFix(tenantId, violationId, generatedFix);

    log.info('Fix generated', {
      violationId,
      wcagCriteria,
      issueType,
      confidenceScore: generatedFix.confidenceScore,
    });

    res.json({
      success: true,
      data: fix,
      message: `Fix generated with ${(fix.confidenceScore * 100).toFixed(0)}% confidence`,
    });
  } catch (error) {
    log.error(
      'Failed to generate fix',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: 'Failed to generate fix',
    });
  }
});

/**
 * GET /api/fixes/:fixId
 *
 * Get a specific fix
 */
router.get('/:fixId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const fix = await prisma.fix.findUnique({
      where: { id: req.params.fixId },
      include: { violation: true, applications: true },
    });

    if (!fix || fix.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Fix not found' });
    }

    res.json({ success: true, data: fix });
  } catch (error) {
    log.error('Failed to fetch fix', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, error: 'Failed to fetch fix' });
  }
});

/**
 * PATCH /api/fixes/:fixId/review
 *
 * Review and approve/reject a fix
 */
router.patch('/:fixId/review', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewStatus, reviewNotes } = req.body;
    const fixId = req.params.fixId;

    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        error: 'reviewStatus must be "approved" or "rejected"',
      });
    }

    const fix = await prisma.fix.findUnique({
      where: { id: fixId },
    });

    if (!fix || fix.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Fix not found' });
    }

    const updated = await prisma.fix.update({
      where: { id: fixId },
      data: {
        reviewStatus,
        reviewedBy: req.user?.email,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

    log.info('Fix reviewed', {
      fixId,
      reviewStatus,
      reviewer: req.user?.email,
    });

    res.json({
      success: true,
      data: updated,
      message: `Fix ${reviewStatus}`,
    });
  } catch (error) {
    log.error(
      'Failed to review fix',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to review fix' });
  }
});

/**
 * POST /api/fixes/:fixId/apply
 *
 * Apply a fix (Phase 2: will actually modify code)
 * For Phase 1, this just logs the action
 */
router.post('/:fixId/apply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { filePath, repository, branch } = req.body;
    const fixId = req.params.fixId;

    const fix = await prisma.fix.findUnique({
      where: { id: fixId },
    });

    if (!fix || fix.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Fix not found' });
    }

    if (fix.reviewStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Fix must be approved before applying',
      });
    }

    // Phase 1: Just log that we're applying
    // Phase 2: Will call GitHub API to create PR
    const application = await prisma.fixApplication.create({
      data: {
        tenantId: req.tenantId!,
        fixId,
        appliedBy: req.user?.email || 'unknown',
        repository,
        filePath,
        branch,
        success: true,
        verificationStatus: 'pending', // Phase 2: actual verification
      },
    });

    log.info('Fix applied', {
      fixId,
      filePath,
      repository,
      appliedBy: req.user?.email,
    });

    res.json({
      success: true,
      data: application,
      message: 'Fix applied (Phase 2: GitHub PR integration coming)',
    });
  } catch (error) {
    log.error(
      'Failed to apply fix',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to apply fix' });
  }
});

/**
 * GET /api/fixes/scan/:scanId
 *
 * Get all fixes for violations in a scan
 */
router.get('/scan/:scanId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;

    // Verify scan ownership
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
    });

    if (!scan || scan.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Scan not found' });
    }

    // Get violations for this scan
    const violations = await prisma.violation.findMany({
      where: { scanId },
    });

    // Get fixes for these violations
    const fixes = await prisma.fix.findMany({
      where: {
        violationId: { in: violations.map((v: any) => v.id) },
      },
      include: { applications: true },
    });

    const stats = {
      totalViolations: violations.length,
      fixesGenerated: fixes.length,
      fixesApproved: fixes.filter((f: any) => f.reviewStatus === 'approved').length,
      fixesApplied: fixes.filter((f: any) => f.applications.length > 0).length,
      averageConfidence:
        fixes.length > 0
          ? (fixes.reduce((sum: number, f: any) => sum + f.confidenceScore, 0) / fixes.length).toFixed(2)
          : '0.00',
    };

    res.json({
      success: true,
      data: {
        fixes,
        stats,
      },
    });
  } catch (error) {
    log.error(
      'Failed to fetch scan fixes',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to fetch fixes' });
  }
});

/**
 * GET /api/fixes/metrics
 *
 * Get remediation engine metrics
 */
router.get('/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const metrics = await RemediationEngine.getFixMetrics(req.tenantId!);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    log.error(
      'Failed to fetch metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

export default router;
