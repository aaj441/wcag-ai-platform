/**
 * Tenant Isolation Middleware
 * Ensures data isolation between different clients/tenants
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// Extend Express Request to include tenant data
declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      client?: any;
    }
  }
}

/**
 * Tenant isolation middleware
 * Extracts and validates client/tenant from API key or auth token
 */
export const requireTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required for tenant identification'
      });
    }

    // Look up client by API key
    const client = await prisma.client.findUnique({
      where: { apiKey }
    });

    if (!client) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Check client status
    if (client.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Client account is ${client.status}`
      });
    }

    // Attach client data to request
    req.clientId = client.id;
    req.client = client;

    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Tenant validation failed'
    });
  }
};

/**
 * Check scan quota middleware
 * Ensures client has remaining scans
 */
export const checkScanQuota = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.client) {
      return res.status(401).json({
        success: false,
        error: 'Client not authenticated'
      });
    }

    if (req.client.scansRemaining <= 0) {
      return res.status(403).json({
        success: false,
        error: 'Scan quota exceeded. Please upgrade your plan or purchase additional scans.'
      });
    }

    next();
  } catch (error) {
    console.error('Quota check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Quota check failed'
    });
  }
};

/**
 * Decrement scan quota middleware
 * Decrements client's remaining scans after successful scan
 */
export const decrementScanQuota = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.clientId) {
      return next();
    }

    await prisma.client.update({
      where: { id: req.clientId },
      data: {
        scansRemaining: {
          decrement: 1
        }
      }
    });

    next();
  } catch (error) {
    console.error('Quota decrement error:', error);
    // Don't fail the request if quota update fails
    next();
  }
};
