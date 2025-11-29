/**
 * Advanced Security Middleware
 * Comprehensive API security with rate limiting, input validation,
 * CSRF protection, and more
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * Rate Limiting Configuration
 * Tiered limits based on API key tier
 */
export const createRateLimiter = (tier: 'free' | 'pro' | 'enterprise' = 'free') => {
  const limits = {
    free: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    pro: {
      windowMs: 15 * 60 * 1000,
      max: 1000
    },
    enterprise: {
      windowMs: 15 * 60 * 1000,
      max: 10000
    }
  };

  const config = limits[tier];

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.windowMs / 60000} minutes.`,
      retryAfter: config.windowMs / 1000
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator: (req: Request) => {
      // Use API key or IP address for rate limiting
      return req.headers['x-api-key'] as string || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `You have exceeded the ${tier} tier rate limit of ${config.max} requests per ${config.windowMs / 60000} minutes`,
        tier,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    }
  });
};

/**
 * Speed Limiter (Gradual Slowdown)
 * Slows down responses as clients approach rate limit
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window at full speed
  delayMs: 500, // Add 500ms delay per request above delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

/**
 * Helmet Configuration (Security Headers)
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
});

/**
 * CORS Configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

/**
 * CSRF Protection Middleware
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();

  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour

    this.tokens.set(sessionId, { token, expires });

    // Cleanup expired tokens
    this.cleanup();

    return token;
  }

  static verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);

    if (!stored) {
      return false;
    }

    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }

    return stored.token === token;
  }

  static middleware(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF check for API key authenticated requests
    if (req.headers['x-api-key']) {
      return next();
    }

    const sessionId = req.sessionID || req.ip || 'unknown';
    const token = req.headers['x-csrf-token'] as string || req.body._csrf;

    if (!token || !CSRFProtection.verifyToken(sessionId, token)) {
      return res.status(403).json({
        error: 'CSRF Token Invalid',
        message: 'CSRF token missing or invalid'
      });
    }

    next();
  }

  private static cleanup() {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

/**
 * Input Validation Middleware
 * Uses Zod for runtime type checking
 */
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Replace with validated data
      req.body = (validated as any).body || req.body;
      req.query = (validated as any).query || req.query;
      req.params = (validated as any).params || req.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        });
      }

      next(error);
    }
  };
}

/**
 * SQL Injection Prevention
 * Validates that strings don't contain SQL injection patterns
 */
export function validateNoSQL(req: Request, res: Response, next: NextFunction) {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(--\s|;)/g,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({
      error: 'Invalid Input',
      message: 'Input contains potentially dangerous patterns'
    });
  }

  next();
}

/**
 * XSS Protection
 * Sanitizes input to prevent XSS attacks
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitize = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitize(v)])
      );
    }
    return value;
  };

  // Only sanitize if content type is not JSON (JSON should be validated, not sanitized)
  const contentType = req.headers['content-type'];
  if (contentType && !contentType.includes('application/json')) {
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
  }

  next();
}

/**
 * API Key Validation
 */
export async function validateAPIKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Include X-API-Key header.'
    });
  }

  // Validate API key format
  if (!/^[a-zA-Z0-9_-]{32,}$/.test(apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key format'
    });
  }

  // TODO: Look up API key in database and attach user/tier info
  // For now, just check against env var for admin key
  if (apiKey === process.env.ADMIN_API_KEY) {
    (req as any).user = { tier: 'enterprise', isAdmin: true };
    return next();
  }

  // Lookup in database would go here
  // const apiKeyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } });

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid API key'
  });
}

/**
 * Request Logging & Monitoring
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Attach request ID
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    // Log to console (in production, send to logging service)
    if (res.statusCode >= 400) {
      console.error('[API Error]', JSON.stringify(logData));
    } else if (duration > 1000) {
      console.warn('[API Slow]', JSON.stringify(logData));
    } else {
      console.log('[API]', JSON.stringify(logData));
    }
  });

  next();
}

/**
 * Error Rate Tracking
 * Tracks error rates for auto-rollback
 */
export class ErrorRateTracker {
  private static errorCount = 0;
  private static requestCount = 0;
  private static windowStart = Date.now();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly ERROR_THRESHOLD = 0.05; // 5%

  static trackRequest() {
    this.checkWindow();
    this.requestCount++;
  }

  static trackError() {
    this.checkWindow();
    this.errorCount++;

    // Check if error rate exceeds threshold
    const errorRate = this.errorCount / Math.max(this.requestCount, 1);
    if (errorRate > this.ERROR_THRESHOLD && this.requestCount > 10) {
      this.triggerAlert(errorRate);
    }
  }

  static getMetrics() {
    this.checkWindow();
    return {
      errorCount: this.errorCount,
      requestCount: this.requestCount,
      errorRate: this.errorCount / Math.max(this.requestCount, 1),
      windowStart: new Date(this.windowStart).toISOString()
    };
  }

  private static checkWindow() {
    const now = Date.now();
    if (now - this.windowStart > this.WINDOW_MS) {
      // Reset window
      this.errorCount = 0;
      this.requestCount = 0;
      this.windowStart = now;
    }
  }

  private static triggerAlert(errorRate: number) {
    console.error(`🚨 HIGH ERROR RATE DETECTED: ${(errorRate * 100).toFixed(2)}%`);
    // In production, trigger PagerDuty/Slack alert
  }
}

/**
 * Combined Security Middleware
 */
export function securityMiddleware() {
  return [
    helmetConfig,
    requestLogger,
    validateNoSQL,
    // Rate limiting applied per route
    // CSRF protection applied per route for mutation endpoints
  ];
}

export default {
  createRateLimiter,
  speedLimiter,
  helmetConfig,
  corsOptions,
  CSRFProtection,
  validateInput,
  validateNoSQL,
  sanitizeInput,
  validateAPIKey,
  requestLogger,
  ErrorRateTracker,
  securityMiddleware
};
