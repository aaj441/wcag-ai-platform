/**
 * PROSPECT DISCOVERY SCRIPT
 * Automated discovery, scoring, and ranking of sales prospects
 *
 * Usage:
 * npx ts-node scripts/discover-prospects.ts [--limit=100] [--icp=medical-dental] [--min-score=60]
 *
 * This script:
 * 1. Scans ICP database for prospect templates
 * 2. Generates synthetic prospect data (for demo)
 * 3. Scores prospects using the scoring algorithm
 * 4. Ranks by opportunity and urgency
 * 5. Exports prioritized list for outreach
 */

import {
  ALL_ICPS,
  getICPById,
  getICPsByTier,
} from '../packages/api/src/config/icp-profiles';
import {
  scoreProspect,
  getPrioritizedProspects,
  ProspectData,
  getScoringStats,
} from '../packages/api/src/services/prospectScoringService';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value || 'true';
  return acc;
}, {});

const LIMIT = parseInt(args.limit || '100');
const ICP_ID = args.icp || undefined;
const MIN_SCORE = parseInt(args['min-score'] || '40');

// ============================================================================
// PROSPECT DATA GENERATION (DEMO)
// ============================================================================

/**
 * Generate synthetic prospect data for demonstration
 * In production, this would come from real data sources (web scraping, databases, etc)
 */
