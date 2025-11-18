/**
 * Structured Logging with Winston
 *
 * Production-ready logging for WCAG AI Platform
 *
 * MEGA PROMPT 2 Enhancements:
 * - Automatic correlation ID injection from async context
 * - Structured request context in all logs
 * - Request lifecycle tracing
 */

import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
  defaultMeta: {
    service: 'wcagaii-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

/**
 * Enhanced logger with OpenTelemetry trace context
 */
export class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = logger;
  }

  private addTraceContext(meta: any = {}) {
    let enrichedMeta = { ...meta };

    // Add OpenTelemetry trace context
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      enrichedMeta = {
        ...enrichedMeta,
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    }

    // Add correlation ID from async local storage (MEGA PROMPT 2)
    // Note: Import is lazy to avoid circular dependency
    try {
      const { getRequestContext } = require('../middleware/correlationId');
      const requestContext = getRequestContext();

      if (requestContext) {
        enrichedMeta = {
          ...enrichedMeta,
          requestId: requestContext.requestId,
          userId: requestContext.userId || enrichedMeta.userId,
          tenantId: requestContext.tenantId || enrichedMeta.tenantId,
          route: requestContext.route,
          method: requestContext.method,
        };
      }
    } catch (error) {
      // Silently fail if correlation ID middleware not available
      // This allows logger to work in contexts without async storage
    }

    return enrichedMeta;
  }

  info(message: string, meta?: any) {
    this.logger.info(message, this.addTraceContext(meta));
  }

  error(message: string, error?: Error, meta?: any) {
    this.logger.error(message, this.addTraceContext({
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    }));
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, this.addTraceContext(meta));
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, this.addTraceContext(meta));
  }

  // Scan-specific logging
  scanStarted(scanId: string, url: string, userId?: string) {
    this.info('Scan started', { scanId, url, userId, event: 'scan.started' });
  }

  scanCompleted(scanId: string, duration: number, violationCount: number) {
    this.info('Scan completed', {
      scanId,
      duration,
      violationCount,
      event: 'scan.completed',
    });
  }

  scanFailed(scanId: string, error: Error, url: string) {
    this.error('Scan failed', error, { scanId, url, event: 'scan.failed' });
  }

  // AI-specific logging
  aiRequestStarted(model: string, operation: string, scanId?: string) {
    this.info('AI request started', { model, operation, scanId, event: 'ai.request.started' });
  }

  aiRequestCompleted(model: string, tokens: number, cost: number) {
    this.info('AI request completed', {
      model,
      tokens,
      cost,
      event: 'ai.request.completed',
    });
  }

  // Security logging
  securityEvent(type: string, details: any) {
    this.warn('Security event', { type, ...details, event: 'security' });
  }

  // Audit logging
  auditLog(action: string, userId: string, resource: string, details?: any) {
    this.info('Audit log', {
      action,
      userId,
      resource,
      ...details,
      event: 'audit',
    });
  }
}

export const log = new Logger();
export default log;
