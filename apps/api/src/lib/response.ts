import { Response } from 'express'
import { ApiResponse } from '../types'
import { logger } from './logger'

export class ApiResponseHandler {
  static success<T>(res: Response, data: T, statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    }
    return res.status(statusCode).json(response)
  }

  static error(
    res: Response,
    code: string,
    message: string,
    statusCode = 400,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    }

    // Log error
    logger.error('API Error', {
      code,
      message,
      statusCode,
      details,
    })

    return res.status(statusCode).json(response)
  }

  static validationError(res: Response, details: any): Response {
    return this.error(
      res,
      'VALIDATION_ERROR',
      'Request validation failed',
      400,
      details
    )
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, 'UNAUTHORIZED', message, 401)
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, 'FORBIDDEN', message, 403)
  }

  static notFound(res: Response, resource = 'Resource'): Response {
    return this.error(res, 'NOT_FOUND', `${resource} not found`, 404)
  }

  static serverError(res: Response, error?: any): Response {
    logger.error('Server Error', { error })
    return this.error(
      res,
      'INTERNAL_ERROR',
      'An internal server error occurred',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    )
  }
}
