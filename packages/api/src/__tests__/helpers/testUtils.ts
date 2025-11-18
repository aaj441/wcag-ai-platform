/**
 * Test Utilities
 * Helper functions for testing
 */

import { Request, Response } from 'express';

/**
 * Create mock Express request
 */
export function createMockRequest(options: {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
}): Partial<Request> {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user,
  };
}

/**
 * Create mock Express response
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a promise that can be manually resolved/rejected
 */
export function createDeferredPromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Mock async function that fails n times before succeeding
 */
export function createFlakeyFunction<T>(
  successValue: T,
  failuresBeforeSuccess: number = 2
): jest.Mock {
  let callCount = 0;

  return jest.fn(async () => {
    callCount++;
    if (callCount <= failuresBeforeSuccess) {
      throw new Error(`Attempt ${callCount} failed`);
    }
    return successValue;
  });
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create mock Date that increments by 1 second on each call
 */
export function createMockDateSequence(startDate: Date = new Date('2024-01-01')): jest.Mock {
  let counter = 0;
  return jest.fn(() => {
    const date = new Date(startDate.getTime() + counter * 1000);
    counter++;
    return date;
  });
}

/**
 * Measure execution time of async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Run function multiple times and collect statistics
 */
export async function benchmark(
  fn: () => Promise<any>,
  iterations: number = 100
): Promise<{
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    durations.push(duration);
  }

  durations.sort((a, b) => a - b);

  return {
    min: durations[0],
    max: durations[durations.length - 1],
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    p99: durations[Math.floor(durations.length * 0.99)],
  };
}

/**
 * Test for memory leaks by running function multiple times
 */
export async function testForMemoryLeaks(
  fn: () => Promise<any>,
  iterations: number = 100
): Promise<{ leaked: boolean; memoryGrowth: number }> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const initialMemory = process.memoryUsage().heapUsed;

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryGrowth = finalMemory - initialMemory;

  // Consider leaked if memory grew by more than 10MB
  const leaked = memoryGrowth > 10 * 1024 * 1024;

  return { leaked, memoryGrowth };
}

/**
 * Run multiple promises concurrently and measure performance
 */
export async function runConcurrently<T>(
  fns: Array<() => Promise<T>>,
  concurrency: number = 10
): Promise<{ results: T[]; totalDuration: number; avgDuration: number }> {
  const start = Date.now();
  const results: T[] = [];

  for (let i = 0; i < fns.length; i += concurrency) {
    const batch = fns.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }

  const totalDuration = Date.now() - start;
  const avgDuration = totalDuration / fns.length;

  return { results, totalDuration, avgDuration };
}

/**
 * Create a mock function that throws specific errors
 */
export function createErrorMock(errors: Array<Error | string>, finalValue?: any): jest.Mock {
  let callCount = 0;

  return jest.fn(async () => {
    if (callCount < errors.length) {
      const error = errors[callCount];
      callCount++;
      throw error instanceof Error ? error : new Error(error);
    }
    return finalValue;
  });
}

/**
 * Create timeout promise
 */
export function createTimeout(ms: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Race function against timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    fn(),
    createTimeout(timeoutMs, timeoutMessage),
  ]);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await wait(delay);
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError!;
}

/**
 * Create a spy that tracks call patterns
 */
export function createCallTracker() {
  const calls: Array<{ timestamp: number; args: any[] }> = [];

  const spy = jest.fn((...args: any[]) => {
    calls.push({ timestamp: Date.now(), args });
  });

  return {
    spy,
    getCalls: () => calls,
    getCallRate: () => {
      if (calls.length < 2) return 0;
      const duration = calls[calls.length - 1].timestamp - calls[0].timestamp;
      return (calls.length / duration) * 1000; // calls per second
    },
    reset: () => {
      calls.length = 0;
      spy.mockClear();
    },
  };
}