function generateSampleProspects(count: number): ProspectData[] {
  const prospects: ProspectData[] = [];
  const icps = ICP_ID ? [getICPById(ICP_ID)] : ALL_ICPS;

  // Industries for realistic data
  const industries = [
    'Dental Practices',
    'Medical Practices',
    'Law Firms',
    'Accounting Firms',
    'CPA Firms',
    'Manufacturing',
    'Restaurants',
    'Hotels',
    'Engineering Firms',
  ];

  for (let i = 0; i < count; i++) {
    const icp = icps[i % icps.length] as any;
    if (!icp) continue;

    const industry = industries[i % industries.length];
    const employeeCount = Math.floor(
      Math.random() * (icp.companySize.max - icp.companySize.min) + icp.companySize.min
    );

    prospects.push({
      prospectId: `prospect-${i + 1}`,
      companyName: `${['ABC', 'XYZ', 'Global', 'Local', 'Premier'][i % 5]} ${industry.split(' ')[0]}`,
      industry,
      employeeCount,
      revenue:
        Math.floor(
          Math.random() * (icp.revenue.max - icp.revenue.min) + icp.revenue.min
        ) / 100000 * 100000,

      // Website quality metrics (varies widely)
      website: {
        wcagScore: Math.floor(Math.random() * 80) + 10, // 10-90
        mobileScore: Math.floor(Math.random() * 80) + 10,
        performanceScore: Math.floor(Math.random() * 85) + 15,
        lastUpdated: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      },

      // Company signals
      signals: {
        hasRecentFunding: Math.random() < 0.1, // 10% have recent funding
        hasNewHire: Math.random() < 0.15, // 15% have new hires
        isHiring: Math.random() < 0.2, // 20% are hiring
        hasNewWebsiteProject: Math.random() < 0.08, // 8% mention website projects
        hasMultipleLocations: Math.random() < 0.25, // 25% have multiple locations
        hasEcommerce: Math.random() < 0.3, // 30% have e-commerce
      },

      // Urgency indicators
      urgency: {
        hasADADemandLetter: Math.random() < 0.02, // 2% have demand letters (realistic)
        hasRecentLawsuit: Math.random() < 0.01, // 1% have lawsuits
        hasHighTrafficLoss: Math.random() < 0.15, // 15% losing traffic
        competeHasNewSite: Math.random() < 0.2, // 20% competitor has new site
        industryLitigationTrend: ['Medical', 'Dental', 'Law'].some(ind =>
          industry.toLowerCase().includes(ind.toLowerCase())
        ), // Certain industries have litigation trends
      },

      // Tech adoption
      tech: {
        hasCloudServices: Math.random() < 0.4, // 40% use cloud
        hasAnalytics: Math.random() < 0.35, // 35% track analytics
        hasMarketingAutomation: Math.random() < 0.15, // 15% use marketing tools
        hasAPI: Math.random() < 0.1, // 10% have APIs
      },
    });
  }

  return prospects;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 WCAG AI PLATFORM - PROSPECT DISCOVERY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Generate/load prospects
  console.log(`📊 Generating ${LIMIT} sample prospects...`);
  const prospects = generateSampleProspects(LIMIT);

  // Step 2: Score all prospects
  console.log(`📈 Scoring prospects using algorithm...`);
  const scores = prospects.map(p => scoreProspect(p));

  // Step 3: Filter by score
  const filtered = scores.filter(s => s.overallScore >= MIN_SCORE);
  console.log(
    `✅ ${filtered.length} prospects score ${MIN_SCORE}+ (${Math.round((filtered.length / scores.length) * 100)}% of total)`
  );

  // Step 4: Prioritize
  console.log(`🎯 Prioritizing by recommendation and opportunity...`);
  const prioritized = getPrioritizedProspects(filtered, 50); // Show top 50

  // Step 5: Display results
  console.log(`\n📋 TOP ${prioritized.length} PROSPECTS FOR OUTREACH:\n`);

  prioritized.forEach((prospect, index) => {
    const recommendation = {
      immediate: '🔴 CALL TODAY',
      'this-week': '🟠 THIS WEEK',
      'this-month': '🟡 THIS MONTH',
      backlog: '⚪ BACKLOG',
    }[prospect.recommendation];

    console.log(`${index + 1}. ${prospect.companyName}`);
    console.log(
      `   Score: ${prospect.overallScore}/100 | Rec: ${recommendation} | Deal: $${prospect.estimatedDealSize.toLocaleString()}`
    );

    if (prospect.hotFlags.length > 0) {
      console.log(`   🚨 FLAGS: ${prospect.hotFlags.join(' | ')}`);
    }

    console.log(
      `   ICP: ${prospect.breakDown.icpFit.details.split('. ')[0]}`
    );
    console.log('');
  });

  // Step 6: Statistics
  const stats = getScoringStats(scores);
  console.log('\n📊 OVERALL STATISTICS:\n');
  console.log(`Total prospects analyzed: ${stats.total}`);
  console.log(`Average score: ${stats.avgScore}/100`);
  console.log(`Score range: ${stats.lowScore}-${stats.highScore}`);
  console.log(`Median score: ${stats.medianScore}`);
  console.log(`\nDistribution:`);
  console.log(`  Excellent (80+): ${stats.distribution.excellent}`);
  console.log(`  Good (60-79): ${stats.distribution.good}`);
  console.log(`  Fair (40-59): ${stats.distribution.fair}`);
  console.log(`  Poor (<40): ${stats.distribution.poor}`);

  // Step 7: Expected funnel
  console.log('\n📈 EXPECTED OUTREACH FUNNEL:\n');
  const prioritizedCount = prioritized.length;
  const auditRequests = Math.round(prioritizedCount * 0.05); // 5% request audit
  const auditCompleted = Math.round(auditRequests * 0.8); // 80% complete it
  const paidConversions = Math.round(auditCompleted * 0.15); // 15% convert to paid

  console.log(`Prospects to reach out to: ${prioritizedCount}`);
  console.log(`→ Expected audit requests (5%): ${auditRequests}`);
  console.log(`→ Expected audits completed (80%): ${auditCompleted}`);
  console.log(`→ Expected paid conversions (15%): ${paidConversions}`);
  console.log(`→ Expected MRR at $6,500 avg: $${(paidConversions * 6500).toLocaleString()}`);

  // Step 8: Next steps
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 NEXT STEPS:\n');
  console.log('1. Review the prioritized prospects above');
  console.log('2. Run: npx ts-node scripts/send-emails.ts --to=immediate');
  console.log('3. Track responses in CRM or database');
  console.log('4. Schedule calls with prospects requesting audits');
  console.log('5. Monitor email metrics (open rate, click rate, conversion)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
