/**
 * Role-Based Access Control (RBAC) Middleware
 * Manages permissions based on user roles
 */

import { Request, Response, NextFunction } from 'express';

// Define roles and their permissions
export enum Role {
  ADMIN = 'admin',
  CONSULTANT = 'consultant',
  CLIENT = 'client',
  VIEWER = 'viewer'
}

export enum Permission {
  // Client management
  CREATE_CLIENT = 'create:client',
  READ_CLIENT = 'read:client',
  UPDATE_CLIENT = 'update:client',
  DELETE_CLIENT = 'delete:client',

  // Scan management
  CREATE_SCAN = 'create:scan',
  READ_SCAN = 'read:scan',
  UPDATE_SCAN = 'update:scan',
  DELETE_SCAN = 'delete:scan',

  // Violation management
  READ_VIOLATION = 'read:violation',
  REVIEW_VIOLATION = 'review:violation',

  // Report management
  GENERATE_REPORT = 'generate:report',
  READ_REPORT = 'read:report',

  // Admin actions
  MANAGE_USERS = 'manage:users',
  VIEW_ANALYTICS = 'view:analytics'
}

// Role to permissions mapping
const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.CREATE_CLIENT,
    Permission.READ_CLIENT,
    Permission.UPDATE_CLIENT,
    Permission.DELETE_CLIENT,
    Permission.CREATE_SCAN,
    Permission.READ_SCAN,
    Permission.UPDATE_SCAN,
    Permission.DELETE_SCAN,
    Permission.READ_VIOLATION,
    Permission.REVIEW_VIOLATION,
    Permission.GENERATE_REPORT,
    Permission.READ_REPORT,
    Permission.MANAGE_USERS,
    Permission.VIEW_ANALYTICS
  ],
  [Role.CONSULTANT]: [
    Permission.READ_CLIENT,
    Permission.READ_SCAN,
    Permission.UPDATE_SCAN,
    Permission.READ_VIOLATION,
    Permission.REVIEW_VIOLATION,
    Permission.GENERATE_REPORT,
    Permission.READ_REPORT
  ],
  [Role.CLIENT]: [
    Permission.CREATE_SCAN,
    Permission.READ_SCAN,
    Permission.READ_VIOLATION,
    Permission.READ_REPORT
  ],
  [Role.VIEWER]: [
    Permission.READ_SCAN,
    Permission.READ_VIOLATION,
    Permission.READ_REPORT
  ]
};

// Extend Express Request to include role
declare global {
  namespace Express {
    interface Request {
      role?: Role;
    }
  }
}

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: Role, permission: Permission): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};

/**
 * Require specific role middleware
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.role || Role.VIEWER;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Require specific permission middleware
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.role || Role.VIEWER;

    const hasAllPermissions = requiredPermissions.every(permission =>
      hasPermission(userRole, permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Set role from client tier
 * Maps client tier to appropriate role
 */
export const setRoleFromTier = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.client) {
    // Map client tier to role
    const tierRoleMap: Record<string, Role> = {
      basic: Role.CLIENT,
      pro: Role.CLIENT,
      enterprise: Role.CLIENT
    };

    req.role = tierRoleMap[req.client.tier] || Role.VIEWER;
  } else if (req.auth?.userId) {
    // If authenticated via Clerk, check for admin/consultant role
    // TODO: Implement role lookup from database or Clerk metadata
    req.role = Role.CONSULTANT;
  } else {
    req.role = Role.VIEWER;
  }

  next();
};
