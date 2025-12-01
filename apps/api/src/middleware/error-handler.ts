import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { ApiResponseHandler } from '../lib/response'
import { logger } from '../lib/logger'

/**
 * Global error handling middleware
 * Should be registered last in the middleware chain
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  })

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return ApiResponseHandler.validationError(res, err.errors)
  }

  // Handle other known error types
  if (err.name === 'UnauthorizedError') {
    return ApiResponseHandler.unauthorized(res)
  }

  // Default to 500 server error
  return ApiResponseHandler.serverError(res, err)
}

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  return ApiResponseHandler.notFound(res, `Route ${req.method} ${req.path}`)
}
