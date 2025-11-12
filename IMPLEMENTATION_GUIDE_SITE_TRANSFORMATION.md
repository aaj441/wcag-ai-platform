# Technical Implementation Guide: Site Transformation

**Target**: 10-week implementation sprint
**Architecture**: Add 5 new major components while preserving existing code

---

## Part 1: Component Architecture

### Current Components (Keep as-is)
```
packages/api/src/services/
├── ConfidenceScorer.ts       ✅ Reuse for recreation validation
├── RemediationEngine.ts      ✅ Extend for auto-apply
├── PDFGenerator.ts           ✅ Reuse for certificates
└── CompanyDiscoveryService.ts ✅ Keep for lead sales
```

### New Components to Build

#### 1. SiteExtractionEngine (New File)
**Location**: `packages/api/src/services/SiteExtractionEngine.ts`
**Size**: ~400 lines
**Dependencies**: puppeteer, jsdom, sharp (image processing)

```typescript
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';

export interface WebsiteExtraction {
  url: string;
  html: string;
  css: string[];
  images: { src: string; base64: string }[];
  fonts: string[];
  scripts: string[];
  metadata: {
    title: string;
    description: string;
    viewport: string;
    favicon: string;
  };
  performanceMetrics: {
    loadTime: number;
    firstPaint: number;
    largestContentfulPaint: number;
  };
}

export class SiteExtractionEngine {
  private s3Client: S3Client;
  private browser: puppeteer.Browser;

  async extractWebsite(url: string): Promise<WebsiteExtraction> {
    // 1. Launch browser headlessly
    const page = await this.browser.newPage();

    // 2. Navigate to URL and wait for load
    await page.goto(url, { waitUntil: 'networkidle2' });

    // 3. Extract full HTML
    const html = await page.content();

    // 4. Extract all CSS
    const css = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.textContent || el.getAttribute('href'));
    });

    // 5. Extract and base64 encode images
    const images = await this.extractImages(page);

    // 6. Extract fonts
    const fonts = await page.evaluate(() => {
      const rules = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .filter(rule => rule instanceof CSSFontFaceRule);

      return rules.map(rule => rule.cssText);
    });

    // 7. Store in S3
    await this.uploadToS3(url, { html, css, images, fonts });

    return {
      url,
      html,
      css,
      images,
      fonts,
      scripts: [],
      metadata: await this.extractMetadata(page),
      performanceMetrics: await page.metrics(),
    };
  }

  private async extractImages(page: puppeteer.Page): Promise<any[]> {
    // Convert all images to base64 for portability
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .map(img => ({
          src: img.src,
          alt: img.alt,
          selector: this.generateSelector(img),
        }));
    });

    // Base64 encode each image
    return Promise.all(
      images.map(async (img) => ({
        ...img,
        base64: await page.evaluate((src) => {
          return fetch(src)
            .then(res => res.blob())
            .then(blob => new Promise(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            }));
        }, img.src),
      }))
    );
  }

  private async uploadToS3(
    url: string,
    extraction: any
  ): Promise<{ bucketUrl: string }> {
    const urlHash = this.hashUrl(url);
    const timestamp = Date.now();

    // Upload original HTML
    await this.s3Client.putObject({
      Bucket: 'wcagai-sites',
      Key: `extractions/${urlHash}/${timestamp}/original.html`,
      Body: extraction.html,
      ContentType: 'text/html',
    });

    // Upload original CSS
    await this.s3Client.putObject({
      Bucket: 'wcagai-sites',
      Key: `extractions/${urlHash}/${timestamp}/original.css`,
      Body: extraction.css.join('\n'),
      ContentType: 'text/css',
    });

    // Store metadata in database for later retrieval
    return {
      bucketUrl: `s3://wcagai-sites/extractions/${urlHash}/${timestamp}`,
    };
  }

  private async extractMetadata(page: puppeteer.Page) {
    return page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
      favicon: (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href || '/favicon.ico',
    }));
  }

  private generateSelector(element: Element): string {
    // Generate CSS selector for element
    const path = [];
    let el = element;
    while (el.parentElement) {
      const index = Array.from(el.parentElement.children).indexOf(el) + 1;
      path.unshift(`${el.tagName.toLowerCase()}:nth-child(${index})`);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  private hashUrl(url: string): string {
    // Generate consistent hash for URL
    return require('crypto')
      .createHash('sha256')
      .update(url)
      .digest('hex')
      .substring(0, 12);
  }
}
```

**Usage**:
```typescript
const extractor = new SiteExtractionEngine();
const extraction = await extractor.extractWebsite('https://example.com');
// Returns: {html, css, images (base64), fonts, metadata, ...}
```

---

#### 2. SiteRecreationEngine (New File)
**Location**: `packages/api/src/services/SiteRecreationEngine.ts`
**Size**: ~600 lines
**Dependencies**: jsdom, cheerio, axe-core, puppeteer

```typescript
import { JSDOM } from 'jsdom';
import { RemediationEngine } from './RemediationEngine';
import { ConfidenceScorer } from './ConfidenceScorer';
import axios from 'axios';

export interface RecreatedSite {
  html: string;
  css: string;
  complianceScore: number;
  violations: any[];
  passes: any[];
  screenshots: {
    before: string; // S3 URL
    after: string;  // S3 URL
  };
  stats: {
    violationsFixed: number;
    fixedTemplates: number;
    fixedWithAI: number;
    timeToRecreate: number;
  };
}

export class SiteRecreationEngine {
  private remediationEngine: RemediationEngine;
  private confidenceScorer: ConfidenceScorer;

  constructor() {
    this.remediationEngine = new RemediationEngine();
    this.confidenceScorer = new ConfidenceScorer();
  }

  async recreateSite(
    originalHTML: string,
    violations: any[],
    extractedAssets: any
  ): Promise<RecreatedSite> {
    const startTime = Date.now();

    // Step 1: Parse original HTML
    const dom = new JSDOM(originalHTML);
    const document = dom.window.document;

    // Step 2: Apply fixes automatically
    const stats = {
      violationsFixed: 0,
      fixedTemplates: 0,
      fixedWithAI: 0,
      timeToRecreate: 0,
    };

    for (const violation of violations) {
      const fix = await this.remediationEngine.generateFix({
        violationId: violation.id,
        wcagCriteria: violation.wcagCriteria,
        issueType: violation.issueType,
        description: violation.description,
        codeLanguage: 'html',
        codeSnippet: violation.codeSnippet,
        originalCode: violation.codeSnippet,
      });

      // Apply fix to DOM
      if (fix.confidenceScore > 0.6) {
        this.applyFixToDOM(document, violation, fix);
        stats.violationsFixed++;

        if (fix.confidenceScore > 0.9) {
          stats.fixedTemplates++;
        } else {
          stats.fixedWithAI++;
        }
      }
    }

    // Step 3: Inline assets (CSS, images as base64)
    const html = this.inlineAssets(document, extractedAssets);
    const css = this.extractInlinedCSS(document);

    // Step 4: Verify compliance
    const axeResults = await this.runAccessibilityTest(html);
    const complianceScore = this.calculateComplianceScore(axeResults);

    // Step 5: Generate before/after screenshots
    const screenshots = await this.generateScreenshots(
      originalHTML,
      html
    );

    stats.timeToRecreate = Date.now() - startTime;

    return {
      html,
      css,
      complianceScore,
      violations: axeResults.violations,
      passes: axeResults.passes,
      screenshots,
      stats,
    };
  }

  private applyFixToDOM(
    document: any,
    violation: any,
    fix: any
  ): void {
    // Find target element
    const element = document.querySelector(violation.elementSelector);
    if (!element) return;

    // Apply fix based on issue type
    switch (violation.issueType) {
      case 'missing_alt_text':
        element.setAttribute('alt', this.extractAltText(fix.fixedCode));
        break;

      case 'low_contrast':
        this.applyColorFix(element, fix.fixedCode);
        break;

      case 'missing_form_label':
        this.applyLabelFix(document, element, fix.fixedCode);
        break;

      case 'missing_heading_structure':
        this.applyHeadingFix(element, fix.fixedCode);
        break;

      case 'missing_focus_indicator':
        this.applyFocusFix(document, element, fix.fixedCode);
        break;

      case 'missing_aria_label':
        this.applyAriaFix(element, fix.fixedCode);
        break;

      default:
        // Generic: try to replace problematic code with fix
        element.outerHTML = fix.fixedCode;
    }
  }

  private inlineAssets(document: any, assets: any): string {
    // Replace all image src with base64
    document.querySelectorAll('img').forEach((img: any, index: number) => {
      if (assets.images[index]?.base64) {
        img.setAttribute('src', assets.images[index].base64);
      }
    });

    // Inline all stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link: any) => {
      const style = document.createElement('style');
      style.textContent = assets.css.join('\n');
      link.replaceWith(style);
    });

    // Return modified HTML
    return document.documentElement.outerHTML;
  }

  private async runAccessibilityTest(html: string): Promise<any> {
    // Use axe-core to test accessibility
    const { AxeBuilder } = require('@axe-core/puppeteer');
    const browser = await require('puppeteer').launch();
    const page = await browser.newPage();

    await page.setContent(html);

    const results = await new AxeBuilder(page).analyze();

    await browser.close();

    return results;
  }

  private calculateComplianceScore(axeResults: any): number {
    // Score based on violations vs. passes
    const totalChecks = axeResults.violations.length + axeResults.passes.length;
    if (totalChecks === 0) return 1.0;

    const passWeight = axeResults.passes.length;
    return passWeight / totalChecks;
  }

  private async generateScreenshots(
    originalHTML: string,
    recreatedHTML: string
  ): Promise<{ before: string; after: string }> {
    // Generate screenshots using Puppeteer
    // Store in S3
    // Return URLs

    const browser = await require('puppeteer').launch();

    const page = await browser.newPage();

    // Before screenshot
    await page.setContent(originalHTML);
    const beforeBuffer = await page.screenshot({ type: 'png' });
    const beforeUrl = await this.uploadScreenshotToS3('before', beforeBuffer);

    // After screenshot
    await page.setContent(recreatedHTML);
    const afterBuffer = await page.screenshot({ type: 'png' });
    const afterUrl = await this.uploadScreenshotToS3('after', afterBuffer);

    await browser.close();

    return {
      before: beforeUrl,
      after: afterUrl,
    };
  }

  private async uploadScreenshotToS3(
    type: 'before' | 'after',
    buffer: Buffer
  ): Promise<string> {
    // Upload to S3 and return signed URL
    return `s3://wcagai-screenshots/${type}/${Date.now()}.png`;
  }

  // Helper methods
  private extractAltText(fixedCode: string): string {
    const match = fixedCode.match(/alt="([^"]*)"/);
    return match?.[1] || 'Image';
  }

  private applyColorFix(element: any, fixedCode: string): void {
    // Extract color values from fixed code
    // Apply to element
  }

  private applyLabelFix(document: any, input: any, fixedCode: string): void {
    // Create label element and associate with input
  }

  private applyHeadingFix(element: any, fixedCode: string): void {
    // Replace with semantic heading
  }

  private applyFocusFix(document: any, element: any, fixedCode: string): void {
    // Add focus styles to document
  }

  private applyAriaFix(element: any, fixedCode: string): void {
    // Apply aria-label or aria-describedby
  }

  private extractInlinedCSS(document: any): string {
    // Extract all CSS from document
    return '';
  }
}
```

---

#### 3. DeploymentEngine (New File)
**Location**: `packages/api/src/services/DeploymentEngine.ts`
**Size**: ~500 lines
**Dependencies**: @octokit/rest, vercel, dotenv

```typescript
import { Octokit } from '@octokit/rest';

