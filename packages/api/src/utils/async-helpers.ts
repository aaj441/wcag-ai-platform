/**
 * Async Helpers Module
 * Provides utilities for efficient async operations and avoiding common antipatterns
 */

/**
 * Execute async operations in batches with concurrency control
 * Replaces await-in-loop antipattern
 * 
 * @param items - Array of items to process
 * @param asyncFn - Async function to apply to each item
 * @param batchSize - Number of concurrent operations (default: 10)
 * @returns Array of results
 */
export async function batchProcess<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => asyncFn(item, i + batchIndex))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Execute async operations in parallel with error handling
 * 
 * @param items - Array of items to process
 * @param asyncFn - Async function to apply to each item
 * @param options - Configuration options
 * @returns Array of results with success/error status
 */
export async function parallelProcess<T, R>(
  items: T[],
  asyncFn: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
    timeout?: number;
  } = {}
): Promise<Array<{ success: boolean; result?: R; error?: Error; item: T }>> {
  const {
    concurrency = 10,
    continueOnError = true,
    timeout = 30000,
  } = options;
  
  const results: Array<{ success: boolean; result?: R; error?: Error; item: T }> = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (item, batchIndex) => {
      try {
        const result = await withTimeout(
          asyncFn(item, i + batchIndex),
          timeout
        );
        return { success: true, result, item };
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          item,
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Add timeout to a promise
 * 
 * @param promise - Promise to add timeout to
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Retry async operation with exponential backoff
 * 
 * @param asyncFn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of successful execution
 */
export async function retryWithBackoff<T>(
  asyncFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;
  
  let lastError: Error;
  let delay = initialDelayMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }
  
  throw lastError!;
}

/**
 * Execute async operations with a queue and concurrency limit
 */
export class AsyncQueue<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private running = 0;
  
  constructor(
    private asyncFn: (item: T) => Promise<R>,
    private concurrency: number = 5
  ) {}
  
  /**
   * Add item to queue
   * @param item - Item to process
   * @returns Promise that resolves with result
   */
  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.process();
    });
  }
  
  /**
   * Add multiple items to queue
   * @param items - Items to process
   * @returns Promise that resolves with all results
   */
  async addAll(items: T[]): Promise<R[]> {
    return Promise.all(items.map((item) => this.add(item)));
  }
  
  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    const { item, resolve, reject } = this.queue.shift()!;
    this.running++;
    
    try {
      const result = await this.asyncFn(item);
      resolve(result);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      this.process();
    }
  }
  
  /**
   * Get queue status
   */
  getStatus(): { queued: number; running: number } {
    return {
      queued: this.queue.length,
      running: this.running,
    };
  }
}

/**
 * Debounce async function
 * 
 * @param asyncFn - Async function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced function
 */
export function debounceAsync<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  delayMs: number
): (...args: T) => Promise<R> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<R> | null = null;
  
  return (...args: T): Promise<R> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (!pendingPromise) {
      pendingPromise = new Promise<R>((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await asyncFn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeoutId = null;
          }
        }, delayMs);
      });
    }
    
    return pendingPromise;
  };
}

/**
 * Throttle async function
 * 
 * @param asyncFn - Async function to throttle
 * @param intervalMs - Minimum interval between calls
 * @returns Throttled function
 */
export function throttleAsync<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  intervalMs: number
): (...args: T) => Promise<R | null> {
  let lastCall = 0;
  let pendingPromise: Promise<R> | null = null;
  
  return async (...args: T): Promise<R | null> => {
    const now = Date.now();
    
    if (now - lastCall < intervalMs) {
      return null;
    }
    
    lastCall = now;
    
    if (pendingPromise) {
      return pendingPromise;
    }
    
    pendingPromise = asyncFn(...args);
    
    try {
      return await pendingPromise;
    } finally {
      pendingPromise = null;
    }
  };
}

/**
 * Memoize async function results
 * 
 * @param asyncFn - Async function to memoize
 * @param options - Memoization options
 * @returns Memoized function
 */
export function memoizeAsync<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  options: {
    keyFn?: (...args: T) => string;
    ttlMs?: number;
  } = {}
): (...args: T) => Promise<R> {
  const cache = new Map<string, { value: R; timestamp: number }>();
  const { keyFn = (...args) => JSON.stringify(args), ttlMs } = options;
  
  return async (...args: T): Promise<R> => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    
    if (cached) {
      if (!ttlMs || Date.now() - cached.timestamp < ttlMs) {
        return cached.value;
      }
      cache.delete(key);
    }
    
    const result = await asyncFn(...args);
    cache.set(key, { value: result, timestamp: Date.now() });
    
    return result;
  };
}

export default {
  batchProcess,
  parallelProcess,
  withTimeout,
  retryWithBackoff,
  AsyncQueue,
  debounceAsync,
  throttleAsync,
  memoizeAsync,
};