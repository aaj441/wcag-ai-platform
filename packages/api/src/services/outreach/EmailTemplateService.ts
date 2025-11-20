/**
 * Email Template Service for Cold Outreach
 *
 * Provides pre-built, tested email templates for different outreach scenarios
 * with personalization placeholders and A/B test variants
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'breakup' | 'value_add';
  hook: 'lawsuit_risk' | 'compliance' | 'revenue_loss' | 'competitive_advantage' | 'value_first';
  industryFocus?: string[];
  abTestVariant?: 'A' | 'B' | 'C';
  performanceMetrics?: {
    openRate?: number;
    responseRate?: number;
    conversionRate?: number;
    totalSent?: number;
  };
}

export interface PersonalizationData {
  firstName?: string;
  lastName?: string;
  companyName: string;
  companyWebsite: string;
  industry?: string;
  employeeCount?: number;
  recentNews?: string;
  specificViolations?: string[];
  competitorsMentioned?: string[];
  localReference?: string;
  mutualConnection?: string;
  riskScore?: number;
  estimatedLawsuitCost?: number;
}

export class EmailTemplateService {
  /**
   * Get all available email templates
   */
  public static getAllTemplates(): EmailTemplate[] {
    return [
      ...this.getInitialContactTemplates(),
      ...this.getFollowUpTemplates(),
      ...this.getValueAddTemplates(),
      ...this.getBreakupTemplates(),
    ];
  }

  /**
   * Initial Contact Templates (First Touch)
   */
  private static getInitialContactTemplates(): EmailTemplate[] {
    return [
      {
        id: 'initial_lawsuit_risk_a',
        name: 'Lawsuit Risk Alert - Direct Approach',
        subject: '{{companyName}} - Accessibility compliance gap detected',
        body: `Hi {{firstName}},

I ran a quick automated scan on {{companyWebsite}} and found {{violationCount}} WCAG violations that could expose {{companyName}} to ADA lawsuits.

{{industry}} companies in {{location}} saw a {{lawsuitTrend}}% increase in accessibility lawsuits last year, with average settlement costs of ${{averageSettlement}}.

{{specificViolation}}

I help {{industry}} companies eliminate these risks in 2-3 weeks. Would a 15-minute call this week make sense to review what I found?

Best,
{{consultantName}}
{{consultantTitle}}
{{consultantPhone}}

P.S. I've attached a 1-page summary of the top 5 violations - no strings attached.`,
        type: 'initial',
        hook: 'lawsuit_risk',
        industryFocus: ['healthtech', 'fintech', 'saas', 'ecommerce'],
        abTestVariant: 'A',
      },
      {
        id: 'initial_lawsuit_risk_b',
        name: 'Lawsuit Risk Alert - Question Approach',
        subject: 'Quick question about {{companyName}}\'s website accessibility',
        body: `{{firstName}},

Quick question - has {{companyName}} done an ADA Title III compliance audit on {{companyWebsite}} recently?

I ask because I noticed {{specificViolation}}, which is one of the top 3 issues cited in accessibility lawsuits against {{industry}} companies.

{{competitorName}} got hit with one of these last quarter - ${{settlementAmount}} settlement plus legal fees.

I run free 15-minute compliance checks for {{industry}} companies in {{location}}. Would this Thursday or Friday work for a quick call?

{{consultantName}}
{{consultantTitle}}
{{consultantPhone}}`,
        type: 'initial',
        hook: 'lawsuit_risk',
        industryFocus: ['healthtech', 'fintech', 'saas'],
        abTestVariant: 'B',
      },
      {
        id: 'initial_compliance_value',
        name: 'Compliance Value Proposition',
        subject: 'Making {{companyWebsite}} WCAG 2.1 AA compliant',
        body: `Hi {{firstName}},

I help {{industry}} companies become WCAG 2.1 AA compliant without rebuilding their entire site.

Most of my clients:
✓ Reduce compliance risk by 95%+ in 3 weeks
✓ Avoid $20k-$75k in potential lawsuit settlements
✓ Unlock accessibility as a competitive advantage

{{companyName}}'s site has {{violationCount}} violations that I can fix for a flat fee of ${{projectCost}}.

I've worked with {{competitorName1}} and {{competitorName2}} in {{location}}. Happy to share case studies.

Open to a brief call this week?

Best,
{{consultantName}}
{{consultantTitle}}`,
        type: 'initial',
        hook: 'compliance',
        abTestVariant: 'A',
      },
      {
        id: 'initial_competitive_advantage',
        name: 'Competitive Advantage Angle',
        subject: 'How {{competitorName}} is beating you on accessibility',
        body: `{{firstName}},

I just finished compliance audits for 3 {{industry}} companies in {{location}}, including {{competitorName}}.

{{competitorName}} scored 98/100 on WCAG compliance.
{{companyName}} scored {{complianceScore}}/100.

This matters because:
• {{percentage}}% of your market has disabilities
• Google ranks accessible sites higher
• Enterprise buyers require WCAG compliance

I can get {{companyName}} to 95+ compliance in 2-3 weeks.

Worth a 15-minute conversation?

{{consultantName}}
{{consultantTitle}}
{{consultantPhone}}`,
        type: 'initial',
        hook: 'competitive_advantage',
        industryFocus: ['saas', 'ecommerce'],
        abTestVariant: 'A',
      },
      {
        id: 'initial_value_first',
        name: 'Value-First Approach (Free Audit)',
        subject: 'Free accessibility audit for {{companyName}}',
        body: `Hi {{firstName}},

I'm doing free WCAG accessibility audits for {{industry}} companies in {{location}} this month.

No sales pitch, no obligation - just a professional 15-minute audit of {{companyWebsite}} with:
✓ Top 10 compliance gaps
✓ Lawsuit risk assessment
✓ Estimated fix costs
✓ Quick-win recommendations

I've done this for {{competitorName1}}, {{competitorName2}}, and {{competitorName3}}.

Does this Wednesday or Thursday work for you?

Best,
{{consultantName}}
{{consultantTitle}}
{{consultantPhone}}

P.S. This normally costs $500, but I'm building case studies in the {{industry}} vertical.`,
        type: 'initial',
        hook: 'value_first',
        abTestVariant: 'A',
      },
    ];
  }

  /**
   * Follow-Up Templates (2nd-4th Touch)
   */
  private static getFollowUpTemplates(): EmailTemplate[] {
    return [
      {
        id: 'follow_up_1_soft',
        name: 'Follow-Up Day 3 - Soft Bump',
        subject: 'Re: {{originalSubject}}',
        body: `{{firstName}},

Following up on my email from {{daysSince}} days ago about {{companyWebsite}}'s accessibility compliance.

Still happy to share the scan results I mentioned - found {{violationCount}} WCAG violations that put {{companyName}} at risk.

Quick 15-minute call work this week?

{{consultantName}}`,
        type: 'follow_up_1',
        hook: 'lawsuit_risk',
        abTestVariant: 'A',
      },
      {
        id: 'follow_up_1_value_add',
        name: 'Follow-Up Day 3 - Added Value',
        subject: 'Accessibility checklist for {{companyName}}',
        body: `Hi {{firstName}},

I know you're busy, so I put together a quick resource while waiting to hear back:

📄 "{{industry}} Accessibility Compliance Checklist" (attached)

This covers the top 10 WCAG violations I see in {{industry}} companies, plus quick fixes.

Still open to reviewing {{companyWebsite}}'s specific gaps if helpful.

Best,
{{consultantName}}

P.S. {{specificViolation}} - this one is on your homepage and takes 5 minutes to fix.`,
        type: 'follow_up_1',
        hook: 'value_first',
        abTestVariant: 'B',
      },
      {
        id: 'follow_up_2_urgency',
        name: 'Follow-Up Day 7 - Urgency',
        subject: 'Last call: {{companyName}} accessibility audit',
        body: `{{firstName}},

Last attempt here - wanted to make sure you saw this before I close out my audit queue for {{month}}.

Key findings from {{companyWebsite}}:
• {{violation1}}
• {{violation2}}
• {{violation3}}

Each of these has been cited in recent ADA lawsuits in {{industry}}.

I can fit {{companyName}} in this week if you're interested in a quick review call.

If not, no worries - I'll close this out.

{{consultantName}}
{{consultantPhone}}`,
        type: 'follow_up_2',
        hook: 'lawsuit_risk',
        abTestVariant: 'A',
      },
      {
        id: 'follow_up_2_case_study',
        name: 'Follow-Up Day 7 - Social Proof',
        subject: 'How {{competitorName}} avoided an ADA lawsuit',
        body: `{{firstName}},

Following up one more time because I just wrapped a project with {{competitorName}} that's relevant.

They had {{violationCount}} WCAG violations (similar to {{companyWebsite}}).

We fixed them in 18 days for ${{projectCost}}.

3 months later, they dodged an ADA complaint that hit {{otherCompetitor}} - who paid ${{settlementCost}} to settle.

Worth a conversation?

{{consultantName}}
{{consultantTitle}}`,
        type: 'follow_up_2',
        hook: 'competitive_advantage',
        abTestVariant: 'B',
      },
      {
        id: 'follow_up_3_final',
        name: 'Follow-Up Day 14 - Final Attempt',
        subject: 'Closing out {{companyName}} file',
        body: `{{firstName}},

I'm closing out my notes on {{companyName}}'s accessibility compliance.

If your priorities change and you want to review the {{violationCount}} WCAG violations I found, I'll keep the scan results for 30 days.

Otherwise, best of luck with {{companyName}}'s growth!

{{consultantName}}
{{consultantPhone}}`,
        type: 'follow_up_3',
        hook: 'lawsuit_risk',
        abTestVariant: 'A',
      },
    ];
  }

  /**
   * Value-Add Templates (Educational Content)
   */
  private static getValueAddTemplates(): EmailTemplate[] {
    return [
      {
        id: 'value_add_guide',
        name: 'Industry-Specific Guide',
        subject: '{{industry}} accessibility compliance guide',
        body: `Hi {{firstName}},

I put together a guide specifically for {{industry}} companies: "The {{industry}} Guide to WCAG 2.1 AA Compliance"

It covers:
✓ Top 10 violations in {{industry}}
✓ ADA lawsuit trends ({{year}})
✓ Cost/benefit analysis
✓ Quick-win fixes

Thought {{companyName}} might find it useful - attached.

No ask here, just wanted to share.

Best,
{{consultantName}}

P.S. If you ever want to discuss {{companyWebsite}}'s compliance specifically, happy to help.`,
        type: 'value_add',
        hook: 'value_first',
        abTestVariant: 'A',
      },
      {
        id: 'value_add_webinar',
        name: 'Webinar Invitation',
        subject: 'Free webinar: {{industry}} accessibility compliance',
        body: `{{firstName}},

I'm hosting a free webinar next week: "WCAG Compliance for {{industry}} Companies"

📅 {{webinarDate}} at {{webinarTime}}
⏱️ 30 minutes + Q&A

We'll cover:
• Current ADA lawsuit trends in {{industry}}
• Top 5 violations (with live examples)
• DIY fixes vs. professional help
• Enterprise compliance requirements

{{competitorName1}} and {{competitorName2}} teams are joining.

Want me to save you a spot?

{{consultantName}}
{{webinarLink}}`,
        type: 'value_add',
        hook: 'value_first',
        abTestVariant: 'A',
      },
    ];
  }

  /**
   * Breakup Templates (Final Touch)
   */
  private static getBreakupTemplates(): EmailTemplate[] {
    return [
      {
        id: 'breakup_helpful',
        name: 'Breakup - Helpful Exit',
        subject: 'Last resource for {{companyName}}',
        body: `{{firstName}},

I'll stop reaching out after this, but wanted to leave you with one last resource:

{{companyWebsite}} Accessibility Report (attached)
• {{violationCount}} WCAG violations detected
• Risk assessment
• Fix cost estimates

No response needed - this is just for your records if you ever need it.

Best of luck with {{companyName}}!

{{consultantName}}`,
        type: 'breakup',
        hook: 'value_first',
        abTestVariant: 'A',
      },
      {
        id: 'breakup_wrong_person',
        name: 'Breakup - Wrong Person',
        subject: 'Wrong person?',
        body: `{{firstName}},

I might be reaching out to the wrong person about {{companyName}}'s website accessibility.

If so, could you point me to whoever handles:
• Website compliance
• Legal/risk management
• Web development

If that's you and it's just not a priority right now, no worries - I'll stop following up.

Thanks,
{{consultantName}}`,
        type: 'breakup',
        hook: 'lawsuit_risk',
        abTestVariant: 'B',
      },
    ];
  }

  /**
   * Personalize an email template with prospect data
   */
  public static personalizeTemplate(
    template: EmailTemplate,
    data: PersonalizationData,
    additionalData?: Record<string, any>
  ): { subject: string; body: string } {
    const allData = {
      ...data,
      ...additionalData,
      violationCount: data.specificViolations?.length || 'several',
      firstName: data.firstName || 'there',
      industry: data.industry || 'your industry',
      location: additionalData?.location || 'your area',
      consultantName: additionalData?.consultantName || 'Your Name',
      consultantTitle: additionalData?.consultantTitle || 'Accessibility Consultant',
      consultantPhone: additionalData?.consultantPhone || '',
    };

    let subject = template.subject;
    let body = template.body;

    // Replace all placeholders
    Object.entries(allData).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, String(value || ''));
      body = body.replace(placeholder, String(value || ''));
    });

    return { subject, body };
  }

  /**
   * Get best performing template for a specific hook/industry
   */
  public static getBestTemplate(
    type: EmailTemplate['type'],
    hook: EmailTemplate['hook'],
    industry?: string
  ): EmailTemplate | null {
    const templates = this.getAllTemplates().filter(t => {
      const matchesType = t.type === type;
      const matchesHook = t.hook === hook;
      const matchesIndustry = !industry || !t.industryFocus || t.industryFocus.includes(industry);
      return matchesType && matchesHook && matchesIndustry;
    });

    if (templates.length === 0) return null;

    // Sort by response rate (if available), otherwise return first match
    return templates.sort((a, b) => {
      const aRate = a.performanceMetrics?.responseRate || 0;
      const bRate = b.performanceMetrics?.responseRate || 0;
      return bRate - aRate;
    })[0];
  }

  /**
   * Get A/B test variants for a template
   */
  public static getABVariants(templateId: string): EmailTemplate[] {
    const baseTemplate = this.getAllTemplates().find(t => t.id === templateId);
    if (!baseTemplate) return [];

    return this.getAllTemplates().filter(t =>
      t.type === baseTemplate.type &&
      t.hook === baseTemplate.hook &&
      t.abTestVariant !== baseTemplate.abTestVariant
    );
  }

  /**
   * Update template performance metrics
   */
  public static updateTemplateMetrics(
    templateId: string,
    metrics: Partial<EmailTemplate['performanceMetrics']>
  ): void {
    // In production, this would update a database
    // For now, this is a placeholder for the interface
    console.log(`Updating metrics for template ${templateId}:`, metrics);
  }

  /**
   * Get template recommendations based on prospect profile
   */
  public static recommendTemplate(
    prospectData: PersonalizationData,
    sequencePosition: number = 1
  ): EmailTemplate | null {
    // Determine best hook based on prospect data
    let hook: EmailTemplate['hook'] = 'value_first';

    if (prospectData.riskScore && prospectData.riskScore > 70) {
      hook = 'lawsuit_risk';
    } else if (prospectData.competitorsMentioned && prospectData.competitorsMentioned.length > 0) {
      hook = 'competitive_advantage';
    } else if (prospectData.industry && ['fintech', 'healthtech'].includes(prospectData.industry)) {
      hook = 'compliance';
    }

    // Determine template type based on sequence position
    let type: EmailTemplate['type'] = 'initial';
    if (sequencePosition === 2) type = 'follow_up_1';
    else if (sequencePosition === 3) type = 'follow_up_2';
    else if (sequencePosition === 4) type = 'follow_up_3';
    else if (sequencePosition >= 5) type = 'breakup';

    return this.getBestTemplate(type, hook, prospectData.industry);
  }
}

export default EmailTemplateService;