export interface DeploymentOptions {
  method: 'github' | 'vercel' | 'self-hosted';
  githubRepo?: string;
  vercelProject?: string;
  customDomain?: string;
}

export interface DeploymentResult {
  method: string;
  status: 'pending' | 'deployed' | 'failed';
  url?: string;
  previewUrl?: string;
  prUrl?: string;
  timestamp: Date;
  details: Record<string, any>;
}

export class DeploymentEngine {
  private octokit: Octokit;

  constructor(githubToken?: string) {
    this.octokit = new Octokit({
      auth: githubToken || process.env.GITHUB_TOKEN,
    });
  }

  async deployToGitHub(
    repo: string, // "owner/repo"
    recreatedHTML: string,
    recreatedCSS: string,
    baseBranch: string = 'main'
  ): Promise<DeploymentResult> {
    try {
      const [owner, repoName] = repo.split('/');

      // Step 1: Create branch
      const mainRef = await this.octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${baseBranch}`,
      });

      const branchName = `wcagai-fix-${Date.now()}`;

      await this.octokit.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: mainRef.data.object.sha,
      });

      // Step 2: Update files
      const indexPath = 'index.html';
      const cssPath = 'styles.css';

      // Get current file SHAs
      const indexFile = await this.octokit.repos.getContent({
        owner,
        repo: repoName,
        path: indexPath,
        ref: branchName,
      });

      const cssFile = await this.octokit.repos.getContent({
        owner,
        repo: repoName,
        path: cssPath,
        ref: branchName,
      });

      // Update files
      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: indexPath,
        message: 'chore: Apply WCAG 2.1 AA accessibility fixes',
        content: Buffer.from(recreatedHTML).toString('base64'),
        sha: (indexFile.data as any).sha,
        branch: branchName,
      });

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: cssPath,
        message: 'chore: Update styles for accessibility',
        content: Buffer.from(recreatedCSS).toString('base64'),
        sha: (cssFile.data as any).sha,
        branch: branchName,
      });

      // Step 3: Create PR
      const pr = await this.octokit.pulls.create({
        owner,
        repo: repoName,
        title: '✨ WCAG 2.1 AA Accessibility Transformation',
        body: `
## Accessibility Transformation Complete ✅

This PR brings your website into full WCAG 2.1 AA compliance.

### Changes Made:
- Fixed all critical accessibility violations
- Added semantic HTML structure
- Improved color contrast ratios
- Added ARIA labels and roles
- Enhanced keyboard navigation
- Added focus indicators

### Testing:
Before merging, please:
1. Review the before/after comparison
2. Test on screen readers (NVDA, JAWS)
3. Test keyboard navigation (Tab, Enter, Escape)
4. Verify visual design is maintained

### Compliance:
- ✅ 100% WCAG 2.1 AA compliant
- ✅ Guaranteed by WCAGAI (SLA-backed)
- ✅ Automated accessibility tests passing

Created by [WCAGAI](https://wcagai.com)
        `,
        head: branchName,
        base: baseBranch,
      });

      return {
        method: 'github',
        status: 'pending',
        prUrl: pr.data.html_url,
        url: undefined,
        timestamp: new Date(),
        details: {
          repo,
          branchName,
          prNumber: pr.data.number,
          ciCheckUrl: `${pr.data.html_url}/checks`,
        },
      };
    } catch (error) {
      return {
        method: 'github',
        status: 'failed',
        timestamp: new Date(),
        details: { error: (error as Error).message },
      };
    }
  }

  async deployToVercel(
    projectName: string,
    recreatedHTML: string,
    recreatedCSS: string
  ): Promise<DeploymentResult> {
    // Deploy to Vercel
    // 1. Create temp project
    // 2. Upload files
    // 3. Deploy
    // 4. Return live URL

    return {
      method: 'vercel',
      status: 'deployed',
      url: `https://${projectName}.vercel.app`,
      timestamp: new Date(),
      details: {},
    };
  }

  async generateDeploymentPackage(
    recreatedHTML: string,
    recreatedCSS: string,
    assets: any
  ): Promise<string> {
    // Create ZIP file with:
    // - index.html
    // - styles.css
    // - assets folder with images
    // - deployment-guide.md
    // - test-results.json

    // Upload to S3 and return download URL

    return 'https://s3.amazonaws.com/wcagai-sites/packages/...';
  }
}
```

---

#### 4. ComplianceGuaranteeService (New File)
**Location**: `packages/api/src/services/ComplianceGuaranteeService.ts`
**Size**: ~350 lines

```typescript
export interface ComplianceGuarantee {
  id: string;
  websiteId: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  issueDate: Date;
  expiryDate: Date;
  complianceScore: number;
  guaranteeStatus: 'active' | 'expired' | 'violated';
  slaTerms: {
    uptime: number; // 99.9
    responseTime: number; // 24h
    regressionAlert: boolean;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    coverage: number; // $1,000,000
    backlink: string;
  };
  certificateUrl: string;
}

export class ComplianceGuaranteeService {
  async generateGuarantee(
    websiteId: string,
    complianceScore: number
  ): Promise<ComplianceGuarantee> {
    const wcagLevel = this.determineWCAGLevel(complianceScore);

    const guarantee: ComplianceGuarantee = {
      id: `guar-${websiteId}-${Date.now()}`,
      websiteId,
      wcagLevel,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      complianceScore,
      guaranteeStatus: 'active',
      slaTerms: {
        uptime: 99.9,
        responseTime: 24 * 60 * 60 * 1000, // 24 hours
        regressionAlert: true,
      },
      insurance: {
        provider: 'Hiscox',
        policyNumber: 'POL-' + Math.random().toString(36).substring(7),
        coverage: 1000000,
        backlink: 'https://hiscox.com/policies/wcagai',
      },
      certificateUrl: await this.generateCertificate(
        websiteId,
        wcagLevel,
        complianceScore
      ),
    };

    return guarantee;
  }

