import { Router, Request, Response } from 'express';
import { getAllDrafts, updateDraft } from '../data/store';
import { ApiResponse } from '../types';
import { extractKeywords, combineTexts } from '../utils/keywords';
import { log } from '../utils/logger';

const router = Router();

/**
 * GET /api/keywords
 * Returns aggregated top keywords across all drafts with counts
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const drafts = getAllDrafts();
    const counts: Record<string, number> = {};
    for (const d of drafts) {
      for (const k of d.keywords || []) {
        const kk = k.toLowerCase();
        counts[kk] = (counts[kk] || 0) + 1;
      }
    }
    const items = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ keyword: k, count: c }));
    const response: ApiResponse = { success: true, data: items };
    res.json(response);
  } catch (error) {
    log.error('Failed to aggregate keywords', error instanceof Error ? error : undefined);
    res.status(500).json({ success: false, error: 'Failed to aggregate keywords' });
  }
});

/**
 * POST /api/keywords/refresh
 * Recompute keywords for all drafts (useful after schema changes or seeding)
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const drafts = getAllDrafts();
    let updated = 0;
    for (const d of drafts) {
      const combined = combineTexts(d.subject, d.body, ...(d.violations || []).map(v => v.description || ''));
      const keywords = extractKeywords(combined, 15);
      const result = updateDraft(d.id, { keywords });
      if (result) updated++;
    }
    log.info('Keywords refreshed for drafts', { updated });
    res.json({ success: true, message: `Refreshed keywords for ${updated} drafts` });
  } catch (error) {
    log.error('Failed to refresh keywords', error instanceof Error ? error : undefined);
    res.status(500).json({ success: false, error: 'Failed to refresh keywords' });
  }
});

export default router;
