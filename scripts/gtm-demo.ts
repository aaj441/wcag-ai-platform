#!/usr/bin/env tsx
/**
 * GTM EXECUTION DEMO
 * Demonstrates all three phases of go-to-market strategy
 * - Phase 1: Automated Outbound
 * - Phase 2: Content Marketing
 * - Phase 3: Sales Scaling
 */

import EmailService from '../packages/api/src/services/emailService';
import LeadTrackingService from '../packages/api/src/services/leadTrackingService';
import ContentService from '../packages/api/src/services/contentService';
import { SalesPlaybookService } from '../packages/api/src/services/crmService';
import { scoreProspect, ProspectData } from '../packages/api/src/services/prospectScoringService';

console.log('');
console.log('═════════════════════════════════════════════════════════════');
console.log('🚀 WCAG AI PLATFORM - GTM EXECUTION DEMO');
console.log('═════════════════════════════════════════════════════════════');
console.log('');

// ============================================================================
// PHASE 1: AUTOMATED OUTBOUND
// ============================================================================

console.log('📧 PHASE 1: AUTOMATED OUTBOUND');
console.log('───────────────────────────────────────────────────────────────');

const emailService = new EmailService({
  name: 'resend',
  apiKey: 'demo-key',
  fromEmail: 'outreach@wcag-ai.com',
  fromName: 'WCAG AI Platform',
});

const leadTracking = new LeadTrackingService();

// Add sample prospects
console.log('\n✓ Adding 5 sample prospects...');
const prospects = [
  {
    id: 'prospect-001',
    companyName: 'Dental Plus Practice',
    email: 'admin@dentalplus.com',
    industry: 'Dental',
    employeeCount: 15,
    estimatedRevenue: 2500000,
  },
  {
    id: 'prospect-002',
    companyName: 'Smith & Associates Law',
    email: 'partner@smithlaw.com',
    industry: 'Law',
    employeeCount: 25,
    estimatedRevenue: 5000000,
  },
  {
    id: 'prospect-003',
    companyName: 'Medical Associates Group',
    email: 'practice@medicalassoc.com',
    industry: 'Medical',
    employeeCount: 12,
    estimatedRevenue: 3000000,
  },
  {
    id: 'prospect-004',
    companyName: 'Accounting Firm XYZ',
    email: 'manager@accountingxyz.com',
    industry: 'Accounting',
    employeeCount: 30,
    estimatedRevenue: 4000000,
  },
  {
    id: 'prospect-005',
    companyName: 'Wellness Center Plus',
    email: 'director@wellnessplus.com',
    industry: 'Medical',
    employeeCount: 20,
    estimatedRevenue: 3500000,
  },
];

prospects.forEach(p => {
  leadTracking.addProspect({
    id: p.id,
    companyName: p.companyName,
    email: p.email,
    industry: p.industry,
    employeeCount: p.employeeCount,
    estimatedRevenue: p.estimatedRevenue,
    status: 'discovered',
    discoveredAt: new Date(),
  });
});

console.log(`  └─ Successfully added ${prospects.length} prospects to lead tracking\n`);

// Score prospects
console.log('✓ Scoring prospects for priority outreach...');
const scoredProspects = prospects.map(p => {
  const prospectData: ProspectData = {
    prospectId: p.id,
    companyName: p.companyName,
    industry: p.industry,
    employeeCount: p.employeeCount,
    revenue: p.estimatedRevenue,
    website: {
      wcagScore: Math.random() * 60, // Assume poor WCAG scores
      mobileScore: Math.random() * 70,
      performanceScore: Math.random() * 75,
      lastUpdated: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    },
    signals: {
      hasRecentFunding: Math.random() > 0.7,
      hasNewHire: Math.random() > 0.6,
      isHiring: Math.random() > 0.5,
      hasNewWebsiteProject: Math.random() > 0.65,
      hasMultipleLocations: Math.random() > 0.4,
      hasEcommerce: Math.random() > 0.8,
    },
    urgency: {
      hasADADemandLetter: Math.random() > 0.9,
      hasRecentLawsuit: Math.random() > 0.85,
      hasHighTrafficLoss: Math.random() > 0.7,
      competeHasNewSite: Math.random() > 0.6,
      industryLitigationTrend: true,
    },
    tech: {
      hasCloudServices: Math.random() > 0.4,
      hasAnalytics: Math.random() > 0.3,
      hasMarketingAutomation: Math.random() > 0.7,
      hasAPI: Math.random() > 0.8,
    },
  };

  return scoreProspect(prospectData);
});

// Sort by score
scoredProspects.sort((a, b) => b.overallScore - a.overallScore);