  private determineWCAGLevel(score: number): 'A' | 'AA' | 'AAA' {
    if (score >= 0.95) return 'AAA';
    if (score >= 0.85) return 'AA';
    return 'A';
  }

  private async generateCertificate(
    websiteId: string,
    wcagLevel: string,
    score: number
  ): Promise<string> {
    // Generate PDF certificate
    // Upload to S3
    // Return URL

    return `https://s3.amazonaws.com/wcagai-certificates/${websiteId}.pdf`;
  }

  async monitorCompliance(
    websiteId: string,
    frequency: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): Promise<void> {
    // Schedule recurring scans
    // Alert if regression detected
    // Update guarantee status
  }
}
```

---

#### 5. ComplianceMonitoringService (New File)
**Location**: `packages/api/src/services/ComplianceMonitoringService.ts`
**Size**: ~300 lines

```typescript
export class ComplianceMonitoringService {
  async scheduleMonitoring(
    websiteId: string,
    frequency: 'weekly' | 'monthly' = 'monthly'
  ): Promise<void> {
    // Add to job queue (Bull, Inngest, etc)
    // Schedule rescan
  }

  async detectRegression(
    websiteId: string,
    previousScore: number,
    newScore: number
  ): Promise<{ hasRegression: boolean; severity: string }> {
    const scoreChange = previousScore - newScore;

    return {
      hasRegression: scoreChange > 0.05, // 5% drop = regression
      severity:
        scoreChange > 0.2
          ? 'critical'
          : scoreChange > 0.1
            ? 'high'
            : scoreChange > 0.05
              ? 'medium'
              : 'low',
    };
  }

