/**
 * IDEAL CLIENT PROFILE (ICP) DEFINITIONS
 * Comprehensive configuration for target customer segments
 *
 * Used by:
 * - Prospect discovery and scoring
 * - Sales playbook generation
 * - Marketing segmentation
 * - Revenue projections
 */

export interface ICP {
  id: string;
  name: string;
  description: string;

  // Company characteristics
  companySize: {
    min: number;
    max: number;
    label: string;
  };
  revenue: {
    min: number;
    max: number;
    label: string;
  };
  industries: string[];

  // Pain points & motivations
  painPoints: string[];
  buyingTriggers: string[];
  objections: Array<{
    objection: string;
    rebuttal: string;
  }>;

  // Decision making
  decisionMakers: {
    title: string;
    role: string;
    influenceLevel: number; // 1-5
    frequencyOfContact: string;
  }[];

  // Financial metrics
  estimatedBudget: {
    min: number;
    max: number;
  };
  avgDealSize: number;
  likelySalesCycle: number; // days
  estimatedLTV: number; // lifetime value

  // Acquisition metrics
  estimatedCAC: number; // cost per acquisition
  conversionRate: number; // from lead to paying customer (0-1)
  annualPotentialValue: number; // annual revenue from this ICP

  // Contact preferences
  preferredChannels: ('email' | 'phone' | 'linkedin' | 'direct-mail')[];
  bestTimeToContact: string;
  frequencyTolerance: 'daily' | 'weekly' | 'monthly';

  // Segmentation
  tier: 'tier-1' | 'tier-2' | 'tier-3';
  priority: number; // 1-10 (10 = highest)
  urgency: 'immediate' | 'upcoming' | 'planned';
}

// ============================================================================
// TIER 1 ICPs - High Risk, High Value
// ============================================================================

export const MEDICAL_DENTAL_ICP: ICP = {
  id: 'icp-medical-dental',
  name: 'Medical & Dental Practices',
  description: 'Multi-doctor practices, dental offices, orthopedic clinics (20-100 employees)',

  companySize: {
    min: 20,
    max: 100,
    label: '20-100 employees',
  },
  revenue: {
    min: 3000000,
    max: 15000000,
    label: '$3M-$15M annually',
  },
  industries: ['Medical Practices', 'Dental Practices', 'Orthopedics', 'Physical Therapy'],

  painPoints: [
    'Website looks outdated (patients complain)',
    'Not mobile-responsive (losing patients)',
    'Worried about ADA lawsuits (330% increase since 2020)',
    'Patients can\'t book appointments online',
    'No in-house IT expertise',
    'Insurance costs rising due to liability concerns',
  ],

  buyingTriggers: [
    'Received ADA cease-and-desist letter',
    'Lost patient because website was inaccessible',
    'Competitor launched new website',
    'Staff member flagged accessibility issues',
    'Insurance broker warned about liability',
    'Annual website review/refresh planning',
  ],

  objections: [
    {
      objection: 'Our website works fine for us',
      rebuttal: 'Show mobile traffic analytics: 73% of patient searches are on mobile. Non-responsive sites lose 60% of mobile traffic.',
    },
    {
      objection: 'We can\'t afford website improvements',
      rebuttal: 'Average ADA lawsuit settlement is $35K-$75K. Our service is a fraction of that cost + ongoing protection.',
    },
    {
      objection: 'Our nephew handles our website',
      rebuttal: 'Show WCAG violations report. Confirm nephew knows WCAG 2.2 AA standards (most don\'t). Offer free audit.',
    },
    {
      objection: 'We\'ll upgrade later when we have time',
      rebuttal: 'Show case study of competitor who modernized first. Show patient acquisition gains from 6 months.',
    },
    {
      objection: 'Let me think about it',
      rebuttal: 'Frame urgency: "Each day without compliance is legal exposure. Would you rather fix now or defend a lawsuit?"',
    },
  ],

  decisionMakers: [
    {
      title: 'Practice Owner / Managing Partner',
      role: 'owner',
      influenceLevel: 5,
      frequencyOfContact: 'weekly',
    },
    {
      title: 'Office Manager',
      role: 'operations',
      influenceLevel: 4,
      frequencyOfContact: 'weekly',
    },
    {
      title: 'Senior Physician / Partner',
      role: 'clinical',
      influenceLevel: 3,
      frequencyOfContact: 'biweekly',
    },
  ],

  estimatedBudget: {
    min: 3000,
    max: 12000,
  },
  avgDealSize: 6500,
  likelySalesCycle: 21, // 3 weeks
  estimatedLTV: 36000, // $1,500/mo × 24 months average

  estimatedCAC: 35,
  conversionRate: 0.20, // 20% of contacted leads convert
  annualPotentialValue: 1200000, // 100 clients × $12K/year

  preferredChannels: ['phone', 'email', 'linkedin'],
  bestTimeToContact: 'Tuesday-Thursday, 10am-12pm or 4-5pm',
  frequencyTolerance: 'weekly',

  tier: 'tier-1',
  priority: 10,
  urgency: 'immediate',
};

