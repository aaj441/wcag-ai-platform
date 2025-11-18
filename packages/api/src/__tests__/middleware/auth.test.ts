/**
 * Unit Tests for Authentication Middleware
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  ensureTenantAccess,
  requireApiKey,
  optionalAuth,
} from '../../middleware/auth';

// Type for Jest mock functions
type MockResponse = Partial<Response> & {
  status: jest.Mock<any>;
  json: jest.Mock<any>;
};

describe('Authentication Middleware', () => {
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
  });

  describe('authMiddleware', () => {
    it('should extract tenantId from x-tenant-id header', () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-123' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe('tenant-123');
      expect(mockReq.user).toEqual({
        id: 'system-user',
        email: 'system@wcagai.local',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenantId from request body', () => {
      mockReq.body = { tenantId: 'tenant-456' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe('tenant-456');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default-tenant when no tenantId provided', () => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe('default-tenant');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize header over body for tenantId', () => {
      mockReq.headers = { 'x-tenant-id': 'header-tenant' };
      mockReq.body = { tenantId: 'body-tenant' };

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenantId).toBe('header-tenant');
    });

    it('should attach mock user to request', () => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe('system-user');
      expect(mockReq.user?.email).toBe('system@wcagai.local');
    });

    it('should handle errors gracefully', () => {
      // Force an error by making headers undefined
      mockReq.headers = undefined as any;

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('ensureTenantAccess', () => {
    it('should call next when tenantId is present', () => {
      mockReq.tenantId = 'tenant-123';

      ensureTenantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 when tenantId is missing', () => {
      mockReq.tenantId = undefined;

      ensureTenantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing tenant ID' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when tenantId is empty string', () => {
      mockReq.tenantId = '';

      ensureTenantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing tenant ID' });
    });

    it('should handle errors and return 403', () => {
      // Force an error by making the request malformed
      mockReq = null as any;

      ensureTenantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('requireApiKey', () => {
    it('should accept valid API key with wcag_ prefix', async () => {
      mockReq.headers = { 'x-api-key': 'wcag_test_key_123' };

      await requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without API key', async () => {
      await requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject API key with invalid format', async () => {
      mockReq.headers = { 'x-api-key': 'invalid_format_key' };

      await requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API key format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject empty API key', async () => {
      mockReq.headers = { 'x-api-key': '' };

      await requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key required',
      });
    });

    it('should handle errors and return 500', async () => {
      // Force an error
      mockReq = null as any;

      await requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed',
      });
    });
  });

  describe('optionalAuth', () => {
    it('should proceed without credentials', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate API key when provided', () => {
      mockReq.headers = { 'x-api-key': 'wcag_test_key' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      // Should delegate to requireApiKey which will call next
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle authorization header', () => {
      mockReq.headers = { authorization: 'Bearer token123' };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      // Should proceed since Clerk validation is not fully implemented
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize API key over authorization header', () => {
      mockReq.headers = {
        'x-api-key': 'wcag_test',
        authorization: 'Bearer token123',
      };

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      // API key path should be taken
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should chain authMiddleware and ensureTenantAccess successfully', () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-abc' };

      // First middleware
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.tenantId).toBe('tenant-abc');
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Reset next mock
      mockNext.mockClear();

      // Second middleware
      ensureTenantAccess(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should fail at ensureTenantAccess if authMiddleware skipped', () => {
      // Skip authMiddleware, go straight to ensureTenantAccess
      ensureTenantAccess(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
