import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

/**
 * Auth Middleware - Stub for Phase 2 implementation
 *
 * Will implement JWT verification and tenant isolation
 * For now, allows requests with optional tenantId
 */

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: {
        id: string;
        email: string;
      };
      auth?: {
        userId: string;
        sessionId: string;
        organizationId?: string;
      };
    }
  }
}

/**
 * Auth Middleware - Verify JWT token (stub)
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Stub implementation - Phase 2 will add real JWT verification
    // For now, look for tenantId in headers or body
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.body as { tenantId?: string })?.tenantId || 'default-tenant';
    req.tenantId = tenantId;

    // Mock user for now
    req.user = {
      id: 'system-user',
      email: 'system@wcagai.local',
    };

    next();
  } catch (error) {
    log.error('Auth middleware error', error instanceof Error ? error : new Error(String(error)));
    res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * Ensure tenant access - Verify user has access to tenant
 */
export const ensureTenantAccess = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Missing tenant ID' });
    }
    next();
  } catch (error) {
    log.error('Tenant access error', error instanceof Error ? error : new Error(String(error)));
    res.status(403).json({ error: 'Forbidden' });
  }
};

import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

/**
 * Clerk authentication middleware
 * Validates JWT tokens and attaches user info to request
 */
export const requireAuth = ClerkExpressRequireAuth({
  onError: (error: any) => {
    console.error('Authentication error:', error);
  }
});

/**
 * API Key authentication middleware
 * For programmatic access via API keys
 */
export const requireApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Validate API key format
    if (!apiKey.startsWith('wcag_')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    // TODO: Validate API key against database
    // For now, just check format
    // In production, this should look up the client by API key

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Allows both authenticated and unauthenticated requests
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for API key or Clerk token
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  if (apiKey || authHeader) {
    // Has credentials, validate them
    if (apiKey) {
      return requireApiKey(req, res, next);
    }
    // Clerk validation would go here
  }

  // No credentials, proceed as unauthenticated
  next();
};
