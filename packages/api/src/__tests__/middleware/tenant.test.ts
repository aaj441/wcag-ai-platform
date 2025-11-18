/**
 * Unit Tests for Tenant Isolation Middleware
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  requireTenant,
  checkScanQuota,
  decrementScanQuota,
} from '../../middleware/tenant';
import prisma from '../../lib/prisma';

type MockResponse = Partial<Response> & {
  status: jest.Mock<any>;
  json: jest.Mock<any>;
};

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    client: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Tenant Isolation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: MockResponse;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis() as jest.Mock<any>,
      json: jest.fn() as jest.Mock<any>,
    };
    mockNext = jest.fn() as jest.Mock<NextFunction>;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('requireTenant', () => {
    it('should reject request without API key', async () => {
      await requireTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key required for tenant identification',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid API key', async () => {
      mockReq.headers = { 'x-api-key': 'invalid_key' };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { apiKey: 'invalid_key' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API key',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request for inactive client', async () => {
      mockReq.headers = { 'x-api-key': 'valid_key' };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-123',
        apiKey: 'valid_key',
        status: 'suspended',
      });

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Client account is suspended',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept request with valid API key and active client', async () => {
      mockReq.headers = { 'x-api-key': 'valid_key' };
      const mockClient = {
        id: 'client-123',
        apiKey: 'valid_key',
        status: 'active',
        tier: 'pro',
        scansRemaining: 10,
      };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.clientId).toBe('client-123');
      expect(mockReq.client).toEqual(mockClient);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockReq.headers = { 'x-api-key': 'valid_key' };
      (prisma.client.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tenant validation failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject client with deleted status', async () => {
      mockReq.headers = { 'x-api-key': 'valid_key' };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-123',
        status: 'deleted',
      });

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Client account is deleted',
      });
    });
  });

  describe('checkScanQuota', () => {
    it('should reject request without client', async () => {
      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Client not authenticated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when scans remaining is 0', async () => {
      mockReq.client = {
        id: 'client-123',
        scansRemaining: 0,
      };

      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Scan quota exceeded. Please upgrade your plan or purchase additional scans.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when scans remaining is negative', async () => {
      mockReq.client = {
        id: 'client-123',
        scansRemaining: -5,
      };

      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow when scans remaining is positive', async () => {
      mockReq.client = {
        id: 'client-123',
        scansRemaining: 10,
      };

      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow when scans remaining is exactly 1', async () => {
      mockReq.client = {
        id: 'client-123',
        scansRemaining: 1,
      };

      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors from next middleware', async () => {
      mockReq.client = {
        scansRemaining: 10,
      };
      // Simulate an error thrown by the next middleware in the chain
      mockNext.mockImplementation(() => {
        throw new Error('Error in next middleware');
      });

      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Quota check failed',
      });
    });
  });

  describe('decrementScanQuota', () => {
    it('should decrement scan quota for valid client', async () => {
      mockReq.clientId = 'client-123';
      (prisma.client.update as jest.Mock).mockResolvedValue({
        id: 'client-123',
        scansRemaining: 9,
      });

      await decrementScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        data: {
          scansRemaining: {
            decrement: 1,
          },
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip decrement when no clientId', async () => {
      mockReq.clientId = undefined;

      await decrementScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.update).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even if database update fails', async () => {
      mockReq.clientId = 'client-123';
      (prisma.client.update as jest.Mock).mockRejectedValue(
        new Error('Database update failed')
      );

      await decrementScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle empty clientId string', async () => {
      mockReq.clientId = '';

      await decrementScanQuota(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.client.update).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should enforce complete tenant workflow', async () => {
      // Step 1: Require tenant
      mockReq.headers = { 'x-api-key': 'valid_key' };
      const mockClient = {
        id: 'client-123',
        apiKey: 'valid_key',
        status: 'active',
        scansRemaining: 5,
      };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.client).toEqual(mockClient);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Step 2: Check quota
      mockNext.mockClear();
      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Step 3: Decrement quota
      mockNext.mockClear();
      (prisma.client.update as jest.Mock).mockResolvedValue({
        ...mockClient,
        scansRemaining: 4,
      });
      await decrementScanQuota(mockReq as Request, mockRes as Response, mockNext);
      expect(prisma.client.update).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should block at quota check when scans depleted', async () => {
      // Step 1: Require tenant with 0 scans
      mockReq.headers = { 'x-api-key': 'valid_key' };
      const mockClient = {
        id: 'client-123',
        apiKey: 'valid_key',
        status: 'active',
        scansRemaining: 0,
      };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Step 2: Quota check should fail
      mockNext.mockClear();
      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block suspended client at tenant check', async () => {
      mockReq.headers = { 'x-api-key': 'valid_key' };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-123',
        status: 'suspended',
        scansRemaining: 10,
      });

      await requireTenant(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();

      // Should never get to quota check
      mockNext.mockClear();
      await checkScanQuota(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401); // No client attached
    });
  });
});
