import express from 'express';
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
router.post('/generate', authMiddleware, ensureTenantAccess, async (req, res) => {
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
router.get('/:fixId', authMiddleware, async (req, res) => {
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
router.patch('/:fixId/review', authMiddleware, async (req, res) => {
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
router.post('/:fixId/apply', authMiddleware, async (req, res) => {
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
router.get('/scan/:scanId', authMiddleware, async (req, res) => {
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
router.get('/metrics', authMiddleware, async (req, res) => {
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

/**
 * POST /api/fixes/generate/multi-llm
 *
 * Generate a fix using multi-LLM validation
 * Uses multiple LLM providers for consensus and expert review
 *
 * Body: {
 *   violationId: string
 *   wcagCriteria: string
 *   issueType: string
 *   description: string
 *   codeLanguage?: string
 * }
 *
 * Returns: {
 *   fix: GeneratedFix
 *   validation: {
 *     responses: LLMResponse[]
 *     majorityVote: AIFixResponse
 *     critic: CriticReview
 *     consensusLevel: 'high' | 'medium' | 'low'
 *     agreementScore: number
 *   }
 * }
 */
router.post('/generate/multi-llm', authMiddleware, ensureTenantAccess, async (req, res) => {
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

    // Generate fix with multi-LLM validation
    const { fix: generatedFix, validation } = await RemediationEngine.generateFixWithMultiLLM({
      violationId,
      wcagCriteria,
      issueType,
      description,
      elementSelector: violation.elementSelector || undefined,
      codeSnippet: violation.codeSnippet || undefined,
      codeLanguage,
    });

    // Save fix to database
    const fix = await RemediationEngine.saveFix(tenantId, violationId, generatedFix);

    // Save multi-LLM validation to database
    const validationRecord = await RemediationEngine.saveMultiLLMValidation(
      tenantId,
      fix.id,
      validation,
      {
        violationId,
        wcagCriteria,
        issueType,
        description,
        elementSelector: violation.elementSelector || undefined,
        codeSnippet: violation.codeSnippet || undefined,
        codeLanguage,
      }
    );

    log.info('Multi-LLM fix generated', {
      violationId,
      wcagCriteria,
      issueType,
      consensusLevel: validation.consensusLevel,
      agreementScore: validation.critic.agreementScore,
      confidenceScore: generatedFix.confidenceScore,
    });

    res.json({
      success: true,
      data: {
        fix,
        validation: {
          id: validationRecord.id,
          responses: validation.responses,
          majorityVote: validation.majorityVote,
          critic: validation.critic,
          consensusLevel: validation.consensusLevel,
          agreementScore: validation.critic.agreementScore,
          totalLatency: validation.totalLatency,
          totalCost: validation.totalCost,
        },
      },
      message: `Fix generated with ${(fix.confidenceScore * 100).toFixed(0)}% confidence using ${validation.responses.length} LLM providers (${validation.consensusLevel} consensus)`,
    });
  } catch (error) {
    log.error(
      'Failed to generate multi-LLM fix',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: 'Failed to generate multi-LLM fix',
    });
  }
});

/**
 * GET /api/fixes/multi-llm/:validationId
 *
 * Get details of a specific multi-LLM validation
 */
router.get('/multi-llm/:validationId', authMiddleware, async (req, res) => {
  try {
    const { validationId } = req.params;

    const validation = await prisma.multiLLMValidation.findUnique({
      where: { id: validationId },
      include: {
        providerResponses: true,
        fix: true,
      },
    });

    if (!validation || validation.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Validation not found' });
    }

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    log.error(
      'Failed to fetch multi-LLM validation',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: 'Failed to fetch multi-LLM validation',
    });
  }
});

/**
 * GET /api/fixes/multi-llm/metrics
 *
 * Get multi-LLM validation metrics for the tenant
 */
router.get('/multi-llm-metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = await RemediationEngine.getMultiLLMMetrics(req.tenantId!);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    log.error(
      'Failed to fetch multi-LLM metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: 'Failed to fetch multi-LLM metrics',
    });
  }
});

/**
 * GET /api/fixes/multi-llm/validations
 *
 * Get all multi-LLM validations for the tenant
 */
router.get('/multi-llm-validations', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0, consensusLevel } = req.query;

    const where: any = { tenantId: req.tenantId! };
    if (consensusLevel) {
      where.consensusLevel = consensusLevel;
    }

    const validations = await prisma.multiLLMValidation.findMany({
      where,
      include: {
        providerResponses: true,
        fix: {
          include: {
            violation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.multiLLMValidation.count({ where });

    res.json({
      success: true,
      data: {
        validations,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit),
        },
      },
    });
  } catch (error) {
    log.error(
      'Failed to fetch multi-LLM validations',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: 'Failed to fetch multi-LLM validations',
    });
  }
});

export default router;