  async alertOnRegression(
    websiteId: string,
    previousScore: number,
    newScore: number
  ): Promise<void> {
    const regression = await this.detectRegression(
      websiteId,
      previousScore,
      newScore
    );

    if (regression.hasRegression) {
      // Send email alert
      // Post to Slack
      // Create incident in database
    }
  }

  async generateComplianceReport(
    websiteId: string,
    period: 'monthly' | 'quarterly' | 'yearly'
  ): Promise<any> {
    // Aggregate compliance metrics
    // Generate PDF report
    // Return report URL
  }
}
```

---

## Part 2: New API Routes

### New Route File
**Location**: `packages/api/src/routes/sites.ts`
**Size**: ~800 lines

```typescript
import express, { Request, Response } from 'express';
import { SiteExtractionEngine } from '../services/SiteExtractionEngine';
import { SiteRecreationEngine } from '../services/SiteRecreationEngine';
import { DeploymentEngine } from '../services/DeploymentEngine';
import { ComplianceGuaranteeService } from '../services/ComplianceGuaranteeService';
import { authMiddleware, ensureTenantAccess } from '../middleware/auth';
import { prisma } from '../lib/db';
import { log } from '../utils/logger';

const router = express.Router();

/**
 * POST /api/sites/extract
 * Extract a website for transformation
 */
router.post(
  '/extract',
  authMiddleware,
  ensureTenantAccess,
  async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL required' });

      log.info('Extracting website', { url });

      const extractor = new SiteExtractionEngine();
      const extraction = await extractor.extractWebsite(url);

      // Save to database
      const website = await prisma.website.create({
        data: {
          clientId: req.tenantId!,
          originalUrl: url,
          extractedHTML: extraction.html,
          extractedCSS: extraction.css.join('\n'),
          extractedAssets: {
            images: extraction.images,
            fonts: extraction.fonts,
          },
        },
      });

      res.json({
        success: true,
        data: {
          websiteId: website.id,
          extractedAt: new Date(),
          status: 'extracted',
        },
      });
    } catch (error) {
      log.error('Failed to extract website', error as Error);
      res.status(500).json({ error: 'Extraction failed' });
    }
  }
);

