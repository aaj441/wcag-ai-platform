/**
 * Risk Scoring Service
 * Calculates lawsuit probability and priority scoring
 */

import { log } from '../utils/logger';
import { INDUSTRY_VERTICALS } from '../data/nationalMetros';

export interface RiskFactors {
  complianceScore: number; // 0-100
  violationCount: number;
  industry: string;
  employeeCount?: number;
  revenue?: string;
  redFlags: string[];
  websiteAge?: number; // years
  hasHttps?: boolean;
  mobileResponsive?: boolean;
}

export interface RiskProfile {
  riskScore: number; // 1-100
  priority: 1 | 2 | 3;
  suggestedHook: 'lawsuit-risk' | 'peer-pressure' | 'trust' | 'compliance';
  riskFactors: {
    industryRisk: number; // 0-100
    complianceRisk: number; // 0-100
    technicalRisk: number; // 0-100
    businessRisk: number; // 0-100
  };
  reasoning: string[];
}

export class RiskScoringService {
  /**
   * Calculate complete risk profile
   */
  static calculateRiskProfile(factors: RiskFactors): RiskProfile {
    const industryRisk = this.calculateIndustryRisk(factors.industry);
    const complianceRisk = this.calculateComplianceRisk(factors.complianceScore, factors.violationCount);
    const technicalRisk = this.calculateTechnicalRisk(factors);
    const businessRisk = this.calculateBusinessRisk(factors);

    // Weighted risk calculation
    const riskScore = Math.round(
      (industryRisk * 0.35) +
      (complianceRisk * 0.35) +
      (technicalRisk * 0.20) +
      (businessRisk * 0.10)
    );

    const priority = this.determinePriority(riskScore, industryRisk);
    const suggestedHook = this.determineSuggestedHook(riskScore, industryRisk, complianceRisk);
    const reasoning = this.generateReasoning(factors, industryRisk, complianceRisk, technicalRisk, businessRisk);

    return {
      riskScore,
      priority,
      suggestedHook,
      riskFactors: {
        industryRisk,
        complianceRisk,
        technicalRisk,
        businessRisk,
      },
      reasoning,
    };
  }

  /**
   * Calculate industry-specific risk (0-100)
   * Medical/Dental/Legal are highest risk
   */
  private static calculateIndustryRisk(industry: string): number {
    const industryProfile = INDUSTRY_VERTICALS.find(i => i.verticalId === industry);
    if (!industryProfile) return 50; // Default medium risk

    const riskLevelMap: { [key: string]: number } = {
      critical: 90,
      high: 75,
      medium: 50,
      low: 25,
    };

    return riskLevelMap[industryProfile.adaRiskLevel] ?? 50;
  }

  /**
   * Calculate compliance risk based on scan results
   */
  private static calculateComplianceRisk(complianceScore: number, violationCount: number): number {
    // Lower compliance score = higher risk
    let complianceRisk = (100 - complianceScore);

    // More violations = higher risk (exponential penalty)
    const violationPenalty = Math.min(30, Math.floor(violationCount / 2));

    return Math.min(100, complianceRisk + violationPenalty);
  }

  /**
   * Calculate technical/website risk
   */
  private static calculateTechnicalRisk(factors: RiskFactors): number {
    let technicalRisk = 50; // Base

    // Mobile responsiveness
    if (factors.mobileResponsive === false) {
      technicalRisk += 15;
    }

    // HTTPS
    if (factors.hasHttps === false) {
      technicalRisk += 10;
    }

    // Old website
    if (factors.websiteAge && factors.websiteAge > 5) {
      technicalRisk += Math.min(20, factors.websiteAge * 2);
    }

    // Red flags
    const redFlagPenalty = factors.redFlags.length * 5;
    technicalRisk += Math.min(25, redFlagPenalty);

    return Math.min(100, technicalRisk);
  }

  /**
   * Calculate business/lawsuit risk
   */
  private static calculateBusinessRisk(factors: RiskFactors): number {
    let businessRisk = 50; // Base

    // Larger companies = higher exposure
    if (factors.employeeCount) {
      if (factors.employeeCount > 50) {
        businessRisk += 20;
      } else if (factors.employeeCount > 20) {
        businessRisk += 10;
      }
    }

    // Higher revenue = higher target value
    if (factors.revenue) {
      if (factors.revenue.includes('$10M') || factors.revenue.includes('$50M')) {
        businessRisk += 15;
      } else if (factors.revenue.includes('$5M')) {
        businessRisk += 10;
      }
    }

    return Math.min(100, businessRisk);
  }

  /**
   * Determine priority tier (1 = highest priority)
   */
  private static determinePriority(riskScore: number, industryRisk: number): 1 | 2 | 3 {
    // Priority 1: High risk + high industry risk + poor compliance
    if (riskScore >= 75 && industryRisk >= 75) {
      return 1;
    }

    // Priority 2: Medium risk
    if (riskScore >= 55) {
      return 2;
    }

    // Priority 3: Low risk
    return 3;
  }

