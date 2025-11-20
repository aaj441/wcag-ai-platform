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