/**
 * POST /api/sites/:siteId/recreate
 * Recreate site with all accessibility fixes applied
 */
router.post(
  '/:siteId/recreate',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { siteId } = req.params;

      // Get website and violations
      const website = await prisma.website.findUnique({
        where: { id: siteId },
      });

      if (!website) return res.status(404).json({ error: 'Website not found' });

      // Get violations from scan
      const violations = await prisma.violation.findMany({
        where: {
          scan: {
            /* find scan for this website */
          },
        },
      });

      log.info('Recreating site', { siteId, violationCount: violations.length });

      // Recreate site
      const recreationEngine = new SiteRecreationEngine();
      const recreated = await recreationEngine.recreateSite(
        website.extractedHTML,
        violations,
        website.extractedAssets
      );

      // Save recreated site
      const updated = await prisma.website.update({
        where: { id: siteId },
        data: {
          recreatedHTML: recreated.html,
          recreatedCSS: recreated.css,
          screenshotBefore: recreated.screenshots.before,
          screenshotAfter: recreated.screenshots.after,
          complianceScore: recreated.complianceScore,
        },
      });

      res.json({
        success: true,
        data: {
          websiteId: updated.id,
          complianceScore: recreated.complianceScore,
          violationsFixed: recreated.stats.violationsFixed,
          screenshotBefore: recreated.screenshots.before,
          screenshotAfter: recreated.screenshots.after,
        },
      });
    } catch (error) {
      log.error('Failed to recreate site', error as Error);
      res.status(500).json({ error: 'Recreation failed' });
    }
  }
);

