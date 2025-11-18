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
