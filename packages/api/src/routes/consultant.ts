/**
 * Consultant Review Routes
 *
 * API endpoints for the WCAGAI consultant workflow:
 * - View pending scans for review
 * - Score violations with AI confidence
 * - Approve, dispute, or reject scans
 * - Export audit trails
 */

import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { confidenceScorer } from "../services/ConfidenceScorer";
import { log } from "../utils/logger";
import type { Scan, Violation, ReviewLog } from "../types";
import BusinessMetricsService from "../services/BusinessMetricsService";

const router = express.Router();

/**
 * GET /api/consultant/scans/pending
 *
 * List all pending scans awaiting consultant review
 * Sorted by confidence score (lowest first - needs more review)
 */
router.get("/scans/pending", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where: { approvalStatus: "pending" },
        include: { violations: true },
        orderBy: { aiConfidenceScore: "asc" },
        skip,
        take: limit,
      }),
      prisma.scan.count({
        where: { approvalStatus: "pending" },
      }),
    ]);

    log.info("Fetched pending scans", {
      count: scans.length,
      page,
      limit,
      total,
    });

    res.json({
      success: true,
      data: scans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    log.error(
      "Failed to fetch pending scans",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending scans",
    });
  }
});

/**
 * GET /api/consultant/scans/:scanId
 *
 * Get detailed scan with violations and review history
 */
router.get("/scans/:scanId", async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        violations: {
          orderBy: { aiConfidence: "desc" },
        },
        reviewLogs: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    log.info("Retrieved scan details", { scanId });

    res.json({
      success: true,
      data: scan,
    });
  } catch (error) {
    log.error(
      "Failed to retrieve scan",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to retrieve scan",
    });
  }
});

/**
 * POST /api/consultant/scans/:scanId/score-confidence
 *
 * Score all violations in a scan using AI confidence analysis
 */
router.post("/scans/:scanId/score-confidence", async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { violations: true },
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    // Score violations
    log.info("Starting confidence scoring", { scanId, violationCount: scan.violations.length });

    const confidenceResult = await confidenceScorer.scoreViolations(
      scan.violations.map((v: any) => ({
        wcagCriteria: v.wcagCriteria,
        description: v.description,
        elementSelector: v.elementSelector || undefined,
        codeSnippet: v.codeSnippet || undefined,
        screenshot: v.screenshot || undefined,
      }))
    );

    // Update scan with overall confidence score
    const updatedScan = await prisma.scan.update({
      where: { id: scanId },
      data: {
        aiConfidenceScore: confidenceResult.overallScore,
        confidenceDetails: {
          falsePositiveRisk: confidenceResult.falsePositiveRisk,
          recommendedAction: confidenceResult.recommendedAction,
          violations: confidenceResult.violations,
        } as any,
      },
      include: { violations: true },
    });

    // Update individual violation scores
    await Promise.all(
      confidenceResult.violations.map((v) =>
        prisma.violation.updateMany({
          where: {
            scanId,
            wcagCriteria: v.wcagCriteria,
          },
          data: { aiConfidence: v.confidence },
        })
      )
    );

    log.info("Confidence scoring completed", {
      scanId,
      overallScore: confidenceResult.overallScore,
      recommendedAction: confidenceResult.recommendedAction,
    });

    res.json({
      success: true,
      data: {
        scan: updatedScan,
        confidence: confidenceResult,
      },
    });
  } catch (error) {
    log.error(
      "Failed to score confidence",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to score confidence",
    });
  }
});

/**
 * POST /api/consultant/scans/:scanId/approve
 *
 * Approve a scan after consultant review
 */
router.post("/scans/:scanId/approve", async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const { approvalStatus, consultantEmail, notes } = req.body;

    // Validate inputs
    if (!consultantEmail || !["approved", "disputed", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid consultant email or approval status",
      });
    }

    // Update scan
    const updatedScan = await prisma.scan.update({
      where: { id: scanId },
      data: {
        approvalStatus,
        reviewed: true,
        reviewedBy: consultantEmail,
        reviewedAt: new Date(),
      },
      include: { violations: true },
    });

    // Log the review action
    await prisma.reviewLog.create({
      data: {
        scanId,
        action: approvalStatus,
        consultantEmail,
        details: { notes, timestamp: new Date() },
      },
    });

    log.info("Scan approved", {
      scanId,
      approvalStatus,
      consultantEmail,
    });

    res.json({
      success: true,
      data: updatedScan,
    });
  } catch (error) {
    log.error(
      "Failed to approve scan",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to approve scan",
    });
  }
});

