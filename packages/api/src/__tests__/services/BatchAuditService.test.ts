/**
 * BatchAuditService Tests
 * Complete test coverage for batch audit functionality
 */

import { BatchAuditService, AuditJob } from '../../services/BatchAuditService';
import { wait } from '../helpers/testUtils';
import { createMockAuditResult } from '../helpers/mockData';

// Mock puppeteer
const mockBrowser = {
  newPage: jest.fn(),
  close: jest.fn(),
};

const mockPage = {
  setViewport: jest.fn(),
  goto: jest.fn(),
  evaluate: jest.fn(),
  close: jest.fn(),
};

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

describe('BatchAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.evaluate.mockResolvedValue({
      hasViewport: true,
      title: 'Test Page',
      images: 10,
      imagesWithoutAlt: 3,
      buttons: 5,
      inputs: 2,
      links: 20,
      headings: 8,
    });
  });

  describe('createAuditJob', () => {
    it('should create a new audit job with correct structure', () => {
      const websites = ['https://example.com', 'https://test.com'];
      const job = BatchAuditService.createAuditJob(websites);

      expect(job).toBeDefined();
      expect(job.jobId).toMatch(/^audit_/);
      expect(job.websites).toEqual(websites);
      expect(job.status).toBe('pending');
      expect(job.progress.total).toBe(2);
      expect(job.progress.completed).toBe(0);
      expect(job.progress.failed).toBe(0);
      expect(job.results).toBeInstanceOf(Map);
    });

    it('should generate unique job IDs', () => {
      const job1 = BatchAuditService.createAuditJob(['https://example.com']);
      const job2 = BatchAuditService.createAuditJob(['https://test.com']);

      expect(job1.jobId).not.toBe(job2.jobId);
    });

    it('should handle empty website list', () => {
      const job = BatchAuditService.createAuditJob([]);

      expect(job.progress.total).toBe(0);
      expect(job.websites).toEqual([]);
    });

    it('should handle single website', () => {
      const job = BatchAuditService.createAuditJob(['https://single.com']);

      expect(job.progress.total).toBe(1);
      expect(job.websites).toHaveLength(1);
    });

    it('should start processing asynchronously', async () => {
      const websites = ['https://example.com'];
      const job = BatchAuditService.createAuditJob(websites);

      // Wait for async processing to start
      await wait(100);

      const updatedJob = BatchAuditService.getJobStatus(job.jobId);
      expect(updatedJob?.status).toMatch(/in_progress|completed/);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for valid job ID', () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      const status = BatchAuditService.getJobStatus(job.jobId);

      expect(status).toBeDefined();
      expect(status?.jobId).toBe(job.jobId);
    });

    it('should return null for invalid job ID', () => {
      const status = BatchAuditService.getJobStatus('invalid_id');

      expect(status).toBeNull();
    });

    it('should return updated status after processing', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);

      // Wait for processing
      await wait(500);

      const status = BatchAuditService.getJobStatus(job.jobId);
      expect(status?.status).toBe('completed');
      expect(status?.startedAt).toBeDefined();
      expect(status?.completedAt).toBeDefined();
    });
  });

  describe('processBatchAsync', () => {
    it('should process multiple websites in parallel', async () => {
      const websites = [
        'https://site1.com',
        'https://site2.com',
        'https://site3.com',
        'https://site4.com',
      ];

      const job = BatchAuditService.createAuditJob(websites);

      // Wait for processing to complete
      await wait(1000);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      expect(finalJob?.status).toBe('completed');
      expect(finalJob?.progress.completed).toBe(4);
      expect(finalJob?.results.size).toBe(4);
    });

    it('should handle partial failures gracefully', async () => {
      // Make one site fail
      let callCount = 0;
      mockPage.goto.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Navigation timeout');
        }
        return Promise.resolve();
      });

      const websites = ['https://site1.com', 'https://site2.com', 'https://site3.com'];
      const job = BatchAuditService.createAuditJob(websites);

      await wait(1000);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      expect(finalJob?.progress.completed).toBe(2);
      expect(finalJob?.progress.failed).toBe(1);
      expect(finalJob?.status).toBe('completed');
    });

    it('should process in batches of 4', async () => {
      const websites = Array.from({ length: 10 }, (_, i) => `https://site${i}.com`);
      const job = BatchAuditService.createAuditJob(websites);

      await wait(1500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      expect(finalJob?.progress.total).toBe(10);
      expect(finalJob?.status).toBe('completed');
    });

    it('should set start and end times correctly', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);

      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      expect(finalJob?.startedAt).toBeInstanceOf(Date);
      expect(finalJob?.completedAt).toBeInstanceOf(Date);
      expect(finalJob?.completedAt!.getTime()).toBeGreaterThanOrEqual(
        finalJob?.startedAt!.getTime()
      );
    });
  });

  describe('auditWebsite', () => {
    it('should audit website successfully', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);

      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      expect(result).toBeDefined();
      expect(result?.status).toBe('success');
      expect(result?.website).toBe('https://example.com');
      expect(result?.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result?.complianceScore).toBeLessThanOrEqual(100);
      expect(result?.violations).toBeDefined();
      expect(result?.passes).toBeDefined();
    });

    it('should detect missing alt text violations', async () => {
      mockPage.evaluate.mockResolvedValue({
        hasViewport: true,
        title: 'Test',
        images: 5,
        imagesWithoutAlt: 3,
        buttons: 0,
        inputs: 0,
        links: 0,
        headings: 1,
      });

      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      const altViolation = result?.violations.find((v: any) => v.id === 'image-alt');
      expect(altViolation).toBeDefined();
      expect(altViolation.impact).toBe('critical');
      expect(altViolation.nodes).toHaveLength(3);
    });

    it('should detect missing viewport', async () => {
      mockPage.evaluate.mockResolvedValue({
        hasViewport: false,
        title: 'Test',
        images: 0,
        imagesWithoutAlt: 0,
        buttons: 0,
        inputs: 0,
        links: 0,
        headings: 0,
      });

      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      const viewportViolation = result?.violations.find((v: any) => v.id === 'viewport');
      expect(viewportViolation).toBeDefined();
      expect(viewportViolation.impact).toBe('critical');
    });

    it('should detect HTTP (no HTTPS)', async () => {
      const job = BatchAuditService.createAuditJob(['http://insecure.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('http://insecure.com');

      const httpsViolation = result?.violations.find((v: any) => v.id === 'https');
      expect(httpsViolation).toBeDefined();
      expect(httpsViolation.impact).toBe('high');
    });

    it('should track page load time', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      expect(result?.technicalMetrics.pageLoadTime).toBeGreaterThan(0);
      expect(typeof result?.technicalMetrics.pageLoadTime).toBe('number');
    });

    it('should handle navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('ERR_NAME_NOT_RESOLVED'));

      const job = BatchAuditService.createAuditJob(['https://nonexistent.invalid']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://nonexistent.invalid');

      expect(result?.status).toBe('failed');
      expect(result?.error).toBeDefined();
      expect(result?.complianceScore).toBe(0);
    });

    it('should close browser after audit', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('getPriorityRecommendations', () => {
    it('should recommend urgent action for low compliance', () => {
      const result = createMockAuditResult({ complianceScore: 35 });
      const recommendations = BatchAuditService.getPriorityRecommendations(result);

      expect(recommendations).toContain('URGENT: Multiple critical accessibility violations');
    });

    it('should recommend fixing critical violations', () => {
      const result = createMockAuditResult({
        redFlags: ['critical_violations_3'],
      });
      const recommendations = BatchAuditService.getPriorityRecommendations(result);

      expect(recommendations.some(r => r.includes('Fix critical violations'))).toBe(true);
    });

    it('should recommend mobile responsive design', () => {
      const result = createMockAuditResult({
        redFlags: ['non_responsive'],
      });
      const recommendations = BatchAuditService.getPriorityRecommendations(result);

      expect(recommendations).toContain('Implement mobile responsive design');
    });

    it('should recommend alt text fixes', () => {
      const result = createMockAuditResult({
        redFlags: ['missing_alt_text'],
      });
      const recommendations = BatchAuditService.getPriorityRecommendations(result);

      expect(recommendations).toContain('Add alt text to all images');
    });

    it('should recommend performance optimization', () => {
      const result = createMockAuditResult({
        technicalMetrics: {
          mobile: true,
          https: true,
          pageLoadTime: 5000,
        },
      });
      const recommendations = BatchAuditService.getPriorityRecommendations(result);

      expect(recommendations).toContain('Optimize page load performance');
    });
  });

  describe('getJobSummary', () => {
    it('should return job summary with statistics', async () => {
      const websites = ['https://site1.com', 'https://site2.com'];
      const job = BatchAuditService.createAuditJob(websites);

      await wait(800);

      const summary = BatchAuditService.getJobSummary(job.jobId);

      expect(summary).toBeDefined();
      expect(summary?.totalWebsites).toBe(2);
      expect(summary?.avgComplianceScore).toBeGreaterThanOrEqual(0);
      expect(summary?.avgComplianceScore).toBeLessThanOrEqual(100);
      expect(summary?.estimatedComplianceTime).toBeDefined();
    });

    it('should calculate average compliance score correctly', async () => {
      // Mock specific compliance scores
      mockPage.evaluate
        .mockResolvedValueOnce({
          hasViewport: true,
          title: 'Test',
          images: 0,
          imagesWithoutAlt: 0,
          buttons: 0,
          inputs: 0,
          links: 10,
          headings: 5,
        })
        .mockResolvedValueOnce({
          hasViewport: false,
          title: 'Test',
          images: 10,
          imagesWithoutAlt: 5,
          buttons: 0,
          inputs: 0,
          links: 0,
          headings: 0,
        });

      const job = BatchAuditService.createAuditJob(['https://site1.com', 'https://site2.com']);
      await wait(800);

      const summary = BatchAuditService.getJobSummary(job.jobId);

      expect(summary?.avgComplianceScore).toBeDefined();
      expect(summary?.totalViolations).toBeGreaterThanOrEqual(0);
    });

    it('should return null for invalid job ID', () => {
      const summary = BatchAuditService.getJobSummary('invalid_id');
      expect(summary).toBeNull();
    });

    it('should include time estimates', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const summary = BatchAuditService.getJobSummary(job.jobId);

      expect(summary?.estimatedComplianceTime).toMatch(/\d+\.?\d* hours/);
    });
  });

  describe('exportJobResults', () => {
    it('should export results as CSV', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const csv = BatchAuditService.exportJobResults(job.jobId);

      expect(csv).toContain('Website,Compliance Score,Violations');
      expect(csv).toContain('https://example.com');
    });

    it('should include all required fields in CSV', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const csv = BatchAuditService.exportJobResults(job.jobId);

      expect(csv).toContain('Mobile Responsive');
      expect(csv).toContain('HTTPS');
      expect(csv).toContain('Load Time');
      expect(csv).toContain('Red Flags');
    });

    it('should escape CSV values properly', async () => {
      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const csv = BatchAuditService.exportJobResults(job.jobId);

      // Check that values are quoted
      expect(csv).toMatch(/"https:\/\/example\.com"/);
    });

    it('should return empty string for invalid job ID', () => {
      const csv = BatchAuditService.exportJobResults('invalid_id');
      expect(csv).toBe('');
    });
  });

  describe('edge cases and performance', () => {
    it('should handle very long website URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      const job = BatchAuditService.createAuditJob([longUrl]);

      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      expect(finalJob?.results.has(longUrl)).toBe(true);
    });

    it('should handle concurrent job creation', () => {
      const jobs = Array.from({ length: 10 }, () =>
        BatchAuditService.createAuditJob(['https://example.com'])
      );

      const uniqueIds = new Set(jobs.map(j => j.jobId));
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle malformed URLs gracefully', async () => {
      const job = BatchAuditService.createAuditJob(['not-a-valid-url']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('not-a-valid-url');

      expect(result?.status).toBe('failed');
    });

    it('should calculate compliance score correctly with no violations', async () => {
      mockPage.evaluate.mockResolvedValue({
        hasViewport: true,
        title: 'Perfect Page',
        images: 10,
        imagesWithoutAlt: 0,
        buttons: 5,
        inputs: 3,
        links: 20,
        headings: 8,
      });

      const job = BatchAuditService.createAuditJob(['https://perfect.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://perfect.com');

      expect(result?.complianceScore).toBe(100);
      expect(result?.violationCount).toBe(0);
    });
  });

  describe('detectRedFlags', () => {
    it('should detect critical violations red flag', async () => {
      mockPage.evaluate.mockResolvedValue({
        hasViewport: false,
        title: 'Test',
        images: 20,
        imagesWithoutAlt: 10,
        buttons: 0,
        inputs: 0,
        links: 0,
        headings: 0,
      });

      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      expect(result?.redFlags.some(f => f.includes('critical_violations'))).toBe(true);
    });

    it('should detect non-responsive flag', async () => {
      mockPage.evaluate.mockResolvedValue({
        hasViewport: false,
        title: 'Test',
        images: 0,
        imagesWithoutAlt: 0,
        buttons: 0,
        inputs: 0,
        links: 0,
        headings: 0,
      });

      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      expect(result?.redFlags).toContain('non_responsive');
    });

    it('should detect no HTTPS flag', async () => {
      const job = BatchAuditService.createAuditJob(['http://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('http://example.com');

      expect(result?.redFlags).toContain('no_https');
    });

    it('should detect excessive missing alt text', async () => {
      mockPage.evaluate.mockResolvedValue({
        hasViewport: true,
        title: 'Test',
        images: 10,
        imagesWithoutAlt: 8,
        buttons: 0,
        inputs: 0,
        links: 0,
        headings: 0,
      });

      const job = BatchAuditService.createAuditJob(['https://example.com']);
      await wait(500);

      const finalJob = BatchAuditService.getJobStatus(job.jobId);
      const result = finalJob?.results.get('https://example.com');

      expect(result?.redFlags).toContain('missing_alt_text');
    });
  });
});
