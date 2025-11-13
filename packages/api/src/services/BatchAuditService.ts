/**
 * Batch Audit Service
 * Parallel WCAG accessibility scanning (MVP version without axe-core)
 */

import puppeteer, { Browser } from 'puppeteer';
import { log } from '../utils/logger';

export interface AuditJob {
  jobId: string;
  websites: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  results: Map<string, AuditResult>;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}

export interface AuditResult {
  website: string;
  status: 'success' | 'failed';
  complianceScore: number;
  violationCount: number;
  violations: any[];
  passes: any[];
  redFlags: string[];
  technicalMetrics: {
    mobile: boolean;
    https: boolean;
    pageLoadTime: number;
    lighthouseScore?: number;
  };
  error?: string;
  auditedAt: Date;
}

export class BatchAuditService {
  private static jobs = new Map<string, AuditJob>();
  private static browserPool: Browser[] = [];

  /**
   * Create a new batch audit job
   */
  static createAuditJob(websites: string[]): AuditJob {
    const jobId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: AuditJob = {
      jobId,
      websites,
      status: 'pending',
      results: new Map(),
      progress: {
        total: websites.length,
        completed: 0,
        failed: 0,
      },
    };

    this.jobs.set(jobId, job);
    log.info('Created batch audit job', { jobId, count: websites.length });

    // Start processing in background
    this.processBatchAsync(jobId);

    return job;
  }

