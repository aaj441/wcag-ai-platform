/**
 * Request Correlation ID Middleware
 *
 * Implements distributed tracing via correlation IDs that flow through:
 * - HTTP requests/responses
 * - Database queries (Prisma)
 * - Queue jobs (Bull)
 * - Log entries (Winston)
 * - External API calls
 *
 * MEGA PROMPT 1 & 2: Request correlation IDs throughout stack
 *
 * Usage:
 *   app.use(correlationIdMiddleware);
 *
 * Access in route handlers:
 *   const requestId = getRequestId();
 *
 * Trace single request across entire lifecycle:
 *   grep "req_abc123" logs/*.log
 */

import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { log } from '../utils/logger';

// ============================================================================
// Async Context Storage
// ============================================================================

interface RequestContext {
  requestId: string;
  userId?: string;
  tenantId?: string;
  route?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  startTime?: number;
}

// Global async storage for request context
export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

// ============================================================================
// Context Accessors
// ============================================================================

/**
 * Get current request ID from async context
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}

/**
 * Get full request context
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Update request context (e.g., add userId after auth)
 */
export function updateRequestContext(updates: Partial<RequestContext>): void {
  const current = asyncLocalStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}

/**
 * Run code with custom correlation ID (for background jobs)
 */
export function runWithRequestId<T>(
  requestId: string,
  fn: () => T
): T {
  return asyncLocalStorage.run({ requestId }, fn);
}

/**
 * Run code with full context (for background jobs)
 */
export function runWithContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return asyncLocalStorage.run(context, fn);
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Correlation ID Middleware
 *
 * Extracts or generates correlation ID and makes it available throughout
 * the request lifecycle via async local storage.
 *
 * Header Priority:
 * 1. X-Request-ID (set by load balancer/proxy)
 * 2. X-Correlation-ID (set by client for distributed tracing)
 * 3. Generate new UUID
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract or generate request ID
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    `req_${randomUUID()}`;

  // Extract user context (if authenticated)
  const userId = (req as any).auth?.userId || (req as any).user?.id;
  const tenantId = (req as any).auth?.tenantId || (req as any).tenant?.id;

  // Build request context
  const context: RequestContext = {
    requestId,
    userId,
    tenantId,
    route: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
    startTime: Date.now(),
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Store context in async local storage
  asyncLocalStorage.run(context, () => {
    // Log incoming request with correlation ID
    log.info(`📨 ${req.method} ${req.path}`, {
      requestId,
      userId,
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: context.userAgent,
      ip: context.ip,
    });

    // Attach cleanup handler
    res.on('finish', () => {
      const duration = Date.now() - (context.startTime || 0);

      log.info(`✅ ${req.method} ${req.path} - ${res.statusCode}`, {
        requestId,
        userId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  });
}

// ============================================================================
// Prisma Middleware (inject correlation ID into queries)
// ============================================================================

/**
 * Create Prisma middleware that adds correlation ID to all queries
 *
 * Usage in lib/prisma.ts:
 *   prisma.$use(createPrismaMiddleware());
 */
export function createPrismaMiddleware() {
  return async (params: any, next: any) => {
    const requestId = getRequestId();

    if (requestId) {
      // Log database query with correlation ID
      log.debug(`🗄️  Prisma ${params.model}.${params.action}`, {
        requestId,
        model: params.model,
        action: params.action,
      });
    }

    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    if (requestId && duration > 100) {
      // Log slow queries
      log.warn(`⚠️  Slow query: ${params.model}.${params.action} (${duration}ms)`, {
        requestId,
        model: params.model,
        action: params.action,
        duration,
      });
    }

    return result;
  };
}

// ============================================================================
// Bull Queue Integration
// ============================================================================

/**
 * Add correlation ID to Bull job data
 *
 * Usage when adding job to queue:
 *   scanQueue.add(addRequestIdToJob({ url, wcagLevel }));
 */
export function addRequestIdToJob<T extends Record<string, any>>(
  jobData: T
): T & { __requestId?: string; __context?: RequestContext } {
  const context = getRequestContext();

  return {
    ...jobData,
    __requestId: context?.requestId,
    __context: context,
  };
}

/**
 * Extract correlation ID from Bull job
 *
 * Usage in job processor:
 *   const requestId = extractRequestIdFromJob(job.data);
 */
export function extractRequestIdFromJob(
  jobData: any
): string | undefined {
  return jobData.__requestId || jobData.requestId;
}

/**
 * Extract full context from Bull job
 */
export function extractContextFromJob(
  jobData: any
): RequestContext | undefined {
  return jobData.__context;
}

/**
 * Process Bull job with correlation ID context
 *
 * Usage in job processor:
 *   scanQueue.process(async (job) => {
 *     return processJobWithContext(job, async () => {
 *       // Job processing code here
 *       // getRequestId() will work inside
 *     });
 *   });
 */
export async function processJobWithContext<T>(
  job: any,
  processor: () => Promise<T>
): Promise<T> {
  const context = extractContextFromJob(job.data);

  if (context) {
    return asyncLocalStorage.run(context, processor);
  } else {
    // Fallback: create minimal context
    const requestId = extractRequestIdFromJob(job.data) || `job_${job.id}`;
    return asyncLocalStorage.run({ requestId }, processor);
  }
}

// ============================================================================
// External API Integration
// ============================================================================

/**
 * Get headers with correlation ID for external API calls
 *
 * Usage:
 *   axios.get(url, {
 *     headers: getHeadersWithRequestId()
 *   });
 */
export function getHeadersWithRequestId(
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const requestId = getRequestId();

  return {
    ...additionalHeaders,
    ...(requestId && { 'X-Request-ID': requestId }),
    ...(requestId && { 'X-Correlation-ID': requestId }),
  };
}

// ============================================================================
// Error Integration
// ============================================================================

/**
 * Attach correlation ID to error object
 */
export function attachRequestIdToError(error: Error): Error & { requestId?: string } {
  const requestId = getRequestId();

  if (requestId) {
    (error as any).requestId = requestId;
  }

  return error as Error & { requestId?: string };
}

/**
 * Extract correlation ID from error
 */
export function extractRequestIdFromError(error: any): string | undefined {
  return error?.requestId;
}

// ============================================================================
// Export Type for External Use
// ============================================================================

export type { RequestContext };
