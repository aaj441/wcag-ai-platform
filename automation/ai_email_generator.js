#!/usr/bin/env node
/**
 * AI Email Generator - Personalized Outreach for WCAG Consulting
 * WCAG AI Platform - Sales Automation
 * 
 * This script uses Claude AI to generate personalized, professional emails
 * for WCAG accessibility consulting outreach.
 * 
 * Usage:
 *   node ai_email_generator.js --prospect prospects.json --template discovery
 *   node ai_email_generator.js --prospect single-prospect.json --template follow-up
 * 
 * Requirements:
 *   npm install @anthropic-ai/sdk axios dotenv
 */

const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;
const axios = require('axios');

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
const OUTPUT_DIR = process.env.EMAIL_OUTPUT_DIR || '/tmp/generated-emails';

// Email templates
const TEMPLATES = {
  discovery: {
    name: 'Discovery Email',
    description: 'Initial cold outreach for WCAG consulting services',
    prompt: `Write a professional, personalized email introducing WCAG accessibility consulting services.

Target: {{company}} ({{industry}} industry)
Contact: {{contactName}}, {{contactTitle}}
Website: {{website}}

Key points to include:
- Brief mention of specific accessibility issues found on their website (if any)
- Value proposition: avoid ADA lawsuits, expand customer reach
- AI-powered efficiency at 50% the cost of traditional consulting
- Social proof: mention similar companies you've helped
- Clear call-to-action: 15-min discovery call

Tone: Professional but approachable, consultative not salesy
Length: 150-200 words
Subject line: Include a compelling subject line
`,
  },
  
  followUp: {
    name: 'Follow-Up Email',
    description: 'Follow-up after initial contact or meeting',
    prompt: `Write a follow-up email for {{contactName}} at {{company}}.

Context: {{context}}
Previous interaction: {{previousInteraction}}
Next step: {{nextStep}}

Include:
- Reference to previous conversation
- Additional value (case study, insight, or resource)
- Gentle nudge toward next action
- Alternative times/options if scheduling

Tone: Helpful and patient, not pushy
Length: 100-150 words
`,
  },
  
  proposal: {
    name: 'Proposal Email',
    description: 'Email accompanying accessibility audit proposal',
    prompt: `Write an email introducing a formal WCAG accessibility audit proposal for {{company}}.

Proposal details:
- Scope: {{scope}}
- Timeline: {{timeline}}
- Investment: {{investment}}
- Key deliverables: {{deliverables}}

Include:
- Recap of their accessibility needs/goals
- Confidence in delivering value
- Highlight unique approach (AI + human expertise)
- Clear next steps to proceed
- Availability for questions

Tone: Confident and professional
Length: 200-250 words
`,
  },
  
  caseStudy: {
    name: 'Case Study Sharing',
    description: 'Share relevant success story',
    prompt: `Write an email sharing a relevant case study with {{contactName}} at {{company}}.

Case study: {{caseStudyTitle}}
Similar company: {{similarCompany}} ({{similarIndustry}})
Results: {{results}}

Include:
- Why this case study is relevant to them
- Key challenges solved
- Measurable outcomes
- Soft transition to discussing their needs

Tone: Educational and helpful
Length: 150-200 words
`,
  },
};

