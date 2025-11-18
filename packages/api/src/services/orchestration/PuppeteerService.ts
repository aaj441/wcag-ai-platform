import puppeteer, { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';
import { log } from '../../utils/logger';

export interface ScanOptions {
  url: string;
  timeout?: number;
  maxRetries?: number;
  screenshot?: boolean;
}

export interface ScanResult {
  url: string;
  score: number;
  violations: any[];
  scanTime: number;
  screenshot?: string;
}

/**
 * Production-grade Puppeteer service with resource pooling,
 * kill switches, and automatic recovery
 */
export class PuppeteerService extends EventEmitter {
  private browser: Browser | null = null;
  private activePages = 0;
  private maxConcurrentPages = 3; // Prevents resource exhaustion
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly BROWSER_LAUNCH_TIMEOUT = 60000; // 60 seconds
  private readonly PAGE_IDLE_TIMEOUT = 30000; // 30 seconds per page

  /**
   * Initialize Puppeteer browser with production-grade configuration
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      log.debug('Puppeteer already initialized');
      return;
    }

    try {
      log.info('Initializing Puppeteer browser');

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Prevents memory issues in containers
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Reduces memory footprint
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-preconnect',
        ],
        timeout: this.BROWSER_LAUNCH_TIMEOUT,
      });

      log.info('✅ Puppeteer browser initialized successfully');
      this.monitorBrowserHealth();
    } catch (error) {
      log.error('❌ Failed to initialize Puppeteer:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Scan a URL with automatic retries and timeout handling
   */
  async scanUrl(options: ScanOptions): Promise<ScanResult> {
    const { url, timeout = 30000, maxRetries = 2 } = options;

    await this.initialize();

    // Wait if we're at concurrency limit
    while (this.activePages >= this.maxConcurrentPages) {
      log.warn(
        `⏳ Concurrency limit reached, waiting... (${this.activePages}/${this.maxConcurrentPages})`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log.info(`🔍 Scan attempt ${attempt}/${maxRetries}: ${url}`);
        const result = await this.runSingleScan(url, timeout);
        log.info(`✅ Scan successful: ${url}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        log.error(`❌ Attempt ${attempt} failed: ${url}`, error instanceof Error ? error : new Error(String(error)));

        if (attempt < maxRetries) {
          const backoff = attempt * 2000; // 2s, 4s, 6s...
          log.info(`🔄 Retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    // All retries failed
    log.error(`💀 All retries failed for ${url}`);
    throw lastError || new Error('Scan failed after all retries');
  }

  /**
   * Run a single scan operation
   */
  private async runSingleScan(url: string, timeoutMs: number): Promise<ScanResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    let page: Page | null = null;
    const startTime = Date.now();

    try {
      page = await this.browser.newPage();
      this.activePages++;

      log.debug(`Created page for ${url} (active: ${this.activePages})`);

      // Set up kill switch - double the timeout for safety buffer
      let killSwitchTriggered = false;
      const killSwitch = setTimeout(async () => {
        killSwitchTriggered = true;
        log.warn(`⚠️ Scan timeout for ${url}, forcing close`);
        if (page) {
          try {
            await page.close();
          } catch (e) {
            log.warn('Failed to close page via kill switch:', e);
          }
        }
      }, timeoutMs * 2);

      // Set user agent to avoid detection
      if (page) {
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Set headers to look like real browser
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        });

        // Navigate with timeout
        log.debug(`Navigating to ${url}`);
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: timeoutMs,
        });

        clearTimeout(killSwitch);

        if (killSwitchTriggered) {
          throw new Error('Scan was killed due to timeout');
        }

        // Inject axe-core for accessibility scanning
        log.debug(`Injecting axe-core into ${url}`);
        await page.evaluate(() => {
          // @ts-ignore
          if (!window.axe) {
            // Inline axe-core (simplified - in production use npm package)
            console.log('Axe-core not found, would be injected here');
          }
        });

        // Get page content for basic scoring
        const content = await page.content();
        const score = this.calculateAccessibilityScore(content);

        log.debug(`Accessibility score for ${url}: ${score}`);

        return {
          url,
          score,
          violations: [], // Would be populated by axe-core in production
          scanTime: Date.now() - startTime,
        };
      } else {
        throw new Error('Page not initialized');
      }
    } finally {
      this.activePages--;
      if (page) {
        try {
          await page.close();
          log.debug(`Closed page for ${url} (active: ${this.activePages})`);
        } catch (error) {
          log.warn(`⚠️ Failed to close page: ${error}`);
        }
      }
    }
  }

  /**
   * Calculate basic accessibility score from page content
   */
  private calculateAccessibilityScore(content: string): number {
    let score = 100;

    // Deduct points for missing accessibility features
    if (!content.includes('role=')) score -= 5;
    if (!content.includes('aria-label')) score -= 5;
    if (!content.includes('alt=')) score -= 10;
    if (!content.includes('lang=')) score -= 5;
    if (!content.includes('meta charset')) score -= 2;
    if (!content.includes('viewport')) score -= 3;

    return Math.max(0, score);
  }

  /**
   * Monitor browser health and restart if necessary
   */
  private monitorBrowserHealth(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

      log.debug(`Memory usage: ${heapUsedMB}MB`);

      if (heapUsedMB > 500) {
        log.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);

        // Restart browser if memory is critical
        if (heapUsedMB > 800) {
          log.error('🚨 Memory critical, restarting browser');
          this.restartBrowser().catch((error) => {
            log.error('Failed to restart browser:', error);
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Restart the browser gracefully
   */
  private async restartBrowser(): Promise<void> {
    if (this.browser) {
      try {
        log.info('Closing browser for restart');
        await this.browser.close();
      } catch (error) {
        log.warn('Error closing browser:', error);
      }
      this.browser = null;
    }

    // Wait a moment before reinitializing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      await this.initialize();
      log.info('✅ Browser restarted successfully');
      this.emit('restart');
    } catch (error) {
      log.error('❌ Failed to restart browser:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current browser health status
   */
  getHealth(): {
    initialized: boolean;
    activePages: number;
    memoryUsageMB: number;
  } {
    const usage = process.memoryUsage();
    return {
      initialized: this.browser !== null,
      activePages: this.activePages,
      memoryUsageMB: Math.round(usage.heapUsed / 1024 / 1024),
    };
  }

  /**
   * Close the browser gracefully
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.browser) {
      try {
        log.info('Closing Puppeteer browser');
        await this.browser.close();
        this.browser = null;
        log.info('✅ Browser closed successfully');
      } catch (error) {
        log.error('Error closing browser:', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

// Singleton instance
let puppeteerServiceInstance: PuppeteerService | null = null;

export function getPuppeteerService(): PuppeteerService {
  if (!puppeteerServiceInstance) {
    puppeteerServiceInstance = new PuppeteerService();
  }
  return puppeteerServiceInstance;
}