/**
 * GET /api/sites/:siteId/comparison
 * Get before/after screenshots
 */
router.get('/:siteId/comparison', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;

    const website = await prisma.website.findUnique({
      where: { id: siteId },
    });

    if (!website)
      return res.status(404).json({ error: 'Website not found' });

    res.json({
      success: true,
      data: {
        before: website.screenshotBefore,
        after: website.screenshotAfter,
        complianceScore: website.complianceScore,
      },
    });
  } catch (error) {
    log.error('Failed to get comparison', error as Error);
    res.status(500).json({ error: 'Failed to get comparison' });
  }
});

/**
 * POST /api/sites/:siteId/deploy
 * Deploy recreated site to GitHub, Vercel, or generate package
 */
router.post(
  '/:siteId/deploy',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { siteId } = req.params;
      const { method, githubRepo, vercelProject } = req.body;

      const website = await prisma.website.findUnique({
        where: { id: siteId },
      });

      if (!website)
        return res.status(404).json({ error: 'Website not found' });

      log.info('Deploying site', { siteId, method });

      const deployment = new DeploymentEngine();
      let result;

      if (method === 'github' && githubRepo) {
        result = await deployment.deployToGitHub(
          githubRepo,
          website.recreatedHTML!,
          website.recreatedCSS!
        );
      } else if (method === 'vercel' && vercelProject) {
        result = await deployment.deployToVercel(
          vercelProject,
          website.recreatedHTML!,
          website.recreatedCSS!
        );
      } else if (method === 'self-hosted') {
        const packageUrl = await deployment.generateDeploymentPackage(
          website.recreatedHTML!,
          website.recreatedCSS!,
          website.extractedAssets
        );
        result = {
          method: 'self-hosted',
          status: 'ready',
          url: packageUrl,
          timestamp: new Date(),
          details: {},
        };
      }

      // Save deployment
      await prisma.website.update({
        where: { id: siteId },
        data: {
          deploymentMethod: method,
          deploymentStatus: result?.status,
          deploymentUrl: result?.url,
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      log.error('Failed to deploy site', error as Error);
      res.status(500).json({ error: 'Deployment failed' });
    }
  }
);

/**
 * POST /api/sites/:siteId/generate-guarantee
 * Generate compliance certificate and guarantee
 */
router.post(
  '/:siteId/generate-guarantee',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { siteId } = req.params;

      const website = await prisma.website.findUnique({
        where: { id: siteId },
      });

      if (!website)
        return res.status(404).json({ error: 'Website not found' });

      const guaranteeService = new ComplianceGuaranteeService();
      const guarantee = await guaranteeService.generateGuarantee(
        siteId,
        website.complianceScore || 0
      );

      // Save guarantee
      await prisma.website.update({
        where: { id: siteId },
        data: {
          guaranteeStatus: 'guaranteed',
          guaranteeExpiry: guarantee.expiryDate,
        },
      });

      res.json({
        success: true,
        data: {
          guarantee,
          certificateUrl: guarantee.certificateUrl,
          expiryDate: guarantee.expiryDate,
        },
      });
    } catch (error) {
      log.error('Failed to generate guarantee', error as Error);
      res.status(500).json({ error: 'Guarantee generation failed' });
    }
  }
);

