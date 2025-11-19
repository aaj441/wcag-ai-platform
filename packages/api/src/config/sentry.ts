/**
 * Sentry Configuration
 * 
 * Production monitoring with:
 * - Error tracking with context
 * - Performance monitoring
 * - Release tracking
 * - Source maps for stack traces
 * - Custom tags and breadcrumbs
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { httpIntegration, expressIntegration } from '@sentry/node';
import { Express } from 'express';

const ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_DSN = process.env.SENTRY_DSN;
const RELEASE_VERSION = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.npm_package_version || 'unknown';

/**
 * Initialize Sentry
 */
export function initializeSentry(app?: Express): void {
  if (!SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `wcagai-api@${RELEASE_VERSION}`,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    integrations: [
      nodeProfilingIntegration(),
      httpIntegration(),
      ...(app ? [expressIntegration()] : []),
    ],

    ignoreErrors: [
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ],

    beforeSend(event, hint) {
      const userAgent = event.request?.headers?.['user-agent'] || '';
      if (userAgent.includes('bot') || userAgent.includes('crawler')) {
        return null;
      }

      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },
  });

  console.log(`✅ Sentry initialized (env: ${ENVIRONMENT}, release: ${RELEASE_VERSION})`);
}

export function setSentryUser(userId: string, email?: string): void {
  Sentry.setUser({ id: userId, email });
}

export function captureException(error: Error, context?: Record<string, any>): string {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
  return error.message;
}

// Sentry middleware handlers
export const sentryRequestHandler = Sentry.expressErrorHandler;

export const sentryTracingHandler = () => {
  return (req: any, res: any, next: any) => {
    Sentry.startSpan({ name: req.path, op: 'http.server' }, () => {
      next();
    });
  };
};

export async function closeSentry(): Promise<void> {
  await Sentry.close(2000);
}

export default Sentry;
