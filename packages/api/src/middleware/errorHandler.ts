/**
 * Global Error Handler Middleware
 *
 * Catches all errors and converts them to RFC 7807 Problem Details format.
 * Integrates with Sentry, Winston logging, and correlation IDs.
 *
 * MEGA PROMPT 2:
 * - Global error handler middleware
 * - RFC 7807 Problem Details format
 * - Correlation ID integration
 * - Sentry error tracking
 *
 * Usage in server.ts:
 *   app.use(errorHandler); // Must be last middleware
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import * as Sentry from '@sentry/node';
import { log } from '../utils/logger';
import {
  BaseError,
  ErrorFactory,
  isBaseError,
  isOperationalError,
  InternalServerError,
  ProblemDetails,
} from '../errors/ProblemDetails';
import { getRequestId } from './correlationId';

// ============================================================================
// Error Handler Middleware
// ============================================================================

/**
 * Global error handler - must be last middleware in chain
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get correlation ID for tracing
  const requestId = getRequestId();

  // Convert to Problem Details format
  const problemDetails = isBaseError(err)
    ? err
    : ErrorFactory.toProblemDetails(err, req.path);

  // Log error with full context
  const logContext = {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    statusCode: problemDetails.status,
    errorType: problemDetails.type,
    userId: (req as any).auth?.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  if (problemDetails.status >= 500) {
    log.error(`❌ ${problemDetails.title}`, err, logContext);
  } else if (problemDetails.status >= 400) {
    log.warn(`⚠️  ${problemDetails.title}`, logContext);
  }

  // Report to Sentry (only operational errors in production)
  if (shouldReportToSentry(err, problemDetails)) {
    Sentry.captureException(err, {
      level: problemDetails.status >= 500 ? 'error' : 'warning',
      tags: {
        requestId,
        errorType: problemDetails.type,
        statusCode: problemDetails.status.toString(),
        route: req.path,
      },
      user: {
        id: (req as any).auth?.userId,
        ip_address: req.ip,
      },
      extra: {
        method: req.method,
        query: req.query,
        body: sanitizeBody(req.body),
      },
    });
  }

  // Send RFC 7807 response
  res.status(problemDetails.status).json(problemDetails.toJSON());
};

// ============================================================================
// Not Found Handler
// ============================================================================

/**
 * 404 handler - should be placed before error handler
 *
 * Usage in server.ts:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = getRequestId();

  log.warn(`🔍 Route not found: ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
  });

  res.status(404).json({
    type: 'https://api.wcagai.com/errors/not-found',
    title: 'Not Found',
    status: 404,
    detail: `The requested resource ${req.path} was not found`,
    instance: req.path,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Process-Level Error Handlers
// ============================================================================

/**
 * Setup global process-level error handlers
 *
 * MEGA PROMPT 2: Global unhandled rejection handler
 *
 * Call this once in server.ts during initialization:
 *   setupGlobalErrorHandlers();
 */
export function setupGlobalErrorHandlers(): void {
  // Unhandled Promise Rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    log.error('💥 Unhandled Promise Rejection', reason, {
      event: 'unhandledRejection',
      reason: reason?.message || String(reason),
      stack: reason?.stack,
    });

    // Report to Sentry
    Sentry.captureException(reason, {
      level: 'fatal',
      tags: {
        event: 'unhandledRejection',
      },
    });

    // In production, we want to stay alive if possible
    // In development, crash to expose the bug
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unhandled Rejection:', reason);
      process.exit(1);
    }
  });

  // Uncaught Exceptions
  process.on('uncaughtException', (error: Error) => {
    log.error('💥 Uncaught Exception', error, {
      event: 'uncaughtException',
      fatal: true,
    });

    // Report to Sentry
    Sentry.captureException(error, {
      level: 'fatal',
      tags: {
        event: 'uncaughtException',
      },
    });

    // Flush Sentry before exit
    Sentry.close(2000).then(() => {
      console.error('Uncaught Exception:', error);
      process.exit(1); // Must exit - app state is now unreliable
    });
  });

  // Graceful Shutdown Signals
  const shutdown = (signal: string) => {
    log.info(`🛑 Received ${signal} signal - starting graceful shutdown`, {
      event: 'shutdown',
      signal,
    });

    // Give in-flight requests time to complete
    setTimeout(() => {
      log.info('✅ Graceful shutdown complete', {
        event: 'shutdown',
        signal,
      });
      process.exit(0);
    }, 10000); // 10s grace period
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Warning: Possible EventEmitter memory leak
  process.on('warning', (warning) => {
    log.warn('⚠️  Process Warning', {
      event: 'warning',
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });

  log.info('✅ Global error handlers initialized');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine if error should be reported to Sentry
 */
function shouldReportToSentry(error: any, problemDetails: BaseError): boolean {
  // Don't report in test environment
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  // Don't report 4xx client errors (except 429 rate limits)
  if (problemDetails.status < 500 && problemDetails.status !== 429) {
    return false;
  }

  // Don't report non-operational errors (programmer bugs) in dev
  if (process.env.NODE_ENV === 'development' && !isOperationalError(error)) {
    return false;
  }

  return true;
}

/**
 * Sanitize request body before sending to Sentry
 * Remove sensitive fields like passwords, API keys, tokens
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'passwordConfirm',
    'apiKey',
    'api_key',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'clientSecret',
    'privateKey',
    'creditCard',
    'ssn',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// ============================================================================
// Async Route Handler Wrapper
// ============================================================================

/**
 * Wrapper for async route handlers that catches errors
 *
 * Without this, async errors won't be caught by error middleware
 *
 * Usage:
 *   router.get('/scan/:id', asyncHandler(async (req, res) => {
 *     const scan = await scanService.get(req.params.id);
 *     res.json(scan);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express middleware wrapper that catches errors
 *
 * Usage for middleware:
 *   app.use(catchErrors(authMiddleware));
 */
export function catchErrors(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Error Response Builder (for manual error responses)
// ============================================================================

/**
 * Send Problem Details error response
 *
 * Usage in route handlers:
 *   if (!scan) {
 *     return sendError(res, new NotFoundError('Scan', scanId, req.path));
 *   }
 */
export function sendError(res: Response, error: BaseError): void {
  res.status(error.status).json(error.toJSON());
}

/**
 * Send validation error response
 *
 * Usage:
 *   if (!req.body.url) {
 *     return sendValidationError(res, [
 *       { field: 'url', message: 'URL is required' }
 *     ], req.path);
 *   }
 */
export function sendValidationError(
  res: Response,
  errors: Array<{ field: string; message: string; value?: any }>,
  instance?: string
): void {
  const error = ErrorFactory.validation(errors, instance);
  res.status(error.status).json(error.toJSON());
}
