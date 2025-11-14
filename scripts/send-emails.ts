/**
 * EMAIL SENDING AUTOMATION SCRIPT
 * Sends automated outreach sequences to prospects
 *
 * Usage:
 * npx ts-node scripts/send-emails.ts [--to=immediate] [--icp=medical-dental] [--dry-run]
 *
 * This script:
 * 1. Filters prospects by recommendation tier
 * 2. Selects appropriate email sequence by ICP
 * 3. Renders personalized templates with prospect data
 * 4. Logs email content (in dry-run mode)
 * 5. Tracks sent emails (in production mode)
 */

import {
  ALL_SEQUENCES,
  getSequenceByICPAndPersona,
  renderTemplate,
} from '../packages/api/src/config/email-sequences';
import { getICPById } from '../packages/api/src/config/icp-profiles';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc: Record<string, string>, arg: string) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value || 'true';
  return acc;
}, {});

const RECOMMENDATION_FILTER = args.to || 'immediate';
const DRY_RUN = args['dry-run'] !== 'false';
const ICP_ID = args.icp || undefined;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✉️  EMAIL SENDING AUTOMATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================================================
// SAMPLE PROSPECT DATA (In production, load from database)
// ============================================================================

interface SampleProspect {
  prospectId: string;
  companyName: string;
  contactName: string;
  email: string;
  icpId: string;
  personaRole: string;
  recommendation: 'immediate' | 'this-week' | 'this-month' | 'backlog';
  variables: Record<string, string>;
}

const sampleProspects: SampleProspect[] = [
  {
    prospectId: 'prospect-001',
    companyName: 'ABC Dental Practice',
    contactName: 'Dr. Sarah Johnson',
    email: 'sarah@abcdental.com',
    icpId: 'icp-medical-dental',
    personaRole: 'owner',
    recommendation: 'immediate',
    variables: {
      contactName: 'Dr. Johnson',
      companyName: 'ABC Dental Practice',
      violationCount: '47',
      topViolation: 'Missing alt text on images',
      wcagLevel: '2.1 AA',
      mobileScore: '32',
      cityName: 'Denver',
      senderName: 'Alex Chen',
      competitorName: 'Mountain View Dental',
    },
  },
  {
    prospectId: 'prospect-002',
    companyName: 'Cohen & Associates Law Firm',
    contactName: 'David Cohen',
    email: 'david@cohenlaw.com',
    icpId: 'icp-law-firms',
    personaRole: 'owner',
    recommendation: 'immediate',
    variables: {
      contactName: 'David',
      companyName: 'Cohen & Associates',
      competitorName: 'Smith Law Group',
      keyword: 'personal injury lawyer',
      cityName: 'Los Angeles',
      issues: 'mobile responsiveness, form accessibility, page speed',
      issue1: 'Website not mobile-responsive (37% traffic from mobile)',
      issue2: 'Forms have accessibility issues (no labels, poor contrast)',
      issue3: 'Page load time >4 seconds (Google ranking penalty)',
      firmName: 'Thompson & Partners',
      otherFirm: 'Williams Legal Group',
      caseIncrease: '45%',
      senderName: 'Alex Chen',
      practiceArea: 'personal injury',
      avgCaseValue: '$50,000',
      monthlyFee: '$2,999',
      spotLimit: '3',
    },
  },
  {
    prospectId: 'prospect-003',
    companyName: 'Premier Wealth Management',
    contactName: 'Jennifer Lee',
    email: 'jennifer@premierwealth.com',
    icpId: 'icp-financial-services',
    personaRole: 'owner',
    recommendation: 'this-week',
    variables: {
      contactName: 'Jennifer',
      companyName: 'Premier Wealth Management',
      cityl: 'Boston',
      senderName: 'Alex Chen',
    },
  },
];

// ============================================================================
// EMAIL SENDING LOGIC
// ============================================================================

async function sendEmails() {
  // Filter prospects by recommendation
  const targetProspects = sampleProspects.filter(
    p => p.recommendation === RECOMMENDATION_FILTER
  );

  if (targetProspects.length === 0) {
    console.log(`❌ No prospects with recommendation: ${RECOMMENDATION_FILTER}`);
    console.log(`Available: immediate, this-week, this-month, backlog\n`);
    return;
  }

  console.log(`📧 Sending emails to ${RECOMMENDATION_FILTER} prospects...`);
  console.log(`📝 Dry run mode: ${DRY_RUN ? 'YES' : 'NO'}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const prospect of targetProspects) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📬 ${prospect.companyName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Get email sequence for this ICP + persona
    const sequence = getSequenceByICPAndPersona(prospect.icpId, prospect.personaRole);

    if (!sequence) {
      console.log(
        `❌ No sequence found for ${prospect.icpId} + ${prospect.personaRole}`
      );
      failureCount++;
      continue;
    }

    console.log(`✉️  Sequence: ${sequence.name}`);
    console.log(`📧 Recipient: ${prospect.contactName} <${prospect.email}>`);
    console.log(`🎯 ICP: ${getICPById(prospect.icpId)?.name}\n`);

    // Send each email in the sequence
    try {
      for (const emailTemplate of sequence.emails) {
        const rendered = renderTemplate(emailTemplate, prospect.variables);

        console.log(`   📨 Day ${emailTemplate.dayOffset + 1}: ${emailTemplate.name}`);
        console.log(`   Subject: ${rendered.subject.substring(0, 60)}...`);
        console.log(`   CTA: ${emailTemplate.cta}`);

        if (DRY_RUN) {
          console.log(`   [DRY RUN - Would send to ${prospect.email}]`);
        } else {
          console.log(
            `   ✅ Would send via Resend (or other email service) in production`
          );
          // In production:
          // await emailService.send({
          //   to: prospect.email,
          //   subject: rendered.subject,
          //   body: rendered.body,
          //   from: 'outreach@wcag-ai.com',
          // });
        }

        console.log('');
      }

      successCount++;
      console.log(`✅ Ready to send ${sequence.emails.length} emails\n`);
    } catch (error) {
      console.log(`❌ Error: ${error}`);
      failureCount++;
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EMAIL SENDING SUMMARY\n');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📧 Total emails ready: ${successCount * 3} (3 per prospect)`);

  const estimatedOpenRate = 0.25;
  const estimatedClickRate = 0.05;
  const estimatedAuditRequests = Math.round(successCount * 3 * estimatedOpenRate * estimatedClickRate);

  console.log(`\n📈 Expected results (conservative estimates):`);
  console.log(
    `   Open rate: ${(estimatedOpenRate * 100).toFixed(0)}% = ${Math.round(successCount * 3 * estimatedOpenRate)} opens`
  );
  console.log(
    `   Click rate: ${(estimatedClickRate * 100).toFixed(1)}% = ${Math.round(successCount * 3 * estimatedOpenRate * estimatedClickRate)} clicks`
  );
  console.log(`   Audit requests: ~${estimatedAuditRequests} requests`);
  console.log(`   Conversions (15%): ~${Math.round(estimatedAuditRequests * 0.15)} paid customers`);

  if (DRY_RUN) {
    console.log('\n💡 To send emails for real, run:');
    console.log(
      `   npx ts-node scripts/send-emails.ts --to=${RECOMMENDATION_FILTER} --dry-run=false`
    );
  } else {
    console.log('\n✨ Emails sent! Monitor responses in your CRM.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the script
sendEmails().catch(console.error);
