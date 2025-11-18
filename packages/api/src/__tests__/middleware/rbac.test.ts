/**
 * Unit Tests for Role-Based Access Control (RBAC) Middleware
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  Role,
  Permission,
  hasPermission,
  requireRole,
  requirePermission,
  setRoleFromTier,
} from '../../middleware/rbac';

type MockResponse = Partial<Response> & {
  status: jest.Mock<any>;
  json: jest.Mock<any>;
};

describe('RBAC Middleware', () => {
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

  describe('hasPermission', () => {
    describe('ADMIN role', () => {
      it('should have all permissions', () => {
        expect(hasPermission(Role.ADMIN, Permission.CREATE_CLIENT)).toBe(true);
        expect(hasPermission(Role.ADMIN, Permission.DELETE_CLIENT)).toBe(true);
        expect(hasPermission(Role.ADMIN, Permission.MANAGE_USERS)).toBe(true);
        expect(hasPermission(Role.ADMIN, Permission.VIEW_ANALYTICS)).toBe(true);
        expect(hasPermission(Role.ADMIN, Permission.REVIEW_VIOLATION)).toBe(true);
      });
    });

    describe('CONSULTANT role', () => {
      it('should have read and review permissions', () => {
        expect(hasPermission(Role.CONSULTANT, Permission.READ_CLIENT)).toBe(true);
        expect(hasPermission(Role.CONSULTANT, Permission.READ_SCAN)).toBe(true);
        expect(hasPermission(Role.CONSULTANT, Permission.UPDATE_SCAN)).toBe(true);
        expect(hasPermission(Role.CONSULTANT, Permission.REVIEW_VIOLATION)).toBe(true);
        expect(hasPermission(Role.CONSULTANT, Permission.GENERATE_REPORT)).toBe(true);
      });

      it('should NOT have create/delete client permissions', () => {
        expect(hasPermission(Role.CONSULTANT, Permission.CREATE_CLIENT)).toBe(false);
        expect(hasPermission(Role.CONSULTANT, Permission.DELETE_CLIENT)).toBe(false);
        expect(hasPermission(Role.CONSULTANT, Permission.MANAGE_USERS)).toBe(false);
      });
    });

    describe('CLIENT role', () => {
      it('should have basic scan and read permissions', () => {
        expect(hasPermission(Role.CLIENT, Permission.CREATE_SCAN)).toBe(true);
        expect(hasPermission(Role.CLIENT, Permission.READ_SCAN)).toBe(true);
        expect(hasPermission(Role.CLIENT, Permission.READ_VIOLATION)).toBe(true);
        expect(hasPermission(Role.CLIENT, Permission.READ_REPORT)).toBe(true);
      });

      it('should NOT have review or admin permissions', () => {
        expect(hasPermission(Role.CLIENT, Permission.REVIEW_VIOLATION)).toBe(false);
        expect(hasPermission(Role.CLIENT, Permission.GENERATE_REPORT)).toBe(false);
        expect(hasPermission(Role.CLIENT, Permission.MANAGE_USERS)).toBe(false);
        expect(hasPermission(Role.CLIENT, Permission.CREATE_CLIENT)).toBe(false);
      });
    });

    describe('VIEWER role', () => {
      it('should have only read permissions', () => {
        expect(hasPermission(Role.VIEWER, Permission.READ_SCAN)).toBe(true);
        expect(hasPermission(Role.VIEWER, Permission.READ_VIOLATION)).toBe(true);
        expect(hasPermission(Role.VIEWER, Permission.READ_REPORT)).toBe(true);
      });

      it('should NOT have any write permissions', () => {
        expect(hasPermission(Role.VIEWER, Permission.CREATE_SCAN)).toBe(false);
        expect(hasPermission(Role.VIEWER, Permission.UPDATE_SCAN)).toBe(false);
        expect(hasPermission(Role.VIEWER, Permission.REVIEW_VIOLATION)).toBe(false);
        expect(hasPermission(Role.VIEWER, Permission.GENERATE_REPORT)).toBe(false);
      });
    });
  });

  describe('requireRole', () => {
    it('should allow ADMIN role when required', () => {
      mockReq.role = Role.ADMIN;
      const middleware = requireRole(Role.ADMIN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      mockReq.role = Role.CONSULTANT;
      const middleware = requireRole(Role.ADMIN, Role.CONSULTANT);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject role not in allowed list', () => {
      mockReq.role = Role.VIEWER;
      const middleware = requireRole(Role.ADMIN, Role.CONSULTANT);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should default to VIEWER role if not set', () => {
      mockReq.role = undefined;
      const middleware = requireRole(Role.ADMIN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow VIEWER when VIEWER is in allowed roles', () => {
      mockReq.role = undefined; // Defaults to VIEWER
      const middleware = requireRole(Role.VIEWER);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow ADMIN with any permission', () => {
      mockReq.role = Role.ADMIN;
      const middleware = requirePermission(Permission.MANAGE_USERS);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow CONSULTANT with review permission', () => {
      mockReq.role = Role.CONSULTANT;
      const middleware = requirePermission(Permission.REVIEW_VIOLATION);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject CLIENT trying to review violations', () => {
      mockReq.role = Role.CLIENT;
      const middleware = requirePermission(Permission.REVIEW_VIOLATION);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require ALL permissions when multiple specified', () => {
      mockReq.role = Role.CLIENT;
      const middleware = requirePermission(
        Permission.READ_SCAN,
        Permission.CREATE_SCAN
      );

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject if ANY permission is missing', () => {
      mockReq.role = Role.CLIENT;
      const middleware = requirePermission(
        Permission.READ_SCAN,
        Permission.REVIEW_VIOLATION // CLIENT does not have this
      );

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should default to VIEWER when role not set', () => {
      mockReq.role = undefined;
      const middleware = requirePermission(Permission.READ_SCAN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject VIEWER for write permissions', () => {
      mockReq.role = undefined; // Defaults to VIEWER
      const middleware = requirePermission(Permission.CREATE_SCAN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('setRoleFromTier', () => {
    it('should set CLIENT role for basic tier', () => {
      mockReq.client = { tier: 'basic' } as any;

      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.CLIENT);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set CLIENT role for pro tier', () => {
      mockReq.client = { tier: 'pro' } as any;

      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.CLIENT);
    });

    it('should set CLIENT role for enterprise tier', () => {
      mockReq.client = { tier: 'enterprise' } as any;

      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.CLIENT);
    });

    it('should set VIEWER role for unknown tier', () => {
      mockReq.client = { tier: 'unknown-tier' } as any;

      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.VIEWER);
    });

    it('should set CONSULTANT role for authenticated Clerk user', () => {
      mockReq.auth = { userId: 'user-123', sessionId: 'session-456' };

      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.CONSULTANT);
    });

    it('should default to VIEWER when no client or auth', () => {
      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.VIEWER);
    });

    it('should prioritize client over auth', () => {
      mockReq.client = { tier: 'pro' } as any;
      mockReq.auth = { userId: 'user-123', sessionId: 'session-456' };

      setRoleFromTier(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.role).toBe(Role.CLIENT);
    });
  });

  describe('Integration scenarios', () => {
    it('should allow ADMIN to perform all operations', () => {
      mockReq.role = Role.ADMIN;

      const createClient = requirePermission(Permission.CREATE_CLIENT);
      const deleteClient = requirePermission(Permission.DELETE_CLIENT);
      const manageUsers = requirePermission(Permission.MANAGE_USERS);

      createClient(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      deleteClient(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      manageUsers(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('should enforce proper CLIENT workflow', () => {
      mockReq.role = Role.CLIENT;

      // CLIENT can create scans
      const createScan = requirePermission(Permission.CREATE_SCAN);
      createScan(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // CLIENT can read reports
      const readReport = requirePermission(Permission.READ_REPORT);
      readReport(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      // CLIENT cannot review violations
      const reviewViolation = requirePermission(Permission.REVIEW_VIOLATION);
      reviewViolation(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).toHaveBeenCalledTimes(2); // Should not increment
    });

    it('should enforce CONSULTANT review workflow', () => {
      mockReq.role = Role.CONSULTANT;

      // Can review violations
      const review = requirePermission(Permission.REVIEW_VIOLATION);
      review(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      mockNext.mockClear();

      // Cannot create clients
      const createClient = requirePermission(Permission.CREATE_CLIENT);
      createClient(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
