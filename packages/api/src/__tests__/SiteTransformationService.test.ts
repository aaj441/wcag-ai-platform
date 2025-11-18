/**
 * Site Transformation Service Tests
 * 
 * Tests for the complete site transformation pipeline
 */

import { siteTransformationService } from '../services/SiteTransformationService';

describe('SiteTransformationService', () => {
  describe('transformSite', () => {
    it('should transform a site and improve compliance', async () => {
      const result = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
        preserveDesign: true,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.status).toBe('complete');
      expect(result.complianceScore.after).toBeGreaterThan(result.complianceScore.before);
      expect(result.transformedSite).toBeTruthy();
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should extract original site', async () => {
      const result = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      expect(result.originalSite).toBeDefined();
      expect(result.originalSite?.html).toBeTruthy();
      expect(result.originalSite?.css).toBeTruthy();
      expect(result.originalSite?.metadata).toBeDefined();
    });

    it('should mark violations as fixed', async () => {
      const result = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      const fixedViolations = result.violations.filter(v => v.fixed);
      expect(fixedViolations.length).toBeGreaterThan(0);
    });

    it('should calculate compliance improvement', async () => {
      const result = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      expect(result.complianceScore.improvement).toBe(
        result.complianceScore.after - result.complianceScore.before
      );
      expect(result.complianceScore.improvement).toBeGreaterThan(0);
    });
  });

  describe('generateDeploymentPackage', () => {
    it('should generate deployment package', async () => {
      const transformation = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      const packageData = await siteTransformationService.generateDeploymentPackage(
        transformation
      );

      expect(packageData).toBeDefined();
      expect(packageData.zipUrl).toBeTruthy();
      expect(packageData.deploymentGuide).toBeTruthy();
      expect(packageData.testResults).toBeDefined();
    });

    it('should include compliance metrics in package', async () => {
      const transformation = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      const packageData = await siteTransformationService.generateDeploymentPackage(
        transformation
      );

      expect(packageData.testResults.complianceScore).toBeDefined();
      expect(packageData.testResults.violationsFixed).toBeDefined();
      expect(packageData.testResults.totalViolations).toBeDefined();
    });
  });

  describe('createGitHubPR', () => {
    it('should create GitHub PR for transformation', async () => {
      const transformation = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      const result = await siteTransformationService.createGitHubPR(
        transformation,
        'https://github.com/example/repo'
      );

      expect(result).toBeDefined();
      expect(result.prUrl).toBeTruthy();
      expect(result.branchName).toBeTruthy();
    });

    it('should use custom branch name', async () => {
      const transformation = await siteTransformationService.transformSite({
        url: 'https://example.com',
        wcagLevel: 'AA',
      });

      const customBranch = 'my-accessibility-fixes';
      const result = await siteTransformationService.createGitHubPR(
        transformation,
        'https://github.com/example/repo',
        customBranch
      );

      expect(result.branchName).toBe(customBranch);
    });
  });
});
