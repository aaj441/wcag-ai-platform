/**
 * Security Middleware
 *
 * Rate limiting, SSRF protection, and security hardening
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createHmac, timingSafeEqual } from 'crypto';
import ipaddr from 'ipaddr.js';
import dns from 'dns/promises';
import jwt from 'jsonwebtoken';
import { log } from '../utils/logger';

// ========================================
// Rate Limiting
// ========================================

/**
 * API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/health' || req.path === '/metrics';
  },
  handler: (req: Request, res: Response) => {
    log.securityEvent('rate_limit_exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  },
});

/**
 * Strict rate limiter for scan endpoint
 * 10 scans per hour per IP
 */
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Scan rate limit exceeded',
    retryAfter: '1 hour',
  },
  skipSuccessfulRequests: false,
});

// ========================================
// SSRF Protection
// ========================================

// Private IP ranges to block
const PRIVATE_IP_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  'fc00::/7',
  'fe80::/10',
  '::1/128',
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254', // AWS metadata
  'metadata', // GCP metadata
];

/**
 * Validate URL and prevent SSRF attacks
 */
async function isUrlSafe(urlString: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const url = new URL(urlString);

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: 'Invalid protocol' };
    }

    // Check blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(url.hostname.toLowerCase())) {
      return { safe: false, reason: 'Blocked hostname' };
    }

    // Resolve hostname to IP
    let addresses: string[];
    try {
      const result = await dns.resolve4(url.hostname);
      addresses = result;
    } catch {
      try {
        const result = await dns.resolve6(url.hostname);
        addresses = result;
      } catch {
        return { safe: false, reason: 'DNS resolution failed' };
      }
    }

    // Check if any resolved IP is in private range
    for (const address of addresses) {
      const addr = ipaddr.parse(address);

      // Check against private ranges
      for (const range of PRIVATE_IP_RANGES) {
        try {
          const [rangeAddr, bits] = ipaddr.parseCIDR(range);
          if (addr.kind() === rangeAddr.kind() && addr.match(rangeAddr, bits)) {
            return { safe: false, reason: 'Private IP address' };
          }
        } catch {
          continue;
        }
      }
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, reason: 'Invalid URL' };
  }
}

/**
 * SSRF Protection Middleware
 */
export async function ssrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const url = req.body.url || req.body.input || req.query.url;

  if (!url) {
    return next();
  }

  const { safe, reason } = await isUrlSafe(url as string);

  if (!safe) {
    log.securityEvent('ssrf_attempt_blocked', {
      ip: req.ip,
      url,
      reason,
      userAgent: req.get('user-agent'),
    });

    res.status(403).json({
      error: 'Forbidden',
      message: `URL scanning prohibited: ${reason}`,
    });
    return;
  }

  next();
}

// ========================================
// Request Signing & Verification
// ========================================

/**
 * Sign request body for webhooks
 */
export function signRequest(body: any, secret: string): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
}

/**
 * Verify webhook signature (SECURITY: using constant-time comparison)
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-webhook-signature'] as string;
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    log.warn('Webhook secret not configured');
    return next();
  }

  if (!signature) {
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  const expectedSignature = signRequest(req.body, secret);

  // SECURITY: Use constant-time comparison to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    // Ensure buffers are same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      log.securityEvent('invalid_webhook_signature', {
        ip: req.ip,
        reason: 'Length mismatch',
      });
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      log.securityEvent('invalid_webhook_signature', {
        ip: req.ip,
        reason: 'Signature mismatch',
      });
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  } catch (error) {
    log.securityEvent('webhook_signature_verification_error', {
      ip: req.ip,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  next();
}

// ========================================
// Content Security Policy
// ========================================

/**
 * Helmet configuration for security headers
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow iframe embedding for demos
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// ========================================
// Input Validation
// ========================================

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .substring(0, 2000); // Limit length
}

/**
 * Validate scan request
 */
export function validateScanRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { url, wcagLevel, includeWarnings } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  if (typeof url !== 'string') {
    res.status(400).json({ error: 'URL must be a string' });
    return;
  }

  if (url.length > 2048) {
    res.status(400).json({ error: 'URL too long' });
    return;
  }

  // Validate WCAG level
  if (wcagLevel && !['A', 'AA', 'AAA'].includes(wcagLevel)) {
    res.status(400).json({ error: 'Invalid WCAG level' });
    return;
  }

  // Validate boolean fields
  if (includeWarnings !== undefined && typeof includeWarnings !== 'boolean') {
    res.status(400).json({ error: 'includeWarnings must be a boolean' });
    return;
  }

  next();
}

// ========================================
// Authentication Middleware
// ========================================

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: string;
    }
  }
}

/**
 * JWT Authentication - PRODUCTION READY
 * Verifies JWT tokens and attaches user info to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log.securityEvent('missing_auth_token', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    log.error('JWT_SECRET not configured', new Error('JWT_SECRET environment variable is not set'));
    res.status(500).json({ error: 'Authentication service unavailable' });
    return;
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'], // Only allow HMAC SHA-256
      maxAge: '24h', // Tokens expire after 24 hours
    }) as { userId: string; email: string; role?: string };

    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role || 'user';

    log.info('Authenticated request', {
      userId: req.userId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      log.securityEvent('expired_jwt_token', {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      log.securityEvent('invalid_jwt_token', {
        ip: req.ip,
        path: req.path,
        reason: error.message,
      });
      res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      return;
    }

    log.error('JWT verification error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
}

/**
 * Optional authentication (for mixed endpoints)
 * If token is provided, it must be valid
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // No auth header = proceed as unauthenticated
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Auth header provided = must be valid
  return requireAuth(req, res, next);
}
