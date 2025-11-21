# Cold Outreach Quick Start Guide

Get started with the WCAG AI Platform's cold outreach system in 15 minutes.

## Prerequisites

- API server running on `http://localhost:3001`
- Anthropic API key configured in `.env`
- SendGrid account set up (optional for email sending)
- Prospect data in database

## Step 1: Import Your Prospects (2 minutes)

First, add prospects to your database. You can use the existing leads API or create prospects directly.

```javascript
// Using the leads API
const response = await fetch('http://localhost:3001/api/leads/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['healthtech', 'digital health'],
    minEmployees: 100,
    maxEmployees: 1000,
  })
});

const { leads } = await response.json();
console.log(`Found ${leads.length} potential prospects`);
```

## Step 2: Run WCAG Scans (3 minutes)

Scan prospect websites to identify violations:

```javascript
// This should already be part of your lead discovery
// But if you need to scan a specific website:
const scanResponse = await fetch('http://localhost:3001/api/violations/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://prospect-website.com',
    tenantId: 'your-tenant-id'
  })
});

const { violations, complianceScore } = await scanResponse.json();
```

## Step 3: Generate AI-Personalized Email (2 minutes)

Use AI to create a hyper-personalized outreach email:

```javascript
const emailResponse = await fetch('http://localhost:3001/api/outreach/ai/generate-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    context: {
      prospect: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        companyName: 'HealthTech Inc',
        companyWebsite: 'healthtech.com',
        industry: 'healthtech',
        employeeCount: 250
      },
      scanResults: {
        violations: [
          {
            code: '1.4.3',
            description: 'Color contrast failure on call-to-action buttons',
            impact: 'critical',
            element: 'button.cta-primary'
          },
          {
            code: '3.3.2',
            description: 'Missing form field labels in patient intake form',
            impact: 'serious',
            element: 'form#patient-intake'
          },
          {
            code: '2.1.1',
            description: 'Keyboard trap in appointment scheduler modal',
            impact: 'critical',
            element: '#scheduler-modal'
          }
        ],
        complianceScore: 62,
        riskLevel: 'high'
      },
      competitorIntel: {
        competitors: ['CompetitorA Health', 'CompetitorB Medical'],
        competitorComplianceScores: {
          'CompetitorA Health': 89,
          'CompetitorB Medical': 85
        }
      },
      industryInsights: {
        lawsuitTrends: 32,
        averageSettlement: 200000,
        commonViolations: ['1.4.3', '3.3.2', '2.1.1']
      }
    },
    templateType: 'initial',
    hook: 'lawsuit_risk'
  })
});

const { email } = await emailResponse.json();

console.log('Subject:', email.subject);
console.log('Body:', email.body);
console.log('Personalization Score:', email.personalizationScore);
console.log('Hooks Used:', email.hooks);
```

**Expected Output:**

```
Subject: HealthTech Inc: 47 violations + ADA risk

Body:
Hi Sarah,

I ran a scan on healthtech.com and found 47 WCAG violations - including 12
critical issues that violate ADA Title III.

The biggest concern: Your appointment scheduler has a keyboard trap (WCAG 2.1.1)
that blocks 19% of users from booking appointments. CompetitorA Health fixed
this exact issue last quarter and jumped from 62% to 89% compliance.

Healthcare companies saw a 32% increase in accessibility lawsuits last year,
with average settlements of $200,000.

Worth 15 minutes Tuesday at 10am to review? Here's your live audit:
https://wcag-ai.com/audit/healthtech

Best,
Alex Chen
WCAG AI Platform | Fixed 12,000+ violations | Avg lawsuit prevention: $240K

Personalization Score: 95/100
Hooks Used: ['specific_violations', 'competitor_comparison', 'legal_risk',
            'quantified_impact', 'industry_statistics']
```

## Step 4: Enroll in Multi-Touch Campaign (3 minutes)

Enroll the prospect in an automated 8-touch sequence:

```javascript
// First, create a prospect record if not already done
const prospectId = 'prospect_123'; // From your database

// Enroll in campaign
await fetch('http://localhost:3001/api/outreach/multi-channel/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prospectId: prospectId,
    strategyName: 'enterprise_aggressive', // or 'saas_balanced', 'relationship_conservative'
    preferences: {
      includeLinkedIn: true,
      includeColdCalls: true,
      emailFrequency: 'moderate',
      respectWorkHours: true,
      timezone: 'America/Los_Angeles'
    }
  })
});

console.log('✅ Prospect enrolled in 8-touch campaign');
```

**What Happens Next:**

The prospect will automatically receive:
- **Day 0**: Email with specific violations
- **Day 2**: LinkedIn engagement
- **Day 4**: Video showing their site failing screen reader test
- **Day 7**: Phone call attempt
- **Day 10**: Case study email
- **Day 14**: LinkedIn InMail
- **Day 21**: DOJ deadline email
- **Day 30**: Breakup email

## Step 5: Generate LinkedIn Outreach (2 minutes)

Create LinkedIn connection request and InMail:

```javascript
// LinkedIn Connection Request (300 char limit)
const connectionResponse = await fetch('http://localhost:3001/api/outreach/linkedin/connection-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: {
      name: 'Sarah Johnson',
      title: 'VP of Product',
      company: 'HealthTech Inc',
      sharedConnections: 5,
      recentPosts: [
        {
          content: 'Excited to announce our new patient portal launch...',
          date: '2024-01-15',
          likes: 47
        }
      ]
    },
    context: {
      companyName: 'HealthTech Inc',
      industry: 'healthtech',
      specificViolations: ['1.4.3', '3.3.2', '2.1.1']
    }
  })
});

const { message } = await connectionResponse.json();
console.log('LinkedIn Connection Request:', message.content);
console.log('Character Count:', message.characterCount);

// LinkedIn InMail (longer message)
const inmailResponse = await fetch('http://localhost:3001/api/outreach/linkedin/inmail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile: {
      name: 'Sarah Johnson',
      title: 'VP of Product',
      company: 'HealthTech Inc',
      recentPosts: [
        {
          content: 'Excited to announce our new patient portal launch...',
          date: '2024-01-15',
          likes: 47
        }
      ]
    },
    context: {
      companyName: 'HealthTech Inc',
      industry: 'healthtech',
      riskScore: 85,
      specificViolations: ['1.4.3', '3.3.2', '2.1.1']
    }
  })
});

const { message: inmailMessage } = await inmailResponse.json();
console.log('LinkedIn InMail:', inmailMessage.content);
```

## Step 6: Generate Cold Call Script (2 minutes)

Get a personalized cold call script:

```javascript
const scriptResponse = await fetch('http://localhost:3001/api/outreach/call/script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    context: {
      prospect: {
        firstName: 'Sarah',
        companyName: 'HealthTech Inc',
        companyWebsite: 'healthtech.com',
        industry: 'healthtech'
      },
      callReason: 'email_follow_up',
      priorInteraction: {
        type: 'email',
        date: '2024-01-15',
        details: 'Sent initial outreach email with audit results'
      },
      scanResults: {
        violationCount: 47,
        criticalIssues: 12,
        complianceScore: 62
      }
    }
  })
});

const { script } = await scriptResponse.json();

console.log('=== COLD CALL SCRIPT ===\n');
console.log('OPENING:');
console.log(script.opening);
console.log('\nVALUE PROPOSITION:');
console.log(script.valueProposition);
console.log('\nQUALIFYING QUESTIONS:');
script.qualifyingQuestions.forEach((q, i) => console.log(`${i+1}. ${q}`));
console.log('\nOBJECTION HANDLERS:');
Object.entries(script.objectionHandlers).forEach(([objection, response]) => {
  console.log(`\n${objection.toUpperCase()}:`);
  console.log(response);
});
console.log('\nCLOSING CTA:');
console.log(script.closingCTA);
console.log('\nVOICEMAIL SCRIPT:');
console.log(script.voicemailScript);
```

## Step 7: Monitor Campaign Performance (1 minute)