console.log(`\n  Top 3 Priority Prospects:`);
scoredProspects.slice(0, 3).forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.companyName}`);
  console.log(`     ├─ Score: ${p.overallScore}/100`);
  console.log(`     ├─ Recommendation: ${p.recommendation}`);
  console.log(`     ├─ Est. Deal Size: $${p.estimatedDealSize.toLocaleString()}`);
  console.log(`     └─ Flags: ${p.hotFlags.join(', ') || 'None'}`);
});

// Track email sends
console.log('\n✓ Executing Phase 1 email campaign (dry-run)...');
let emailsSent = 0;
prospects.slice(0, 3).forEach(p => {
  leadTracking.trackEmailEvent(p.id, 'sent');
  emailsSent++;
  leadTracking.trackEmailEvent(p.id, 'opened');
  emailsSent++;
});

console.log(`  └─ Sent ${emailsSent} emails (email tracking enabled)\n`);

// Get Phase 1 metrics
const phase1Metrics = {
  funnel: leadTracking.getFunnelStats(),
  email: leadTracking.getEmailMetrics(),
  mrr: leadTracking.getMRRProjection(),
};

console.log('📊 Phase 1 Funnel Metrics:');
console.log(`  ├─ Prospects Discovered: ${phase1Metrics.funnel.discovered}`);
console.log(`  ├─ Contacted: ${phase1Metrics.funnel.contacted}`);
console.log(`  ├─ Conversion Rate: ${(phase1Metrics.funnel.conversionRate * 100).toFixed(1)}%`);
console.log(`  ├─ Avg Time to Conversion: ${phase1Metrics.funnel.avgTimeToConversion} days`);
console.log(`  └─ Customers: ${phase1Metrics.funnel.customer}`);

console.log('\n📊 Phase 1 Email Metrics:');
console.log(`  ├─ Total Sent: ${phase1Metrics.email.totalSent}`);
console.log(`  ├─ Total Opened: ${phase1Metrics.email.totalOpened}`);
console.log(`  ├─ Open Rate: ${phase1Metrics.email.openRate}%`);
console.log(`  ├─ Click Rate: ${phase1Metrics.email.clickRate}%`);
console.log(`  └─ Conversion Rate: ${phase1Metrics.email.conversionRate}%`);

console.log('\n💰 Phase 1 Revenue Projection:');
console.log(`  ├─ Current MRR: $${phase1Metrics.mrr.currentMRR.toLocaleString()}`);
console.log(`  ├─ Projected MRR: $${phase1Metrics.mrr.projectedMRR.toLocaleString()}`);
console.log(`  ├─ Customers: ${phase1Metrics.mrr.customers}`);
console.log(`  ├─ In Negotiation: ${phase1Metrics.mrr.negotiating}`);
console.log(`  └─ Total Projected MRR: $${phase1Metrics.mrr.totalProjectedMRR.toLocaleString()}`);

// ============================================================================
// PHASE 2: CONTENT MARKETING
// ============================================================================

console.log('\n');
console.log('═════════════════════════════════════════════════════════════');
console.log('📝 PHASE 2: CONTENT MARKETING');
console.log('───────────────────────────────────────────────────────────────');

const contentService = new ContentService();

console.log('\n✓ Creating Phase 2 content assets...');
const blogPost = contentService.createBlogPost('wcag-basics', {
  industry: 'Dental',
});
console.log(`  ├─ Blog Post: "${blogPost.title}"`);
console.log(`     └─ Est. Views: 500, Est. Leads: 25\n`);

const caseStudy = contentService.createCaseStudy('Dental Plus Practice', 'Dental', {
  violationsFixed: 125,
  complianceScore: 95,
  implementationTime: 72,
});
console.log(`  ├─ Case Study: "${caseStudy.title}"`);
console.log(`     └─ Est. Value: $162,500\n`);

const landingPage = contentService.createLandingPage('Dental', 'WCAG compliance for dental practices', 'Dental Practice Accessibility Guide');
console.log(`  ├─ Landing Page: "${landingPage.title}"`);
console.log(`     └─ Est. Conversions: 15 leads/month\n`);

// Content calendar
console.log('✓ Building 3-month content calendar...');
const calendar = contentService.getContentCalendar(3);
console.log(`  └─ ${calendar.length} planned content pieces across 3 months\n`);

// Content performance
const performance = contentService.getContentPerformance();
console.log('📊 Phase 2 Content Performance:');
console.log(`  ├─ Blog Posts: ${performance.blogPosts}`);
console.log(`  ├─ Case Studies: ${performance.caseStudies}`);
console.log(`  ├─ Landing Pages: ${performance.landingPages}`);
console.log(`  ├─ Total Views: ${performance.totalViews.toLocaleString()}`);
console.log(`  ├─ Avg Views Per Post: ${performance.avgViewsPerPost.toLocaleString()}`);
console.log(`  └─ Top Post: "${performance.topPosts[0]?.title || 'N/A'}"\n`);

// ============================================================================
// PHASE 3: SALES SCALING
// ============================================================================

console.log('═════════════════════════════════════════════════════════════');
console.log('💼 PHASE 3: SALES SCALING');
console.log('───────────────────────────────────────────────────────────────');

const salesPlaybook = new SalesPlaybookService();

console.log('\n✓ Loading sales playbooks...');
const playbooks = salesPlaybook.getAllPlaybooks();
console.log(`  └─ ${playbooks.length} playbooks loaded\n`);

playbooks.forEach(pb => {
  console.log(`  ├─ ${pb.industry} Playbook`);
  console.log(`  │  ├─ Stages: ${pb.stages.length} (${pb.stages.map(s => s.name).join(' → ')})`);
  console.log(`  │  ├─ Duration: ${pb.stages.reduce((sum, s) => sum + s.duration, 0)} days`);
  console.log(`  │  ├─ Objections Handled: ${pb.objection_handlers.length}`);
  console.log(`  │  └─ Closing Techniques: ${pb.closing_techniques.length}\n`);
});

// Move prospects through sales pipeline
console.log('✓ Moving top prospects through sales pipeline...');
const topProspect = scoredProspects[0];
leadTracking.updateProspectStatus(topProspect.prospectId, 'engaged');
leadTracking.updateProspectStatus(scoredProspects[1].prospectId, 'audited');
leadTracking.startNegotiation(scoredProspects[2].prospectId, topProspect.estimatedDealSize, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

console.log(`  ├─ ${topProspect.companyName}: Engaged (negotiation pending)`);
console.log(`  ├─ ${scoredProspects[1].companyName}: Audit Completed (ready for negotiation)`);
console.log(`  └─ ${scoredProspects[2].companyName}: In Negotiation (closing in 30 days)\n`);

// Phase 3 metrics
console.log('📊 Phase 3 Sales Pipeline:');
const phase3Metrics = leadTracking.getMRRProjection();
console.log(`  ├─ Current MRR: $${phase3Metrics.currentMRR.toLocaleString()}`);
console.log(`  ├─ Customers: ${phase3Metrics.customers}`);
console.log(`  ├─ In Negotiation: ${phase3Metrics.negotiating}`);
console.log(`  ├─ Avg Deal Size: $${(topProspect.estimatedDealSize * 12).toLocaleString()}/year`);
console.log(`  └─ Projected MRR: $${phase3Metrics.projectedMRR.toLocaleString()}\n`);

// ============================================================================
// UNIFIED GTM DASHBOARD
// ============================================================================

console.log('═════════════════════════════════════════════════════════════');
console.log('📈 UNIFIED GTM DASHBOARD');
console.log('───────────────────────────────────────────────────────────────\n');

console.log('🎯 PHASE 1 - Automated Outbound:');
console.log(`  Status: In Progress`);
console.log(`  Progress: ${phase1Metrics.funnel.contacted}/100 leads contacted`);
console.log(`  Target: Get 100 qualified leads/month`);
console.log(`  Performance: ${phase1Metrics.email.openRate}% open rate, ${phase1Metrics.email.clickRate}% click rate\n`);

console.log('📝 PHASE 2 - Content Marketing:');
console.log(`  Status: Planning`);
console.log(`  Progress: ${performance.blogPosts + performance.caseStudies + performance.landingPages} content pieces created`);
console.log(`  Target: Get 500 inbound leads/month`);
console.log(`  Performance: ${performance.totalViews.toLocaleString()} views, 0% conversion yet\n`);

console.log('💼 PHASE 3 - Sales Scaling:');
console.log(`  Status: Foundation`);
console.log(`  Progress: ${playbooks.length} playbooks ready, ${phase3Metrics.negotiating} deals in pipeline`);
console.log(`  Target: $50K MRR by Q2 2026`);
console.log(`  Performance: $${phase3Metrics.currentMRR.toLocaleString()} MRR, ${phase3Metrics.customers} customers\n`);

console.log('📊 Key Metrics:');
console.log(`  ├─ Total Leads Generated: ${phase1Metrics.funnel.discovered}`);
console.log(`  ├─ Conversion Rate: ${(phase1Metrics.funnel.conversionRate * 100).toFixed(1)}%`);
console.log(`  ├─ Current MRR: $${phase3Metrics.currentMRR.toLocaleString()}`);
console.log(`  ├─ Projected MRR: $${phase3Metrics.projectedMRR.toLocaleString()}`);
console.log(`  ├─ Customers Onboarded: ${phase3Metrics.customers}`);
console.log(`  └─ Avg Time to Close: ${phase1Metrics.funnel.avgTimeToConversion} days\n`);

console.log('═════════════════════════════════════════════════════════════');
console.log('✅ GTM DEMO COMPLETE - All three phases working together');
console.log('═════════════════════════════════════════════════════════════\n');
