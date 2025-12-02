const puppeteer = require('puppeteer');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');

/**
 * Production-Ready WCAG Accessibility Scanner
 * 
 * Features:
 * - Multi-page crawling with depth control
 * - WCAG 2.0/2.1/2.2/Section508 compliance checking
 * - Custom accessibility validation
 * - Screenshot capture for visual comparison
 * - Real-time progress tracking
 * - Comprehensive violation reporting
 */
class ScanService {
  constructor(options = {}) {
    this.scanId = options.scanId || uuidv4();
    this.baseUrl = options.baseUrl;
    this.maxDepth = options.maxDepth || 3;
    this.maxPages = options.maxPages || 50;
    this.standards = options.standards || ['WCAG2.2'];
    this.onProgress = options.onProgress || (() => {});
    
    this.visitedUrls = new Set();
    this.discoveredUrls = new Set();
    
    this.scanResults = {
      scanId: this.scanId,
      baseUrl: this.baseUrl,
      startedAt: new Date(),
      completedAt: null,
      totalPages: 0,
      pagesWithViolations: 0,
      totalViolations: 0,
      criticalViolations: 0,
      seriousViolations: 0,
      moderateViolations: 0,
      minorViolations: 0,
      violations: [],
      pages: [],
      complianceScore: 0,
      wcagLevel: 'A',
      status: 'pending'
    };
  }

