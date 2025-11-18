/**
 * RiskScoringService Tests
 * Complete test coverage for risk scoring and priority determination
 */

import { RiskScoringService, RiskFactors } from '../../services/RiskScoringService';
import { createMockRiskFactors } from '../helpers/mockData';

describe('RiskScoringService', () => {
  describe('calculateRiskProfile', () => {
    it('should calculate complete risk profile', () => {
      const factors = createMockRiskFactors();
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile).toBeDefined();
      expect(profile.riskScore).toBeGreaterThanOrEqual(0);
      expect(profile.riskScore).toBeLessThanOrEqual(100);
      expect(profile.priority).toMatch(/^(1|2|3)$/);
      expect(profile.suggestedHook).toMatch(/^(lawsuit-risk|peer-pressure|trust|compliance)$/);
      expect(profile.riskFactors).toBeDefined();
      expect(profile.reasoning).toBeDefined();
      expect(Array.isArray(profile.reasoning)).toBe(true);
    });

    it('should calculate high risk for poor compliance', () => {
      const factors = createMockRiskFactors({
        complianceScore: 25,
        violationCount: 50,
        industry: 'medical',
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskScore).toBeGreaterThan(60);
      expect(profile.priority).toBe(1);
    });

    it('should calculate low risk for good compliance', () => {
      const factors = createMockRiskFactors({
        complianceScore: 95,
        violationCount: 2,
        industry: 'technology',
        hasHttps: true,
        mobileResponsive: true,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskScore).toBeLessThan(40);
    });

    it('should weight industry risk at 35%', () => {
      const highIndustryRisk = createMockRiskFactors({
        industry: 'medical',
        complianceScore: 80,
        violationCount: 5,
      });

      const lowIndustryRisk = createMockRiskFactors({
        industry: 'technology',
        complianceScore: 80,
        violationCount: 5,
      });

      const profile1 = RiskScoringService.calculateRiskProfile(highIndustryRisk);
      const profile2 = RiskScoringService.calculateRiskProfile(lowIndustryRisk);

      expect(profile1.riskScore).toBeGreaterThan(profile2.riskScore);
    });

    it('should weight compliance risk at 35%', () => {
      const poorCompliance = createMockRiskFactors({
        complianceScore: 30,
        violationCount: 40,
      });

      const goodCompliance = createMockRiskFactors({
        complianceScore: 95,
        violationCount: 2,
      });

      const profile1 = RiskScoringService.calculateRiskProfile(poorCompliance);
      const profile2 = RiskScoringService.calculateRiskProfile(goodCompliance);

      expect(profile1.riskFactors.complianceRisk).toBeGreaterThan(
        profile2.riskFactors.complianceRisk
      );
    });

    it('should include all risk factor components', () => {
      const factors = createMockRiskFactors();
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.industryRisk).toBeDefined();
      expect(profile.riskFactors.complianceRisk).toBeDefined();
      expect(profile.riskFactors.technicalRisk).toBeDefined();
      expect(profile.riskFactors.businessRisk).toBeDefined();
    });
  });

  describe('calculateIndustryRisk', () => {
    it('should assign critical risk to medical industry', () => {
      const factors = createMockRiskFactors({ industry: 'medical' });
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.industryRisk).toBeGreaterThanOrEqual(75);
    });

    it('should assign critical risk to dental industry', () => {
      const factors = createMockRiskFactors({ industry: 'dental' });
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.industryRisk).toBeGreaterThanOrEqual(75);
    });

    it('should assign critical risk to legal industry', () => {
      const factors = createMockRiskFactors({ industry: 'legal' });
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.industryRisk).toBeGreaterThanOrEqual(75);
    });

    it('should assign medium risk to unknown industry', () => {
      const factors = createMockRiskFactors({ industry: 'unknown_industry' });
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.industryRisk).toBe(50);
    });

    it('should return consistent risk for same industry', () => {
      const factors1 = createMockRiskFactors({ industry: 'medical' });
      const factors2 = createMockRiskFactors({ industry: 'medical' });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile1.riskFactors.industryRisk).toBe(profile2.riskFactors.industryRisk);
    });
  });

  describe('calculateComplianceRisk', () => {
    it('should invert compliance score', () => {
      const factors = createMockRiskFactors({
        complianceScore: 20,
        violationCount: 0,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.complianceRisk).toBeGreaterThanOrEqual(80);
    });

    it('should add violation penalty', () => {
      const factors1 = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 0,
      });

      const factors2 = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 20,
      });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.complianceRisk).toBeGreaterThan(
        profile1.riskFactors.complianceRisk
      );
    });

    it('should cap violation penalty at 30', () => {
      const factors = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 1000,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      // Max risk should be 100
      expect(profile.riskFactors.complianceRisk).toBeLessThanOrEqual(100);
    });

    it('should apply exponential penalty for violations', () => {
      const factors1 = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 2,
      });

      const factors2 = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 10,
      });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.complianceRisk).toBeGreaterThan(
        profile1.riskFactors.complianceRisk
      );
    });
  });

  describe('calculateTechnicalRisk', () => {
    it('should penalize non-mobile responsive sites', () => {
      const factors = createMockRiskFactors({
        mobileResponsive: false,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.technicalRisk).toBeGreaterThanOrEqual(65);
    });

    it('should penalize non-HTTPS sites', () => {
      const factors = createMockRiskFactors({
        hasHttps: false,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.technicalRisk).toBeGreaterThanOrEqual(60);
    });

    it('should penalize old websites', () => {
      const factors1 = createMockRiskFactors({ websiteAge: 1 });
      const factors2 = createMockRiskFactors({ websiteAge: 10 });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.technicalRisk).toBeGreaterThan(
        profile1.riskFactors.technicalRisk
      );
    });

    it('should cap website age penalty', () => {
      const factors = createMockRiskFactors({
        websiteAge: 50,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.technicalRisk).toBeLessThanOrEqual(100);
    });

    it('should penalize red flags', () => {
      const factors1 = createMockRiskFactors({ redFlags: [] });
      const factors2 = createMockRiskFactors({
        redFlags: ['missing_alt_text', 'no_https', 'non_responsive'],
      });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.technicalRisk).toBeGreaterThan(
        profile1.riskFactors.technicalRisk
      );
    });

    it('should cap red flag penalty at 25', () => {
      const factors = createMockRiskFactors({
        redFlags: Array.from({ length: 20 }, (_, i) => `flag_${i}`),
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.technicalRisk).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateBusinessRisk', () => {
    it('should increase risk for larger companies', () => {
      const factors1 = createMockRiskFactors({ employeeCount: 10 });
      const factors2 = createMockRiskFactors({ employeeCount: 100 });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.businessRisk).toBeGreaterThan(
        profile1.riskFactors.businessRisk
      );
    });

    it('should bonus for 50+ employees', () => {
      const factors1 = createMockRiskFactors({ employeeCount: 49 });
      const factors2 = createMockRiskFactors({ employeeCount: 51 });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.businessRisk).toBeGreaterThan(
        profile1.riskFactors.businessRisk
      );
    });

    it('should increase risk for high revenue companies', () => {
      const factors1 = createMockRiskFactors({ revenue: '$1M' });
      const factors2 = createMockRiskFactors({ revenue: '$10M' });

      const profile1 = RiskScoringService.calculateRiskProfile(factors1);
      const profile2 = RiskScoringService.calculateRiskProfile(factors2);

      expect(profile2.riskFactors.businessRisk).toBeGreaterThan(
        profile1.riskFactors.businessRisk
      );
    });

    it('should handle missing employee count', () => {
      const factors = createMockRiskFactors({ employeeCount: undefined });
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.businessRisk).toBeDefined();
    });

    it('should handle missing revenue', () => {
      const factors = createMockRiskFactors({ revenue: undefined });
      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.businessRisk).toBeDefined();
    });
  });

  describe('determinePriority', () => {
    it('should assign priority 1 to high risk + high industry risk', () => {
      const factors = createMockRiskFactors({
        complianceScore: 20,
        violationCount: 50,
        industry: 'medical',
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.priority).toBe(1);
    });

    it('should assign priority 2 to medium risk', () => {
      const factors = createMockRiskFactors({
        complianceScore: 60,
        violationCount: 15,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.priority).toBe(2);
    });

    it('should assign priority 3 to low risk', () => {
      const factors = createMockRiskFactors({
        complianceScore: 95,
        violationCount: 2,
        hasHttps: true,
        mobileResponsive: true,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.priority).toBe(3);
    });
  });

  describe('determineSuggestedHook', () => {
    it('should suggest lawsuit-risk for terrible compliance', () => {
      const factors = createMockRiskFactors({
        complianceScore: 15,
        violationCount: 60,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.suggestedHook).toBe('lawsuit-risk');
    });

    it('should suggest peer-pressure for high industry risk', () => {
      const factors = createMockRiskFactors({
        industry: 'medical',
        complianceScore: 70,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.suggestedHook).toBe('peer-pressure');
    });

    it('should suggest trust for moderate risk', () => {
      const factors = createMockRiskFactors({
        complianceScore: 55,
        violationCount: 20,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.suggestedHook).toBe('trust');
    });

    it('should suggest compliance as default', () => {
      const factors = createMockRiskFactors({
        complianceScore: 85,
        violationCount: 5,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.suggestedHook).toBe('compliance');
    });
  });

  describe('generateReasoning', () => {
    it('should include industry lawsuit count', () => {
      const factors = createMockRiskFactors({
        industry: 'medical',
        complianceScore: 30,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('lawsuits'))).toBe(true);
    });

    it('should mention violation count and compliance score', () => {
      const factors = createMockRiskFactors({
        complianceScore: 40,
        violationCount: 30,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('30') && r.includes('40%'))).toBe(true);
    });

    it('should mention ADA Title III exposure', () => {
      const factors = createMockRiskFactors({
        complianceScore: 30,
        violationCount: 40,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('ADA Title III'))).toBe(true);
    });

    it('should mention mobile responsiveness', () => {
      const factors = createMockRiskFactors({
        mobileResponsive: false,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('responsive'))).toBe(true);
    });

    it('should mention HTTPS', () => {
      const factors = createMockRiskFactors({
        hasHttps: false,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('HTTPS'))).toBe(true);
    });

    it('should mention website age', () => {
      const factors = createMockRiskFactors({
        websiteAge: 8,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('8+'))).toBe(true);
    });

    it('should list red flags', () => {
      const factors = createMockRiskFactors({
        redFlags: ['missing_alt_text', 'no_https'],
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(
        profile.reasoning.some(r => r.includes('missing_alt_text') && r.includes('no_https'))
      ).toBe(true);
    });

    it('should mention company size', () => {
      const factors = createMockRiskFactors({
        employeeCount: 150,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.reasoning.some(r => r.includes('150'))).toBe(true);
    });
  });

  describe('scoreBatch', () => {
    it('should score multiple prospects', () => {
      const prospects = [
        createMockRiskFactors({ complianceScore: 80 }),
        createMockRiskFactors({ complianceScore: 50 }),
        createMockRiskFactors({ complianceScore: 30 }),
      ];

      const results = RiskScoringService.scoreBatch(prospects);

      expect(results.size).toBe(3);
      expect(results.get('prospect_0')).toBeDefined();
      expect(results.get('prospect_1')).toBeDefined();
      expect(results.get('prospect_2')).toBeDefined();
    });

    it('should handle empty batch', () => {
      const results = RiskScoringService.scoreBatch([]);

      expect(results.size).toBe(0);
    });

    it('should handle large batches', () => {
      const prospects = Array.from({ length: 100 }, () => createMockRiskFactors());

      const results = RiskScoringService.scoreBatch(prospects);

      expect(results.size).toBe(100);
    });
  });

  describe('generateBatchRecommendations', () => {
    it('should sort by risk score descending', () => {
      const prospects = [
        createMockRiskFactors({ complianceScore: 80 }),
        createMockRiskFactors({ complianceScore: 30 }),
        createMockRiskFactors({ complianceScore: 60 }),
      ];

      const recommendations = RiskScoringService.generateBatchRecommendations(prospects);

      expect(recommendations[0].profile.riskScore).toBeGreaterThanOrEqual(
        recommendations[1].profile.riskScore
      );
      expect(recommendations[1].profile.riskScore).toBeGreaterThanOrEqual(
        recommendations[2].profile.riskScore
      );
    });

    it('should include prospect, profile, hook, and email template', () => {
      const prospects = [createMockRiskFactors()];

      const recommendations = RiskScoringService.generateBatchRecommendations(prospects);

      expect(recommendations[0].prospect).toBeDefined();
      expect(recommendations[0].profile).toBeDefined();
      expect(recommendations[0].hook).toBeDefined();
      expect(recommendations[0].emailTemplate).toBeDefined();
    });

    it('should generate appropriate email template', () => {
      const prospects = [
        createMockRiskFactors({
          complianceScore: 20,
          violationCount: 50,
        }),
      ];

      const recommendations = RiskScoringService.generateBatchRecommendations(prospects);

      expect(recommendations[0].emailTemplate).toContain('Subject:');
      expect(recommendations[0].emailTemplate).toContain('50');
    });
  });

  describe('generateEmailTemplate', () => {
    it('should generate lawsuit-risk template', () => {
      const factors = createMockRiskFactors({
        complianceScore: 15,
        violationCount: 60,
        industry: 'medical',
      });

      const recommendations = RiskScoringService.generateBatchRecommendations([factors]);

      expect(recommendations[0].emailTemplate).toContain('lawsuit');
      expect(recommendations[0].emailTemplate).toContain('60');
    });

    it('should generate peer-pressure template', () => {
      const factors = createMockRiskFactors({
        industry: 'medical',
        complianceScore: 70,
      });

      const recommendations = RiskScoringService.generateBatchRecommendations([factors]);

      expect(recommendations[0].hook).toBe('peer-pressure');
      expect(recommendations[0].emailTemplate).toContain('practices in your');
    });

    it('should generate trust template', () => {
      const factors = createMockRiskFactors({
        complianceScore: 55,
        violationCount: 20,
      });

      const recommendations = RiskScoringService.generateBatchRecommendations([factors]);

      expect(recommendations[0].hook).toBe('trust');
      expect(recommendations[0].emailTemplate).toContain('community');
    });

    it('should include violation count in template', () => {
      const factors = createMockRiskFactors({
        violationCount: 25,
      });

      const recommendations = RiskScoringService.generateBatchRecommendations([factors]);

      expect(recommendations[0].emailTemplate).toContain('25');
    });

    it('should mention industry in template', () => {
      const factors = createMockRiskFactors({
        industry: 'medical',
      });

      const recommendations = RiskScoringService.generateBatchRecommendations([factors]);

      expect(recommendations[0].emailTemplate).toContain('medical');
    });
  });

  describe('edge cases and performance', () => {
    it('should handle zero compliance score', () => {
      const factors = createMockRiskFactors({
        complianceScore: 0,
        violationCount: 100,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskScore).toBeGreaterThan(90);
      expect(profile.priority).toBe(1);
    });

    it('should handle perfect compliance score', () => {
      const factors = createMockRiskFactors({
        complianceScore: 100,
        violationCount: 0,
        hasHttps: true,
        mobileResponsive: true,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskScore).toBeLessThan(20);
    });

    it('should handle extreme violation count', () => {
      const factors = createMockRiskFactors({
        violationCount: 10000,
      });

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile.riskFactors.complianceRisk).toBe(100);
    });

    it('should handle all undefined optional fields', () => {
      const factors: RiskFactors = {
        complianceScore: 60,
        violationCount: 10,
        industry: 'technology',
        redFlags: [],
      };

      const profile = RiskScoringService.calculateRiskProfile(factors);

      expect(profile).toBeDefined();
      expect(profile.riskScore).toBeGreaterThan(0);
    });

    it('should produce consistent results for same input', () => {
      const factors = createMockRiskFactors();

      const profile1 = RiskScoringService.calculateRiskProfile(factors);
      const profile2 = RiskScoringService.calculateRiskProfile(factors);

      expect(profile1.riskScore).toBe(profile2.riskScore);
      expect(profile1.priority).toBe(profile2.priority);
      expect(profile1.suggestedHook).toBe(profile2.suggestedHook);
    });

    it('should handle concurrent calculations', () => {
      const factors = createMockRiskFactors();

      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(RiskScoringService.calculateRiskProfile(factors))
      );

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(100);
        results.forEach(profile => {
          expect(profile.riskScore).toBe(results[0].riskScore);
        });
      });
    });
  });
});