class EmailGenerator {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.generatedCount = 0;
    this.outputDir = OUTPUT_DIR;
  }

  async initialize() {
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log(`[EmailGenerator] Initialized. Output: ${this.outputDir}`);
  }

  /**
   * Generate personalized email for a prospect
   */
  async generateEmail(prospect, templateType = 'discovery') {
    const template = TEMPLATES[templateType];
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    console.log(`[EmailGenerator] Generating ${template.name} for ${prospect.company}...`);

    // Enrich prospect data
    const enrichedProspect = await this.enrichProspectData(prospect);

    // Build prompt with prospect data
    const prompt = this.buildPrompt(template.prompt, enrichedProspect);

    // Generate email with Claude
    const email = await this.callClaudeAPI(prompt);

    // Parse and structure email
    const structuredEmail = this.parseEmail(email);

    // Add metadata
    structuredEmail.prospect = enrichedProspect;
    structuredEmail.template = templateType;
    structuredEmail.generatedAt = new Date().toISOString();

    // Save to file
    await this.saveEmail(structuredEmail, enrichedProspect.company);

    this.generatedCount++;
    console.log(`[EmailGenerator] ✓ Generated email for ${enrichedProspect.company}`);

    return structuredEmail;
  }

  /**
   * Enrich prospect data with research
   */
  async enrichProspectData(prospect) {
    const enriched = { ...prospect };

    // Check website accessibility (quick scan)
    if (prospect.website) {
      try {
        enriched.accessibilityIssues = await this.quickAccessibilityCheck(prospect.website);
      } catch (error) {
        console.warn(`[EmailGenerator] Could not scan ${prospect.website}: ${error.message}`);
        enriched.accessibilityIssues = [];
      }
    }

    // Industry-specific insights
    enriched.industryInsights = this.getIndustryInsights(prospect.industry);

    return enriched;
  }

  /**
   * Quick accessibility check (simplified)
   */
  async quickAccessibilityCheck(website) {
    // In production, integrate with actual accessibility scanner
    // For now, return placeholder
    console.log(`[EmailGenerator] Scanning ${website}...`);
    
    // Simulated quick check
    return [
      { type: 'missing_alt_text', severity: 'high', count: 12 },
      { type: 'color_contrast', severity: 'medium', count: 8 },
      { type: 'missing_labels', severity: 'high', count: 5 },
    ];
  }

  /**
   * Get industry-specific insights
   */
  getIndustryInsights(industry) {
    const insights = {
      'ecommerce': {
        risk: 'high',
        lawsuitStats: '40% of ADA web lawsuits target e-commerce sites',
        impact: 'Inaccessible checkout flows lose 20% of potential customers',
      },
      'finance': {
        risk: 'critical',
        lawsuitStats: 'Financial services face highest per-incident settlements ($10K-$50K)',
        impact: 'Compliance required for federal contracts and partnerships',
      },
      'healthcare': {
        risk: 'critical',
        lawsuitStats: 'HIPAA + ADA dual compliance requirements',
        impact: 'Patient portals must be accessible by law',
      },
      'education': {
        risk: 'high',
        lawsuitStats: 'Section 508 compliance required for federal funding',
        impact: 'Learning management systems must support all students',
      },
      'default': {
        risk: 'medium',
        lawsuitStats: 'ADA web lawsuits increased 14% in 2023',
        impact: '15% of population has disabilities - significant market reach',
      },
    };

    return insights[industry] || insights['default'];
  }

  /**
   * Build prompt with prospect data
   */
  buildPrompt(template, prospect) {
    let prompt = template;

    // Replace placeholders
    const replacements = {
      '{{company}}': prospect.company,
      '{{contactName}}': prospect.contactName || 'there',
      '{{contactTitle}}': prospect.contactTitle || '',
      '{{industry}}': prospect.industry || 'your',
      '{{website}}': prospect.website || '',
      '{{context}}': prospect.context || '',
      '{{previousInteraction}}': prospect.previousInteraction || '',
      '{{nextStep}}': prospect.nextStep || 'schedule a discovery call',
      '{{scope}}': prospect.scope || 'full website accessibility audit',
      '{{timeline}}': prospect.timeline || '2-3 weeks',
      '{{investment}}': prospect.investment || '$7,500',
      '{{deliverables}}': prospect.deliverables || 'comprehensive WCAG 2.1 AA audit report, VPAT documentation',
      '{{caseStudyTitle}}': prospect.caseStudyTitle || '',
      '{{similarCompany}}': prospect.similarCompany || '',
      '{{similarIndustry}}': prospect.similarIndustry || prospect.industry,
      '{{results}}': prospect.results || '',
    };

    for (const [key, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(key, 'g'), value);
    }

    // Add accessibility issues if found
    if (prospect.accessibilityIssues && prospect.accessibilityIssues.length > 0) {
      const issuesSummary = prospect.accessibilityIssues
        .map(issue => `${issue.count} ${issue.type} issues (${issue.severity} severity)`)
        .join(', ');
      prompt += `\n\nAccessibility issues found on their website: ${issuesSummary}`;
    }

    // Add industry insights
    if (prospect.industryInsights) {
      prompt += `\n\nIndustry context: ${prospect.industryInsights.lawsuitStats}. ${prospect.industryInsights.impact}`;
    }

    return prompt;
  }

  /**
   * Call Claude API to generate email
   */
  async callClaudeAPI(prompt) {
    try {
      const response = await this.anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return response.content[0].text;
    } catch (error) {
      console.error(`[EmailGenerator] Claude API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse email into structured format
   */
  parseEmail(emailText) {
    // Extract subject line
    const subjectMatch = emailText.match(/Subject:?\s*(.+?)[\n\r]/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'WCAG Accessibility Consultation';

    // Extract body (everything after subject line)
    let body = emailText;
    if (subjectMatch) {
      body = emailText.substring(emailText.indexOf(subjectMatch[0]) + subjectMatch[0].length).trim();
    }

    return {
      subject,
      body,
      rawText: emailText,
    };
  }

  /**
   * Save email to file
   */
  async saveEmail(email, companyName) {
    const filename = `${companyName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(email, null, 2));
    console.log(`[EmailGenerator] Saved to ${filepath}`);

    // Also save plain text version
    const txtFilename = filename.replace('.json', '.txt');
    const txtFilepath = path.join(this.outputDir, txtFilename);
    const plainText = `Subject: ${email.subject}\n\n${email.body}`;
    await fs.writeFile(txtFilepath, plainText);
  }

  /**
   * Generate batch of emails from prospects file
   */
  async generateBatch(prospectsFile, templateType = 'discovery') {
    const prospectsData = await fs.readFile(prospectsFile, 'utf-8');
    const prospects = JSON.parse(prospectsData);

    console.log(`[EmailGenerator] Processing ${prospects.length} prospects...`);

    const results = [];
    for (const prospect of prospects) {
      try {
        const email = await this.generateEmail(prospect, templateType);
        results.push({ success: true, prospect: prospect.company, email });
        
        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[EmailGenerator] Failed for ${prospect.company}: ${error.message}`);
        results.push({ success: false, prospect: prospect.company, error: error.message });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n[EmailGenerator] Batch complete: ${successful}/${prospects.length} successful`);

    // Save summary
    const summaryPath = path.join(this.outputDir, `batch-summary-${Date.now()}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
    console.log(`[EmailGenerator] Summary saved to ${summaryPath}`);

    return results;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : null;
  };

  const prospectFile = getArg('--prospect');
  const templateType = getArg('--template') || 'discovery';

  if (!prospectFile) {
    console.error('Usage: node ai_email_generator.js --prospect <file.json> [--template <type>]');
    console.error('Templates:', Object.keys(TEMPLATES).join(', '));
    process.exit(1);
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const generator = new EmailGenerator();
  await generator.initialize();

  // Check if prospects file is array or single prospect
  const fileContent = await fs.readFile(prospectFile, 'utf-8');
  const data = JSON.parse(fileContent);

  if (Array.isArray(data)) {
    // Batch mode
    await generator.generateBatch(prospectFile, templateType);
  } else {
    // Single prospect mode
    await generator.generateEmail(data, templateType);
  }
}

// Export for use as module
module.exports = { EmailGenerator, TEMPLATES };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('[EmailGenerator] Fatal error:', error);
    process.exit(1);
  });
}
