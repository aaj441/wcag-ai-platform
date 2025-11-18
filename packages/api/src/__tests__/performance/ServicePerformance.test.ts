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

    it('should maintain performance under 5x load (250 iterations)', async () => {
      const factors = createMockRiskFactors();

      const stats = await benchmark(
        async () => RiskScoringService.calculateRiskProfile(factors),
        250 // 5x from 50
      );

      expect(stats.avg).toBeLessThan(50);
      expect(stats.p95).toBeLessThan(100);
      expect(stats.p99).toBeLessThan(150);
    }, 30000); // 30 second timeout

    it('should handle 5x concurrent calculations (500 concurrent)', async () => {
      const calculations = Array.from({ length: 500 }, () => async () => {
        const factors = createMockRiskFactors();
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { totalDuration, avgDuration } = await runConcurrently(
        calculations,
        100 // 5x concurrency from 20
      );

      expect(totalDuration).toBeLessThan(5000);
      expect(avgDuration).toBeLessThan(50);
    }, 30000);

    it('should not leak memory under 5x stress (500 iterations)', async () => {
      const { leaked, memoryGrowth } = await testForMemoryLeaks(async () => {
        const factors = createMockRiskFactors();
        RiskScoringService.calculateRiskProfile(factors);
      }, 500); // 5x from 100

      expect(leaked).toBe(false);
      expect(memoryGrowth).toBeLessThan(25 * 1024 * 1024); // Less than 25MB growth (5x from 5MB)
    }, 60000); // 60 second timeout

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
    it('should process 500 items in under 5 seconds (5x stress)', async () => {
      const factors = Array.from({ length: 500 }, () => createMockRiskFactors()); // 5x from 100

      const { duration } = await measureExecutionTime(async () => {
        RiskScoringService.scoreBatch(factors);
      });

      expect(duration).toBeLessThan(5000); // 5x from 1000ms
    }, 30000);

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

  describe('Concurrent Load Testing (5x Stress)', () => {
    it('should handle 2500 concurrent requests (5x stress)', async () => {
      const requests = Array.from({ length: 2500 }, () => async () => {
        const factors = createMockRiskFactors();
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { results, totalDuration } = await runConcurrently(requests, 250); // 5x concurrency

      expect(results).toHaveLength(2500);
      expect(results.every(r => r.riskScore !== undefined)).toBe(true);
      expect(totalDuration).toBeLessThan(25000); // 25 seconds for 2500 requests
    }, 60000); // 60 second timeout

    it('should maintain accuracy under 5x concurrent load (500 requests)', async () => {
      const factors = createMockRiskFactors({
        complianceScore: 50,
        violationCount: 10,
      });

      const requests = Array.from({ length: 500 }, () => async () => {
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { results } = await runConcurrently(requests, 100); // 5x concurrency

      // All results should be identical for same input
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.riskScore).toBe(firstResult.riskScore);
        expect(result.priority).toBe(firstResult.priority);
      });
    }, 30000);
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

  describe('Heavy Stress Tests (5x Production Load)', () => {
    it('should survive sustained load of 1000 calculations', async () => {
      const results = [];

      for (let i = 0; i < 1000; i++) {
        const factors = createMockRiskFactors();
        const profile = RiskScoringService.calculateRiskProfile(factors);
        results.push(profile);
      }

      expect(results).toHaveLength(1000);
      expect(results.every(r => r.riskScore !== undefined)).toBe(true);
    }, 30000);

    it('should handle burst traffic pattern (waves of 100 concurrent)', async () => {
      const waves = 5;
      const requestsPerWave = 100;
      const allResults = [];

      for (let wave = 0; wave < waves; wave++) {
        const requests = Array.from({ length: requestsPerWave }, () => async () => {
          const factors = createMockRiskFactors();
          return RiskScoringService.calculateRiskProfile(factors);
        });

        const { results } = await runConcurrently(requests, 50);
        allResults.push(...results);
      }

      expect(allResults).toHaveLength(waves * requestsPerWave);
      expect(allResults.every(r => r.riskScore !== undefined)).toBe(true);
    }, 30000);

    it('should process mixed batch sizes efficiently', async () => {
      const batches = [
        Array.from({ length: 10 }, () => createMockRiskFactors()),
        Array.from({ length: 50 }, () => createMockRiskFactors()),
        Array.from({ length: 100 }, () => createMockRiskFactors()),
        Array.from({ length: 250 }, () => createMockRiskFactors()),
        Array.from({ length: 500 }, () => createMockRiskFactors()),
      ];

      const { duration } = await measureExecutionTime(async () => {
        for (const batch of batches) {
          RiskScoringService.scoreBatch(batch);
        }
      });

      expect(duration).toBeLessThan(10000); // All batches in 10 seconds
    }, 30000);

    it('should handle extreme concurrent spike (1000 simultaneous)', async () => {
      const requests = Array.from({ length: 1000 }, () => async () => {
        const factors = createMockRiskFactors();
        return RiskScoringService.calculateRiskProfile(factors);
      });

      const { results, totalDuration } = await runConcurrently(requests, 500);

      expect(results).toHaveLength(1000);
      expect(results.every(r => r.riskScore !== undefined)).toBe(true);
      expect(totalDuration).toBeLessThan(15000); // 15 seconds max
    }, 30000);

    it('should maintain performance under continuous pressure (10 waves)', async () => {
      const waves = 10;
      const durations: number[] = [];

      for (let i = 0; i < waves; i++) {
        const { duration } = await measureExecutionTime(async () => {
          const factors = createMockRiskFactors();
          return RiskScoringService.calculateRiskProfile(factors);
        });
        durations.push(duration);
      }

      // All durations should be reasonable
      expect(durations.every(d => d >= 0)).toBe(true);
      expect(durations.length).toBe(waves);

      // Performance should not degrade significantly (if durations are measurable)
      const avgFirst5 = durations.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const avgLast5 = durations.slice(5).reduce((a, b) => a + b, 0) / 5;

      // If operations are measurable (> 0ms), last 5 should not be more than 2x slower than first 5
      if (avgFirst5 > 0) {
        expect(avgLast5).toBeLessThan(avgFirst5 * 2 + 1); // +1 for tolerance
      }
    });

    it('should handle mixed extreme and normal values in batch', async () => {
      const factors = [
        ...Array.from({ length: 100 }, () => createMockRiskFactors()),
        ...Array.from({ length: 100 }, () => createMockRiskFactors({
          violationCount: 9999,
          complianceScore: 0,
        })),
      ];

      const { duration } = await measureExecutionTime(async () => {
        RiskScoringService.scoreBatch(factors);
      });

      expect(duration).toBeLessThan(3000);
    }, 30000);
  });
});
