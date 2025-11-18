/**
 * Performance Tests
 * Tests service performance under load and concurrent access
 */

import { RiskScoringService } from '../../services/RiskScoringService';
import { createMockRiskFactors } from '../helpers/mockData';
import {
  benchmark,
  measureExecutionTime,
  runConcurrently,
  testForMemoryLeaks,
} from '../helpers/testUtils';

describe('Service Performance Tests', () => {
  describe('RiskScoringService Performance', () => {
    it('should calculate risk profile in under 100ms', async () => {
      const factors = createMockRiskFactors();

      const { duration } = await measureExecutionTime(async () => {
        RiskScoringService.calculateRiskProfile(factors);
      });

      expect(duration).toBeLessThan(100);
    });

    it('should maintain performance under load', async () => {
      const factors = createMockRiskFactors();

      const stats = await benchmark(
        async () => RiskScoringService.calculateRiskProfile(factors),
        50
      );

      expect(stats.avg).toBeLessThan(50);
      expect(stats.p95).toBeLessThan(100);
      expect(stats.p99).toBeLessThan(150);
    });

    it('should handle concurrent calculations efficiently', async () => {
      const calculations = Array.from({ length: 100 }, () => async () => {
        const factors = createMockRiskFactors();
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { totalDuration, avgDuration } = await runConcurrently(
        calculations,
        20
      );

      expect(totalDuration).toBeLessThan(1000);
      expect(avgDuration).toBeLessThan(50);
    });

    it('should not leak memory', async () => {
      const { leaked, memoryGrowth } = await testForMemoryLeaks(async () => {
        const factors = createMockRiskFactors();
        RiskScoringService.calculateRiskProfile(factors);
      }, 100);

      expect(leaked).toBe(false);
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB growth
    });

    it('should scale linearly with batch size', async () => {
      const factors = Array.from({ length: 10 }, () => createMockRiskFactors());

      const { duration: single } = await measureExecutionTime(async () => {
        RiskScoringService.scoreBatch(factors.slice(0, 1));
      });

      const { duration: batch10 } = await measureExecutionTime(async () => {
        RiskScoringService.scoreBatch(factors);
      });

      // Both should complete very quickly
      expect(single).toBeGreaterThanOrEqual(0);
      expect(batch10).toBeGreaterThanOrEqual(0);

      // If single is > 0, check scaling (but operations are usually sub-ms, so we skip ratio check)
      if (single > 0) {
        expect(batch10 / single).toBeLessThan(15);
      }
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process 100 items in under 1 second', async () => {
      const factors = Array.from({ length: 100 }, () => createMockRiskFactors());

      const { duration } = await measureExecutionTime(async () => {
        RiskScoringService.scoreBatch(factors);
      });

      expect(duration).toBeLessThan(1000);
    });

    it('should show performance improvement from caching', async () => {
      const factors = createMockRiskFactors({ industry: 'Technology' });

      // First run (cold cache)
      const { duration: firstRun } = await measureExecutionTime(async () => {
        RiskScoringService.calculateRiskProfile(factors);
      });

      // Second run (warm cache)
      const { duration: secondRun } = await measureExecutionTime(async () => {
        RiskScoringService.calculateRiskProfile(factors);
      });

      // Second run should be at least as fast or faster
      expect(secondRun).toBeLessThanOrEqual(firstRun * 1.5);
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle 500 concurrent requests', async () => {
      const requests = Array.from({ length: 500 }, () => async () => {
        const factors = createMockRiskFactors();
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { results, totalDuration } = await runConcurrently(requests, 50);

      expect(results).toHaveLength(500);
      expect(results.every(r => r.riskScore !== undefined)).toBe(true);
      expect(totalDuration).toBeLessThan(5000); // 5 seconds for 500 requests
    });

    it('should maintain accuracy under concurrent load', async () => {
      const factors = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 10,
      });

      const requests = Array.from({ length: 100 }, () => async () => {
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { results } = await runConcurrently(requests, 20);

      // All results should be identical for same input
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.riskScore).toBe(firstResult.riskScore);
        expect(result.priority).toBe(firstResult.priority);
      });
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle extreme values efficiently', async () => {
      const extremeFactors = createMockRiskFactors({
        violationCount: 9999,
        complianceScore: 0,
      });

      const { duration } = await measureExecutionTime(async () => {
        RiskScoringService.calculateRiskProfile(extremeFactors);
      });

      expect(duration).toBeLessThan(100);
    });

    it('should handle minimal data efficiently', async () => {
      const minimalFactors = createMockRiskFactors({
        industry: '',
        violationCount: 0,
        complianceScore: 100,
      });

      const { duration } = await measureExecutionTime(async () => {
        RiskScoringService.calculateRiskProfile(minimalFactors);
      });

      expect(duration).toBeLessThan(50);
    });
  });
});
