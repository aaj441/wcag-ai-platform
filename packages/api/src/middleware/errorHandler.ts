import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { prisma } from '@/utils/database';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Internal server error';
  let details = error.details;

  // Log the error
  const logData = {
    error: error.stack || error.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    logger.error('Server Error:', logData);
  } else {
    logger.warn('Client Error:', logData);
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = extractValidationErrorDetails(error);
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    statusCode = handlePrismaError(prismaError);
    code = prismaError.code;
    message = getPrismaErrorMessage(prismaError);
  } else if (error.name === 'PrismaClientValidationError') {
    statusCode = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    message = 'Invalid data format';
  }

  // Don't expose stack trace in production
  const response: any = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.debug = {
      name: error.name,
      statusCode,
      isOperational: error.isOperational,
    };
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = {
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    error.debug = {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
    };
  }

  res.status(404).json(error);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes for different scenarios
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CustomError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message?: string) {
    super(message || `Error communicating with ${service}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// Helper functions
function extractValidationErrorDetails(error: any): any {
  if (error.details) {
    return error.details;
  }

  // Handle Joi validation errors
  if (error.isJoi) {
    return {
      fields: error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      })),
    };
  }

  // Handle Express Validator errors
  if (error.errors) {
    return {
      fields: error.errors.map((err: any) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    };
  }

  return null;
}

function handlePrismaError(error: any): number {
  switch (error.code) {
    case 'P2002':
      return 409; // Unique constraint violation
    case 'P2025':
      return 404; // Record not found
    case 'P2003':
      return 400; // Foreign key constraint violation
    case 'P2014':
      return 400; // Relation violation
    case 'P2021':
      return 500; // Table does not exist
    case 'P2022':
      return 500; // Column does not exist
    default:
      return 500;
  }
}

function getPrismaErrorMessage(error: any): string {
  switch (error.code) {
    case 'P2002':
      return 'A record with this value already exists';
    case 'P2025':
      return 'Record not found';
    case 'P2003':
      return 'Foreign key constraint violation';
    case 'P2014':
      return 'Relation violation';
    case 'P2021':
      return 'Database table does not exist';
    case 'P2022':
      return 'Database column does not exist';
    default:
      return 'Database operation failed';
  }
}

// Error monitoring and reporting utilities
export const reportError = async (error: AppError, context?: any): Promise<void> => {
  try {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // Log to application logs
    logger.error('Error reported:', errorReport);

    // In a real implementation, you would send this to an error monitoring service
    // like Sentry, Bugsnag, or a custom endpoint
    
    // Store in database for internal tracking
    if (process.env.NODE_ENV === 'production') {
      await prisma.auditLog.create({
        data: {
          action: 'ERROR_REPORTED',
          resource: 'SYSTEM',
          details: errorReport,
        },
      }).catch(() => {
        // Don't throw errors in error reporting
      });
    }
  } catch (reportingError) {
    logger.error('Failed to report error:', reportingError);
  }
};

// Graceful error recovery utilities
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError!;
};

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new ExternalServiceError('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker OPENED after ${this.failures} failures`);
    }
  }

  getState(): string {
    return this.state;
  }
}