/**
 * Memory Leak Detection & Stress Test
 *
 * Node-based stress test that monitors memory usage during load testing.
 * Identifies memory leaks by tracking heap growth over 1000 scan cycles.
 *
 * Success Criteria (MEGA PROMPT 1):
 * - No memory leaks after 1000 scan cycles
 * - Heap growth < 50MB over test duration
 * - GC effectiveness > 80%
 *
 * Usage:
 *   tsx stress-tests/memory-leak-detector.ts
 *   tsx stress-tests/memory-leak-detector.ts --concurrent=50 --cycles=1000
 */

import axios, { type AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

// ============================================================================
// Configuration
// ============================================================================

interface TestConfig {
  baseUrl: string;
  concurrent: number;
  cycles: number;
  sampleInterval: number; // Memory sample every N cycles
  gcInterval: number; // Force GC every N cycles (if --expose-gc)
  apiKey?: string;
}

const config: TestConfig = {
  baseUrl: process.env.API_URL || 'http://localhost:8080',
  concurrent: parseInt(process.argv.find(arg => arg.startsWith('--concurrent='))?.split('=')[1] || '10'),
  cycles: parseInt(process.argv.find(arg => arg.startsWith('--cycles='))?.split('=')[1] || '100'),
  sampleInterval: 10,
  gcInterval: 50,
  apiKey: process.env.API_KEY,
};

// ============================================================================
// Memory Monitoring
// ============================================================================

interface MemorySample {
  cycle: number;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

class MemoryMonitor {
  private samples: MemorySample[] = [];
  private baselineHeap = 0;

  start(): void {
    const baseline = process.memoryUsage();
    this.baselineHeap = baseline.heapUsed;
    console.log('📊 Baseline Memory Usage:');
    console.log(`   Heap Used: ${this.formatBytes(baseline.heapUsed)}`);
    console.log(`   RSS: ${this.formatBytes(baseline.rss)}`);
    console.log('');
  }

  sample(cycle: number): MemorySample {
    const mem = process.memoryUsage();
    const sample: MemorySample = {
      cycle,
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
      arrayBuffers: mem.arrayBuffers,
    };

    this.samples.push(sample);
    return sample;
  }

  forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }

  analyze(): MemoryAnalysis {
    if (this.samples.length < 2) {
      throw new Error('Insufficient samples for analysis');
    }

    const firstSample = this.samples[0];
    const lastSample = this.samples[this.samples.length - 1];
    const heapGrowth = lastSample.heapUsed - firstSample.heapUsed;
    const heapGrowthPercent = (heapGrowth / firstSample.heapUsed) * 100;

    // Calculate trend (linear regression of heap usage over time)
    const trend = this.calculateTrend();

    // Detect if heap is continuously growing (potential leak)
    const isLeak = heapGrowthPercent > 50 && trend > 0;

    // Calculate GC effectiveness (how much memory is freed on average)
    const gcEffectiveness = this.calculateGCEffectiveness();

    return {
      samples: this.samples.length,
      duration: lastSample.timestamp - firstSample.timestamp,
      heapGrowth,
      heapGrowthPercent,
      trend,
      isLeak,
      gcEffectiveness,
      peakHeap: Math.max(...this.samples.map(s => s.heapUsed)),
      avgHeap: this.samples.reduce((sum, s) => sum + s.heapUsed, 0) / this.samples.length,
    };
  }

  private calculateTrend(): number {
    // Simple linear regression to detect upward trend
    const n = this.samples.length;
    const sumX = this.samples.reduce((sum, s, i) => sum + i, 0);
    const sumY = this.samples.reduce((sum, s) => sum + s.heapUsed, 0);
    const sumXY = this.samples.reduce((sum, s, i) => sum + i * s.heapUsed, 0);
    const sumX2 = this.samples.reduce((sum, s, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private calculateGCEffectiveness(): number {
    // Look for drops in heap usage (GC events)
    let totalFreed = 0;
    let gcEvents = 0;

    for (let i = 1; i < this.samples.length; i++) {
      const diff = this.samples[i - 1].heapUsed - this.samples[i].heapUsed;
      if (diff > 1_000_000) { // > 1MB drop indicates GC
        totalFreed += diff;
        gcEvents++;
      }
    }

    if (gcEvents === 0) return 0;

    const avgFreed = totalFreed / gcEvents;
    const avgHeap = this.samples.reduce((sum, s) => sum + s.heapUsed, 0) / this.samples.length;

    return (avgFreed / avgHeap) * 100;
  }

  printSample(sample: MemorySample): void {
    const growth = sample.heapUsed - this.baselineHeap;
    const growthStr = growth > 0 ? `+${this.formatBytes(growth)}` : this.formatBytes(growth);

    console.log(
      `[Cycle ${String(sample.cycle).padStart(4, ' ')}] ` +
      `Heap: ${this.formatBytes(sample.heapUsed)} (${growthStr}) | ` +
      `RSS: ${this.formatBytes(sample.rss)}`
    );
  }

  private formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}

interface MemoryAnalysis {
  samples: number;
  duration: number;
  heapGrowth: number;
  heapGrowthPercent: number;
  trend: number;
  isLeak: boolean;
  gcEffectiveness: number;
  peakHeap: number;
  avgHeap: number;
}

// ============================================================================
// Load Testing
// ============================================================================

interface ScanResult {
  success: boolean;
  duration: number;
  statusCode?: number;
  error?: string;
}

interface LoadTestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimes: number[];
}

class LoadTester {
  private client: AxiosInstance;
  private stats: LoadTestStats;

  constructor(baseUrl: string, apiKey?: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 60000, // 60s timeout
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey }),
      },
    });

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
    };
  }

  async executeScan(): Promise<ScanResult> {
    const start = performance.now();

    try {
      const response = await this.client.post('/api/scan', {
        url: this.getRandomUrl(),
        wcagLevel: this.getRandomWcagLevel(),
        includeWarnings: Math.random() > 0.5,
      });

      const duration = performance.now() - start;

      this.stats.totalRequests++;
      this.stats.successfulRequests++;
      this.stats.responseTimes.push(duration);
      this.stats.minResponseTime = Math.min(this.stats.minResponseTime, duration);
      this.stats.maxResponseTime = Math.max(this.stats.maxResponseTime, duration);

      return {
        success: true,
        duration,
        statusCode: response.status,
      };
    } catch (error: any) {
      const duration = performance.now() - start;

      this.stats.totalRequests++;
      this.stats.failedRequests++;
      this.stats.responseTimes.push(duration);

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        this.stats.timeouts++;
      }

      return {
        success: false,
        duration,
        statusCode: error.response?.status,
        error: error.message,
      };
    }
  }

  async executeBatch(count: number): Promise<void> {
    const promises: Promise<ScanResult>[] = [];

    for (let i = 0; i < count; i++) {
      promises.push(this.executeScan());
    }

    await Promise.all(promises);
  }

  getStats(): LoadTestStats {
    // Calculate percentiles
    const sorted = [...this.stats.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.stats.avgResponseTime =
      this.stats.responseTimes.reduce((sum, t) => sum + t, 0) / this.stats.responseTimes.length || 0;
    this.stats.p95ResponseTime = sorted[p95Index] || 0;
    this.stats.p99ResponseTime = sorted[p99Index] || 0;

    return this.stats;
  }

  private getRandomUrl(): string {
    const urls = [
      'https://example.com',
      'https://www.w3.org/WAI/',
      'https://github.com',
      'https://developer.mozilla.org',
    ];
    return urls[Math.floor(Math.random() * urls.length)];
  }

  private getRandomWcagLevel(): string {
    const levels = ['A', 'AA', 'AAA'];
    return levels[Math.floor(Math.random() * levels.length)];
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runStressTest(): Promise<void> {
  console.log('🔬 WCAGAI Memory Leak Detection & Stress Test');
  console.log('='.repeat(70));
  console.log(`   Target: ${config.baseUrl}`);
  console.log(`   Concurrent Requests: ${config.concurrent}`);
  console.log(`   Test Cycles: ${config.cycles}`);
  console.log(`   Total Requests: ${config.concurrent * config.cycles}`);
  console.log('');

  if (!global.gc) {
    console.log('⚠️  Warning: GC not exposed. Run with --expose-gc for accurate results:');
    console.log('   node --expose-gc -r tsx/register stress-tests/memory-leak-detector.ts');
    console.log('');
  }

  const monitor = new MemoryMonitor();
  const tester = new LoadTester(config.baseUrl, config.apiKey);

  // Pre-flight checks
  try {
    console.log('🔍 Running pre-flight health check...');
    await axios.get(`${config.baseUrl}/health`);
    console.log('✅ Health check passed');
    console.log('');
  } catch (error) {
    console.error('❌ Pre-flight health check failed!');
    console.error(error);
    process.exit(1);
  }

  // Start monitoring
  monitor.start();

  const startTime = Date.now();
  let progressBar = 0;

  console.log('🚀 Starting stress test...');
  console.log('');

  // Main test loop
  for (let cycle = 1; cycle <= config.cycles; cycle++) {
    // Execute concurrent batch
    await tester.executeBatch(config.concurrent);

    // Sample memory
    if (cycle % config.sampleInterval === 0) {
      const sample = monitor.sample(cycle);
      monitor.printSample(sample);
    }

    // Force GC
    if (global.gc && cycle % config.gcInterval === 0) {
      monitor.forceGC();
    }

    // Progress indicator
    const progress = Math.floor((cycle / config.cycles) * 20);
    if (progress > progressBar) {
      progressBar = progress;
      process.stdout.write('.');
    }
  }

  console.log('');
  console.log('');

  // Final GC and sample
  if (global.gc) {
    console.log('🧹 Running final garbage collection...');
    monitor.forceGC();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for GC
  }

  monitor.sample(config.cycles);

  // Analyze results
  console.log('');
  console.log('📊 ANALYSIS RESULTS');
  console.log('='.repeat(70));

  const memAnalysis = monitor.analyze();
  const loadStats = tester.getStats();

  // Memory Analysis
  console.log('');
  console.log('🧠 Memory Analysis:');
  console.log(`   Samples Taken: ${memAnalysis.samples}`);
  console.log(`   Test Duration: ${(memAnalysis.duration / 1000).toFixed(2)}s`);
  console.log(`   Heap Growth: ${(memAnalysis.heapGrowth / 1024 / 1024).toFixed(2)} MB (${memAnalysis.heapGrowthPercent.toFixed(2)}%)`);
  console.log(`   Peak Heap: ${(memAnalysis.peakHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Average Heap: ${(memAnalysis.avgHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Trend: ${memAnalysis.trend > 0 ? '📈 Growing' : '📉 Stable'} (${memAnalysis.trend.toFixed(2)})`);
  console.log(`   GC Effectiveness: ${memAnalysis.gcEffectiveness.toFixed(2)}%`);
  console.log(`   Memory Leak Detected: ${memAnalysis.isLeak ? '❌ YES' : '✅ NO'}`);

  // Load Test Statistics
  console.log('');
  console.log('⚡ Load Test Statistics:');
  console.log(`   Total Requests: ${loadStats.totalRequests}`);
  console.log(`   Successful: ${loadStats.successfulRequests} (${((loadStats.successfulRequests / loadStats.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   Failed: ${loadStats.failedRequests} (${((loadStats.failedRequests / loadStats.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   Timeouts: ${loadStats.timeouts}`);
  console.log(`   Avg Response Time: ${loadStats.avgResponseTime.toFixed(2)}ms`);
  console.log(`   P95 Response Time: ${loadStats.p95ResponseTime.toFixed(2)}ms`);
  console.log(`   P99 Response Time: ${loadStats.p99ResponseTime.toFixed(2)}ms`);
  console.log(`   Min Response Time: ${loadStats.minResponseTime.toFixed(2)}ms`);
  console.log(`   Max Response Time: ${loadStats.maxResponseTime.toFixed(2)}ms`);

  // Success Criteria Evaluation
  console.log('');
  console.log('✅ SUCCESS CRITERIA (MEGA PROMPT 1):');
  console.log('='.repeat(70));

  const heapGrowthOk = memAnalysis.heapGrowth < 50_000_000; // < 50MB
  const gcEffectivenessOk = memAnalysis.gcEffectiveness > 80 || memAnalysis.gcEffectiveness === 0;
  const noLeaks = !memAnalysis.isLeak;
  const errorRateOk = (loadStats.failedRequests / loadStats.totalRequests) < 0.1;
  const responseTimeOk = loadStats.p95ResponseTime < 30000;

  console.log(`${heapGrowthOk ? '✅' : '❌'} Heap growth < 50MB (actual: ${(memAnalysis.heapGrowth / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`${gcEffectivenessOk ? '✅' : '❌'} GC effectiveness > 80% (actual: ${memAnalysis.gcEffectiveness.toFixed(2)}%)`);
  console.log(`${noLeaks ? '✅' : '❌'} No memory leaks detected`);
  console.log(`${errorRateOk ? '✅' : '❌'} Error rate < 10% (actual: ${((loadStats.failedRequests / loadStats.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`${responseTimeOk ? '✅' : '❌'} P95 response time < 30s (actual: ${(loadStats.p95ResponseTime / 1000).toFixed(2)}s)`);

  const passed = heapGrowthOk && noLeaks && errorRateOk && responseTimeOk;

  console.log('');
  console.log('='.repeat(70));
  console.log(`🎯 VERDICT: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(70));

  if (!passed) {
    console.log('');
    console.log('⚠️  RECOMMENDATIONS:');
    if (!heapGrowthOk) {
      console.log('   - Investigate memory growth patterns');
      console.log('   - Check for object retention issues');
      console.log('   - Review Puppeteer page cleanup');
    }
    if (memAnalysis.isLeak) {
      console.log('   - Memory leak detected - run with --inspect for profiling');
      console.log('   - Take heap snapshots before/after test');
      console.log('   - Check event listener cleanup');
    }
    if (!errorRateOk) {
      console.log('   - High error rate - check logs for failure patterns');
      console.log('   - Review external API circuit breakers');
    }
    if (!responseTimeOk) {
      console.log('   - Response times too high - consider increasing workers');
      console.log('   - Review database query performance');
      console.log('   - Check Redis queue configuration');
    }
  }

  console.log('');

  process.exit(passed ? 0 : 1);
}

// ============================================================================
// Entry Point
// ============================================================================

runStressTest().catch((error) => {
  console.error('💥 Stress test crashed:');
  console.error(error);
  process.exit(1);
});
