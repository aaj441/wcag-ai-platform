/**
 * Email Drafts Routes - RESTful API Endpoints
 */

import { Router, Request, Response } from 'express';
import { getAllDrafts, getDraftById, createDraft, updateDraft, deleteDraft } from '../data/store';
import { ApiResponse, EmailDraft } from '../types';
import { CreateEmailDraftSchema, UpdateEmailDraftSchema } from '../validation/schemas';
import { extractKeywords, combineTexts } from '../utils/keywords';
import { log } from '../utils/logger';

const router = Router();

/**
 * GET /api/drafts
 * Get all email drafts with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    let drafts = getAllDrafts();

    // Filter by status
    if (status && status !== 'all') {
      drafts = drafts.filter(d => d.status === status);
    }

    // Search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      drafts = drafts.filter(d =>
        d.recipient.toLowerCase().includes(searchLower) ||
        d.subject.toLowerCase().includes(searchLower) ||
        d.company?.toLowerCase().includes(searchLower) ||
        d.body.toLowerCase().includes(searchLower)
      );
    }

    // Keyword filter
    const { keyword } = req.query;
    if (keyword && typeof keyword === 'string') {
      const k = keyword.toLowerCase();
      drafts = drafts.filter(d => (d.keywords || []).map(s => s.toLowerCase()).includes(k));
    }

    const response: ApiResponse<EmailDraft[]> = {
      success: true,
      data: drafts,
      message: `Retrieved ${drafts.length} draft(s)`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve drafts',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/drafts/:id
 * Get a single draft by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const draft = getDraftById(req.params.id);

    if (!draft) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: draft,
    };

    res.json(response);
  } catch (error) {
    log.error('Failed to delete draft', error instanceof Error ? error : undefined, { draftId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete draft',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/drafts
 * Create a new email draft
 * SECURITY: Input validation with Zod
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const parseResult = CreateEmailDraftSchema.safeParse(req.body);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation error',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
      };
      return res.status(400).json(response);
    }

    const { recipient, recipientName, company, subject, body, violations, notes, tags } = parseResult.data;

    // Extract keywords from subject + body + violation descriptions
    const combinedText = combineTexts(subject, body, ...(violations || []).map(v => v.description || ''));
    const keywords = extractKeywords(combinedText, 15);

    const newDraft = createDraft({
      recipient,
      recipientName,
      company,
      subject,
      body,
      violations: violations || [],
      status: 'draft',
      tags,
      notes,
      keywords,
    });

    log.info('Draft created', { draftId: newDraft.id, recipient });

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: newDraft,
      message: 'Draft created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    log.error('Failed to create draft', error as Error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create draft',
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/drafts/:id
 * Update a draft
 * SECURITY: Input validation with Zod
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const validationResult = UpdateEmailDraftSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        details: errors,
      };
      return res.status(400).json(response);
    }

    const updates = validationResult.data;
    const existing = getDraftById(req.params.id);
    if (!existing) {
      const response: ApiResponse = { success: false, error: 'Draft not found' };
      return res.status(404).json(response);
    }

    // Enforce status workflow if status changing
    const nextStatus = updates.status as EmailDraft['status'] | undefined;
    if (nextStatus && nextStatus !== existing.status) {
      const allowed: Record<EmailDraft['status'], EmailDraft['status'][]> = {
        draft: ['pending_review', 'rejected'],
        pending_review: ['approved', 'rejected'],
        approved: ['sent', 'rejected'],
        sent: [],
        rejected: [],
      };
      const validNext = allowed[existing.status];
      if (!validNext.includes(nextStatus)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid status transition: ${existing.status} -> ${nextStatus}`,
        };
        return res.status(422).json(response);
      }
    }

    const updatedDraft = updateDraft(req.params.id, {
      ...updates,
      status: updates.status ?? existing.status,
    });

    if (!updatedDraft) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: updatedDraft,
      message: 'Draft updated successfully',
    };

    log.info('Draft updated', { draftId: req.params.id, status: updatedDraft.status });

    res.json(response);
  } catch (error) {
    log.error('Failed to create draft', error instanceof Error ? error : undefined, { body: req.body });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create draft',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/drafts/:id/approve
 * Approve a draft
 */