  /**
   * Get job status
   */
  static getJobStatus(jobId: string): AuditJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Process batch asynchronously
   */
  private static async processBatchAsync(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'in_progress';
    job.startedAt = new Date();

    try {
      // Process in parallel (4 concurrent browsers)
      const concurrency = 4;
      for (let i = 0; i < job.websites.length; i += concurrency) {
        const batch = job.websites.slice(i, i + concurrency);
        const promises = batch.map(website => this.auditWebsite(website));

        const batchResults = await Promise.allSettled(promises);

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const website = batch[j];

          if (result.status === 'fulfilled') {
            job.results.set(website, result.value);
            job.progress.completed++;
          } else {
            job.progress.failed++;
            job.results.set(website, {
              website,
              status: 'failed',
              complianceScore: 0,
              violationCount: 0,
              violations: [],
              passes: [],
              redFlags: [],
              technicalMetrics: {
                mobile: false,
                https: false,
                pageLoadTime: 0,
              },
              error: (result.reason as Error).message,
              auditedAt: new Date(),
            });
          }
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      log.info('Batch audit completed', {
        jobId,
        completed: job.progress.completed,
        failed: job.progress.failed,
      });
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      log.error('Batch audit failed', error as Error);
    }
  }

  /**
   * Audit a single website
   */
  private static async auditWebsite(website: string): Promise<AuditResult> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to website
      const startTime = Date.now();
      await page.goto(website, { waitUntil: 'networkidle2', timeout: 30000 });
      const pageLoadTime = Date.now() - startTime;

      // Check HTTPS after navigation
      const hasHttps = website.startsWith('https://');

      // Check mobile responsiveness and get page info
      const pageInfo = await page.evaluate(() => {
        // @ts-ignore - This code runs in browser context
        return {
          // @ts-ignore
          hasViewport: !!document.querySelector('meta[name="viewport"]'),
          // @ts-ignore
          title: document.title,
          // @ts-ignore
          images: document.querySelectorAll('img').length,
          // @ts-ignore
          imagesWithoutAlt: Array.from(document.querySelectorAll('img')).filter((img: any) => !img.getAttribute('alt')).length,
          // @ts-ignore
          buttons: document.querySelectorAll('button').length,
          // @ts-ignore
          inputs: document.querySelectorAll('input').length,
          // @ts-ignore
          links: document.querySelectorAll('a').length,
          // @ts-ignore
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        };
      });

      const mobileResponsive = pageInfo.hasViewport;

      // Generate mock violations based on page structure (MVP)
      const { violations, passes } = this.generateMockViolations(pageInfo, hasHttps, mobileResponsive);

      // Calculate compliance score
      const totalTests = violations.length + passes.length;
      const complianceScore = totalTests > 0
        ? Math.round((passes.length / totalTests) * 100)
        : 50;

      // Detect red flags
      const redFlags = this.detectRedFlags(violations, { mobileResponsive, hasHttps });

      await page.close();

      return {
        website,
        status: 'success',
        complianceScore,
        violationCount: violations.length,
        violations,
        passes,
        redFlags,
        technicalMetrics: {
          mobile: mobileResponsive,
          https: hasHttps,
          pageLoadTime,
        },
        auditedAt: new Date(),
      };
    } catch (error) {
      return {
        website,
        status: 'failed',
        complianceScore: 0,
        violationCount: 0,
        violations: [],
        passes: [],
        redFlags: [],
        technicalMetrics: {
          mobile: false,
          https: false,
          pageLoadTime: 0,
        },
        error: (error as Error).message,
        auditedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate mock violations for MVP (would use axe-core in production)
   */
  private static generateMockViolations(
    pageInfo: any,
    hasHttps: boolean,
    mobileResponsive: boolean
  ) {
    const violations: any[] = [];
    const passes: any[] = [];

    // Mock accessibility checks based on page structure
    if (pageInfo.imagesWithoutAlt > 0) {
      violations.push({
        id: 'image-alt',
        impact: 'critical',
        description: 'Images missing alt text',
        nodes: Array(pageInfo.imagesWithoutAlt).fill({}),
      });
    }

    if (!mobileResponsive) {
      violations.push({
        id: 'viewport',
        impact: 'critical',
        description: 'Viewport meta tag missing',
        nodes: [{}],
      });
    }

    if (!hasHttps) {
      violations.push({
        id: 'https',
        impact: 'high',
        description: 'No HTTPS',
        nodes: [{}],
      });
    }

    // Add some passing checks
    if (pageInfo.title) {
      passes.push({ id: 'page-title', description: 'Page has a title' });
    }
    if (pageInfo.headings > 0) {
      passes.push({ id: 'headings', description: 'Page has headings' });
    }
    if (pageInfo.links > 0) {
      passes.push({ id: 'links-present', description: 'Page has links' });
    }

    return { violations, passes };
  }

  /**
   * Detect red flags
   */
  private static detectRedFlags(
    violations: any[],
    metrics: { mobileResponsive: boolean; hasHttps: boolean }
  ): string[] {
    const redFlags: string[] = [];

    // Critical violations
    const criticalViolations = violations.filter((v: any) => v.impact === 'critical');
    if (criticalViolations.length > 0) {
      redFlags.push(`critical_violations_${criticalViolations.length}`);
    }

    // Mobile responsiveness
    if (!metrics.mobileResponsive) {
      redFlags.push('non_responsive');
    }

    // HTTPS
    if (!metrics.hasHttps) {
      redFlags.push('no_https');
    }

    // Specific violation types
    const altTextViolations = violations.find((v: any) => v.id === 'image-alt');
    if (altTextViolations?.nodes?.length > 5) {
      redFlags.push('missing_alt_text');
    }

    return redFlags;
  }

  /**
   * Get priority recommendations from audit results
   */
  static getPriorityRecommendations(result: AuditResult): string[] {
    const recommendations: string[] = [];

    if (result.complianceScore < 50) {
      recommendations.push('URGENT: Multiple critical accessibility violations');
    }

    if (result.redFlags.includes('critical_violations_3') || result.redFlags.includes('critical_violations_4')) {
      recommendations.push('Fix critical violations first (1-2 days work)');
    }

    if (result.redFlags.includes('non_responsive')) {
      recommendations.push('Implement mobile responsive design');
    }

    if (result.redFlags.includes('missing_alt_text')) {
      recommendations.push('Add alt text to all images');
    }

    if (result.technicalMetrics.pageLoadTime > 3000) {
      recommendations.push('Optimize page load performance');
    }

    return recommendations;
  }

  /**
   * Get summary statistics
   */
  static getJobSummary(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const results = Array.from(job.results.values());
    const successResults = results.filter(r => r.status === 'success');

    const avgComplianceScore = successResults.length > 0
      ? Math.round(successResults.reduce((sum, r) => sum + r.complianceScore, 0) / successResults.length)
      : 0;

    const totalViolations = successResults.reduce((sum, r) => sum + r.violationCount, 0);

    return {
      jobId: job.jobId,
      status: job.status,
      totalWebsites: job.progress.total,
      completedAudits: job.progress.completed,
      failedAudits: job.progress.failed,
      avgComplianceScore,
      totalViolations,
      estimatedComplianceTime: `${(successResults.length * 16) / 60} hours`, // 16 min per website average
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Export results to CSV
   */
  static exportJobResults(jobId: string): string {
    const job = this.jobs.get(jobId);
    if (!job) return '';

    const headers = [
      'Website',
      'Compliance Score',
      'Violations',
      'Status',
      'Red Flags',
      'Mobile Responsive',
      'HTTPS',
      'Load Time (ms)',
      'Audited At',
    ];

    const rows = Array.from(job.results.values()).map(result => [
      result.website,
      result.complianceScore,
      result.violationCount,
      result.status,
      result.redFlags.join('; '),
      result.technicalMetrics.mobile ? 'Yes' : 'No',
      result.technicalMetrics.https ? 'Yes' : 'No',
      result.technicalMetrics.pageLoadTime,
      result.auditedAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