/**
 * POST /api/consultant/scans/:scanId/dispute
 *
 * Dispute a specific violation
 */
router.post("/scans/:scanId/dispute", async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const { violationId, consultantEmail, reason } = req.body;

    if (!violationId || !consultantEmail || !reason) {
      return res.status(400).json({
        success: false,
        error: "Missing violation ID, consultant email, or reason",
      });
    }

    // Mark violation as human-reviewed
    const violation = await prisma.violation.update({
      where: { id: violationId },
      data: { humanReviewed: true },
    });

    // Log the dispute
    await prisma.reviewLog.create({
      data: {
        scanId,
        action: "disputed",
        consultantEmail,
        details: {
          violationId,
          wcagCriteria: violation.wcagCriteria,
          reason,
          timestamp: new Date(),
        },
      },
    });

    log.info("Violation disputed", {
      scanId,
      violationId,
      reason,
    });

    res.json({
      success: true,
      data: { violationId, disputed: true },
    });
  } catch (error) {
    log.error(
      "Failed to dispute violation",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to dispute violation",
    });
  }
});

/**
 * GET /api/consultant/reports/:scanId/audit-trail
 *
 * Get complete audit trail for a scan
 */
router.get("/reports/:scanId/audit-trail", async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;

    const logs = await prisma.reviewLog.findMany({
      where: { scanId },
      orderBy: { timestamp: "desc" },
    });

    log.info("Retrieved audit trail", { scanId, logCount: logs.length });

    res.json({
      success: true,
      data: {
        scanId,
        auditTrail: logs,
        totalActions: logs.length,
      },
    });
  } catch (error) {
    log.error(
      "Failed to fetch audit trail",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch audit trail",
    });
  }
});

/**
 * GET /api/consultant/stats
 *
 * Get consultant dashboard statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [pendingCount, approvedCount, disputedCount, totalScans] =
      await Promise.all([
        prisma.scan.count({ where: { approvalStatus: "pending" } }),
        prisma.scan.count({ where: { approvalStatus: "approved" } }),
        prisma.scan.count({ where: { approvalStatus: "disputed" } }),
        prisma.scan.count({}),
      ]);

    // Calculate average confidence score
    const scans = await prisma.scan.findMany({
      select: { aiConfidenceScore: true },
    });
    const avgConfidence =
      scans.length > 0
        ? scans.reduce((sum: number, s: any) => sum + s.aiConfidenceScore, 0) / scans.length
        : 0;

    res.json({
      success: true,
      data: {
        pending: pendingCount,
        approved: approvedCount,
        disputed: disputedCount,
        total: totalScans,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
    });
  } catch (error) {
    log.error(
      "Failed to fetch stats",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
});

/**
 * GET /api/consultant/metrics
 *
 * Get business metrics for consultant dashboard
 * (as documented in README.md)
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;

    const metricsService = new BusinessMetricsService(prisma);
    const metrics = await metricsService.calculateMetrics(tenantId);

    log.info("Retrieved consultant metrics", {
      totalProjects: metrics.totalProjects,
      monthlyRevenue: metrics.monthlyRevenue,
    });

    res.json({
      success: true,
      totalProjects: metrics.totalProjects,
      monthlyRevenue: metrics.monthlyRevenue,
      activeClients: metrics.activeClients,
      avgProjectValue: metrics.avgProjectValue,
      maintenanceRevenue: metrics.maintenanceRevenue,
      detailed: metrics.metrics,
    });
  } catch (error) {
    log.error(
      "Failed to fetch metrics",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch consultant metrics",
    });
  }
});

/**
 * GET /api/consultant/metrics/history
 *
 * Get historical metrics for trend analysis
 */
router.get("/metrics/history", async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const months = parseInt(req.query.months as string) || 12;

    const metricsService = new BusinessMetricsService(prisma);
    const history = await metricsService.getHistoricalMetrics(tenantId, months);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    log.error(
      "Failed to fetch historical metrics",
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: "Failed to fetch historical metrics",
    });
  }
});

export default router;