  /**
   * Start the accessibility scan
   */
  async scan() {
    console.log(`[Scanner] Starting scan for ${this.baseUrl}`);
    this.scanResults.status = 'scanning';
    
    let browser;
    try {
      // Launch headless browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      // Crawl from base URL
      await this.crawlUrl(this.baseUrl, 0, browser);
      
      // Calculate compliance metrics
      this.calculateComplianceScore();
      
      this.scanResults.completedAt = new Date();
      this.scanResults.status = 'completed';
      
      console.log(`[Scanner] Completed: ${this.scanResults.totalViolations} violations across ${this.scanResults.totalPages} pages`);
      
      return this.scanResults;
      
    } catch (error) {
      console.error('[Scanner] Fatal error:', error);
      this.scanResults.status = 'failed';
      this.scanResults.error = error.message;
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Crawl a URL and discover linked pages
   */
  async crawlUrl(url, depth, browser) {
    // Stop conditions
    if (this.visitedUrls.has(url)) return;
    if (depth > this.maxDepth) return;
    if (this.visitedUrls.size >= this.maxPages) return;
    if (!this.isSameDomain(url, this.baseUrl)) return;

    this.visitedUrls.add(url);
    
    try {
      const page = await browser.newPage();
      
      // Configure page
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('WCAG-Scanner/1.0');
      
      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Scan the page
      const pageResults = await this.scanPage(page, url);
      this.scanResults.pages.push(pageResults);
      
      // Update counters
      if (pageResults.violations.length > 0) {
        this.scanResults.pagesWithViolations++;
      }
      
      // Discover new URLs
      if (depth < this.maxDepth && this.visitedUrls.size < this.maxPages) {
        const newUrls = await this.discoverUrls(page, url);
        for (const newUrl of newUrls) {
          if (!this.visitedUrls.has(newUrl)) {
            await this.crawlUrl(newUrl, depth + 1, browser);
          }
        }
      }
      
      await page.close();
      
      // Report progress
      this.scanResults.totalPages = this.visitedUrls.size;
      this.updateProgress();
      
    } catch (error) {
      console.warn(`[Scanner] Failed to crawl ${url}:`, error.message);
    }
  }

  /**
   * Scan a single page for accessibility violations
   */
  async scanPage(page, url) {
    console.log(`[Scanner] Scanning: ${url}`);
    
    const pageResults = {
      url,
      pageId: uuidv4(),
      title: '',
      scannedAt: new Date(),
      violations: [],
      screenshot: null
    };
    
    try {
      // Get page metadata
      pageResults.title = await page.title();
      
      // Capture screenshot
      pageResults.screenshot = await page.screenshot({
        fullPage: false,
        encoding: 'base64'
      });
      
      // Inject axe-core
      await page.addScriptTag({
        path: require.resolve('axe-core')
      });
      
      // Run axe-core scan
      const axeResults = await page.evaluate(async (standards) => {
        const config = { tags: [] };
        
        // Configure standards
        standards.forEach(standard => {
          switch (standard) {
            case 'WCAG2.0':
              config.tags.push('wcag2a', 'wcag2aa');
              break;
            case 'WCAG2.1':
              config.tags.push('wcag21aa');
              break;
            case 'WCAG2.2':
              config.tags.push('wcag22aa');
              break;
            case 'Section508':
              config.tags.push('section508');
              break;
          }
        });
        
        return await axe.run(config);
      }, this.standards);
      
      // Process violations
      pageResults.violations = this.processViolations(axeResults.violations, url);
      
      // Custom accessibility checks
      const customChecks = await this.performCustomChecks(page, url);
      pageResults.violations.push(...customChecks);
      
      // Update violation counters
      this.scanResults.totalViolations += pageResults.violations.length;
      this.scanResults.violations.push(...pageResults.violations);
      
      // Categorize by severity
      pageResults.violations.forEach(v => {
        switch (v.impact) {
          case 'critical':
            this.scanResults.criticalViolations++;
            break;
          case 'serious':
            this.scanResults.seriousViolations++;
            break;
          case 'moderate':
            this.scanResults.moderateViolations++;
            break;
          case 'minor':
            this.scanResults.minorViolations++;
            break;
        }
      });
      
    } catch (error) {
      console.error(`[Scanner] Error scanning ${url}:`, error);
      pageResults.violations.push({
        id: 'scan-error',
        impact: 'critical',
        description: 'Scan failed',
        help: error.message,
        nodes: [{ target: ['body'] }]
      });
    }
    
    return pageResults;
  }

  /**
   * Process axe-core violations into standardized format
   */
  processViolations(violations, url) {
    return violations.map(v => ({
      id: v.id,
      impact: v.impact,
      tags: v.tags,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      url,
      nodes: v.nodes.map(node => ({
        html: node.html,
        target: node.target,
        failureSummary: node.failureSummary
      }))
    }));
  }

  /**
   * Perform custom accessibility checks beyond axe-core
   */
  async performCustomChecks(page, url) {
    const violations = [];
    
    try {
      // Check: Missing lang attribute
      const hasLang = await page.evaluate(() => {
        return Boolean(document.documentElement.lang);
      });
      
      if (!hasLang) {
        violations.push({
          id: 'html-has-lang',
          impact: 'serious',
          tags: ['wcag2a', 'wcag21a'],
          description: 'Page language not specified',
          help: 'Add lang attribute to <html> element',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/html/H57',
          url,
          nodes: [{ target: ['html'], html: '<html>' }]
        });
      }
      
      // Check: Missing viewport meta
      const hasViewport = await page.evaluate(() => {
        return Boolean(document.querySelector('meta[name="viewport"]'));
      });
      
      if (!hasViewport) {
        violations.push({
          id: 'meta-viewport',
          impact: 'moderate',
          tags: ['best-practice'],
          description: 'Missing viewport meta tag',
          help: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
          helpUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag',
          url,
          nodes: [{ target: ['head'], html: '<head>' }]
        });
      }
      
      // Check: Skip link present
      const hasSkipLink = await page.evaluate(() => {
        const skip = document.querySelector('a[href="#main"], a[href="#content"]');
        return Boolean(skip);
      });
      
      if (!hasSkipLink) {
        violations.push({
          id: 'bypass-blocks',
          impact: 'moderate',
          tags: ['wcag2a', 'wcag21a'],
          description: 'No skip link found',
          help: 'Add skip link to bypass navigation',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/general/G1',
          url,
          nodes: [{ target: ['body'], html: '<body>' }]
        });
      }
      
    } catch (error) {
      console.warn('[Scanner] Custom checks error:', error);
    }
    
    return violations;
  }

  /**
   * Discover URLs from a page
   */
  async discoverUrls(page, baseUrl) {
    const urls = new Set();
    
    try {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href && !href.startsWith('javascript:') && !href.startsWith('mailto:'));
      });
      
      for (const link of links) {
        try {
          const absoluteUrl = new URL(link, baseUrl).href;
          if (this.isSameDomain(absoluteUrl, baseUrl)) {
            // Remove hash and query params for deduplication
            const cleanUrl = absoluteUrl.split('#')[0].split('?')[0];
            urls.add(cleanUrl);
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    } catch (error) {
      console.warn('[Scanner] URL discovery error:', error);
    }
    
    return Array.from(urls);
  }

  /**
   * Check if two URLs are from the same domain
   */
  isSameDomain(url1, url2) {
    try {
      const host1 = new URL(url1).hostname;
      const host2 = new URL(url2).hostname;
      return host1 === host2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update progress callback
   */
  updateProgress() {
    const progress = Math.min(
      (this.visitedUrls.size / this.maxPages) * 100,
      100
    );
    this.onProgress({
      progress: Math.floor(progress),
      pagesScanned: this.visitedUrls.size,
      violationsFound: this.scanResults.totalViolations
    });
  }

  /**
   * Calculate compliance score and WCAG level
   */
  calculateComplianceScore() {
    const totalPossibleViolations = this.scanResults.totalPages * 20;
    const violationRate = this.scanResults.totalViolations / totalPossibleViolations;
    
    // Score: 100 = perfect, 0 = many violations
    this.scanResults.complianceScore = Math.max(0, Math.round(100 * (1 - violationRate)));
    
    // Determine WCAG level
    if (this.scanResults.criticalViolations === 0 && this.scanResults.seriousViolations === 0) {
      this.scanResults.wcagLevel = 'AAA';
    } else if (this.scanResults.criticalViolations === 0) {
      this.scanResults.wcagLevel = 'AA';
    } else {
      this.scanResults.wcagLevel = 'A';
    }
  }
}

// Export service
module.exports = {
  ScanService,
  
  // Utility: Categorize violation by severity
  categorizeViolation: (violation) => {
    const severityMap = {
      'critical': { label: 'Critical', priority: 1, color: '#ef4444' },
      'serious': { label: 'Serious', priority: 2, color: '#f59e0b' },
      'moderate': { label: 'Moderate', priority: 3, color: '#3b82f6' },
      'minor': { label: 'Minor', priority: 4, color: '#8b5cf6' }
    };
    
    return severityMap[violation.impact] || severityMap['minor'];
  },
  
  // Utility: Group violations by type
  groupViolations: (violations) => {
    const grouped = {};
    
    violations.forEach(v => {
      if (!grouped[v.id]) {
        grouped[v.id] = {
          id: v.id,
          description: v.description,
          help: v.help,
          impact: v.impact,
          count: 0,
          instances: []
        };
      }
      grouped[v.id].count += v.nodes.length;
      grouped[v.id].instances.push(...v.nodes);
    });
    
    return Object.values(grouped);
  }
};