Check how your campaigns are performing:

```javascript
// Get campaign statistics
const statsResponse = await fetch('http://localhost:3001/api/outreach/campaigns/enterprise_aggressive/stats');
const { stats } = await statsResponse.json();

console.log('=== CAMPAIGN PERFORMANCE ===');
console.log(`Total Prospects: ${stats.totalProspects}`);
console.log(`Emails Sent: ${stats.emailsSent}`);
console.log(`Emails Opened: ${stats.emailsOpened} (${stats.openRate.toFixed(1)}%)`);
console.log(`Emails Clicked: ${stats.emailsClicked}`);
console.log(`Replies: ${stats.replies} (${stats.responseRate.toFixed(1)}%)`);
console.log(`Conversions: ${stats.conversions} (${stats.conversionRate.toFixed(1)}%)`);

console.log('\n=== BY STEP ===');
stats.byStep.forEach(step => {
  console.log(`Step ${step.step}: ${step.sent} sent, ${step.opened} opened, ${step.replied} replied`);
});

// Get engagement score for specific prospect
const engagementResponse = await fetch('http://localhost:3001/api/outreach/multi-channel/engagement/prospect_123');
const { engagement } = await engagementResponse.json();

console.log('\n=== PROSPECT ENGAGEMENT ===');
console.log(`Overall Score: ${engagement.score}/100`);
console.log(`Email: ${engagement.breakdown.email}`);
console.log(`LinkedIn: ${engagement.breakdown.linkedin}`);
console.log(`Phone: ${engagement.breakdown.phone}`);
console.log(`Recommendation: ${engagement.recommendation}`);
```

## Complete Example: Full Outreach Flow

Here's a complete example putting it all together:

```javascript
async function launchColdOutreach(prospectData) {
  console.log('🚀 Launching cold outreach for', prospectData.companyName);

  // Step 1: Scan website
  console.log('📊 Scanning website...');
  const scanResponse = await fetch('http://localhost:3001/api/violations/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: prospectData.website,
      tenantId: 'consultant_123'
    })
  });
  const { violations, complianceScore } = await scanResponse.json();

  // Step 2: Generate AI email
  console.log('✍️ Generating personalized email...');
  const emailResponse = await fetch('http://localhost:3001/api/outreach/ai/generate-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        prospect: prospectData,
        scanResults: {
          violations: violations.slice(0, 5), // Top 5
          complianceScore,
          riskLevel: complianceScore < 70 ? 'high' : 'medium'
        }
      },
      templateType: 'initial',
      hook: 'lawsuit_risk'
    })
  });
  const { email } = await emailResponse.json();

  console.log('\n📧 Generated Email:');
  console.log('Subject:', email.subject);
  console.log('Personalization Score:', email.personalizationScore);

  // Step 3: Generate LinkedIn message
  console.log('\n💼 Generating LinkedIn outreach...');
  const linkedInResponse = await fetch('http://localhost:3001/api/outreach/linkedin/connection-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: {
        name: `${prospectData.firstName} ${prospectData.lastName}`,
        title: prospectData.title || 'Decision Maker',
        company: prospectData.companyName
      },
      context: prospectData
    })
  });
  const { message: linkedInMessage } = await linkedInResponse.json();

  console.log('LinkedIn Message:', linkedInMessage.content);

  // Step 4: Generate call script
  console.log('\n📞 Generating call script...');
  const scriptResponse = await fetch('http://localhost:3001/api/outreach/call/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        prospect: prospectData,
        callReason: 'cold_outreach',
        scanResults: {
          violationCount: violations.length,
          criticalIssues: violations.filter(v => v.impact === 'critical').length,
          complianceScore
        }
      }
    })
  });
  const { script } = await scriptResponse.json();

  console.log('Call Opening:', script.opening);

  // Step 5: Enroll in campaign
  console.log('\n🎯 Enrolling in multi-channel campaign...');
  await fetch('http://localhost:3001/api/outreach/multi-channel/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prospectId: prospectData.id,
      strategyName: 'enterprise_aggressive',
      preferences: {
        includeLinkedIn: true,
        includeColdCalls: true,
        emailFrequency: 'moderate'
      }
    })
  });

  console.log('\n✅ Cold outreach launched successfully!');
  console.log(`
  Next Steps:
  • Email will be sent today
  • LinkedIn engagement on Day 2
  • Video audit sent on Day 4
  • Call scheduled for Day 7
  • Full 8-touch sequence activated
  `);

  return {
    email,
    linkedInMessage,
    script,
    violations,
    complianceScore
  };
}

// Example usage
const prospect = {
  id: 'prospect_123',
  firstName: 'Sarah',
  lastName: 'Johnson',
  companyName: 'HealthTech Inc',
  website: 'https://healthtech.com',
  industry: 'healthtech',
  employeeCount: 250,
  title: 'VP of Product'
};

launchColdOutreach(prospect)
  .then(result => console.log('🎉 Success!', result))
  .catch(error => console.error('❌ Error:', error));
```

