/**
 * Email Drafts Routes - RESTful API Endpoints
 */

import { Router, Request, Response } from 'express';
import { getAllDrafts, getDraftById, createDraft, updateDraft, deleteDraft } from '../data/store';
import { ApiResponse, EmailDraft } from '../types';
import { autoTagDraft } from '../services/keywordExtractor';
import { generateAlertsForDraft, getDraftsNeedingAttention, getAlertStats } from '../services/keywordAlerting';
import { validate, createDraftSchema, updateDraftSchema } from '../middleware/validation';

const router = Router();

/**
 * GET /api/drafts
 * Get all email drafts with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, search, keywords } = req.query;
    let drafts = getAllDrafts();

    // Filter by status
    if (status && status !== 'all') {
      drafts = drafts.filter(d => d.status === status);
    }

    // Keyword filter
    if (keywords && typeof keywords === 'string') {
      const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
      drafts = drafts.filter(d => {
        const draftKeywords = [
          ...(d.keywords || []),
          ...(d.keywordTags || []),
        ].map(k => k.toLowerCase());
        
        return keywordList.some(k => 
          draftKeywords.some(dk => dk.includes(k))
        );
      });
    }

    // Search filter (now includes keyword search)
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      drafts = drafts.filter(d => {
        const keywordMatch = (d.keywords || []).some(k => 
          k.toLowerCase().includes(searchLower)
        ) || (d.keywordTags || []).some(k => 
          k.toLowerCase().includes(searchLower)
        );
        
        return (
          d.recipient.toLowerCase().includes(searchLower) ||
          d.subject.toLowerCase().includes(searchLower) ||
          d.company?.toLowerCase().includes(searchLower) ||
          d.body.toLowerCase().includes(searchLower) ||
          keywordMatch
        );
      });
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
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve draft',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/drafts
 * Create a new email draft
 * SECURITY: Input validation with Zod
 */
router.post('/', validate({ body: createDraftSchema }), (req: Request, res: Response) => {
  try {
    const { recipient, subject, body, violations, recipientName, company, tags, notes, keywordTags } = req.body;

    // Auto-extract keywords from violations and body
    const violationList = violations || [];
    const { keywords } = autoTagDraft(violationList, body);

    const newDraft = createDraft({
      recipient,
      recipientName,
      company,
      subject,
      body,
      violations: violationList,
      status: 'draft',
      tags,
      notes,
      keywords,
      keywordTags: keywordTags || [],
    });

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: newDraft,
      message: 'Draft created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create draft',
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/drafts/:id
 * Update an existing draft
 * SECURITY: Input validation with Zod
 */
router.put('/:id', validate({ body: updateDraftSchema }), (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // If violations or body are updated, re-extract keywords
    if (updates.violations || updates.body) {
      const currentDraft = getDraftById(req.params.id);
      if (currentDraft) {
        const violations = updates.violations || currentDraft.violations;
        const body = updates.body || currentDraft.body;
        const { keywords } = autoTagDraft(violations, body);
        updates.keywords = keywords;
      }
    }
    
    const updatedDraft = updateDraft(req.params.id, updates);

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

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update draft',
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

    const updatedDraft = updateDraft(req.params.id, {
      status: 'approved',
      approvedBy: approvedBy || 'admin@wcag-ai.com',
      approvedAt: new Date(),
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
      message: 'Draft approved successfully',
    };

    res.json(response);
  } catch (error) {
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
    const updatedDraft = updateDraft(req.params.id, {
      status: 'rejected',
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
      message: 'Draft rejected',
    };

    res.json(response);
  } catch (error) {
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

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: updatedDraft!,
      message: 'Draft marked as sent',
    };

    res.json(response);
  } catch (error) {
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

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete draft',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/drafts/:id/alerts
 * Get keyword-based alerts for a specific draft
 */
router.get('/:id/alerts', (req: Request, res: Response) => {
  try {
    const draft = getDraftById(req.params.id);

    if (!draft) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    const alerts = generateAlertsForDraft(draft);
    const stats = getAlertStats(alerts);

    const response: ApiResponse = {
      success: true,
      data: { alerts, stats },
      message: `Generated ${alerts.length} alert(s) for draft`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate alerts',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/drafts/alerts/attention
 * Get all drafts that need attention based on keywords
 */
router.get('/alerts/attention', (req: Request, res: Response) => {
  try {
    const allDrafts = getAllDrafts();
    const draftsNeedingAttention = getDraftsNeedingAttention(allDrafts);

    const response: ApiResponse<EmailDraft[]> = {
      success: true,
      data: draftsNeedingAttention,
      message: `Found ${draftsNeedingAttention.length} draft(s) needing attention`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get drafts needing attention',
    };
    res.status(500).json(response);
  }
});

export default router;