  /**
   * Determine suggested outreach hook
   */
  private static determineSuggestedHook(
    riskScore: number,
    industryRisk: number,
    complianceRisk: number
  ): 'lawsuit-risk' | 'peer-pressure' | 'trust' | 'compliance' {
    // If compliance is terrible, emphasize lawsuit risk
    if (complianceRisk >= 80) {
      return 'lawsuit-risk';
    }

    // If industry risk is high, emphasize peer pressure
    if (industryRisk >= 80) {
      return 'peer-pressure';
    }

    // If technical risk is moderate, emphasize trust/brand
    if (riskScore >= 60) {
      return 'trust';
    }

    // Default to compliance
    return 'compliance';
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(
    factors: RiskFactors,
    industryRisk: number,
    complianceRisk: number,
    technicalRisk: number,
    businessRisk: number
  ): string[] {
    const reasons: string[] = [];

    // Industry reasoning
    const industryProfile = INDUSTRY_VERTICALS.find(i => i.verticalId === factors.industry);
    if (industryProfile && industryRisk >= 75) {
      reasons.push(
        `${industryProfile.name} has ${industryProfile.recentLawsuitCount} known lawsuits in past 24 months nationally`
      );
    }

    // Compliance reasoning
    if (complianceRisk >= 75) {
      reasons.push(
        `Website has ${factors.violationCount} WCAG violations (compliance score: ${factors.complianceScore}%)`
      );
      reasons.push('WCAG violations create significant ADA Title III lawsuit exposure');
    }

    // Technical reasoning
    if (factors.mobileResponsive === false) {
      reasons.push('Non-responsive design excludes mobile users (~50% of traffic)');
    }

    if (factors.hasHttps === false) {
      reasons.push('No HTTPS encryption indicates outdated/unmaintained website');
    }

    if (factors.websiteAge && factors.websiteAge > 5) {
      reasons.push(`Website appears ${factors.websiteAge}+ years old (outdated design patterns)`);
    }

    // Red flags
    if (factors.redFlags.length > 0) {
      reasons.push(`Technical red flags detected: ${factors.redFlags.join(', ')}`);
    }

    // Business reasoning
    if (factors.employeeCount && factors.employeeCount > 50) {
      reasons.push(`Company size (${factors.employeeCount} employees) increases lawsuit exposure`);
    }

    return reasons;
  }

  /**
   * Score a batch of prospects
   */
  static scoreBatch(prospectsList: RiskFactors[]): Map<string, RiskProfile> {
    const results = new Map<string, RiskProfile>();

    for (let i = 0; i < prospectsList.length; i++) {
      const prospect = prospectsList[i];
      const profile = this.calculateRiskProfile(prospect);
      results.set(`prospect_${i}`, profile);
    }

    log.info(`Scored ${prospectsList.length} prospects`);
    return results;
  }

  /**
   * Batch recommendations for outreach
   */
  static generateBatchRecommendations(
    prospectsList: RiskFactors[]
  ): Array<{ prospect: RiskFactors; profile: RiskProfile; hook: string; emailTemplate: string }> {
    return prospectsList
      .map(prospect => {
        const profile = this.calculateRiskProfile(prospect);
        return {
          prospect,
          profile,
          hook: profile.suggestedHook,
          emailTemplate: this.generateEmailTemplate(prospect, profile),
        };
      })
      .sort((a, b) => b.profile.riskScore - a.profile.riskScore); // Sort by risk (highest first)
  }

  /**
   * Generate email template based on risk profile
   */
  private static generateEmailTemplate(
    factors: RiskFactors,
    profile: RiskProfile
  ): string {
    const hook = profile.suggestedHook;

    const templates = {
      'lawsuit-risk': `Subject: ${factors.industry === 'medical' ? 'Dental' : 'Healthcare'} Practice - ADA Lawsuit Alert

Hi there,

I noticed your website has ${factors.violationCount} accessibility violations.
Here's why this matters: ADA lawsuits against ${factors.industry} practices have increased 300%.
Average settlement: $25K-$75K + legal fees.

We fix websites to 99% WCAG compliance in 48 hours.

Let's talk.`,

      'peer-pressure': `Subject: How ${factors.industry} practices in your area are handling ADA compliance

Hi there,

We just helped 3 other ${factors.industry} practices in your city become WCAG-compliant.
They're now protected from ADA lawsuits and seeing 30%+ more customer bookings.

Your site has ${factors.violationCount} violations. Fixable in 48 hours.

Interested?`,

      'trust': `Subject: Website accessibility check for ${factors.industry} practice

Hi there,

Your website serves your community, but accessibility issues are costing you patients/clients.
${factors.violationCount} accessibility violations detected.

We specialize in transforming websites for ${factors.industry} practices.
99% WCAG compliance guaranteed.

Free audit?`,

      'compliance': `Subject: ${factors.industry === 'medical' ? 'HIPAA' : 'ADA'} Compliance Check`,
    };

    return templates[hook] || templates.compliance;
  }
}
