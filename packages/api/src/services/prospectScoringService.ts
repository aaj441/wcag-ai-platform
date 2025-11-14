/**
 * PROSPECT SCORING SERVICE
 * Algorithmic ranking of potential customers based on fit + readiness
 *
 * Scoring model:
 * - ICP fit (0-30 points)
 * - Website quality (0-20 points)
 * - Company signals (0-20 points)
 * - Urgency indicators (0-20 points)
 * - Tech adoption (0-10 points)
 * Total: 0-100 points
 *
 * Usage: Prioritize which prospects to contact first
 */

export interface ProspectScore {
  prospectId: string;
  companyName: string;
  overallScore: number; // 0-100
  breakDown: {
    icpFit: {
      score: number;
      details: string;
    };
    websiteQuality: {
      score: number;
      details: string;
    };
    companySignals: {
      score: number;
      details: string;
    };
    urgencyIndicators: {
      score: number;
      details: string;
    };
    techAdoption: {
      score: number;
      details: string;
    };
  };
  recommendation: 'immediate' | 'this-week' | 'this-month' | 'backlog';
  hotFlags: string[]; // Red flags or gold opportunities
  estimatedDealSize: number;
  estimatedClosingProbability: number; // 0-1
}

// ============================================================================
// SCORING COMPONENTS
// ============================================================================

/**
 * ICP FIT SCORING (0-30 points)
 * How well does the company match our ideal customer profile?
 */
export function scoreICPFit(
  companySize: number,
  industry: string,
  revenue: number
): { score: number; details: string } {
  let score = 0;
  let details = '';

  // Company size (20-200 employees = sweet spot)
  if (companySize >= 20 && companySize <= 200) {
    score += 12; // Perfect fit
    details += 'Size: Perfect (20-200 employees). ';
  } else if (companySize >= 10 && companySize <= 300) {
    score += 8; // Good fit
    details += 'Size: Good (10-300 employees). ';
  } else if (companySize >= 5 && companySize <= 500) {
    score += 4; // Acceptable
    details += 'Size: Acceptable but smaller/larger than ideal. ';
  } else {
    details += 'Size: Outside target range. ';
  }

  // Industry fit
  const tier1Industries = [
    'Medical Practices',
    'Dental Practices',
    'Law Firms',
    'Accounting',
    'CPA',
    'Wealth Management',
  ];
  const tier2Industries = [
    'Manufacturing',
    'Restaurants',
    'Hotels',
    'Engineering',
    'Architecture',
  ];

  if (tier1Industries.some(ind => industry.toLowerCase().includes(ind.toLowerCase()))) {
    score += 12; // High priority
    details += 'Industry: Tier 1 (high-value). ';
  } else if (tier2Industries.some(ind => industry.toLowerCase().includes(ind.toLowerCase()))) {
    score += 8; // Medium priority
    details += 'Industry: Tier 2 (moderate-value). ';
  } else {
    score += 4; // Lower priority
    details += 'Industry: Tier 3 or unknown. ';
  }

  // Revenue fit
  if (revenue >= 3000000 && revenue <= 50000000) {
    score += 6; // Perfect fit
    details += 'Revenue: Perfect ($3M-$50M). ';
  } else if (revenue >= 1000000 && revenue <= 100000000) {
    score += 3; // Acceptable
    details += 'Revenue: Acceptable range. ';
  }

  return { score, details };
}

/**
 * WEBSITE QUALITY SCORING (0-20 points)
 * How bad is their website? (worse = more urgent)
 */
