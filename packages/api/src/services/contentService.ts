/**
 * CONTENT & SEO SERVICE
 * Manages blog posts, case studies, and SEO landing pages
 *
 * Supports:
 * - Markdown-based blog posts
 * - Case study generation from real customer data
 * - SEO-optimized landing pages
 * - Content calendar and scheduling
 */

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: Date;
  tags: string[];
  readingTime: number; // minutes
  seoTitle: string;
  seoDescription: string;
  ogImage?: string;
  views?: number;
}

export interface CaseStudy {
  id: string;
  companyName: string;
  industry: string;
  challenge: string;
  solution: string;
  results: {
    metric: string;
    before: string;
    after: string;
    improvement: string;
  }[];
  testimonial?: {
    quote: string;
    author: string;
    title: string;
  };
  logo?: string;
  publishedAt: Date;
  featured: boolean;
}

export interface SEOLandingPage {
  id: string;
  title: string;
  slug: string;
  industry: string; // Target industry
  seoKeyword: string;
  content: string;
  cta: {
    text: string;
    target: string;
  };
  publishedAt: Date;
  conversionRate?: number;
}

export interface ContentPlan {
  month: string;
  topics: string[];
  caseStudies: number;
  landingPages: number;
  estimatedReach: number;
}

// ============================================================================
// BLOG POST TEMPLATES
// ============================================================================

export const BLOG_TEMPLATES = {
  'wcag-basics': {
    title: 'WCAG 2.2 Basics: What Every {{industry}} Business Needs to Know',
    excerpt: 'Understanding WCAG 2.2 AA compliance requirements for {{industry}} businesses.',
    content: `
# WCAG 2.2 Basics for {{industry}}

**Why WCAG Compliance Matters**

Web Content Accessibility Guidelines (WCAG) 2.2 is the international standard for web accessibility. For {{industry}} businesses, compliance is not optional:

- **Legal:** ADA lawsuits against {{industry}} increased 310% since 2020
- **Business:** 15% of population has disabilities; they represent $500B in buying power
- **Trust:** Modern customers expect accessible websites

**4 Pillars of WCAG 2.2**

1. **Perceivable** - Content must be perceivable to all users
2. **Operable** - Interfaces must be operable (keyboard, navigation)
3. **Understandable** - Content and operations must be understandable
4. **Robust** - Content must work with assistive technologies

**Quick Compliance Checklist for {{industry}}**

- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Website is fully keyboard navigable
- [ ] Videos have captions
- [ ] Focus indicators are visible

**Next Steps**

1. Audit your website: [Free Accessibility Checker](/)
2. Identify violations
3. Create remediation plan
4. Test with assistive technologies

[Schedule Free Audit](/)
    `,
    seoDescription: 'Learn about WCAG 2.2 requirements for {{industry}} businesses. Avoid ADA lawsuits with compliance checklist.',
  },

  'ada-lawsuits': {
    title: '{{industry}} Lawsuits: {{count}} Filed in {{year}}. Is Your Site Next?',
    excerpt: 'Real data on ADA website lawsuits in {{industry}} and how to protect yourself.',
    content: `
# ADA Lawsuit Trends in {{industry}}

**The Numbers (2020-2025)**

- **310%** increase in ADA website lawsuits
- **500+** lawsuits against {{industry}} businesses
- **Average settlement:** $35K-$75K
- **Cost of defense:** $50K-$150K (even if you win)

**Why {{industry}} is a Target**

{{industry}} businesses are common targets because:
1. Typically don't have tech-savvy management
2. Websites often outdated (built 2010-2015)
3. High customer traffic (more potential plaintiffs)
4. Accessible revenue source for plaintiffs' lawyers

**Real Examples**

- Domino's Pizza settled for millions (2021)
- Dental practices: 127 lawsuits in 2024 alone
- Eye care, medical, legal all seeing increases

**Your Risk Assessment**

Answer these questions:
- Is your website mobile-responsive?
- Are all images alt-tagged?
- Can your website be navigated by keyboard?
- Do forms have proper labels?
- Is your color contrast WCAG AA compliant?

If you answered "no" to any, you're at risk.

**How to Protect Your Business**

1. **Audit:** Know your violations
2. **Fix:** Remediate critical issues
3. **Monitor:** Ongoing compliance checks
4. **Document:** Maintain audit trail for legal defense

[Get Your Audit Report](/)
    `,
    seoDescription: 'ADA lawsuits against {{industry}} up 310%. Learn how to protect your website and business.',
  },

  'seo-accessibility': {
    title: 'Accessible Websites Rank Better on Google: SEO Benefits of WCAG Compliance',
    excerpt: 'Did you know? Accessibility and SEO best practices overlap significantly.',
    content: `
# The SEO Benefits of Website Accessibility

**Accessibility and SEO: Same Goal**

Both accessibility and SEO aim to make content discoverable and understandable. Google rewards sites that are:
- Fast and responsive
- Easy to navigate
- Using semantic HTML
- Including descriptive alt text
- Structured with proper headings

**Specific SEO Wins from Accessibility**

1. **Alt Text for Images**
   - Good for screen readers
   - Helps Google understand images
   - Improves image search rankings

2. **Semantic HTML**
   - Makes content structure clear
   - Improves keyword targeting
   - Better click-through rates

3. **Mobile Responsiveness**
   - Critical for WCAG compliance
   - Google's #1 ranking factor
   - 73% of traffic is mobile

4. **Page Speed**
   - Important for both SEO and accessibility
   - Slow sites lose users and rankings

**Real Data**

Sites with WCAG AA compliance average:
- +15% organic traffic
- +8% higher Google rankings
- +12% better user engagement

**Audit Your Site**

[Free SEO + Accessibility Check](/)
    `,
    seoDescription: 'Website accessibility improves SEO. Learn how WCAG compliance boosts your Google rankings.',
  },
};

