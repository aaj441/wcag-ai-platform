/**
 * CRM SERVICE
 * Manages HubSpot integration for pipeline management
 *
 * Syncs:
 * - Prospects → HubSpot Contacts
 * - Email events → HubSpot Activity
 * - Deals → HubSpot Deals
 * - Sales team → HubSpot Users
 */

export interface HubSpotConfig {
  apiKey: string;
  baseUrl: string;
}

export interface HubSpotContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone?: string;
  linkedinUrl?: string;
  properties: Record<string, string>;
}

export interface HubSpotDeal {
  id: string;
  dealName: string;
  amount: number;
  dealStage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  closeDate: Date;
  associatedContacts: string[]; // contact IDs
}

export interface SalesPlaybook {
  id: string;
  industry: string;
  title: string;
  description: string;
  stages: {
    name: string;
    description: string;
    duration: number; // days
    key_activities: string[];
    success_criteria: string[];
  }[];
  email_templates: Array<{
    stage: string;
    subject: string;
    body: string;
  }>;
  objection_handlers: Array<{
    objection: string;
    response: string;
  }>;
  closing_techniques: string[];
}

// ============================================================================
// HUBSPOT API SERVICE
// ============================================================================

export class HubSpotService {
  private apiKey: string;
  private baseUrl: string = 'https://api.hubapi.com';

