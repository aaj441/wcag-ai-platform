/**
 * RemediationEngine Tests
 * Complete test coverage for accessibility fix generation
 */

import { RemediationEngine, FixRequest } from '../../services/RemediationEngine';
import { createMockFixRequest, createMockPrismaClient } from '../helpers/mockData';

// Mock AIService
jest.mock('../../services/AIService', () => ({
  aiService: {
    generateFix: jest.fn(),
  },
}));

import { aiService } from '../../services/AIService';
const mockAIService = aiService as jest.Mocked<typeof aiService>;

// Mock prisma
const mockPrisma = createMockPrismaClient();
jest.mock('../../lib/db', () => ({
  prisma: mockPrisma,
}));

describe('RemediationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFix', () => {
    it('should generate fix using AI when no template exists', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: '<img src="/logo.png" alt="Company Logo">',
        explanation: 'Added descriptive alt text',
        confidence: 0.92,
      });

      const request = createMockFixRequest();
      const fix = await RemediationEngine.generateFix(request);

      expect(fix).toBeDefined();
      expect(fix.fixedCode).toContain('alt=');
      expect(fix.explanation).toBeTruthy();
      expect(fix.confidenceScore).toBeGreaterThan(0.7);
    });

    it('should use template when available', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue({
        id: 'template_1',
        wcagCriteria: '1.1.1',
        issueType: 'missing_alt_text',
        description: 'Add alt text to image',
        templates: {
          html: '<img src="{selector}" alt="Descriptive text">',
        },
        isActive: true,
      });

      const request = createMockFixRequest({
        elementSelector: 'img.logo',
      });

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.fixedCode).toBeDefined();
      expect(fix.confidenceScore).toBe(0.9);
      expect(mockAIService.generateFix).not.toHaveBeenCalled();
    });

    it('should handle HTML code language', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: '<label for="email">Email:</label><input type="email" id="email">',
        explanation: 'Added label',
        confidence: 0.95,
      });

      const request = createMockFixRequest({
        codeLanguage: 'html',
        issueType: 'missing_form_label',
      });

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.codeLanguage).toBe('html');
    });

    it('should handle CSS code language', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: 'color: #000; background: #fff;',
        explanation: 'Improved contrast ratio',
        confidence: 0.88,
      });

      const request = createMockFixRequest({
        codeLanguage: 'css',
        wcagCriteria: '1.4.3',
        issueType: 'low_contrast',
      });

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.codeLanguage).toBe('css');
    });

    it('should default to html when language not specified', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: '<div>Fixed</div>',
        explanation: 'Fixed issue',
        confidence: 0.9,
      });

      const request: FixRequest = {
        ...createMockFixRequest(),
        codeLanguage: undefined,
      };

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.codeLanguage).toBe('html');
    });

    it('should interpolate template variables', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue({
        id: 'template_1',
        wcagCriteria: '1.1.1',
        issueType: 'missing_alt_text',
        description: 'Description: {description}',
        templates: {
          html: '<img class="{selector}" alt="{description}">',
        },
        isActive: true,
      });

      const request = createMockFixRequest({
        elementSelector: 'logo-image',
        description: 'Company branding logo',
      });

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.fixedCode).toContain('logo-image');
      expect(fix.fixedCode).toContain('Company branding logo');
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.fixTemplate.findFirst.mockRejectedValue(new Error('Database error'));

      const request = createMockFixRequest();

      await expect(RemediationEngine.generateFix(request)).rejects.toThrow();
    });

    it('should pass all request fields to AI service', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: 'fixed',
        explanation: 'explanation',
        confidence: 0.9,
      });

      const request = createMockFixRequest({
        violationId: 'v_123',
        wcagCriteria: '2.4.4',
        issueType: 'missing_link_text',
        description: 'Link has no accessible text',
        elementSelector: 'a.nav-link',
        codeSnippet: '<a href="/page" class="nav-link"></a>',
        pageContext: 'Navigation menu',
      });

      await RemediationEngine.generateFix(request);

      expect(mockAIService.generateFix).toHaveBeenCalledWith(
        expect.objectContaining({
          violationId: 'v_123',
          wcagCriteria: '2.4.4',
          issueType: 'missing_link_text',
          description: 'Link has no accessible text',
          elementSelector: 'a.nav-link',
          codeSnippet: '<a href="/page" class="nav-link"></a>',
          pageContext: 'Navigation menu',
        })
      );
    });
  });

  describe('saveFix', () => {
    it('should save fix to database', async () => {
      mockPrisma.fix.create.mockResolvedValue({
        id: 'fix_123',
        tenantId: 'tenant_1',
        violationId: 'v_1',
      } as any);

      const fix = {
        wcagCriteria: '1.1.1',
        issueType: 'missing_alt_text',
        originalCode: '<img src="/test.png">',
        fixedCode: '<img src="/test.png" alt="Test image">',
        explanation: 'Added alt text',
        confidenceScore: 0.95,
        codeLanguage: 'html',
      };

      const saved = await RemediationEngine.saveFix('tenant_1', 'v_1', fix);

      expect(mockPrisma.fix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant_1',
            violationId: 'v_1',
            wcagCriteria: '1.1.1',
            fixedCode: fix.fixedCode,
            confidenceScore: 0.95,
          }),
        })
      );

      expect(saved).toBeDefined();
    });

    it('should set review status to approved for high confidence', async () => {
      mockPrisma.fix.create.mockResolvedValue({ id: 'fix_1' } as any);

      const fix = {
        wcagCriteria: '1.1.1',
        issueType: 'test',
        fixedCode: 'fixed',
        explanation: 'explanation',
        confidenceScore: 0.95,
        codeLanguage: 'html',
      };

      await RemediationEngine.saveFix('tenant_1', 'v_1', fix);

      expect(mockPrisma.fix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewStatus: 'approved',
          }),
        })
      );
    });

    it('should set review status to pending for low confidence', async () => {
      mockPrisma.fix.create.mockResolvedValue({ id: 'fix_1' } as any);

      const fix = {
        wcagCriteria: '1.1.1',
        issueType: 'test',
        fixedCode: 'fixed',
        explanation: 'explanation',
        confidenceScore: 0.75,
        codeLanguage: 'html',
      };

      await RemediationEngine.saveFix('tenant_1', 'v_1', fix);

      expect(mockPrisma.fix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewStatus: 'pending',
          }),
        })
      );
    });
  });

  describe('getFixMetrics', () => {
    it('should calculate fix metrics', async () => {
      mockPrisma.fix.findMany.mockResolvedValue([
        {
          id: '1',
          confidenceScore: 0.9,
          reviewStatus: 'approved',
          generationCost: 0.01,
        },
        {
          id: '2',
          confidenceScore: 0.8,
          reviewStatus: 'approved',
          generationCost: 0.015,
        },
        {
          id: '3',
          confidenceScore: 0.7,
          reviewStatus: 'pending',
          generationCost: 0.012,
        },
      ] as any);

      mockPrisma.fixApplication.findMany.mockResolvedValue([
        { id: '1', success: true, verificationStatus: 'verified' },
        { id: '2', success: true, verificationStatus: 'verified' },
        { id: '3', success: false, verificationStatus: 'failed' },
      ] as any);

      const metrics = await RemediationEngine.getFixMetrics('tenant_1');

      expect(metrics.totalFixes).toBe(3);
      expect(metrics.approvedFixes).toBe(2);
      expect(metrics.averageConfidence).toBe('0.80');
      expect(metrics.totalApplications).toBe(3);
      expect(metrics.successfulApplications).toBe(2);
      expect(metrics.successRate).toBe('66.7%');
    });

    it('should handle zero fixes', async () => {
      mockPrisma.fix.findMany.mockResolvedValue([]);
      mockPrisma.fixApplication.findMany.mockResolvedValue([]);

      const metrics = await RemediationEngine.getFixMetrics('tenant_1');

      expect(metrics.totalFixes).toBe(0);
      expect(metrics.averageConfidence).toBe('0.00');
      expect(metrics.successRate).toBe('0%');
    });

    it('should calculate total generation cost', async () => {
      mockPrisma.fix.findMany.mockResolvedValue([
        { confidenceScore: 0.9, reviewStatus: 'approved', generationCost: 0.05 },
        { confidenceScore: 0.9, reviewStatus: 'approved', generationCost: 0.03 },
      ] as any);

      mockPrisma.fixApplication.findMany.mockResolvedValue([]);

      const metrics = await RemediationEngine.getFixMetrics('tenant_1');

      expect(metrics.totalGenerationCost).toBe('0.08');
    });
  });

  describe('getFixPatterns', () => {
    it('should return active fix templates ordered by usage', async () => {
      mockPrisma.fixTemplate.findMany.mockResolvedValue([
        {
          id: '1',
          wcagCriteria: '1.1.1',
          issueType: 'missing_alt_text',
          usageCount: 100,
          isActive: true,
        },
        {
          id: '2',
          wcagCriteria: '1.4.3',
          issueType: 'low_contrast',
          usageCount: 75,
          isActive: true,
        },
      ] as any);

      const patterns = await RemediationEngine.getFixPatterns();

      expect(patterns).toHaveLength(2);
      expect(mockPrisma.fixTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { usageCount: 'desc' },
          take: 20,
        })
      );
    });

    it('should limit to 20 patterns', async () => {
      mockPrisma.fixTemplate.findMany.mockResolvedValue([]);

      await RemediationEngine.getFixPatterns();

      expect(mockPrisma.fixTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing code snippet', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: 'fixed',
        explanation: 'explanation',
        confidence: 0.9,
      });

      const request: FixRequest = {
        ...createMockFixRequest(),
        codeSnippet: undefined,
      };

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.originalCode).toBeUndefined();
    });

    it('should handle very long code snippets', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: 'fixed',
        explanation: 'explanation',
        confidence: 0.9,
      });

      const longCode = '<div>' + 'x'.repeat(10000) + '</div>';
      const request = createMockFixRequest({
        codeSnippet: longCode,
      });

      const fix = await RemediationEngine.generateFix(request);

      expect(fix).toBeDefined();
    });

    it('should handle concurrent fix generation', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockResolvedValue({
        fixedCode: 'fixed',
        explanation: 'explanation',
        confidence: 0.9,
      });

      const requests = Array.from({ length: 10 }, () => createMockFixRequest());

      const fixes = await Promise.all(requests.map(r => RemediationEngine.generateFix(r)));

      expect(fixes).toHaveLength(10);
      fixes.forEach(fix => {
        expect(fix).toBeDefined();
        expect(fix.fixedCode).toBeTruthy();
      });
    });

    it('should handle AI service errors', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue(null);
      mockAIService.generateFix.mockRejectedValue(new Error('AI service unavailable'));

      const request = createMockFixRequest();

      await expect(RemediationEngine.generateFix(request)).rejects.toThrow();
    });

    it('should handle missing element selector', async () => {
      mockPrisma.fixTemplate.findFirst.mockResolvedValue({
        templates: { html: 'Element: {selector}' },
      } as any);

      const request: FixRequest = {
        ...createMockFixRequest(),
        elementSelector: undefined,
      };

      const fix = await RemediationEngine.generateFix(request);

      expect(fix.fixedCode).toContain('element');
    });
  });
});
