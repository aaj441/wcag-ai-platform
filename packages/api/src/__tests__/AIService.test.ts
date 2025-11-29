/**
 * AI Service Tests
 * 
 * Tests for AI-powered WCAG fix generation
 */

import { aiService, AIFixRequest } from '../services/AIService';

describe('AIService', () => {
  describe('generateFix', () => {
    it('should generate fix for missing alt text', async () => {
      const request: AIFixRequest = {
        violationId: 'v1',
        wcagCriteria: '1.1.1',
        issueType: 'missing_alt_text',
        description: 'Image missing alt text',
        codeSnippet: '<img src="/logo.png">',
        elementSelector: 'img',
      };

      const fix = await aiService.generateFix(request);

      expect(fix).toBeDefined();
      expect(fix.fixedCode).toContain('alt=');
      expect(fix.confidence).toBeGreaterThan(0.7);
      expect(fix.explanation).toBeTruthy();
    });

    it('should generate fix for low contrast', async () => {
      const request: AIFixRequest = {
        violationId: 'v2',
        wcagCriteria: '1.4.3',
        issueType: 'low_contrast',
        description: 'Insufficient color contrast',
        codeSnippet: 'color: #999999; background: #f5f5f5;',
        elementSelector: 'p',
      };

      const fix = await aiService.generateFix(request);

      expect(fix).toBeDefined();
      expect(fix.fixedCode).toBeTruthy();
      expect(fix.confidence).toBeGreaterThan(0.7);
    });

    it('should generate fix for missing form label', async () => {
      const request: AIFixRequest = {
        violationId: 'v3',
        wcagCriteria: '1.3.1',
        issueType: 'missing_form_label',
        description: 'Form input missing label',
        codeSnippet: '<input type="email" placeholder="Enter email">',
        elementSelector: 'input[type="email"]',
      };

      const fix = await aiService.generateFix(request);

      expect(fix).toBeDefined();
      expect(fix.fixedCode).toContain('label');
      expect(fix.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('generateBatchFixes', () => {
    it('should generate multiple fixes in batch', async () => {
      const requests: AIFixRequest[] = [
        {
          violationId: 'v1',
          wcagCriteria: '1.1.1',
          issueType: 'missing_alt_text',
          description: 'Image missing alt text',
          codeSnippet: '<img src="/logo.png">',
        },
        {
          violationId: 'v2',
          wcagCriteria: '1.4.3',
          issueType: 'low_contrast',
          description: 'Insufficient color contrast',
          codeSnippet: 'color: #999999;',
        },
      ];

      const fixes = await aiService.generateBatchFixes(requests);

      expect(fixes).toHaveLength(2);
      expect(fixes[0].fixedCode).toBeTruthy();
      expect(fixes[1].fixedCode).toBeTruthy();
    });
  });

  describe('validateFix', () => {
    it('should validate alt text fix', async () => {
      const original = '<img src="/logo.png">';
      const fixed = '<img src="/logo.png" alt="Company logo">';

      const result = await aiService.validateFix(original, fixed, '1.1.1');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect unchanged code', async () => {
      const original = '<img src="/logo.png">';
      const fixed = '<img src="/logo.png">';

      const result = await aiService.validateFix(original, fixed, '1.1.1');

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect missing alt attribute for image fix', async () => {
      const original = '<img src="/logo.png">';
      const fixed = '<img src="/logo.png" title="Logo">';

      const result = await aiService.validateFix(original, fixed, '1.1.1');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Alt attribute missing for image accessibility');
    });
  });
});
