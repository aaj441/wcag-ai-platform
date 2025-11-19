import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { prisma } from '@/utils/database';
import { logger } from '@/utils/logger';
import { updateScanProgress, notifyScanComplete, notifyScanError } from '@/utils/websocket';
import { emailService } from '@/utils/email';
import { NotFoundError, ExternalServiceError } from '@/middleware/errorHandler';

interface ScanOptions {
  includeScreenshots?: boolean;
  customRules?: string[];
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
  waitTime?: number;
}

interface ScanResult {
  scanId: string;
  url: string;
  title?: string;
  score: number;
  totalIssues: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  issues: any[];
  screenshot?: Buffer;
  metadata: any;
}

export async function scanWebsite(scanId: string, options: ScanOptions = {}): Promise<ScanResult> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      user: {
        select: { email: true, firstName: true, username: true },
      },
    },
  });

  if (!scan) {
    throw new NotFoundError('Scan');
  }

  if (scan.status !== 'PENDING') {
    throw new Error('Scan is not in pending state');
  }

  // Update scan status to running
  await prisma.scan.update({
    where: { id: scanId },
    data: { 
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  updateScanProgress({
    scanId,
    progress: 0,
    status: 'RUNNING',
    currentStep: 'Initializing browser',
  });

  let browser;
  let page;

  try {
    // Launch browser with appropriate configuration
    browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS === 'true',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
      timeout: options.timeout || 30000,
    });

    page = await browser.newPage();

    // Configure viewport and user agent
    if (options.viewport) {
      await page.setViewport(options.viewport);
    } else {
      await page.setViewport({ width: 1920, height: 1080 });
    }

    if (options.userAgent) {
      await page.setUserAgent(options.userAgent);
    }

    // Navigate to the URL
    updateScanProgress({
      scanId,
      progress: 10,
      status: 'RUNNING',
      currentStep: `Navigating to ${scan.url}`,
    });

    await page.goto(scan.url, {
      waitUntil: 'networkidle2',
      timeout: options.timeout || 30000,
    });

    // Wait for page to load completely
    if (options.waitTime) {
      await new Promise(resolve => setTimeout(resolve, options.waitTime));
    }

    // Get page title
    const title = await page.title();

    updateScanProgress({
      scanId,
      progress: 30,
      status: 'RUNNING',
      currentStep: 'Analyzing page content',
    });

    // Take screenshot if requested
    let screenshot: Buffer | undefined;
    if (options.includeScreenshots) {
      updateScanProgress({
        scanId,
        progress: 35,
        status: 'RUNNING',
        currentStep: 'Capturing screenshot',
      });

      screenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      });
    }

    // Run axe accessibility testing
    updateScanProgress({
      scanId,
      progress: 50,
      status: 'RUNNING',
      currentStep: 'Running accessibility analysis',
    });

    const axeResults = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    updateScanProgress({
      scanId,
      progress: 80,
      status: 'RUNNING',
      currentStep: 'Processing results',
    });

    // Process axe results
    const processedResults = await processAxeResults(axeResults, scan.url);

    // Calculate score
    const score = calculateAccessibilityScore(processedResults.issues);

    updateScanProgress({
      scanId,
      progress: 90,
      status: 'RUNNING',
      currentStep: 'Saving results',
    });

    // Save issues to database
    await saveScanIssues(scanId, processedResults.issues);

    // Update scan with results
    const updatedScan = await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        title,
        progress: 100,
        totalIssues: processedResults.totalIssues,
        criticalIssues: processedResults.criticalIssues,
        seriousIssues: processedResults.seriousIssues,
        moderateIssues: processedResults.moderateIssues,
        minorIssues: processedResults.minorIssues,
        score,
        completedAt: new Date(),
      },
    });

    // Save screenshot if captured
    if (screenshot) {
      // In a real implementation, you would save this to a file storage service
      // For now, we'll just log that it was captured
      logger.info(`Screenshot captured for scan ${scanId}`);
    }

    updateScanProgress({
      scanId,
      progress: 100,
      status: 'COMPLETED',
      currentStep: 'Scan completed successfully',
      score,
      issuesFound: processedResults.totalIssues,
    });

    // Send notification via WebSocket
    notifyScanComplete(scanId, {
      id: scanId,
      url: scan.url,
      title,
      score,
      totalIssues: processedResults.totalIssues,
      criticalIssues: processedResults.criticalIssues,
      seriousIssues: processedResults.seriousIssues,
      moderateIssues: processedResults.moderateIssues,
      minorIssues: processedResults.minorIssues,
    });

    // Send email notification
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
      try {
        await emailService.sendScanCompleteEmail(
          scan.user.email,
          scan.url,
          {
            id: scanId,
            url: scan.url,
            title,
            score,
            totalIssues: processedResults.totalIssues,
            criticalIssues: processedResults.criticalIssues,
            seriousIssues: processedResults.seriousIssues,
            moderateIssues: processedResults.moderateIssues,
            minorIssues: processedResults.minorIssues,
          }
        );
      } catch (emailError) {
        logger.warn('Failed to send scan completion email:', emailError);
      }
    }

    logger.info(`Scan completed successfully: ${scanId} for ${scan.url}`);

    return {
      scanId,
      url: scan.url,
      title,
      score,
      totalIssues: processedResults.totalIssues,
      criticalIssues: processedResults.criticalIssues,
      seriousIssues: processedResults.seriousIssues,
      moderateIssues: processedResults.moderateIssues,
      minorIssues: processedResults.minorIssues,
      issues: processedResults.issues,
      screenshot,
      metadata: {
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: page.viewport(),
        timestamp: new Date().toISOString(),
      },
    };

  } catch (error) {
    logger.error(`Scan failed for ${scanId}:`, error);

    // Update scan status to failed
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    // Notify about failure
    updateScanProgress({
      scanId,
      progress: 0,
      status: 'FAILED',
      currentStep: 'Scan failed',
    });

    notifyScanError(scanId, error instanceof Error ? error.message : 'Unknown error');

    throw new ExternalServiceError('Accessibility scanning', error instanceof Error ? error.message : 'Unknown error');

  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function processAxeResults(axeResults: any, url: string) {
  const issues: any[] = [];
  let totalIssues = 0;
  let criticalIssues = 0;
  let seriousIssues = 0;
  let moderateIssues = 0;
  let minorIssues = 0;

  // Process violations
  if (axeResults.violations && Array.isArray(axeResults.violations)) {
    for (const violation of axeResults.violations) {
      const severity = mapAxeSeverityToCustom(violation.impact);
      
      // Update counters
      totalIssues++;
      switch (severity) {
        case 'CRITICAL':
          criticalIssues++;
          break;
        case 'SERIOUS':
          seriousIssues++;
          break;
        case 'MODERATE':
          moderateIssues++;
          break;
        case 'MINOR':
          minorIssues++;
          break;
      }

      // Process each node in the violation
      for (const node of violation.nodes) {
        const issue = {
          type: 'VIOLATION',
          severity,
          rule: violation.id,
          message: violation.description,
          impact: violation.impact,
          help: violation.help,
          helpUrl: violation.helpUrl,
          selector: node.target[0] || '',
          xpath: await getXPath(node.target[0]),
          element: node.html,
          context: {
            any: node.any || [],
            all: node.all || [],
            none: node.none || [],
          },
          tags: violation.tags || [],
          wcagLevel: getWcagLevel(violation.tags),
          wcagSection: getWcagSection(violation.tags),
        };

        issues.push(issue);
      }
    }
  }

  // Process incomplete (warnings)
  if (axeResults.incomplete && Array.isArray(axeResults.incomplete)) {
    for (const incomplete of axeResults.incomplete) {
      for (const node of incomplete.nodes) {
        const issue = {
          type: 'WARNING',
          severity: 'MODERATE',
          rule: incomplete.id,
          message: `Could not be tested: ${incomplete.description}`,
          impact: incomplete.impact || 'moderate',
          help: incomplete.help,
          helpUrl: incomplete.helpUrl,
          selector: node.target[0] || '',
          xpath: await getXPath(node.target[0]),
          element: node.html,
          context: {
            any: node.any || [],
            all: node.all || [],
            none: node.none || [],
          },
          tags: incomplete.tags || [],
          wcagLevel: getWcagLevel(incomplete.tags),
          wcagSection: getWcagSection(incomplete.tags),
        };

        issues.push(issue);
        totalIssues++;
        moderateIssues++;
      }
    }
  }

  return {
    issues,
    totalIssues,
    criticalIssues,
    seriousIssues,
    moderateIssues,
    minorIssues,
  };
}

function mapAxeSeverityToCustom(impact: string): string {
  switch (impact?.toLowerCase()) {
    case 'critical':
      return 'CRITICAL';
    case 'serious':
      return 'SERIOUS';
    case 'moderate':
      return 'MODERATE';
    case 'minor':
      return 'MINOR';
    default:
      return 'MODERATE';
  }
}

function getWcagLevel(tags: string[]): string {
  if (tags.includes('wcag2a')) return 'A';
  if (tags.includes('wcag2aa')) return 'AA';
  if (tags.includes('wcag2aaa')) return 'AAA';
  if (tags.includes('wcag21aa')) return 'AA';
  if (tags.includes('wcag22aa')) return 'AA';
  return 'A';
}

function getWcagSection(tags: string[]): string {
  // Map axe tags to WCAG sections
  if (tags.includes('keyboard')) return '2.1 Keyboard Accessible';
  if (tags.includes('color-contrast')) return '1.4 Distinguishable';
  if (tags.includes('image-alt')) return '1.1 Text Alternatives';
  if (tags.includes('title-element')) return '2.4 Navigable';
  if (tags.includes('html-has-lang')) return '3.1 Readable';
  if (tags.includes('label')) return '1.3 Adaptable';
  if (tags.includes('link-name')) return '2.4 Navigable';
  if (tags.includes('focus-order-semantics')) return '2.4 Navigable';
  return 'Unknown';
}

function calculateAccessibilityScore(issues: any[]): number {
  let score = 100;
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'CRITICAL':
        score -= 20;
        break;
      case 'SERIOUS':
        score -= 10;
        break;
      case 'MODERATE':
        score -= 5;
        break;
      case 'MINOR':
        score -= 1;
        break;
    }
  }
  
  return Math.max(0, score);
}

