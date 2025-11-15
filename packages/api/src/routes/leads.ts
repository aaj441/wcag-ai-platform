import express, { Request, Response } from 'express';
import { prisma } from '../lib/db';
import { CompanyDiscoveryService } from '../services/CompanyDiscoveryService';
import { authMiddleware, ensureTenantAccess } from '../middleware/auth';
import { log } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/leads/search
 *
 * Search for companies by keywords and create leads
 * Body: { keywords: ["fintech", "healthtech"], minEmployees?: 50, maxEmployees?: 500 }
 */
router.post('/search', authMiddleware, ensureTenantAccess, async (req: Request, res: Response) => {
  try {
    const { keywords, minEmployees = 50, maxEmployees = 500 } = req.body;
    const tenantId = req.tenantId!;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array required (e.g., ["fintech", "healthcare"])',
      });
    }

    log.info('Starting keyword search', {
      tenantId,
      keywords,
      minEmployees,
      maxEmployees,
    });

    // Search for companies
    const companies = await CompanyDiscoveryService.searchByKeywords(keywords, {
      minEmployees,
      maxEmployees,
    });

    log.info('Company search completed', {
      tenantId,
      found: companies.length,
    });

    if (companies.length === 0) {
      return res.json({
        success: true,
        data: {
          keywords,
          companiesFound: 0,
          leadsCreated: 0,
          leads: [],
          message: 'No companies found matching your keywords. Try different keywords.',
        },
      });
    }

    // Create leads in database
    const leads = await CompanyDiscoveryService.createLeads(
      tenantId,
      companies,
      keywords
    );

    // Log search
    await prisma.keywordSearch.create({
      data: {
        tenantId,
        keywords,
        resultsCount: companies.length,
        leadsCreated: leads.length,
      },
    });

    res.json({
      success: true,
      data: {
        keywords,
        companiesFound: companies.length,
        leadsCreated: leads.length,
        leads: leads.map((lead) => ({
          id: lead.id,
          email: lead.email,
          company: lead.company?.name || 'Unknown',
          industry: lead.company?.industry,
          relevanceScore: (lead.relevanceScore * 100).toFixed(0) + '%',
          priority: lead.priorityTier,
          status: lead.status,
        })),
      },
    });
  } catch (error) {
    log.error(
      'Keyword search failed',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.',
    });
  }
});

/**
 * GET /api/leads
 *
 * Get all leads for tenant with optional filters
 * Query: ?status=new&priority=high&sortBy=relevanceScore
 */
router.get('/', authMiddleware, ensureTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { status, priority, sortBy = 'relevanceScore' } = req.query;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priorityTier = priority;

    const leads = await prisma.lead.findMany({
      where,
      include: { company: true },
      orderBy: {
        [sortBy as string]: 'desc',
      },
      take: 100,
    });

    // Calculate stats
    const allLeads = await prisma.lead.findMany({
      where: { tenantId },
    });

    const stats = {
      total: allLeads.length,
      byStatus: {
        new: allLeads.filter((l: any) => l.status === 'new').length,
        contacted: allLeads.filter((l: any) => l.status === 'contacted').length,
        interested: allLeads.filter((l: any) => l.status === 'interested').length,
        qualified: allLeads.filter((l: any) => l.status === 'qualified').length,
        won: allLeads.filter((l: any) => l.status === 'won').length,
        lost: allLeads.filter((l: any) => l.status === 'lost').length,
      },
      byPriority: {
        high: allLeads.filter((l: any) => l.priorityTier === 'high').length,
        medium: allLeads.filter((l: any) => l.priorityTier === 'medium').length,
        low: allLeads.filter((l: any) => l.priorityTier === 'low').length,
      },
    };

    res.json({
      success: true,
      data: leads,
      stats,
    });
  } catch (error) {
    log.error(
      'Failed to fetch leads',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
});

/**
 * GET /api/leads/:leadId
 *
 * Get single lead details
 */
router.get('/:leadId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.leadId },
      include: { company: true },
    });

    if (!lead || lead.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    log.error(
      'Failed to fetch lead',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to fetch lead' });
  }
});

/**
 * PATCH /api/leads/:leadId
 *
 * Update lead status, notes, tags, etc
 */
router.patch('/:leadId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, notes, tags, priorityTier, nextFollowUp } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id: req.params.leadId },
    });

    if (!lead || lead.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const updated = await prisma.lead.update({
      where: { id: req.params.leadId },
      data: {
        status: status || undefined,
        notes: notes || undefined,
        tags: tags || undefined,
        priorityTier: priorityTier || undefined,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
        lastContacted: status === 'contacted' ? new Date() : undefined,
      },
      include: { company: true },
    });

    log.info('Lead updated', {
      leadId: req.params.leadId,
      status,
      actor: req.user?.email,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    log.error(
      'Failed to update lead',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});

/**
 * POST /api/leads/:leadId/contact
 *
 * Mark lead as contacted and log the interaction
 */
router.post('/:leadId/contact', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const leadId = req.params.leadId;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { company: true },
    });

    if (!lead || lead.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Update lead status
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'contacted',
        lastContacted: new Date(),
        notes: (lead.notes || '') +
          `\n[${new Date().toISOString()}] Contacted: ${message || '(no message)'}`,
      },
    });

    log.info('Lead contacted', {
      leadId,
      email: lead.email,
      company: lead.company?.name,
      actor: req.user?.email,
    });

    res.json({
      success: true,
      data: updated,
      message: 'Lead marked as contacted',
    });
  } catch (error) {
    log.error(
      'Failed to contact lead',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to contact lead' });
  }
});

/**
 * GET /api/leads/analytics/summary
 *
 * Get conversion funnel stats
 */
router.get('/analytics/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    const statuses = ['new', 'contacted', 'interested', 'qualified', 'won', 'lost'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      counts[status] = await prisma.lead.count({
        where: { tenantId, status },
      });
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const conversionRate = total > 0 ? (counts['won'] / total) * 100 : 0;

    const conversions = {
      ...counts,
      total,
      conversionRate: conversionRate.toFixed(2) + '%',
    };

    res.json({
      success: true,
      data: conversions,
    });
  } catch (error) {
    log.error(
      'Failed to fetch analytics',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

/**
 * DELETE /api/leads/:leadId
 *
 * Delete a lead
 */
router.delete('/:leadId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.leadId },
    });

    if (!lead || lead.tenantId !== req.tenantId) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    await prisma.lead.delete({
      where: { id: req.params.leadId },
    });

    log.info('Lead deleted', {
      leadId: req.params.leadId,
      actor: req.user?.email,
    });

    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    log.error(
      'Failed to delete lead',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
});

export default router;
