/**
 * EMAIL SEQUENCES CONFIGURATION
 * Automated outreach templates for different ICPs and personas
 *
 * Email sequence strategy:
 * - 3-email sequence (Day 1, Day 5, Day 10)
 * - ICP-specific messaging
 * - Persona-specific positioning
 * - A/B testing framework
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[]; // {{companyName}}, {{contactName}}, etc.
  cta: string; // Call to action
  dayOffset: number; // When to send (0 = day 1, 5 = day 6, etc)
  icpIds?: string[]; // ICPs this sequence applies to
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string;
  icpId: string;
  personaRole: string; // 'owner', 'operations', 'marketing'
  emails: EmailTemplate[];
  openRateTarget: number; // 0-1
  ctRateTarget: number; // 0-1
  conversionTarget: number; // 0-1
}

// ============================================================================
// EMAIL TEMPLATES - Medical & Dental Practices
// ============================================================================

export const EMAIL_MEDICAL_DENTAL_DAY1: EmailTemplate = {
  id: 'email-medical-dental-day1',
  name: 'Medical/Dental - Day 1 - Problem Awareness',
  subject: '{{contactName}}: Your website has {{violationCount}} WCAG violations (Free 5-min audit)',
  body: `Hi {{contactName}},

I audited {{companyName}}'s website this morning and found {{violationCount}} accessibility violations that could put your practice at legal risk.

Here's what I found:
- {{topViolation}} (WCAG {{wcagLevel}})
- Mobile responsiveness issues ({{mobileScore}}% pass rate)
- Form field accessibility gaps
- Color contrast problems

**Why this matters:**
Dental practices have seen a 310% increase in ADA lawsuits since 2020. Average settlement: $35K-$75K. Your insurance already knows about this risk.

I'm offering free 5-minute accessibility audits to {{cityName}}-area practices this week. No strings attached, no sales pitch.

Want to see the full audit report?

Reply to this email or click below:
[Get Free Audit Report]

- {{senderName}}
WCAG AI Platform
P.S. I just reviewed {{competitorName}} (your competitor) - they score 88/100. I can show you how to get there too.`,
  variables: [
    'contactName',
    'companyName',
    'violationCount',
    'topViolation',
    'wcagLevel',
    'mobileScore',
    'cityName',
    'senderName',
    'competitorName',
  ],
  cta: 'Get Free Audit Report',
  dayOffset: 0,
  icpIds: ['icp-medical-dental'],
};

export const EMAIL_MEDICAL_DENTAL_DAY5: EmailTemplate = {
  id: 'email-medical-dental-day5',
  name: 'Medical/Dental - Day 5 - Social Proof & Urgency',
  subject: 'Re: Your website audit - 4 practices fixed their accessibility this month',
  body: `Hi {{contactName}},

Following up on the accessibility audit I sent earlier this week.

I've been busy helping other {{cityName}}-area practices fix their websites:
- {{practice1}}: 95 violations → 3 violations (72 hours)
- {{practice2}}: WCAG A → WCAG AA compliant
- {{practice3}}: 45% increase in mobile appointment bookings

Each practice went from "worried about lawsuits" to "confident and compliant."

**The cost of waiting:**
- One ADA demand letter: $35K-$75K
- Lost patient trust: Immeasurable
- Your competitor already fixed theirs

**What happens next:**
If {{companyName}} wants to become the most accessible practice in {{cityName}}, I can have an initial fix deployed in 72 hours.

Ready to start? Just reply with "audit" and I'll send the full report.

- {{senderName}}
WCAG AI Platform`,
  variables: [
    'contactName',
    'practice1',
    'practice2',
    'practice3',
    'cityName',
    'companyName',
    'senderName',
  ],
  cta: 'Get Full Audit Report',
  dayOffset: 5,
  icpIds: ['icp-medical-dental'],
};

export const EMAIL_MEDICAL_DENTAL_DAY10: EmailTemplate = {
  id: 'email-medical-dental-day10',
  name: 'Medical/Dental - Day 10 - FOMO & Objection Handle',
  subject: 'Last chance: Free audit expires soon ({{expirationDate}})',
  body: `Hi {{contactName}},

I've sent two audits and haven't heard back. Completely understand - you're busy running the practice.

But I want to make sure you see this because:

**Option A: Do nothing**
- Keep the status quo
- Hope you don't get an ADA demand letter
- Hope patients don't leave due to outdated website
- Risk: $35K-$75K liability + reputational damage

**Option B: 30 minutes of your time**
- I send you the full audit report (free)
- You review it (15 min)
- Quick call to discuss options (15 min)
- Make an informed decision

The free audit expires on {{expirationDate}}. After that, I'll move on to other practices in {{cityName}}.

Reply with "audit" if you want to take a look. I'll have it in your inbox in 2 hours.

- {{senderName}}
WCAG AI Platform`,
  variables: [
    'contactName',
    'expirationDate',
    'cityName',
    'senderName',
  ],
  cta: 'Get My Free Audit',
  dayOffset: 10,
  icpIds: ['icp-medical-dental'],
};

// ============================================================================
// EMAIL TEMPLATES - Law Firms
// ============================================================================

export const EMAIL_LAW_FIRMS_DAY1: EmailTemplate = {
  id: 'email-law-firms-day1',
  name: 'Law Firms - Day 1 - Lead Generation Focus',
  subject: '{{contactName}}: {{competitorName}} is outranking you for "{{keyword}}" on Google',
  body: `Hi {{contactName}},

Quick observation: When I search for "{{keyword}} in {{cityName}}", {{competitorName}} appears on the first page. {{companyName}} doesn't show up until page 3.

Why this matters:
- 73% of potential clients start with Google
- Page 3 = zero new cases from search
- {{competitorName}} is getting cases that could be yours

I did a quick website audit and found {{issues}} that are hurting your SEO:
- {{issue1}}
- {{issue2}}
- {{issue3}}

**The opportunity:**
I help law firms get to page 1 for high-intent keywords. {{firmName}} went from page 4 → page 1 in 6 weeks. {{otherFirm}} increased new cases by {{caseIncrease}}%.

Want to see your SEO audit?

Reply to this email and I'll send it over. No obligation.

- {{senderName}}
WCAG AI Platform
P.S. I focus on {{practiceArea}} law. That's why I reached out.`,
  variables: [
    'contactName',
    'competitorName',
    'keyword',
    'cityName',
    'companyName',
    'issues',
    'issue1',
    'issue2',
    'issue3',
    'firmName',
    'otherFirm',
    'caseIncrease',
    'senderName',
    'practiceArea',
  ],
  cta: 'Get My SEO Audit',
  dayOffset: 0,
  icpIds: ['icp-law-firms'],
};

export const EMAIL_LAW_FIRMS_DAY5: EmailTemplate = {
  id: 'email-law-firms-day5',
  name: 'Law Firms - Day 5 - ROI Proof',
  subject: 'One new case = ROI (How {{firmName}} got 12 this quarter)',
  body: `Hi {{contactName}},

Quick math on ROI:

If {{companyName}} gets just **one new case** from your website this month, that's:
- Average personal injury case value: {{avgCaseValue}}
- Website cost: {{monthlyFee}}
- Payback: Immediate

Here's what other {{practiceArea}} firms saw:
- {{firmName}}: 12 new cases in Q2 (was getting 4/quarter)
- {{otherFirm}}: Doubled SEO leads in 4 months
- {{thirdFirm}}: Now #1 local result for "{{keyword}}"

**How we do it:**
1. Fix website technical SEO (accessibility, speed, mobile)
2. Optimize for high-intent keywords in your practice area
3. Set up conversion tracking
4. Monthly reporting on leads, not just traffic

**Next steps:**
If you're serious about growing through your website, let's talk. 30-minute call to discuss your goals.

When are you free this week?

- {{senderName}}
WCAG AI Platform`,
  variables: [
    'contactName',
    'companyName',
    'avgCaseValue',
    'monthlyFee',
    'practiceArea',
    'firmName',
    'otherFirm',
    'thirdFirm',
    'keyword',
    'senderName',
  ],
  cta: 'Schedule 30-Minute Call',
  dayOffset: 5,
  icpIds: ['icp-law-firms'],
};

export const EMAIL_LAW_FIRMS_DAY10: EmailTemplate = {
  id: 'email-law-firms-day10',
  name: 'Law Firms - Day 10 - Last Attempt',
  subject: 'Is now a bad time? (I can follow up later)',
  body: `Hi {{contactName}},

I've reached out 2x about getting {{companyName}} to page 1 for "{{keyword}}" in {{cityName}}.

If now isn't a good time, I get it. Law is busy.

But I want to be upfront: I'm only taking on {{spotLimit}} more {{practiceArea}} firms this quarter. Once {{spotLimit}} is full, I'm closing the door on new legal clients.

**Here's what you're getting if we work together:**
- Website audit + SEO analysis
- 90-day optimization plan
- Monthly case tracking
- Commitment: One new case per month (or we adjust strategy)

{{competitorName}} already said yes. {{otherFirm}} just started this month.

If {{companyName}} wants to be the next {{practiceArea}} firm getting 10+ new cases per month, reply with your availability.

Otherwise, no hard feelings. I'll stop bugging you.

- {{senderName}}
WCAG AI Platform`,
  variables: [
    'contactName',
    'companyName',
    'keyword',
    'cityName',
    'spotLimit',
    'practiceArea',
    'competitorName',
    'otherFirm',
    'senderName',
  ],
  cta: 'Schedule Call (Limited Spots)',
  dayOffset: 10,
  icpIds: ['icp-law-firms'],
};

// ============================================================================
// EMAIL SEQUENCES - Combined
// ============================================================================

export const MEDICAL_DENTAL_SEQUENCE: EmailSequence = {
  id: 'seq-medical-dental-owner',
  name: 'Medical/Dental - Owner Focus',
  description: 'Compliance + legal liability angle for practice owners',
  icpId: 'icp-medical-dental',
  personaRole: 'owner',
  emails: [
    EMAIL_MEDICAL_DENTAL_DAY1,
    EMAIL_MEDICAL_DENTAL_DAY5,
    EMAIL_MEDICAL_DENTAL_DAY10,
  ],
  openRateTarget: 0.25,
  ctRateTarget: 0.08,
  conversionTarget: 0.15,
};

export const LAW_FIRMS_SEQUENCE: EmailSequence = {
  id: 'seq-law-firms-owner',
  name: 'Law Firms - Partner Focus',
  description: 'New business generation + SEO angle for managing partners',
  icpId: 'icp-law-firms',
  personaRole: 'owner',
  emails: [
    EMAIL_LAW_FIRMS_DAY1,
    EMAIL_LAW_FIRMS_DAY5,
    EMAIL_LAW_FIRMS_DAY10,
  ],
  openRateTarget: 0.28,
  ctRateTarget: 0.10,
  conversionTarget: 0.18,
};

// ============================================================================
// Export functions
// ============================================================================

export const ALL_SEQUENCES = [
  MEDICAL_DENTAL_SEQUENCE,
  LAW_FIRMS_SEQUENCE,
];

export function getSequenceByICPAndPersona(
  icpId: string,
  personaRole: string
): EmailSequence | undefined {
  return ALL_SEQUENCES.find(
    seq => seq.icpId === icpId && seq.personaRole === personaRole
  );
}

export function getAllSequences(): EmailSequence[] {
  return ALL_SEQUENCES;
}

export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  Object.entries(variables).forEach(([key, value]) => {
    subject = subject.replace(`{{${key}}}`, value);
    body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return { subject, body };
}

export function getSequenceMetrics(sequence: EmailSequence) {
  return {
    sequenceId: sequence.id,
    name: sequence.name,
    emailCount: sequence.emails.length,
    openRateTarget: `${(sequence.openRateTarget * 100).toFixed(0)}%`,
    ctRateTarget: `${(sequence.ctRateTarget * 100).toFixed(1)}%`,
    conversionTarget: `${(sequence.conversionTarget * 100).toFixed(0)}%`,
    expectedConversionPerThousandSent: Math.round(1000 * sequence.conversionTarget),
  };
}