async function saveScanIssues(scanId: string, issues: any[]): Promise<void> {
  const issueData = issues.map(issue => ({
    scanId,
    type: issue.type as any,
    severity: issue.severity as any,
    rule: issue.rule,
    selector: issue.selector,
    message: issue.message,
    impact: issue.impact,
    help: issue.help,
    helpUrl: issue.helpUrl,
    xpath: issue.xpath,
    element: issue.element,
    context: issue.context,
    tags: issue.tags,
    wcagLevel: issue.wcagLevel,
    wcagSection: issue.wcagSection,
  }));

  // Batch insert issues
  await prisma.issue.createMany({
    data: issueData,
  });
}

async function getXPath(selector: string): Promise<string> {
  // This is a simplified XPath generation
  // In a real implementation, you would want a more robust XPath generator
  if (!selector) return '';
  
  try {
    // Convert CSS selector to XPath (simplified)
    return selector.replace(/#/g, '//*[@id="').replace(/\./g, '//*[@class="').replace(/>/g, '/').trim() + '"]';
  } catch {
    return selector;
  }
}

// Queue processing function
export async function processScanQueue(): Promise<void> {
  const { getNextJob, addToQueue } = await import('@/utils/redis');
  
  while (true) {
    try {
      const job = await getNextJob('scans');
      
      if (job && job.data && job.data.scanId) {
        logger.info(`Processing scan job: ${job.id} for scan: ${job.data.scanId}`);
        
        try {
          await scanWebsite(job.data.scanId, job.data.options || {});
        } catch (error) {
          logger.error(`Failed to process scan job ${job.id}:`, error);
          
          // Optionally retry failed jobs
          if (job.retryCount < 3) {
            job.retryCount = (job.retryCount || 0) + 1;
            await addToQueue('scans', job, 1);
            logger.info(`Retrying scan job: ${job.id} (attempt ${job.retryCount})`);
          }
        }
      } else {
        // No jobs available, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      logger.error('Error processing scan queue:', error);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Start queue processor
if (process.env.NODE_ENV !== 'test') {
  processScanQueue().catch(error => {
    logger.error('Failed to start scan queue processor:', error);
  });
}

export { ScanOptions, ScanResult };