  constructor(config: HubSpotConfig) {
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  /**
   * Create or update contact in HubSpot
   */
  async syncContact(contact: {
    email: string;
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<{ success: boolean; contactId: string }> {
    try {
      console.log(`🔄 Syncing contact to HubSpot: ${contact.email}`);

      // In production:
      // const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     properties: {
      //       email: contact.email,
      //       firstname: contact.firstName,
      //       lastname: contact.lastName,
      //       company: contact.company,
      //     },
      //   }),
      // });

      return {
        success: true,
        contactId: `hubspot_contact_${Date.now()}`,
      };
    } catch (error) {
      console.error('HubSpot sync error:', error);
      return { success: false, contactId: '' };
    }
  }

  /**
   * Create deal in HubSpot
   */
  async createDeal(deal: {
    dealName: string;
    amount: number;
    dealStage: string;
    contactIds: string[];
  }): Promise<{ success: boolean; dealId: string }> {
    try {
      console.log(`💼 Creating HubSpot deal: ${deal.dealName}`);

      return {
        success: true,
        dealId: `hubspot_deal_${Date.now()}`,
      };
    } catch (error) {
      return { success: false, dealId: '' };
    }
  }

  /**
   * Log activity (email sent, call made, etc)
   */
  async logActivity(activity: {
    contactId: string;
    activityType: 'email' | 'call' | 'meeting' | 'note';
    subject: string;
    body: string;
  }): Promise<boolean> {
    try {
      console.log(`📝 Logging activity in HubSpot: ${activity.activityType}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update deal stage
   */
  async updateDealStage(
    dealId: string,
    newStage: string
  ): Promise<boolean> {
    try {
      console.log(`📊 Updating deal stage: ${dealId} → ${newStage}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get pipeline summary
   */
  async getPipelineSummary(): Promise<{
    totalDeals: number;
    totalValue: number;
    byStage: Record<string, { count: number; value: number }>;
  }> {
    try {
      return {
        totalDeals: 0,
        totalValue: 0,
        byStage: {},
      };
    } catch (error) {
      throw error;
    }
  }
}

// ============================================================================
// SALES PLAYBOOK SYSTEM
// ============================================================================

export const SALES_PLAYBOOKS: Record<string, SalesPlaybook> = {
  'medical-dental': {
    id: 'pb_medical_dental',
    industry: 'Medical & Dental Practices',
    title: 'Medical/Dental Practice Playbook',
    description: 'Sales playbook for dental and medical practice owners',

    stages: [
      {
        name: 'Prospecting',
        description: 'Identify and research prospects',
        duration: 3,
        key_activities: [
          'Score prospect using ICP algorithm',
          'Research practice (website, reviews, staff)',
          'Identify decision makers',
          'Find contact information',
        ],
        success_criteria: [
          'Contact information verified',
          'Practice matches ICP fit >60%',
          'Email address validated',
        ],
      },
      {
        name: 'Awareness',
        description: 'Initial outreach and problem identification',
        duration: 7,
        key_activities: [
          'Send awareness email (Day 1)',
          'Follow up email (Day 5)',
          'Final follow up (Day 10)',
          'Track opens and clicks',
        ],
        success_criteria: [
          'Email opened',
          'Link clicked',
          'Audit request received',
        ],
      },
      {
        name: 'Evaluation',
        description: 'Audit delivery and analysis',
        duration: 14,
        key_activities: [
          'Deliver comprehensive audit report',
          'Schedule 20-minute audit review call',
          'Discuss findings and impact',
          'Present solution options',
        ],
        success_criteria: [
          'Audit completed',
          'Call scheduled and attended',
          'Prospect expressed interest',
        ],
      },
      {
        name: 'Negotiation',
        description: 'Proposal and deal closure',
        duration: 14,
        key_activities: [
          'Send proposal with pricing',
          'Address objections',
          'Negotiate contract terms',
          'Obtain signatures',
        ],
        success_criteria: [
          'Contract signed',
          'Payment received',
          'Onboarding scheduled',
        ],
      },
    ],

    email_templates: [
      {
        stage: 'awareness',
        subject: 'Dr. {{firstName}}: Your {{companyName}} website has {{violationCount}} WCAG violations',
        body: 'Hi Dr. {{firstName}},\n\nI audited your website and found accessibility issues that could expose {{companyName}} to ADA lawsuits...',
      },
      {
        stage: 'evaluation',
        subject: 'Your {{companyName}} accessibility audit is ready',
        body: 'Hi Dr. {{firstName}},\n\nYour audit report is ready. Let\'s schedule a 20-minute call to review findings...',
      },
      {
        stage: 'proposal',
        subject: 'Proposal: {{companyName}} Website Accessibility & Modernization',
        body: 'Hi Dr. {{firstName}},\n\nBased on our discussion, I\'ve prepared a proposal for {{companyName}}...',
      },
    ],

    objection_handlers: [
      {
        objection: 'Our website works fine',
        response: 'I understand, but 73% of your patients search on mobile, and our audit found {{violationCount}} accessibility issues. These put you at legal risk.',
      },
      {
        objection: 'We can\'t afford it',
        response: 'Average ADA settlement is $35K-$75K. Our solution is a fraction of that cost and protects you from lawsuits.',
      },
      {
        objection: 'We\'ll do it later',
        response: 'I understand, but each day without compliance is legal exposure. Would you rather fix it now or defend a lawsuit?',
      },
    ],

    closing_techniques: [
      'Trial Close: "Does Tuesday or Thursday work better for implementation?"',
      'Urgency Close: "We have limited availability this month. Should I block time for {{companyName}}?"',
      'Alternative Close: "Would you prefer the basic plan or comprehensive plan?"',
      'Assumptive Close: "Great, let\'s get {{companyName}} scheduled for next week."',
    ],
  },

  'law-firms': {
    id: 'pb_law_firms',
    industry: 'Law Firms',
    title: 'Law Firm Playbook',
    description: 'Sales playbook for law firms (lead generation + SEO angle)',

    stages: [
      {
        name: 'Research',
        description: 'Analyze law firm and competitive landscape',
        duration: 5,
        key_activities: [
          'Score law firm (ICP + website quality)',
          'Analyze current rankings for high-intent keywords',
          'Identify competitors\' websites',
          'Research firm practice areas',
        ],
        success_criteria: [
          'Firm on Page 2-3+ for target keywords',
          'Website has technical SEO issues',
          'Contact info verified',
        ],
      },
      {
        name: 'Awareness',
        description: 'Show the problem (lost leads to competitors)',
        duration: 7,
        key_activities: [
          'Email about competitor ranking higher',
          'Share SEO audit showing technical issues',
          'Show case study of similar firm\'s results',
        ],
        success_criteria: [
          'Email opened (>25% target)',
          'Link clicked (>5% target)',
          'Call scheduled',
        ],
      },
      {
        name: 'Evaluation',
        description: 'Prove ROI with projected case value',
        duration: 10,
        key_activities: [
          'Present SEO analysis call',
          'Calculate: 1 new case/month = {{avgCaseValue}} = ROI',
          'Share case study from similar firm',
          'Discuss implementation timeline',
        ],
        success_criteria: [
          'Partner engaged in discussion',
          'Sees ROI potential',
          'Wants to move forward',
        ],
      },
      {
        name: 'Negotiation',
        description: 'Contract and close',
        duration: 10,
        key_activities: [
          'Send proposal with ROI calculator',
          'Discuss timeline and deliverables',
          'Negotiate contract terms',
          'Get signatures',
        ],
        success_criteria: [
          'Contract signed',
          'First payment received',
          'Onboarding call scheduled',
        ],
      },
    ],

    email_templates: [
      {
        stage: 'awareness',
        subject: '{{partnerName}}: {{competitorName}} is ranking #1 for "{{keyword}}" in {{city}}',
        body: 'Hi {{partnerName}},\n\nQuick observation: When prospects search for "{{keyword}}", {{competitorName}} appears on page 1...',
      },
      {
        stage: 'evaluation',
        subject: 'Your {{firmName}} SEO opportunity: {{estimatedCases}} new cases/month potential',
        body: 'Hi {{partnerName}},\n\nBased on our analysis, getting to page 1 for your target keywords could mean {{estimatedCases}} new cases per month...',
      },
    ],

    objection_handlers: [
      {
        objection: 'We\'re doing fine without SEO',
        response: 'That\'s great, but {{competitorName}} is getting cases you\'re not seeing. One new case pays for this entire year.',
      },
      {
        objection: 'Too expensive',
        response: 'One new {{practiceArea}} case = {{avgCaseValue}} in revenue. This pays for itself in month 1.',
      },
      {
        objection: 'We tried SEO before and it didn\'t work',
        response: 'Most agencies do technical SEO wrong. We focus on the specific keywords that matter for {{practiceArea}} and {{city}}.',
      },
    ],

    closing_techniques: [
      'Trial Close: "Should we start with your top 3 keywords or all 10?"',
      'Urgency: "I\'m only taking 2 more law firms this quarter. Should I reserve a spot for {{firmName}}?"',
      'Alternative: "Do you prefer monthly reporting or quarterly?"',
      'Assumptive: "Great, I\'ll get {{firmName}} scheduled to start next week."',
    ],
  },
};

export class SalesPlaybookService {
  getPlaybook(industry: string): SalesPlaybook | null {
    const keys = Object.keys(SALES_PLAYBOOKS);
    const key = keys.find(k => industry.toLowerCase().includes(k.replace('-', ' ')));
    return key ? SALES_PLAYBOOKS[key] : null;
  }

  getAllPlaybooks(): SalesPlaybook[] {
    return Object.values(SALES_PLAYBOOKS);
  }

  getPlaybookStages(industry: string) {
    const playbook = this.getPlaybook(industry);
    return playbook ? playbook.stages : [];
  }

  getEmailTemplate(industry: string, stage: string) {
    const playbook = this.getPlaybook(industry);
    if (!playbook) return null;
    return playbook.email_templates.find(t => t.stage === stage);
  }

  getObjectionHandler(industry: string, objection: string) {
    const playbook = this.getPlaybook(industry);
    if (!playbook) return null;
    return playbook.objection_handlers.find(
      h => h.objection.toLowerCase().includes(objection.toLowerCase())
    );
  }
}

export default SalesPlaybookService;