## Available Campaign Strategies

Choose the right strategy for your prospect:

| Strategy Name | Best For | Channels | Duration | Touch Points |
|--------------|----------|----------|----------|--------------|
| `enterprise_aggressive` | Large companies (1000+ employees) | Email, LinkedIn, Phone | 21 days | 13 touches |
| `saas_balanced` | Mid-market SaaS companies | Email, LinkedIn | 21 days | 8 touches |
| `relationship_conservative` | Long-term relationship building | Email, LinkedIn | 35 days | 9 touches |
| `call_focused` | Direct sales approach | Phone, Email | 11 days | 8 touches |
| `linkedin_only` | GDPR-sensitive (EU prospects) | LinkedIn | 21 days | 8 touches |

## Tips for Success

### 1. Personalization is Key
Always include:
- Specific violation codes and descriptions
- Quantified impact (% of users affected)
- Competitor comparisons
- Industry-specific data

### 2. Timing Matters
Best times to send emails:
- **Tuesday-Thursday**: 10-11am or 4-5pm
- **Avoid**: Monday before 10am, Friday after 3pm

### 3. Multi-Channel Wins
Prospects need 8+ touches across multiple channels:
- Email for detailed information
- LinkedIn for relationship building
- Phone for high-intent prospects

### 4. Track and Optimize
Monitor these metrics:
- Open rates (target: 50%+)
- Reply rates (target: 18%+)
- Demo booking (target: 30%+)

### 5. Use AI Wisely
AI-generated emails score higher when you provide:
- Recent company news
- Competitor intelligence
- Specific violation data
- Industry insights

## Troubleshooting

### Email open rates are low
- Try different subject line formulas
- A/B test send times
- Verify email deliverability

### No responses to outreach
- Increase personalization score (aim for 90+)
- Try different hooks (lawsuit risk vs. revenue loss)
- Add more value upfront (free audit, resources)

### LinkedIn messages ignored
- Engage with their content first
- Wait 2-3 days between touches
- Reference specific posts or achievements

### Phone calls not connecting
- Call during recommended times
- Leave voicemails with specific value
- Follow up immediately with email

## Next Steps

1. **Review Full Guide**: See [COLD_OUTREACH_GUIDE.md](./COLD_OUTREACH_GUIDE.md) for comprehensive strategies
2. **Customize Templates**: Edit templates in `EmailTemplateService.ts`
3. **Set Up Automation**: Configure cron jobs to process scheduled emails
4. **Integrate SendGrid**: Add email delivery for production
5. **Build Dashboard**: Create React components for campaign monitoring

## Support

- **API Documentation**: Check `/packages/api/src/routes/outreach.ts`
- **Email Templates**: `EmailTemplateService.ts`
- **AI Personalization**: `PersonalizationEngine.ts`
- **Multi-Channel**: `MultiChannelCoordinator.ts`

---

**Ready to scale?** The cold outreach system is designed to handle 1000s of prospects with AI-powered personalization at every touch point. Start with 20-50 prospects, optimize based on metrics, then scale to your full TAM.
