import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/database';
import { logger } from '@/utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING',
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    if (!decoded || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid access token',
        code: 'TOKEN_INVALID',
      });
      return;
    }

    // Fetch user from database with organization info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        organizations: {
          where: {
            organization: {
              isActive: true,
            },
          },
          select: {
            organizationId: true,
            role: true,
          },
          take: 1, // Get primary organization
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account is inactive',
        code: 'USER_INACTIVE',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizations[0]?.organizationId,
    };

    // Log successful authentication
    logger.debug(`User authenticated: ${user.email} (${user.id})`);

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED',
        code: 'TOKEN_INVALID',
        code: 'TOKEN_EXPIRED',
      });
    } else {
      logger.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication',
        code: 'AUTH_ERROR',
      });
    }
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: {
          required: allowedRoles,
          current: req.user.role,
        },
      });
      return;
    }

    next();
  };
};

export const requireOrganizationMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    
    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
        code: 'ORGANIZATION_ID_REQUIRED',
      });
      return;
    }

    // Check if user is a member of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: organizationId as string,
        },
      },
      include: {
        organization: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!membership || !membership.organization.isActive) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this organization',
        code: 'ORGANIZATION_ACCESS_DENIED',
      });
      return;
    }

    // Add organization role to request for further authorization
    (req as any).organizationRole = membership.role;
    (req as any).organizationId = organizationId;

    next();
  } catch (error) {
    logger.error('Organization membership check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking organization membership',
      code: 'MEMBERSHIP_CHECK_ERROR',
    });
  }
};

export const requireOrganizationRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const organizationRole = (req as any).organizationRole;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!organizationRole) {
      res.status(403).json({
        success: false,
        message: 'Organization membership required',
        code: 'ORGANIZATION_MEMBERSHIP_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(organizationRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient organization permissions',
        code: 'INSUFFICIENT_ORG_PERMISSIONS',
        details: {
          required: allowedRoles,
          current: organizationRole,
        },
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      // No token provided, but that's okay for optional auth
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    if (decoded && decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't return errors on token failure
    next();
  }
};

function extractTokenFromRequest(req: Request): string | null {
  // Try to extract token from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try to extract token from query parameters
  const tokenFromQuery = req.query.token as string;
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  // Try to extract token from cookies
  const tokenFromCookie = req.cookies?.token;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  return null;
}

// Rate limiting middleware based on user role
export const roleBasedRateLimit = (limits: { [role: string]: number }) => {
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Apply default limit for unauthenticated users
      const defaultLimit = limits['default'] || 10;
      return applyRateLimit(req.ip || 'unknown', defaultLimit, res, next);
    }

    const userLimit = limits[req.user.role] || limits['default'] || 100;
    return applyRateLimit(req.user.id, userLimit, res, next);
  };
};

function applyRateLimit(
  identifier: string, 
  limit: number, 
  res: Response, 
  next: NextFunction
): void {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const key = identifier;

  // Clean up expired entries
  if (rateLimitStore.has(key)) {
    const entry = rateLimitStore.get(key)!;
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    next();
    return;
  }

  const entry = rateLimitStore.get(key)!;
  
  if (entry.count >= limit) {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        limit,
        resetTime: entry.resetTime,
      },
    });
    return;
  }

  entry.count++;
  next();
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export type { AuthenticatedRequest };