export function scoreWebsiteQuality(
  wcagScore: number, // 0-100
  mobileScore: number, // 0-100
  performanceScore: number, // 0-100
  lastUpdated: Date
): { score: number; details: string } {
  let score = 0;
  let details = '';

  // WCAG compliance
  if (wcagScore < 50) {
    score += 8; // Critical violations
    details += 'WCAG: Critical (<50). ';
  } else if (wcagScore < 75) {
    score += 5; // Significant issues
    details += 'WCAG: Significant (50-75). ';
  } else {
    score += 2; // Minor issues
    details += 'WCAG: Minor (75+). ';
  }

  // Mobile responsiveness
  if (mobileScore < 50) {
    score += 6; // Very poor mobile
    details += 'Mobile: Very Poor (<50). ';
  } else if (mobileScore < 75) {
    score += 4; // Poor mobile
    details += 'Mobile: Poor (50-75). ';
  } else {
    score += 2; // Acceptable mobile
    details += 'Mobile: Acceptable. ';
  }

  // Performance
  if (performanceScore < 50) {
    score += 4; // Slow website
    details += 'Performance: Slow (<50). ';
  } else if (performanceScore < 75) {
    score += 2; // Moderate speed
    details += 'Performance: Moderate (50-75). ';
  }

  // Website age
  const ageInDays = Math.floor(
    (new Date().getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (ageInDays > 1825) {
    // 5+ years old
    score += 2;
    details += `Website: Very outdated (${Math.floor(ageInDays / 365)} years). `;
  }

  return { score: Math.min(score, 20), details };
}

/**
 * COMPANY SIGNALS SCORING (0-20 points)
 * What are they doing that signals readiness to buy?
 */
export function scoreCompanySignals(
  hasRecentFunding: boolean,
  hasNewHire: boolean, // Marketing/IT hire
  isHiring: boolean, // Tech positions
  hasNewWebsiteProject: boolean,
  hasMultipleLocations: boolean,
  hasEcommerce: boolean
): { score: number; details: string } {
  let score = 0;
  let details = '';

  if (hasRecentFunding) {
    score += 5;
    details += 'Signal: Recent funding (ready to invest). ';
  }

  if (hasNewHire) {
    score += 5;
    details += 'Signal: New marketing/IT hire (modernizing). ';
  }

  if (isHiring) {
    score += 3;
    details += 'Signal: Hiring for tech roles. ';
  }

  if (hasNewWebsiteProject) {
    score += 4;
    details += 'Signal: Website project mentioned. ';
  }

  if (hasMultipleLocations) {
    score += 2;
    details += 'Signal: Multi-location (high complexity). ';
  }

  if (hasEcommerce) {
    score += 1;
    details += 'Signal: E-commerce (digital-forward). ';
  }

  return { score: Math.min(score, 20), details };
}

/**
 * URGENCY INDICATORS SCORING (0-20 points)
 * How urgent is their need?
 */
export function scoreUrgencyIndicators(
  hasADADemandLetter: boolean,
  hasRecentLawsuit: boolean,
  hasHighTrafficLoss: boolean, // >20% bounce rate increase
  competeHasNewSite: boolean,
  industryLitigationTrend: boolean
): { score: number; details: string } {
  let score = 0;
  let details = '';

  if (hasADADemandLetter) {
    score += 20; // CRITICAL urgency
    details += 'Urgency: ADA demand letter (CRITICAL). ';
  } else if (hasRecentLawsuit) {
    score += 15; // Very urgent
    details += 'Urgency: Recent lawsuit (VERY URGENT). ';
  } else if (hasHighTrafficLoss) {
    score += 8; // Moderately urgent
    details += 'Urgency: High traffic loss (MODERATE). ';
  } else if (competeHasNewSite) {
    score += 5; // Some urgency
    details += 'Urgency: Competitor has new site. ';
  }

  if (industryLitigationTrend) {
    score += 5;
    details += 'Context: Industry seeing lawsuits. ';
  }

  return { score: Math.min(score, 20), details };
}

/**
 * TECH ADOPTION SCORING (0-10 points)
 * How tech-forward is the company? (faster to close if tech-forward)
 */
export function scoreTechAdoption(
  hasCloudServices: boolean, // AWS, Salesforce, etc
  hasAnalytics: boolean, // Google Analytics, Mixpanel
  hasMarketingAutomation: boolean,
  hasAPI: boolean // Existing website has APIs
): { score: number; details: string } {
  let score = 0;
  let details = '';

  if (hasCloudServices) {
    score += 3;
    details += 'Tech: Cloud services (modern). ';
  }

  if (hasAnalytics) {
    score += 3;
    details += 'Tech: Analytics tracking. ';
  }

  if (hasMarketingAutomation) {
    score += 2;
    details += 'Tech: Marketing automation. ';
  }

  if (hasAPI) {
    score += 2;
    details += 'Tech: API integration (sophisticated). ';
  }

  return { score: Math.min(score, 10), details };
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export interface ProspectData {
  prospectId: string;
  companyName: string;
  industry: string;
  employeeCount: number;
  revenue: number;
  website: {
    wcagScore: number;
    mobileScore: number;
    performanceScore: number;
    lastUpdated: Date;
  };
  signals: {
    hasRecentFunding: boolean;
    hasNewHire: boolean;
    isHiring: boolean;
    hasNewWebsiteProject: boolean;
    hasMultipleLocations: boolean;
    hasEcommerce: boolean;
  };
  urgency: {
    hasADADemandLetter: boolean;
    hasRecentLawsuit: boolean;
    hasHighTrafficLoss: boolean;
    competeHasNewSite: boolean;
    industryLitigationTrend: boolean;
  };
  tech: {
    hasCloudServices: boolean;
    hasAnalytics: boolean;
    hasMarketingAutomation: boolean;
    hasAPI: boolean;
  };
}

export function scoreProspect(prospect: ProspectData): ProspectScore {
  // Calculate component scores
  const icpFit = scoreICPFit(prospect.employeeCount, prospect.industry, prospect.revenue);
  const websiteQuality = scoreWebsiteQuality(
    prospect.website.wcagScore,
    prospect.website.mobileScore,
    prospect.website.performanceScore,
    prospect.website.lastUpdated
  );
  const companySignals = scoreCompanySignals(
    prospect.signals.hasRecentFunding,
    prospect.signals.hasNewHire,
    prospect.signals.isHiring,
    prospect.signals.hasNewWebsiteProject,
    prospect.signals.hasMultipleLocations,
    prospect.signals.hasEcommerce
  );
  const urgencyIndicators = scoreUrgencyIndicators(
    prospect.urgency.hasADADemandLetter,
    prospect.urgency.hasRecentLawsuit,
    prospect.urgency.hasHighTrafficLoss,
    prospect.urgency.competeHasNewSite,
    prospect.urgency.industryLitigationTrend
  );
  const techAdoption = scoreTechAdoption(
    prospect.tech.hasCloudServices,
    prospect.tech.hasAnalytics,
    prospect.tech.hasMarketingAutomation,
    prospect.tech.hasAPI
  );

  // Overall score
  const overallScore =
    icpFit.score +
    websiteQuality.score +
    companySignals.score +
    urgencyIndicators.score +
    techAdoption.score;

  // Estimate deal size based on company size and urgency
  let estimatedDealSize = 999; // Minimum Tier 1
  if (prospect.employeeCount > 100) {
    estimatedDealSize = 2999; // Tier 2
  }
  if (prospect.revenue > 20000000) {
    estimatedDealSize = 5999; // Tier 3 (custom)
  }
  if (prospect.urgency.hasADADemandLetter) {
    estimatedDealSize *= 2; // Premium for urgent
  }

  // Estimate closing probability
  let closingProbability = 0.05; // 5% baseline
  closingProbability += overallScore * 0.01; // +1% per score point
  closingProbability = Math.min(closingProbability, 0.95);

  // Recommendation
  let recommendation: 'immediate' | 'this-week' | 'this-month' | 'backlog';
  if (overallScore >= 75) {
    recommendation = 'immediate';
  } else if (overallScore >= 60) {
    recommendation = 'this-week';
  } else if (overallScore >= 40) {
    recommendation = 'this-month';
  } else {
    recommendation = 'backlog';
  }

  // Hot flags
  const hotFlags: string[] = [];
  if (prospect.urgency.hasADADemandLetter) hotFlags.push('🔴 ADA DEMAND LETTER');
  if (prospect.urgency.hasRecentLawsuit) hotFlags.push('🔴 RECENT LAWSUIT');
  if (overallScore >= 80) hotFlags.push('✨ TOP 10% PROSPECT');
  if (prospect.signals.hasRecentFunding) hotFlags.push('💰 RECENT FUNDING');
  if (prospect.urgency.competeHasNewSite) hotFlags.push('⚠️ COMPETITOR THREAT');
  if (prospect.website.wcagScore < 30) hotFlags.push('🚨 CRITICAL WCAG GAPS');

  return {
    prospectId: prospect.prospectId,
    companyName: prospect.companyName,
    overallScore: Math.round(overallScore),
    breakDown: {
      icpFit,
      websiteQuality,
      companySignals,
      urgencyIndicators,
      techAdoption,
    },
    recommendation,
    hotFlags,
    estimatedDealSize,
    estimatedClosingProbability: Math.round(closingProbability * 100) / 100,
  };
}

// ============================================================================
// BATCH SCORING & PRIORITIZATION
// ============================================================================

export function scoreProspects(prospects: ProspectData[]): ProspectScore[] {
  return prospects
    .map(prospect => scoreProspect(prospect))
    .sort((a, b) => b.overallScore - a.overallScore);
}

export function getPrioritizedProspects(
  prospects: ProspectScore[],
  limit: number = 100
): ProspectScore[] {
  const byRecommendation = {
    immediate: [] as ProspectScore[],
    'this-week': [] as ProspectScore[],
    'this-month': [] as ProspectScore[],
    backlog: [] as ProspectScore[],
  };

  prospects.forEach(p => byRecommendation[p.recommendation].push(p));

  const result: ProspectScore[] = [];
  result.push(...byRecommendation.immediate);
  result.push(...byRecommendation['this-week']);
  result.push(...byRecommendation['this-month']);
  result.push(...byRecommendation.backlog);

  return result.slice(0, limit);
}

export function getProspectsAboveScore(
  prospects: ProspectScore[],
  minScore: number
): ProspectScore[] {
  return prospects.filter(p => p.overallScore >= minScore);
}

export function getProspectsWithHotFlags(
  prospects: ProspectScore[]
): ProspectScore[] {
  return prospects.filter(p => p.hotFlags.length > 0);
}

export function getScoringStats(scores: ProspectScore[]) {
  if (scores.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      highScore: 0,
      lowScore: 0,
      medianScore: 0,
      distribution: {} as Record<string, number>,
    };
  }

  const sortedScores = scores.map(s => s.overallScore).sort((a, b) => a - b);
  const avgScore = Math.round(sortedScores.reduce((a, b) => a + b) / sortedScores.length);
  const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

  const distribution = {
    excellent: scores.filter(s => s.overallScore >= 80).length,
    good: scores.filter(s => s.overallScore >= 60 && s.overallScore < 80).length,
    fair: scores.filter(s => s.overallScore >= 40 && s.overallScore < 60).length,
    poor: scores.filter(s => s.overallScore < 40).length,
  };

  return {
    total: scores.length,
    avgScore,
    highScore: sortedScores[sortedScores.length - 1],
    lowScore: sortedScores[0],
    medianScore,
    distribution,
  };
}
