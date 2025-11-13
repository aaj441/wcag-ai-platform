/**
 * Unit Tests for Keyword Extraction Service
 */

import { describe, it, expect } from '@jest/globals';
import {
  extractKeywordsFromViolation,
  extractKeywordsFromViolations,
  autoTagDraft,
  generateTemplatePlaceholders,
  applyTemplateSubstitution,
  WCAG_KEYWORDS,
} from '../services/keywordExtractor';
import { LegacyViolation } from '../types';

describe('Keyword Extraction Service', () => {
  const mockViolation: LegacyViolation = {
    id: 'test1',
    url: 'https://example.com',
    pageTitle: 'Test Page',
    element: 'button.primary',
    wcagCriteria: '1.4.3',
    wcagLevel: 'AA',
    severity: 'critical',
    description: 'Color contrast is insufficient for text readability',
    recommendation: 'Increase contrast ratio',
    priority: 1,
  };

  describe('extractKeywordsFromViolation', () => {
    it('should extract WCAG criterion keywords', () => {
      const keywords = extractKeywordsFromViolation(mockViolation);
      const wcagKeywords = WCAG_KEYWORDS['1.4.3'];
      
      wcagKeywords.forEach(kw => {
        expect(keywords).toContain(kw);
      });
    });

    it('should extract severity as keyword', () => {
      const keywords = extractKeywordsFromViolation(mockViolation);
      expect(keywords).toContain('critical');
    });

    it('should extract WCAG level as keyword', () => {
      const keywords = extractKeywordsFromViolation(mockViolation);
      expect(keywords).toContain('WCAG AA');
    });

    it('should extract accessibility terms from description', () => {
      const keywords = extractKeywordsFromViolation(mockViolation);
      expect(keywords).toContain('contrast');
      expect(keywords).toContain('color');
    });
  });

  describe('extractKeywordsFromViolations', () => {
    it('should combine keywords from multiple violations', () => {
      const violation2: LegacyViolation = {
        ...mockViolation,
        id: 'test2',
        wcagCriteria: '1.1.1',
        description: 'Missing alt text for images',
      };

      const keywords = extractKeywordsFromViolations([mockViolation, violation2]);
      
      expect(keywords).toContain('color contrast');
      expect(keywords).toContain('alt text');
      expect(keywords.length).toBeGreaterThan(5);
    });

    it('should deduplicate keywords', () => {
      const keywords = extractKeywordsFromViolations([mockViolation, mockViolation]);
      const uniqueKeywords = new Set(keywords);
      
      expect(keywords.length).toBe(uniqueKeywords.size);
    });

    it('should return empty array for no violations', () => {
      const keywords = extractKeywordsFromViolations([]);
      expect(keywords).toEqual([]);
    });
  });

  describe('autoTagDraft', () => {
    it('should extract keywords from violations', () => {
      const result = autoTagDraft([mockViolation], 'Test email body');
      
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords).toContain('color contrast');
    });

    it('should detect critical violations', () => {
      const result = autoTagDraft([mockViolation], 'Test email');
      
      expect(result.containsCritical).toBe(true);
    });

    it('should not detect critical when none exist', () => {
      const nonCritical: LegacyViolation = {
        ...mockViolation,
        severity: 'low',
      };
      const result = autoTagDraft([nonCritical], 'Test email');
      
      expect(result.containsCritical).toBe(false);
    });
  });

  describe('generateTemplatePlaceholders', () => {
    it('should generate correct placeholder values', () => {
      const placeholders = generateTemplatePlaceholders([mockViolation]);
      
      expect(placeholders['{{violation_count}}']).toBe('1');
      expect(placeholders['{{critical_count}}']).toBe('1');
      expect(placeholders['{{wcag_criterion}}']).toBe('1.4.3');
      expect(placeholders['{{severity_level}}']).toBe('critical');
    });

    it('should return empty object for no violations', () => {
      const placeholders = generateTemplatePlaceholders([]);
      
      expect(placeholders).toEqual({});
    });
  });

  describe('applyTemplateSubstitution', () => {
    it('should replace all placeholders in template', () => {
      const template = 'Found {{violation_count}} issues, {{critical_count}} critical';
      const result = applyTemplateSubstitution(template, [mockViolation]);
      
      expect(result).toContain('Found 1 issues');
      expect(result).toContain('1 critical');
      expect(result).not.toContain('{{');
    });

    it('should handle templates with no placeholders', () => {
      const template = 'No placeholders here';
      const result = applyTemplateSubstitution(template, [mockViolation]);
      
      expect(result).toBe(template);
    });
  });
});
