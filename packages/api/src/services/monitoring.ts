/**
 * Monitoring Service
 * Sentry integration for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Application } from 'express';

/**
 * Initialize Sentry for error tracking
 */
export function initializeSentry(app: Application): void {
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      nodeProfilingIntegration(),
    ],
    beforeSend(event: any, hint: any) {
      // Filter out specific errors if needed
      const error = hint.originalException;
      
      // Don't send 404 errors
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      
      return event;
    }
  });

  console.log('✅ Sentry initialized for error tracking');
}

/**
 * Error handler middleware (should be added after routes)
 */
export const sentryErrorHandler = (err: any, req: any, res: any, next: any) => {
  Sentry.captureException(err);
  next(err);
};

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info'
  });
}

export default {
  initializeSentry,
  sentryErrorHandler,
  captureException,
  captureMessage,
  addBreadcrumb
};
