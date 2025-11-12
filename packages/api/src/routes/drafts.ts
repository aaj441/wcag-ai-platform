/**
 * Email Drafts Routes - RESTful API Endpoints
 */

import { Router, Request, Response } from 'express';
import { getAllDrafts, getDraftById, createDraft, updateDraft, deleteDraft } from '../data/store';
import { ApiResponse, EmailDraft } from '../types';
import { extractKeywordsFromViolations } from '../services/keywordExtractor';
import { processAlertsForDraft, getAlertsForDraft } from '../services/alertService';
import { buildTemplateContext, substituteTemplateVariables, generateSubject, generateEmailBody } from '../services/templateService';

const router = Router();

/**
 * GET /api/drafts
 * Get all email drafts with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, search, keyword, tag, violationType } = req.query;
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
    if (keyword && typeof keyword === 'string') {
      const keywordLower = keyword.toLowerCase();
      drafts = drafts.filter(d => 
        d.keywords?.some(k => k.toLowerCase().includes(keywordLower))
      );
    }

    // Tag filter
    if (tag && typeof tag === 'string') {
      const tagLower = tag.toLowerCase();
      drafts = drafts.filter(d => 
        d.keywordTags?.some(t => t.toLowerCase().includes(tagLower)) ||
        d.tags?.some(t => t.toLowerCase().includes(tagLower))
      );
    }

    // Violation type filter
    if (violationType && typeof violationType === 'string') {
      const typeLower = violationType.toLowerCase();
      drafts = drafts.filter(d => 
        d.keywordTags?.some(t => t.toLowerCase().includes(typeLower))
      );
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
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { recipient, subject, body, violations, recipientName, company, tags, notes, useTemplate } = req.body;

    // Validation
    if (!recipient || !subject || !body) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: recipient, subject, body',
      };
      return res.status(400).json(response);
    }

    // Extract keywords and tags from violations if present
    let keywords: string[] = [];
    let keywordTags: string[] = [];
    let processedSubject = subject;
    let processedBody = body;

    if (violations && violations.length > 0) {
      const extracted = extractKeywordsFromViolations(violations);
      keywords = extracted.allKeywords;
      keywordTags = extracted.allTags;

      // Apply template substitution if requested
      if (useTemplate) {
        const context = buildTemplateContext(violations, recipientName, company);
        processedSubject = substituteTemplateVariables(subject, context);
        processedBody = substituteTemplateVariables(body, context);
      }
    }

    const newDraft = createDraft({
      recipient,
      recipientName,
      company,
      subject: processedSubject,
      body: processedBody,
      violations: violations || [],
      status: 'draft',
      tags,
      notes,
      keywords,
      keywordTags,
    });

    // Process alerts for the new draft
    const alerts = processAlertsForDraft(newDraft);

    const response: ApiResponse<EmailDraft & { alerts?: any[] }> = {
      success: true,
      data: {
        ...newDraft,
        alerts: alerts.length > 0 ? alerts : undefined,
      },
      message: `Draft created successfully${alerts.length > 0 ? ` with ${alerts.length} alert(s)` : ''}`,
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
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const updates = req.body;
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
 * GET /api/drafts/:id/keywords
 * Get extracted keywords for a specific draft
 */
router.get('/:id/keywords', (req: Request, res: Response) => {
  try {
    const draft = getDraftById(req.params.id);

    if (!draft) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<{
      keywords: string[];
      keywordTags: string[];
      violations: number;
    }> = {
      success: true,
      data: {
        keywords: draft.keywords || [],
        keywordTags: draft.keywordTags || [],
        violations: draft.violations.length,
      },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve keywords',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/drafts/:id/alerts
 * Get alerts for a specific draft
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

    const alerts = getAlertsForDraft(req.params.id);

    const response: ApiResponse<typeof alerts> = {
      success: true,
      data: alerts,
      message: `Found ${alerts.length} alert(s)`,
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve alerts',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/drafts/:id/regenerate
 * Regenerate draft content using templates
 */
router.post('/:id/regenerate', (req: Request, res: Response) => {
  try {
    const draft = getDraftById(req.params.id);

    if (!draft) {
      const response: ApiResponse = {
        success: false,
        error: 'Draft not found',
      };
      return res.status(404).json(response);
    }

    const { subjectTemplate, bodyTemplate } = req.body;

    const newSubject = subjectTemplate 
      ? substituteTemplateVariables(
          subjectTemplate, 
          buildTemplateContext(draft.violations, draft.recipientName, draft.company)
        )
      : generateSubject(null, draft.violations, draft.company);

    const newBody = bodyTemplate
      ? substituteTemplateVariables(
          bodyTemplate,
          buildTemplateContext(draft.violations, draft.recipientName, draft.company)
        )
      : generateEmailBody(null, draft.violations, draft.recipientName, draft.company);

    const updatedDraft = updateDraft(req.params.id, {
      subject: newSubject,
      body: newBody,
    });

    const response: ApiResponse<EmailDraft> = {
      success: true,
      data: updatedDraft!,
      message: 'Draft regenerated successfully',
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to regenerate draft',
    };
    res.status(500).json(response);
  }
});

export default router;