router.patch('/:id/approve', (req: Request, res: Response) => {
  try {
    const { approvedBy } = req.body;
    const existing = getDraftById(req.params.id);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }
    if (!['pending_review'].includes(existing.status)) {
      const response: ApiResponse = { success: false, error: `Only pending_review drafts can be approved (current: ${existing.status})` };
      return res.status(422).json(response);
    }

    const updatedDraft = updateDraft(req.params.id, {
      status: 'approved',
      approvedBy: approvedBy || 'admin@wcag-ai.com',
      approvedAt: new Date(),
    });

    if (!updatedDraft) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to approve draft',
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: updatedDraft,
      message: 'Draft approved successfully',
    };

    log.info('Draft approved', { draftId: req.params.id, approvedBy });

    res.json(response);
  } catch (error) {
    log.error('Failed to approve draft', error instanceof Error ? error : undefined, { draftId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to approve draft',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/drafts/:id/reject
 * Reject a draft
 */
router.patch('/:id/reject', (req: Request, res: Response) => {
  try {
    const existing = getDraftById(req.params.id);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }
    if (!['draft', 'pending_review', 'approved'].includes(existing.status)) {
      const response: ApiResponse = { success: false, error: `Cannot reject draft in status ${existing.status}` };
      return res.status(422).json(response);
    }
    const updatedDraft = updateDraft(req.params.id, { status: 'rejected' });

    if (!updatedDraft) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to reject draft',
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: updatedDraft,
      message: 'Draft rejected',
    };

    log.info('Draft rejected', { draftId: req.params.id });

    res.json(response);
  } catch (error) {
    log.error('Failed to reject draft', error instanceof Error ? error : undefined, { draftId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to reject draft',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/drafts/approve-all
 * Bulk approve all drafts with pending_review status
 */
router.post('/approve-all', (req: Request, res: Response) => {
  try {
    const { approvedBy } = req.body;
    const allDrafts = getAllDrafts();

    // Filter only pending_review drafts
    const pendingDrafts = allDrafts.filter(d => d.status === 'pending_review');

    if (pendingDrafts.length === 0) {
      const response: ApiResponse = {
        success: true,
        data: { count: 0, drafts: [] },
        message: 'No pending drafts to approve',
      };
      return res.json(response);
    }

    // Approve each draft
    const approvedDrafts = pendingDrafts.map(draft => {
      return updateDraft(draft.id, {
        status: 'approved',
        approvedBy: approvedBy || 'admin@wcag-ai.com',
        approvedAt: new Date(),
      });
    }).filter(d => d !== null);

    const response: ApiResponse = {
      success: true,
      data: { count: approvedDrafts.length, drafts: approvedDrafts },
      message: `${approvedDrafts.length} draft(s) approved successfully`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to approve drafts',
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/drafts/:id/send
 * Mark draft as sent
 */
router.patch('/:id/send', (req: Request, res: Response) => {
  try {
    const draft = getDraftById(req.params.id);

    if (!draft) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    if (draft.status !== 'approved') {
      const response: ApiResponse = {
        success: false,
        error: 'Only approved drafts can be marked as sent',
      };
      return res.status(400).json(response);
    }

    const updatedDraft = updateDraft(req.params.id, {
      status: 'sent',
    });

    if (!updatedDraft) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to mark draft as sent',
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: updatedDraft,
      message: 'Draft marked as sent',
    };

    log.info('Draft sent', { draftId: req.params.id });

    res.json(response);
  } catch (error) {
    log.error('Failed to mark draft as sent', error instanceof Error ? error : undefined, { draftId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to mark draft as sent',
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/drafts/:id
 * Delete a draft
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteDraft(req.params.id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Draft deleted successfully',
    };

    log.info('Draft deleted', { draftId: req.params.id });

    res.json(response);
  } catch (error) {
    log.error('Failed to update draft', error instanceof Error ? error : undefined, { draftId: req.params.id });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update draft',
    };
    res.status(500).json(response);
  }
});

export default router;
