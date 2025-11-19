/**
 * Violations API
 * 
 * GET /api/violations - List violations with filtering
 * GET /api/violations/summary - Aggregate statistics
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/violations
 * List all violations with optional filters
 */
router.get('/', (req: Request, res: Response) => {
  const { severity, wcagCriterion, limit = 50 } = req.query;

  // Mock violation data
  const violations = [
    {
      id: 'image-alt',
      wcagCriterion: '1.1.1',
      severity: 'critical',
      title: 'Images missing alt text',
      description: 'All images must have alternative text for screen readers',
      occurrences: 247,
    },
    {
      id: 'color-contrast',
      wcagCriterion: '1.4.3',
      severity: 'serious',
      title: 'Insufficient color contrast',
      description: 'Text must have sufficient contrast with background',
      occurrences: 189,
    },
    {
      id: 'button-name',
      wcagCriterion: '4.1.2',
      severity: 'moderate',
      title: 'Buttons lack accessible names',
      description: 'Interactive elements must have discernible text',
      occurrences: 134,
    },
  ];

  let filtered = violations;

  if (severity) {
    filtered = filtered.filter(v => v.severity === severity);
  }

  if (wcagCriterion) {
    filtered = filtered.filter(v => v.wcagCriterion === wcagCriterion);
  }

  res.json({
    success: true,
    data: {
      total: filtered.length,
      violations: filtered.slice(0, Number(limit)),
    },
  });
});

/**
 * GET /api/violations/summary
 * Aggregate violation statistics
 */
router.get('/summary', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalViolations: 570,
      bySeverity: {
        critical: 247,
        serious: 189,
        moderate: 134,
        minor: 0,
      },
      byPrinciple: {
        perceivable: 289,
        operable: 142,
        understandable: 91,
        robust: 48,
      },
      topViolations: [
        { id: 'image-alt', count: 247 },
        { id: 'color-contrast', count: 189 },
        { id: 'button-name', count: 134 },
      ],
    },
  });
});

export { router as violationsRouter };