export const LAW_FIRMS_ICP: ICP = {
  id: 'icp-law-firms',
  name: 'Law Firms',
  description: 'Personal injury, employment law, estate planning (10-75 employees)',

  companySize: {
    min: 10,
    max: 75,
    label: '10-75 employees',
  },
  revenue: {
    min: 2000000,
    max: 20000000,
    label: '$2M-$20M annually',
  },
  industries: ['Law Firms', 'Legal Services', 'Personal Injury', 'Employment Law'],

  painPoints: [
    'Website is primary lead generation channel',
    'Not mobile-responsive (losing cases to competitors)',
    'Can\'t track which website content drives cases',
    'Outdated design hurts credibility',
    'Website downtime = lost revenue',
    'Staff can\'t update content (relies on vendor)',
  ],

  buyingTriggers: [
    'Lost case to competitor with better website',
    'Client complained about website experience',
    'Website went down during critical period',
    'SEO ranking dropped',
    'Want to implement client portal',
  ],

  objections: [
    {
      objection: 'We already have a website',
      rebuttal: 'Show competitive analysis: [Competitor] rebuilt their site last year and now rank #1 locally.',
    },
    {
      objection: 'Too expensive',
      rebuttal: 'Show ROI: One additional case per month = $50K+ revenue. Website pays for itself in 1 month.',
    },
    {
      objection: 'We don\'t have time for this',
      rebuttal: 'Our process is hands-off. We handle everything. 72-hour turnaround.',
    },
    {
      objection: 'Will it affect our current website?',
      rebuttal: 'No downtime. We rebuild behind the scenes and launch when ready. Full testing included.',
    },
  ],

  decisionMakers: [
    {
      title: 'Managing Partner / Senior Attorney',
      role: 'owner',
      influenceLevel: 5,
      frequencyOfContact: 'biweekly',
    },
    {
      title: 'Office Manager / Practice Manager',
      role: 'operations',
      influenceLevel: 4,
      frequencyOfContact: 'weekly',
    },
    {
      title: 'Marketing Director (if exists)',
      role: 'marketing',
      influenceLevel: 3,
      frequencyOfContact: 'weekly',
    },
  ],

  estimatedBudget: {
    min: 4000,
    max: 15000,
  },
  avgDealSize: 8000,
  likelySalesCycle: 28, // 4 weeks (lawyers take time)
  estimatedLTV: 48000, // $2,000/mo × 24 months

  estimatedCAC: 40,
  conversionRate: 0.18, // Lawyers are cautious
  annualPotentialValue: 960000, // 60 clients × $16K/year

  preferredChannels: ['email', 'phone', 'linkedin'],
  bestTimeToContact: 'Tuesday-Thursday, 11am-1pm',
  frequencyTolerance: 'biweekly',

  tier: 'tier-1',
  priority: 9,
  urgency: 'upcoming',
};

export const FINANCIAL_SERVICES_ICP: ICP = {
  id: 'icp-financial-services',
  name: 'Financial Services (RIAs, CPAs, Wealth Management)',
  description: 'Boutique wealth management, independent CPAs, bookkeeping firms (15-100 employees)',

  companySize: {
    min: 15,
    max: 100,
    label: '15-100 employees',
  },
  revenue: {
    min: 5000000,
    max: 50000000,
    label: '$5M-$50M annually',
  },
  industries: ['Wealth Management', 'Accounting', 'CPA Firms', 'Financial Planning'],

  painPoints: [
    'SEC compliance requirements',
    'Need secure client portals',
    'Difficult to communicate with clients online',
    'Website doesn\'t inspire trust (looks outdated)',
    'Can\'t track client acquisition sources',
    'Client onboarding is slow',
  ],

  buyingTriggers: [
    'SEC audit flagged website issues',
    'Want to add client portal',
    'Hired new team member who modernized processes',
    'Competitor upgraded their digital presence',
    'Want to attract younger clients',
  ],

  objections: [
    {
      objection: 'Our clients are fine with our current website',
      rebuttal: 'Show data: 40% of millennials won\'t trust a financial advisor with outdated website. Younger AUM = better retention.',
    },
    {
      objection: 'Security concerns - can you guarantee compliance?',
      rebuttal: 'SOC 2 Type II certified. E&O insurance covers compliance. Can provide audit trail for every change.',
    },
    {
      objection: 'We need custom features (portals, etc)',
      rebuttal: 'Standard portal included. Custom integrations available. Separate engagement for specialized work.',
    },
  ],

  decisionMakers: [
    {
      title: 'Owner / Managing Principal',
      role: 'owner',
      influenceLevel: 5,
      frequencyOfContact: 'biweekly',
    },
    {
      title: 'Client Services Manager',
      role: 'operations',
      influenceLevel: 4,
      frequencyOfContact: 'weekly',
    },
    {
      title: 'Chief Compliance Officer',
      role: 'compliance',
      influenceLevel: 4,
      frequencyOfContact: 'biweekly',
    },
  ],

  estimatedBudget: {
    min: 5000,
    max: 20000,
  },
  avgDealSize: 11000,
  likelySalesCycle: 21,
  estimatedLTV: 55000, // $2,300/mo × 24 months

  estimatedCAC: 45,
  conversionRate: 0.22,
  annualPotentialValue: 1320000, // 60 clients × $22K/year

  preferredChannels: ['email', 'linkedin', 'phone'],
  bestTimeToContact: 'Monday-Friday, 9am-11am',
  frequencyTolerance: 'weekly',

  tier: 'tier-1',
  priority: 9,
  urgency: 'upcoming',
};

