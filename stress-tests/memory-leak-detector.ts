#!/usr/bin/env tsx

/**
 * Memory Leak Detection Test
 *
 * Runs 1000 cycles of simulated operations to detect memory leaks
 * Monitors heap growth and fails if memory usage increases beyond acceptable threshold
 *
 * Usage: npx tsx stress-tests/memory-leak-detector.ts
 */

import { performance } from 'perf_hooks';

// Configuration
const CYCLES = 1000;
const HEAP_GROWTH_THRESHOLD_MB = 50; // Fail if heap grows more than 50MB
const SAMPLE_INTERVAL = 100; // Sample memory every 100 cycles

interface MemorySample {
  cycle: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

async function simulateWorkload(): Promise<void> {
  // Simulate typical API operations
  const data: any[] = [];

  // Create some objects (should be garbage collected)
  for (let i = 0; i < 100; i++) {
    data.push({
      id: Math.random().toString(36),
      timestamp: new Date().toISOString(),
      data: Buffer.alloc(1024), // 1KB buffer
    });
  }

  // Process data (simulated work)
  await new Promise(resolve => setTimeout(resolve, 1));

  // Data should be GC'd after this function returns
}

async function runMemoryLeakTest(): Promise<void> {
  console.log('🧪 Starting Memory Leak Detection Test');
  console.log(`Running ${CYCLES} cycles...`);
  console.log('');

  const samples: MemorySample[] = [];
  const startTime = performance.now();

  // Initial memory snapshot
  if (global.gc) {
    global.gc();
    console.log('✅ Forced garbage collection before test');
  } else {
    console.log('⚠️  Garbage collection not exposed (run with --expose-gc for better accuracy)');
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  const initialMemory = process.memoryUsage();
  console.log('📊 Initial Memory:');
  console.log(`   Heap Used: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
  console.log(`   Heap Total: ${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`);
  console.log(`   RSS: ${Math.round(initialMemory.rss / 1024 / 1024)}MB`);
  console.log('');

  // Run cycles
  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    await simulateWorkload();

    // Sample memory at intervals
    if (cycle % SAMPLE_INTERVAL === 0) {
      const mem = process.memoryUsage();
      samples.push({
        cycle,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
      });

      const progress = Math.round((cycle / CYCLES) * 100);
      process.stdout.write(`\r   Progress: ${progress}% (${cycle}/${CYCLES} cycles)`);
    }
  }

  console.log('\n');

  // Force final GC
  if (global.gc) {
    global.gc();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const finalMemory = process.memoryUsage();
  const duration = (performance.now() - startTime) / 1000;

  console.log('📊 Final Memory:');
  console.log(`   Heap Used: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
  console.log(`   Heap Total: ${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`);
  console.log(`   RSS: ${Math.round(finalMemory.rss / 1024 / 1024)}MB`);
  console.log('');

  // Calculate memory growth
  const heapGrowthBytes = finalMemory.heapUsed - initialMemory.heapUsed;
  const heapGrowthMB = heapGrowthBytes / 1024 / 1024;

  console.log('📈 Memory Growth Analysis:');
  console.log(`   Heap Growth: ${heapGrowthMB.toFixed(2)}MB`);
  console.log(`   RSS Growth: ${((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Duration: ${duration.toFixed(2)}s`);
  console.log(`   Ops/sec: ${Math.round(CYCLES / duration)}`);
  console.log('');

  // Analyze trend
  if (samples.length >= 3) {
    const firstThird = samples.slice(0, Math.floor(samples.length / 3));
    const lastThird = samples.slice(-Math.floor(samples.length / 3));

    const avgFirstThird = firstThird.reduce((sum, s) => sum + s.heapUsed, 0) / firstThird.length;
    const avgLastThird = lastThird.reduce((sum, s) => sum + s.heapUsed, 0) / lastThird.length;

    const trendGrowth = (avgLastThird - avgFirstThird) / 1024 / 1024;

    console.log('📊 Trend Analysis:');
    console.log(`   First third avg: ${(avgFirstThird / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Last third avg: ${(avgLastThird / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Trend growth: ${trendGrowth.toFixed(2)}MB`);
    console.log('');
  }

  // Determine pass/fail
  if (heapGrowthMB > HEAP_GROWTH_THRESHOLD_MB) {
    console.log(`❌ MEMORY LEAK DETECTED`);
    console.log(`   Heap grew by ${heapGrowthMB.toFixed(2)}MB (threshold: ${HEAP_GROWTH_THRESHOLD_MB}MB)`);
    console.log(`   This indicates a potential memory leak.`);
    console.log('');
    console.log('💡 Recommendations:');
    console.log('   1. Check for unclosed resources (DB connections, file handles)');
    console.log('   2. Review event listener registrations (memory retention)');
    console.log('   3. Inspect caching logic (unbounded cache growth)');
    console.log('   4. Profile with --inspect and Chrome DevTools');
    console.log('');
    process.exit(1);
  } else {
    console.log(`✅ NO MEMORY LEAK DETECTED`);
    console.log(`   Heap growth (${heapGrowthMB.toFixed(2)}MB) is within acceptable range (<${HEAP_GROWTH_THRESHOLD_MB}MB)`);
    console.log(`   Memory management appears healthy.`);
    console.log('');
  }
}

// Run test
runMemoryLeakTest().catch(error => {
  console.error('❌ Memory leak test failed with error:', error);
  process.exit(1);
});
