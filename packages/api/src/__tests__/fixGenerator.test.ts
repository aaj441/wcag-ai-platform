/**
 * Unit Tests for Fix Generator Service
 */

import { generateFix, generateBatchFixes } from '../services/fixGenerator';
import { FixRequest, LegacyViolation } from '../types';

describe('Fix Generator Service', () => {
  const mockViolation: LegacyViolation = {
    id: 'v1',
    url: 'https://example.com',
    pageTitle: 'Test Page',
    element: 'button.primary',
    wcagCriteria: '1.4.3',
    wcagLevel: 'AA',
    severity: 'critical',
    description: 'Color contrast is insufficient',
    recommendation: 'Increase contrast ratio',
    codeSnippet: '<button class="primary-cta">Sign Up</button>',
    priority: 1,
  };

  describe('generateFix', () => {
    it('should generate fix for contrast violation', async () => {
      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix = await generateFix(request, mockViolation);

      expect(fix).toBeDefined();
      expect(fix.violationId).toBe('v1');
      expect(fix.status).toBe('generated');
      expect(fix.codeFix).toBeDefined();
      expect(fix.codeFix.original).toBeDefined();
      expect(fix.codeFix.fixed).toBeDefined();
      expect(fix.codeFix.explanation).toBeDefined();
      expect(fix.confidence).toBeGreaterThan(0);
      expect(fix.confidence).toBeLessThanOrEqual(1);
      expect(fix.instructions.length).toBeGreaterThan(0);
      expect(fix.filesAffected.length).toBeGreaterThan(0);
    });

    it('should generate fix for alt text violation', async () => {
      const altViolation: LegacyViolation = {
        ...mockViolation,
        id: 'v2',
        wcagCriteria: '1.1.1',
        description: 'Missing alt text',
        codeSnippet: '<img src="hero.jpg">',
      };

      const request: FixRequest = {
        violationId: 'v2',
        type: 'manual',
      };

      const fix = await generateFix(request, altViolation);

      expect(fix).toBeDefined();
      expect(fix.codeFix.fixed).toContain('alt=');
      expect(fix.estimatedEffort).toBe('5 minutes');
    });

    it('should calculate high confidence for violations with code snippets', async () => {
      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix = await generateFix(request, mockViolation);

      expect(fix.confidence).toBeGreaterThan(0.85);
    });

    it('should provide implementation instructions', async () => {
      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix = await generateFix(request, mockViolation);

      expect(fix.instructions).toBeDefined();
      expect(fix.instructions.length).toBeGreaterThan(0);
      expect(fix.instructions[0]).toContain('1.');
    });

    it('should handle unsupported WCAG criteria gracefully', async () => {
      const unsupportedViolation: LegacyViolation = {
        ...mockViolation,
        wcagCriteria: '9.9.9',
      };

      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix = await generateFix(request, unsupportedViolation);

      expect(fix).toBeDefined();
      expect(fix.status).toBe('generated');
      expect(fix.codeFix.explanation).toContain(unsupportedViolation.recommendation);
    });
  });

  describe('generateBatchFixes', () => {
    it('should generate fixes for multiple violations', async () => {
      const violations: LegacyViolation[] = [
        mockViolation,
        {
          ...mockViolation,
          id: 'v2',
          wcagCriteria: '1.1.1',
        },
        {
          ...mockViolation,
          id: 'v3',
          wcagCriteria: '2.1.1',
        },
      ];

      const fixes = await generateBatchFixes(violations);

      expect(fixes.length).toBe(3);
      expect(fixes[0].violationId).toBe('v1');
      expect(fixes[1].violationId).toBe('v2');
      expect(fixes[2].violationId).toBe('v3');
    });

    it('should handle empty violations array', async () => {
      const fixes = await generateBatchFixes([]);

      expect(fixes).toEqual([]);
    });

    it('should continue processing even if one fix fails', async () => {
      const violations: LegacyViolation[] = [
        mockViolation,
        {
          ...mockViolation,
          id: 'v2',
          wcagCriteria: '1.1.1',
        },
      ];

      const fixes = await generateBatchFixes(violations);

      expect(fixes.length).toBeGreaterThan(0);
    });
  });

  describe('Fix metadata', () => {
    it('should include generation timestamp', async () => {
      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix = await generateFix(request, mockViolation);

      expect(fix.generatedAt).toBeInstanceOf(Date);
      expect(fix.generatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include model information', async () => {
      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix = await generateFix(request, mockViolation);

      expect(fix.metadata).toBeDefined();
      expect(fix.metadata?.model).toBeDefined();
    });

    it('should include unique fix ID', async () => {
      const request: FixRequest = {
        violationId: 'v1',
        type: 'manual',
      };

      const fix1 = await generateFix(request, mockViolation);
      const fix2 = await generateFix(request, mockViolation);

      expect(fix1.id).toBeDefined();
      expect(fix2.id).toBeDefined();
      expect(fix1.id).not.toBe(fix2.id);
    });
  });
});
