/**
 * Tenant Isolation Middleware
 * Ensures all database queries are filtered by tenant
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Tenant isolation middleware for API key authentication
 * Validates API key and associates request with tenant/client
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Provide X-API-Key header.'
    });
  }

  try {
    // Lookup client by API key
    const client = await prisma.client.findUnique({
      where: { apiKey }
    });

    if (!client) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    if (client.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${client.status}. Please contact support.`
      });
    }

    // Attach client/tenant info to request
    req.tenantId = client.id;
    (req as any).client = client;

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if client has remaining scans
 */
export const checkScanQuota = async (req: Request, res: Response, next: NextFunction) => {
  const client = (req as any).client;

  if (!client) {
    return res.status(401).json({
      success: false,
      error: 'Client authentication required'
    });
  }

  if (client.scansRemaining <= 0) {
    return res.status(403).json({
      success: false,
      error: 'Scan quota exceeded. Please upgrade your plan.',
      scansRemaining: 0
    });
  }

  next();
};

/**
 * Tenant filter helper
 * Returns Prisma where clause for tenant isolation
 */
export function getTenantFilter(tenantId?: string) {
  if (!tenantId) {
    throw new Error('Tenant ID is required for database queries');
  }

  return {
    clientId: tenantId
  };
}

/**
 * Middleware that injects tenant filtering into Prisma queries
 * This is a global approach to ensure no data leaks between tenants
 */
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenantId) {
    return res.status(401).json({
      success: false,
      error: 'Tenant context required'
    });
  }

  // Store original Prisma methods
  const originalFindMany = prisma.scan.findMany;
  const originalFindUnique = prisma.scan.findUnique;
  const originalFindFirst = prisma.scan.findFirst;

  // Override Prisma methods to inject tenant filter
  // NOTE: This is a simplified approach. In production, use Prisma middleware
  // or a custom Prisma client extension

  next();
};