// ============================================================================
// TIER 2 ICPs - Moderate Risk, High Volume
// ============================================================================

export const MANUFACTURING_ICP: ICP = {
  id: 'icp-manufacturing',
  name: 'Manufacturing & Industrial',
  description: 'Machine shops, fabrication, distribution centers (50-200 employees)',

  companySize: {
    min: 50,
    max: 200,
    label: '50-200 employees',
  },
  revenue: {
    min: 10000000,
    max: 100000000,
    label: '$10M-$100M annually',
  },
  industries: ['Manufacturing', 'Metal Fabrication', 'Industrial Distribution'],

  painPoints: [
    'Website used for B2B sales - needs better design',
    'Customers can\'t find product specs',
    'No online quoting system',
    'Long sales cycles due to manual processes',
    'Can\'t attract younger talent with outdated tech',
  ],

  buyingTriggers: [
    'Lost deal due to unprofessional website',
    'Want to implement online ordering',
    'Hired young engineer who flagged tech debt',
    'Need to attract millennials to manufacturing',
  ],

  objections: [
    {
      objection: 'Our website is fine for B2B',
      rebuttal: 'Show data: B2B buyers research extensively. 70% spend >1 hour on website. Design matters for trust.',
    },
    {
      objection: 'Too much downtime during rebuild',
      rebuttal: 'Zero downtime migration. We rebuild live while your current site keeps running.',
    },
  ],

  decisionMakers: [
    {
      title: 'Owner / President',
      role: 'owner',
      influenceLevel: 5,
      frequencyOfContact: 'biweekly',
    },
    {
      title: 'Operations Manager',
      role: 'operations',
      influenceLevel: 4,
      frequencyOfContact: 'weekly',
    },
  ],

  estimatedBudget: {
    min: 3000,
    max: 10000,
  },
  avgDealSize: 5500,
  likelySalesCycle: 35,
  estimatedLTV: 33000,

  estimatedCAC: 30,
  conversionRate: 0.15,
  annualPotentialValue: 660000, // 60 clients × $11K/year

  preferredChannels: ['email', 'phone'],
  bestTimeToContact: 'Tuesday-Thursday, 2pm-4pm',
  frequencyTolerance: 'monthly',

  tier: 'tier-2',
  priority: 7,
  urgency: 'planned',
};

export const HOSPITALITY_ICP: ICP = {
  id: 'icp-hospitality',
  name: 'Hospitality & Food Service (Multi-Location)',
  description: 'Restaurant chains, hotel groups, food service (30-200 employees)',

  companySize: {
    min: 30,
    max: 200,
    label: '30-200 employees',
  },
  revenue: {
    min: 5000000,
    max: 50000000,
    label: '$5M-$50M annually',
  },
  industries: ['Restaurants', 'Hotels', 'Food Service'],

  painPoints: [
    'Customers can\'t find locations / hours / menus online',
    'No online reservation system',
    'Can\'t track online orders',
    'Website goes down = lost revenue',
    'Need mobile app or mobile-first design',
  ],

  buyingTriggers: [
    'Lost revenue due to website downtime',
    'Competitor has online reservations',
    'Want to implement online ordering',
    'Need multi-location management',
  ],

  objections: [
    {
      objection: 'We\'re doing fine with our current website',
      rebuttal: 'Show data: Online reservations increase bookings 30%. Contactless ordering increases average check 15%.',
    },
    {
      objection: 'Worried about managing multiple locations',
      rebuttal: 'Centralized backend. Each location has own login. Easy content updates.',
    },
  ],

  decisionMakers: [
    {
      title: 'Owner / GM',
      role: 'owner',
      influenceLevel: 5,
      frequencyOfContact: 'biweekly',
    },
    {
      title: 'General Manager (if multiple locations)',
      role: 'operations',
      influenceLevel: 4,
      frequencyOfContact: 'weekly',
    },
  ],

  estimatedBudget: {
    min: 3000,
    max: 9000,
  },
  avgDealSize: 5000,
  likelySalesCycle: 21,
  estimatedLTV: 30000,

  estimatedCAC: 25,
  conversionRate: 0.17,
  annualPotentialValue: 600000,

  preferredChannels: ['phone', 'email'],
  bestTimeToContact: 'Tuesday-Thursday, 11am-1pm',
  frequencyTolerance: 'monthly',

  tier: 'tier-2',
  priority: 8,
  urgency: 'upcoming',
};

