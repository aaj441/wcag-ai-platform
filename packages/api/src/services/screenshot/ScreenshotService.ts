import puppeteer, { Browser, Page } from 'puppeteer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { log } from '../../utils/logger';

export interface ScreenshotResult {
  url: string;
  beforeUrl: string;
  afterUrl: string;
  complianceImprovement: number;
  violationsFixed: number;
  timeToCapture: number;
}

export class ScreenshotService {
  private browser: Browser | null = null;
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      log.info('Puppeteer browser initialized');
    }
  }

  async captureBeforeAndAfter(url: string): Promise<ScreenshotResult> {
    const startTime = Date.now();

    if (!this.browser) await this.initialize();

    try {
      const page = await this.browser!.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to URL
      log.info('Navigating to URL', { url });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Capture BEFORE screenshot
      const beforeScreenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
      }) as Buffer;
      const beforeUrl = await this.uploadToS3(
        `${this.hashUrl(url)}/before-${Date.now()}.png`,
        beforeScreenshot
      );

      // Inject auto-fix script
      log.info('Injecting auto-fix script');
      await page.evaluate(() => {
        // Add alt text to images
        // @ts-ignore
        document.querySelectorAll('img:not([alt])').forEach((img: any) => {
          img.setAttribute('alt', img.src.split('/').pop() || 'Image');
        });

        // Add focus indicators
        // @ts-ignore
        const style = document.createElement('style');
        style.textContent = `
          button:focus-visible, a:focus-visible, input:focus-visible {
            outline: 3px solid #4F46E5;
            outline-offset: 2px;
          }
        `;
        // @ts-ignore
        document.head.appendChild(style);

        // Add skip link
        // @ts-ignore
        if (!document.querySelector('a.skip-link')) {
          // @ts-ignore
          const skipLink = document.createElement('a');
          skipLink.href = '#main';
          skipLink.className = 'skip-link';
          skipLink.textContent = 'Skip to main content';
          skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: #000;
            color: #fff;
            padding: 8px;
            z-index: 100;
          `;
          skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
          });
          skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
          });
          // @ts-ignore
          document.body.prepend(skipLink);
        }
      });

      // Wait for fixes to apply
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture AFTER screenshot
      const afterScreenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
      }) as Buffer;
      const afterUrl = await this.uploadToS3(
        `${this.hashUrl(url)}/after-${Date.now()}.png`,
        afterScreenshot
      );

      // Calculate compliance improvement (mock for now)
      const violationsFixed = Math.floor(Math.random() * 30) + 15;
      const complianceImprovement = (violationsFixed / 47) * 100;

      await page.close();

      return {
        url,
        beforeUrl,
        afterUrl,
        violationsFixed,
        complianceImprovement,
        timeToCapture: Date.now() - startTime,
      };
    } catch (error) {
      log.error('Failed to capture screenshots', error as Error, { url });
      throw error;
    }
  }

  private async uploadToS3(key: string, buffer: Buffer): Promise<string> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET || 'wcagai-screenshots',
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
          ACL: 'public-read',
        })
      );

      const bucketUrl = process.env.S3_PUBLIC_BUCKET_URL || 'https://wcagai-screenshots.s3.us-east-1.amazonaws.com';
      return `${bucketUrl}/${key}`;
    } catch (error) {
      log.error('Failed to upload to S3', error as Error);
      // Fallback: return base64 encoded buffer
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  }

  private hashUrl(url: string): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(url)
      .digest('hex')
      .substring(0, 8);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      log.info('Puppeteer browser closed');
    }
  }
}
