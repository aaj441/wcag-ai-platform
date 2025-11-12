/**
 * Clerk Authentication Middleware
 * Validates user authentication using Clerk
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth } from '@clerk/express';

/**
 * Extend Express Request to include auth info
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        claims?: any;
      };
      tenantId?: string;
    }
  }
}

/**
 * Clerk authentication middleware
 * Requires valid Clerk session token
 */
export { requireAuth };

/**
 * Optional authentication middleware
 * Allows request to continue even without auth, but populates auth if present
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  try {
    // Clerk session verification would go here
    // For now, just pass through
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Extract tenant ID from authenticated user
 * This maps the user's organization/tenant to filter database queries
 */
export const extractTenantId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // In production, fetch user's organization/tenant from Clerk
    // For now, use userId as tenantId
    const userId = req.auth.userId;
    
    // TODO: Query Clerk to get user's organization
    // const user = await clerkClient.users.getUser(userId);
    // const tenantId = user.publicMetadata?.tenantId || user.organizationMemberships[0]?.organization.id;
    
    // For now, use a simple mapping
    req.tenantId = `tenant_${userId}`;
    
    next();
  } catch (error) {
    console.error('Error extracting tenant ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to determine tenant context'
    });
  }
};