// ============================================================================
// TIER 3 ICPs - Lower Priority, Volume Play
// ============================================================================

export const PROFESSIONAL_SERVICES_ICP: ICP = {
  id: 'icp-professional-services',
  name: 'Professional Services',
  description: 'Engineering, architecture, IT consulting (20-150 employees)',

  companySize: {
    min: 20,
    max: 150,
    label: '20-150 employees',
  },
  revenue: {
    min: 3000000,
    max: 30000000,
    label: '$3M-$30M annually',
  },
  industries: ['Engineering', 'Architecture', 'IT Consulting'],

  painPoints: [
    'Website is portfolio/credibility tool',
    'Need case studies and project showcase',
    'Can\'t track lead sources',
    'Competing on brand, not price',
  ],

  buyingTriggers: [
    'Lost RFP due to weak website',
    'Want to refresh brand',
    'Hired marketing person',
  ],

  objections: [],

  decisionMakers: [
    {
      title: 'Partner / Principal',
      role: 'owner',
      influenceLevel: 5,
      frequencyOfContact: 'monthly',
    },
    {
      title: 'Marketing Manager (if exists)',
      role: 'marketing',
      influenceLevel: 3,
      frequencyOfContact: 'weekly',
    },
  ],

  estimatedBudget: {
    min: 3000,
    max: 12000,
  },
  avgDealSize: 6500,
  likelySalesCycle: 28,
  estimatedLTV: 39000,

  estimatedCAC: 35,
  conversionRate: 0.14,
  annualPotentialValue: 520000,

  preferredChannels: ['email', 'linkedin'],
  bestTimeToContact: 'Monday-Friday, 10am-12pm',
  frequencyTolerance: 'monthly',

  tier: 'tier-3',
  priority: 6,
  urgency: 'planned',
};

// ============================================================================
// Export all ICPs
// ============================================================================

export const ALL_ICPS = [
  MEDICAL_DENTAL_ICP,
  LAW_FIRMS_ICP,
  FINANCIAL_SERVICES_ICP,
  MANUFACTURING_ICP,
  HOSPITALITY_ICP,
  PROFESSIONAL_SERVICES_ICP,
];

// ============================================================================
// ICP Lookup Functions
// ============================================================================

export function getICPById(id: string): ICP | undefined {
  return ALL_ICPS.find(icp => icp.id === id);
}

export function getICPsByTier(tier: 'tier-1' | 'tier-2' | 'tier-3'): ICP[] {
  return ALL_ICPS.filter(icp => icp.tier === tier);
}

export function getICPsByIndustry(industry: string): ICP[] {
  return ALL_ICPS.filter(icp => icp.industries.includes(industry));
}

export function getICPsByPriority(minPriority: number): ICP[] {
  return ALL_ICPS.filter(icp => icp.priority >= minPriority)
    .sort((a, b) => b.priority - a.priority);
}

export function getAllICPIds(): string[] {
  return ALL_ICPS.map(icp => icp.id);
}

export function getICPStats() {
  return {
    totalICPs: ALL_ICPS.length,
    tier1: getICPsByTier('tier-1').length,
    tier2: getICPsByTier('tier-2').length,
    tier3: getICPsByTier('tier-3').length,
    totalAnnualPotential: ALL_ICPS.reduce((sum, icp) => sum + icp.annualPotentialValue, 0),
    avgDealSize: Math.round(ALL_ICPS.reduce((sum, icp) => sum + icp.avgDealSize, 0) / ALL_ICPS.length),
    avgCAC: Math.round(ALL_ICPS.reduce((sum, icp) => sum + icp.estimatedCAC, 0) / ALL_ICPS.length),
  };
}
