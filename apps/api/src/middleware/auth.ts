import { Request, Response, NextFunction } from 'express'
import { AuthenticatedRequest, UserContext } from '../types'
import { ApiResponseHandler } from '../lib/response'
import { logger } from '../lib/logger'

/**
 * Authentication middleware
 *
 * In production, this should verify JWT tokens from NextAuth or your auth provider.
 * For now, this is a placeholder that can be integrated with your auth system.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return ApiResponseHandler.unauthorized(res, 'No authorization header provided')
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return ApiResponseHandler.unauthorized(res, 'No token provided')
    }

    // TODO: Implement actual JWT verification
    // For now, we'll use a basic validation
    // In production, verify with NextAuth or your JWT library:
    // const decoded = await verifyJWT(token)

    // Mock user context for development
    const user: UserContext = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      email: 'user@example.com',
      role: 'USER',
    }

    // Attach user to request
    ;(req as AuthenticatedRequest).user = user

    logger.info('User authenticated', { userId: user.userId })
    next()
  } catch (error) {
    logger.error('Authentication error', { error })
    return ApiResponseHandler.unauthorized(res, 'Invalid or expired token')
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't block if no auth is provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return next()
  }

  try {
    const token = authHeader.replace('Bearer ', '')

    // TODO: Implement actual JWT verification
    const user: UserContext = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      email: 'user@example.com',
      role: 'USER',
    }

    ;(req as AuthenticatedRequest).user = user
    next()
  } catch (error) {
    // If optional auth fails, just continue without user context
    logger.warn('Optional auth failed', { error })
    next()
  }
}

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: UserContext['role'][]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user

    if (!user) {
      return ApiResponseHandler.unauthorized(res)
    }

    if (!allowedRoles.includes(user.role)) {
      return ApiResponseHandler.forbidden(
        res,
        'Insufficient permissions to access this resource'
      )
    }

    next()
  }
}