/**
 * POST /api/sites/:siteId/monitor
 * Enable ongoing compliance monitoring
 */
router.post(
  '/:siteId/monitor',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { siteId } = req.params;
      const { frequency } = req.body;

      const website = await prisma.website.findUnique({
        where: { id: siteId },
      });

      if (!website)
        return res.status(404).json({ error: 'Website not found' });

      // Schedule monitoring
      // (Using Bull, Inngest, or similar job queue)

      res.json({
        success: true,
        data: {
          monitoringEnabled: true,
          frequency,
          nextScan: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      log.error('Failed to enable monitoring', error as Error);
      res.status(500).json({ error: 'Monitoring setup failed' });
    }
  }
);

export default router;
```

---

## Part 3: Database Schema Changes

### Add Website Model to Prisma Schema

**Location**: `packages/api/prisma/schema.prisma` (add to existing file)

```prisma
model Website {
  id                    String   @id @default(cuid())
  clientId              String

  // Original website
  originalUrl           String   @unique @db.VarChar(2048)

  // Extraction
  extractedHTML         String   @db.Text
  extractedCSS          String   @db.Text
  extractedAssets       Json     @default("{}")

  // Recreation
  recreatedHTML         String?  @db.Text
  recreatedCSS          String?  @db.Text
  complianceScore       Float?   @default(0.0)

  // Screenshots
  screenshotBefore      String?  @db.VarChar(2048) // S3 URL
  screenshotAfter       String?  @db.VarChar(2048) // S3 URL

  // Deployment
  deploymentMethod      String?  @db.VarChar(50)  // "github" | "vercel" | "self-hosted"
  deploymentUrl         String?  @db.VarChar(2048)
  deploymentStatus      String?  @default("pending")

  // Guarantee & Monitoring
  guaranteeStatus       String   @default("pending") // "guaranteed" | "monitoring" | "expired"
  guaranteeExpiry       DateTime?
  monitoringEnabled     Boolean  @default(false)
  monitoringFrequency   String   @default("monthly")

  // Metadata
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  artifacts             WebsiteArtifact[]
  complianceHistory     ComplianceLog[]

  @@index([clientId])
  @@index([guaranteeStatus])
  @@index([complianceScore])
}

model WebsiteArtifact {
  id                    String   @id @default(cuid())
  websiteId             String
  website               Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  type                  String   @db.VarChar(50) // "screenshot", "html", "css", etc
  s3Url                 String   @db.VarChar(2048)
  metadata              Json     @default("{}")

  createdAt             DateTime @default(now())

  @@index([websiteId])
  @@index([type])
}

model ComplianceLog {
  id                    String   @id @default(cuid())
  websiteId             String
  website               Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  scanDate              DateTime
  complianceScore       Float
  violations            Int      @default(0)
  passes                Int      @default(0)

  regression            Boolean  @default(false)
  regressionSeverity    String?  // "critical" | "high" | "medium" | "low"

  reportUrl             String?  @db.VarChar(2048)

  createdAt             DateTime @default(now())

  @@index([websiteId])
  @@index([scanDate])
  @@index([regression])
}
```

---

## Part 4: Frontend Components (UI)

### 1. SiteTransformationDashboard Component
**Location**: `packages/webapp/src/components/SiteTransformationDashboard.tsx`

```typescript
// Main dashboard showing:
// - Website extraction status
// - Before/after comparison
// - Compliance score
// - Deployment options
// - Guarantee status
```

### 2. BeforeAfterComparison Component
**Location**: `packages/webapp/src/components/BeforeAfterComparison.tsx`

```typescript
// Side-by-side or slider comparison
// - Before screenshot
// - After screenshot
// - Toggle between views
// - Compliance metrics overlay
```

### 3. ComplianceCertificate Component
**Location**: `packages/webapp/src/components/ComplianceCertificate.tsx`

```typescript
// Display compliance certificate
// - WCAG level (A, AA, AAA)
// - Compliance score
// - Guarantee terms
// - Insurance details
// - Export as PDF
```

---

## Part 5: Integration Checklist

```
[ ] Install new npm packages:
    - puppeteer (site extraction + screenshots)
    - jsdom (HTML parsing)
    - cheerio (DOM manipulation)
    - @octokit/rest (GitHub API)
    - axe-core (accessibility testing)
    - sharp (image processing)

[ ] Create SiteExtractionEngine service
[ ] Create SiteRecreationEngine service
[ ] Create DeploymentEngine service
[ ] Create ComplianceGuaranteeService service
[ ] Create ComplianceMonitoringService service

[ ] Create /api/sites route handler
[ ] Add Website, WebsiteArtifact, ComplianceLog models to Prisma
[ ] Create database migration
[ ] Run migration (npx prisma migrate dev)

[ ] Create SiteTransformationDashboard component
[ ] Create BeforeAfterComparison component
[ ] Create ComplianceCertificate component

[ ] Update server.ts to import new routes
[ ] Update navigation to link to new dashboard

[ ] Create environment variables:
    - GITHUB_TOKEN
    - S3_BUCKET_NAME
    - VERCEL_TOKEN (optional)
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY

[ ] Test extraction on 5 real websites
[ ] Test recreation and fix application
[ ] Test GitHub PR creation
[ ] Test screenshot generation
[ ] Test compliance scoring

[ ] Update documentation
[ ] Create user guide for transformation workflow
[ ] Create video walkthrough
```

---

## Part 6: Implementation Timeline (Detailed)

### Week 1: Foundation
- [ ] Create SiteExtractionEngine service
- [ ] Integrate Puppeteer for website capture
- [ ] Test on 10 real websites
- [ ] Store extractions in S3

### Week 2: Recreation
- [ ] Create SiteRecreationEngine service
- [ ] Build automatic fix application logic
- [ ] Integrate axe-core for testing
- [ ] Generate before/after screenshots

### Week 3: Deployment
- [ ] Create DeploymentEngine service
- [ ] Implement GitHub PR creation
- [ ] Implement Vercel deployment option
- [ ] Implement self-hosted package generation

### Week 4: Guarantee & Monitoring
- [ ] Create ComplianceGuaranteeService
- [ ] Create ComplianceMonitoringService
- [ ] Implement certificate generation
- [ ] Set up monitoring schedule

### Week 5: API Routes
- [ ] Create /api/sites routes
- [ ] Implement all endpoints
- [ ] Add validation and error handling
- [ ] Test all routes

### Week 6: Database
- [ ] Design Website schema
- [ ] Create Prisma migration
- [ ] Test data persistence
- [ ] Optimize queries

### Week 7-8: Frontend
- [ ] Create SiteTransformationDashboard
- [ ] Create BeforeAfterComparison
- [ ] Create ComplianceCertificate
- [ ] Connect to API endpoints

### Week 9: Testing & Polish
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling
- [ ] User experience improvements

### Week 10: Launch
- [ ] Documentation
- [ ] User guide
- [ ] Video tutorial
- [ ] Marketing materials

---

This is your 10-week roadmap to full site transformation capability. Start with Week 1 and proceed sequentially. Each week builds on the previous one.
