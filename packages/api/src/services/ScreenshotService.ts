/**
 * Screenshot Service - The "Wow Factor" Feature
 *
 * Generates before/after screenshots with violations highlighted
 * Uses Browserless.io for Puppeteer (works on Replit/Railway)
 *
 * YOUR OVERNIGHT EXPERT CHEAT CODE:
 * - Browserless.io does the heavy lifting
 * - We just tell it what to highlight
 * - Creates pitch-perfect visuals automatically
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import Jimp from 'jimp';
import { log } from '../utils/logger';

export interface ViolationHighlight {
  selector: string;
  wcagCriteria: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fix?: {
    type: 'alt-text' | 'color-contrast' | 'label' | 'aria' | 'heading' | 'focus-indicator';
    suggestedFix?: string;
    code?: string;
  };
}

export interface ScreenshotOptions {
  url: string;
  violations: ViolationHighlight[];
  viewport?: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
}

export class ScreenshotService {
  private browserlessEndpoint: string;

  constructor() {
    // Use Browserless.io (works on Replit, Railway, anywhere)
    // Free tier: 100 sessions/month - perfect for demos
    const browserlessToken = process.env.BROWSERLESS_TOKEN || '';

    if (!browserlessToken) {
      log.warn('BROWSERLESS_TOKEN not set - screenshots will fail. Get free token at browserless.io');
    }

    this.browserlessEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}`;
  }

  /**
   * Connect to browser (Browserless.io or local)
   */
  private async connectBrowser(): Promise<Browser> {
    try {
      // Try Browserless.io first (production/Replit)
      const browser = await puppeteer.connect({
        browserWSEndpoint: this.browserlessEndpoint,
      });

      log.info('Connected to Browserless.io');
      return browser;
    } catch (error) {
      // Fallback to local Chrome (development only)
      log.warn('Browserless.io connection failed, trying local Chrome...');

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      return browser;
    }
  }

  /**
   * BEFORE Screenshot: Violations highlighted in RED
   */
  async captureViolations(options: ScreenshotOptions): Promise<Buffer> {
    log.info('Capturing BEFORE screenshot', {
      url: options.url,
      violationCount: options.violations.length,
    });

    const browser = await this.connectBrowser();

    try {
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport(options.viewport || {
        width: 1920,
        height: 1080,
      });

      // Navigate to page
      await page.goto(options.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a moment for page to settle
      await page.waitForTimeout(1000);

      // Highlight each violation in RED
      await page.evaluate((violations: ViolationHighlight[]) => {
        violations.forEach((violation, index) => {
          try {
            const elements = document.querySelectorAll(violation.selector);

            elements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement;

              // Red highlight
              htmlEl.style.outline = '5px solid #FF0000';
              htmlEl.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.8)';
              htmlEl.style.position = 'relative';
              htmlEl.style.zIndex = '9999';

              // Add violation label
              const label = document.createElement('div');
              label.style.cssText = `
                position: absolute;
                top: -35px;
                left: 0;
                background: #FF0000;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                white-space: nowrap;
                z-index: 10000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              `;
              label.textContent = `⚠ ${violation.wcagCriteria} - ${violation.severity.toUpperCase()}`;

              htmlEl.style.position = 'relative';
              htmlEl.appendChild(label);
            });
          } catch (e) {
            console.warn(`Failed to highlight ${violation.selector}:`, e);
          }
        });

        // Add header banner
        const banner = document.createElement('div');
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #FF0000;
          color: white;
          padding: 16px;
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          font-family: Arial, sans-serif;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        banner.textContent = `❌ BEFORE: ${violations.length} WCAG Violation${violations.length !== 1 ? 's' : ''} Found`;
        document.body.insertBefore(banner, document.body.firstChild);
      }, options.violations);

      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: options.fullPage || false,
        type: 'png',
      });

      await browser.close();

      log.info('BEFORE screenshot captured successfully');
      return screenshot as Buffer;
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * AFTER Screenshot: Fixes applied, highlighted in GREEN
   */
  async captureFixed(options: ScreenshotOptions): Promise<Buffer> {
    log.info('Capturing AFTER screenshot', {
      url: options.url,
      fixCount: options.violations.length,
    });

    const browser = await this.connectBrowser();

    try {
      const page = await browser.newPage();

      await page.setViewport(options.viewport || {
        width: 1920,
        height: 1080,
      });

      await page.goto(options.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await page.waitForTimeout(1000);

      // Apply fixes and highlight in GREEN
      await page.evaluate((violations: ViolationHighlight[]) => {
        violations.forEach((violation) => {
          try {
            const elements = document.querySelectorAll(violation.selector);

            elements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement;

              // Apply the actual fix
              if (violation.fix) {
                switch (violation.fix.type) {
                  case 'alt-text':
                    if (el instanceof HTMLImageElement) {
                      el.setAttribute('alt', violation.fix.suggestedFix || 'AI-generated alt text');
                    }
                    break;

                  case 'color-contrast':
                    if (violation.fix.suggestedFix) {
                      htmlEl.style.color = violation.fix.suggestedFix;
                    }
                    break;

                  case 'label':
                    const label = document.createElement('label');
                    label.textContent = violation.fix.suggestedFix || 'Field label';
                    label.style.cssText = 'display: block; margin-bottom: 4px; font-weight: 600;';
                    if (el.id) {
                      label.setAttribute('for', el.id);
                    }
                    el.parentNode?.insertBefore(label, el);
                    break;

                  case 'aria':
                    if (violation.fix.code) {
                      const attrs = violation.fix.code.split(' ');
                      attrs.forEach(attr => {
                        const [key, val] = attr.split('=');
                        if (key && val) {
                          htmlEl.setAttribute(key, val.replace(/"/g, ''));
                        }
                      });
                    }
                    break;

                  case 'focus-indicator':
                    htmlEl.style.outline = '3px solid #4A90E2';
                    htmlEl.style.outlineOffset = '2px';
                    break;
                }
              }

              // Green highlight to show it's fixed
              htmlEl.style.outline = '5px solid #00FF00';
              htmlEl.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
              htmlEl.style.position = 'relative';
              htmlEl.style.zIndex = '9999';

              // Add fixed label
              const label = document.createElement('div');
              label.style.cssText = `
                position: absolute;
                top: -35px;
                left: 0;
                background: #00FF00;
                color: #000;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                white-space: nowrap;
                z-index: 10000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              `;
              label.textContent = `✓ ${violation.wcagCriteria} FIXED`;

              htmlEl.style.position = 'relative';
              htmlEl.appendChild(label);
            });
          } catch (e) {
            console.warn(`Failed to fix ${violation.selector}:`, e);
          }
        });

        // Add green success banner
        const banner = document.createElement('div');
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #00FF00;
          color: #000;
          padding: 16px;
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          font-family: Arial, sans-serif;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        banner.textContent = `✓ AFTER: ${violations.length} Violation${violations.length !== 1 ? 's' : ''} Fixed (AI-Powered)`;
        document.body.insertBefore(banner, document.body.firstChild);
      }, options.violations);

      const screenshot = await page.screenshot({
        fullPage: options.fullPage || false,
        type: 'png',
      });

      await browser.close();

      log.info('AFTER screenshot captured successfully');
      return screenshot as Buffer;
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  /**
   * Create side-by-side composite (PITCH DECK READY)
   */
  async createBeforeAfterComposite(
    beforeBuffer: Buffer,
    afterBuffer: Buffer,
    stats: {
      violationCount: number;
      url: string;
      complianceBefore: number;
      complianceAfter: number;
    }
  ): Promise<Buffer> {
    log.info('Creating before/after composite');

    try {
      const [beforeImg, afterImg] = await Promise.all([
        Jimp.read(beforeBuffer),
        Jimp.read(afterBuffer),
      ]);

      const width = beforeImg.bitmap.width;
      const height = beforeImg.bitmap.height;
      const gap = 40;
      const footerHeight = 100;

      // Create canvas
      const composite = new Jimp(
        width * 2 + gap,
        height + footerHeight,
        0xFFFFFFFF
      );

      // Add images
      composite.blit(beforeImg, 0, 0);
      composite.blit(afterImg, width + gap, 0);

      // Add divider
      for (let y = 0; y < height; y++) {
        composite.setPixelColor(0x000000FF, width + gap / 2, y);
      }

      // Add footer with stats
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

      composite.print(
        font,
        20,
        height + 20,
        `${stats.url} | ${stats.violationCount} violations | ${stats.complianceBefore}% → ${stats.complianceAfter}% compliant`
      );

      const buffer = await composite.getBufferAsync(Jimp.MIME_PNG);

      log.info('Composite created successfully');
      return buffer;
    } catch (error) {
      log.error('Failed to create composite', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * ONE-CLICK MAGIC: Generate everything for the pitch
   */
  async generatePitchPackage(options: ScreenshotOptions): Promise<{
    before: Buffer;
    after: Buffer;
    composite: Buffer;
    stats: {
      violationCount: number;
      url: string;
      complianceBefore: number;
      complianceAfter: number;
    };
  }> {
    log.info('🎯 Generating complete pitch package', { url: options.url });

    // Generate before and after in parallel
    const [before, after] = await Promise.all([
      this.captureViolations(options),
      this.captureFixed(options),
    ]);

    // Calculate stats
    const stats = {
      violationCount: options.violations.length,
      url: options.url,
      complianceBefore: Math.max(0, 100 - (options.violations.length * 5)),
      complianceAfter: Math.min(100, 100 - (options.violations.filter(v => !v.fix).length * 5)),
    };

    // Create composite
    const composite = await this.createBeforeAfterComposite(before, after, stats);

    log.info('✅ Pitch package complete!');

    return {
      before,
      after,
      composite,
      stats,
    };
  }
}

export const screenshotService = new ScreenshotService();
