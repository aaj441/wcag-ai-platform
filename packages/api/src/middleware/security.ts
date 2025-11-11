/**
 * Security Middleware
 *
 * Rate limiting, SSRF protection, and security hardening
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createHmac } from 'crypto';
import ipaddr from 'ipaddr.js';
import dns from 'dns/promises';
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
          if (addr.kind() === rangeAddr.kind() && addr.match(rangeAddr, parseInt(bits))) {
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
 * Verify webhook signature
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

  if (signature !== expectedSignature) {
    log.securityEvent('invalid_webhook_signature', {
      ip: req.ip,
      expected: expectedSignature.substring(0, 8),
      received: signature.substring(0, 8),
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
// Authentication Middleware (stub)
// ========================================

/**
 * JWT Authentication
 * TODO: Implement full JWT validation
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // TODO: Verify JWT token
  // For now, just check if token exists
  (req as any).userId = 'user-123'; // Stub
  next();
}

/**
 * Optional authentication (for mixed endpoints)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    // TODO: Verify JWT token
    (req as any).userId = 'user-123'; // Stub
  }

  next();
}