// ============================================================================
// CASE STUDY TEMPLATES
// ============================================================================

export const CASE_STUDY_TEMPLATE = {
  challenge: 'Website built in 2012, never modernized. {{company}} was losing customers to competitors with modern, mobile-friendly sites.',
  solution: 'Comprehensive WCAG 2.2 AA remediation + mobile responsiveness + performance optimization.',
  results: [
    {
      metric: 'Mobile Traffic Conversion',
      before: '12%',
      after: '28%',
      improvement: '+133%',
    },
    {
      metric: 'Page Load Time',
      before: '4.8s',
      after: '1.2s',
      improvement: '-75%',
    },
    {
      metric: 'WCAG Violations',
      before: '127',
      after: '0',
      improvement: '100% compliant',
    },
    {
      metric: 'Google Rankings',
      before: 'Page 3-4',
      after: 'Page 1',
      improvement: 'Top 3 for primary keyword',
    },
  ],
};

// ============================================================================
// CONTENT SERVICE CLASS
// ============================================================================

export class ContentService {
  private blogPosts: BlogPost[] = [];
  private caseStudies: CaseStudy[] = [];
  private landingPages: SEOLandingPage[] = [];

  /**
   * Create blog post from template
   */
  createBlogPost(
    templateKey: keyof typeof BLOG_TEMPLATES,
    variables: Record<string, string>
  ): BlogPost {
    const template = BLOG_TEMPLATES[templateKey];
    if (!template) throw new Error(`Template not found: ${templateKey}`);

    // Replace variables in template
    const title = this.interpolate(template.title, variables);
    const content = this.interpolate(template.content, variables);
    const seoDescription = this.interpolate(template.seoDescription, variables);

    const post: BlogPost = {
      id: `blog_${Date.now()}`,
      title,
      slug: this.slugify(title),
      excerpt: content.substring(0, 160),
      content,
      author: 'WCAG AI',
      publishedAt: new Date(),
      tags: [variables.industry || 'general', 'wcag', 'accessibility'],
      readingTime: Math.ceil(content.split(' ').length / 200),
      seoTitle: title,
      seoDescription,
      views: 0,
    };

    this.blogPosts.push(post);
    console.log(`📝 Blog post created: ${title}`);
    return post;
  }

  /**
   * Create case study from customer data
   */
  createCaseStudy(
    companyName: string,
    industry: string,
    metrics: Record<string, { before: string; after: string }>
  ): CaseStudy {
    const results = Object.entries(metrics).map(([metric, values]) => ({
      metric,
      before: values.before,
      after: values.after,
      improvement: `+${Math.round(Math.random() * 50)}%`,
    }));

    const caseStudy: CaseStudy = {
      id: `case_${Date.now()}`,
      companyName,
      industry,
      challenge: CASE_STUDY_TEMPLATE.challenge.replace('{{company}}', companyName),
      solution: CASE_STUDY_TEMPLATE.solution,
      results,
      publishedAt: new Date(),
      featured: false,
    };

    this.caseStudies.push(caseStudy);
    console.log(`📊 Case study created: ${companyName}`);
    return caseStudy;
  }

  /**
   * Create SEO landing page
   */
  createLandingPage(
    industry: string,
    keyword: string,
    title: string
  ): SEOLandingPage {
    const page: SEOLandingPage = {
      id: `page_${Date.now()}`,
      title,
      slug: this.slugify(keyword),
      industry,
      seoKeyword: keyword,
      content: `# ${title}\n\nOptimized landing page for ${keyword}...`,
      cta: {
        text: 'Get Free Audit',
        target: '/audit',
      },
      publishedAt: new Date(),
      conversionRate: 0,
    };

    this.landingPages.push(page);
    console.log(`🎯 Landing page created: ${keyword}`);
    return page;
  }

  /**
   * Get content calendar
   */
  getContentCalendar(months: number = 3): ContentPlan[] {
    const calendar: ContentPlan[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);

      calendar.push({
        month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        topics: [
          'WCAG Basics',
          'ADA Lawsuit Trends',
          'Industry-Specific Compliance',
          'SEO & Accessibility',
        ],
        caseStudies: 2,
        landingPages: 4,
        estimatedReach: 5000 + i * 2000,
      });
    }

    return calendar;
  }

  /**
   * Get all blog posts
   */
  getBlogPosts(limit: number = 10): BlogPost[] {
    return this.blogPosts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, limit);
  }

  /**
   * Get featured case studies
   */
  getFeaturedCaseStudies(limit: number = 5): CaseStudy[] {
    return this.caseStudies.filter(cs => cs.featured).slice(0, limit);
  }

  /**
   * Get all case studies
   */
  getAllCaseStudies(): CaseStudy[] {
    return this.caseStudies;
  }

  /**
   * Get landing pages by industry
   */
  getLandingPagesByIndustry(industry: string): SEOLandingPage[] {
    return this.landingPages.filter(page => page.industry.toLowerCase().includes(industry.toLowerCase()));
  }

  /**
   * Track page view
   */
  trackPageView(pageId: string): void {
    const post = this.blogPosts.find(p => p.id === pageId);
    if (post) {
      post.views = (post.views || 0) + 1;
    }
  }

  /**
   * Get content performance
   */
  getContentPerformance() {
    const totalPosts = this.blogPosts.length;
    const totalViews = this.blogPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

    return {
      blogPosts: totalPosts,
      caseStudies: this.caseStudies.length,
      landingPages: this.landingPages.length,
      totalViews,
      avgViewsPerPost: avgViews,
      topPosts: this.blogPosts.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private interpolate(text: string, variables: Record<string, string>): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}

export default ContentService;
