/**
 * RFC 7807 Problem Details for HTTP APIs
 *
 * Standardized error response format for consistent API error handling.
 *
 * MEGA PROMPT 2: Standardized error classes (RFC 7807)
 *
 * Reference: https://www.rfc-editor.org/rfc/rfc7807
 *
 * Example Response:
 * {
 *   "type": "https://api.wcagai.com/errors/scan-failed",
 *   "title": "Scan Failed",
 *   "status": 500,
 *   "detail": "The accessibility scan could not be completed due to a timeout",
 *   "instance": "/api/scan/abc123",
 *   "requestId": "req_xyz789",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "errors": [...] // Optional validation errors
 * }
 */

import { getRequestId } from '../middleware/correlationId';

// ============================================================================
// Base Problem Details Interface (RFC 7807)
// ============================================================================

export interface ProblemDetails {
  /**
   * URI reference that identifies the problem type
   * Should dereference to human-readable documentation
   */
  type: string;

  /**
   * Short, human-readable summary of the problem type
   */
  title: string;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Human-readable explanation specific to this occurrence
   */
  detail?: string;

  /**
   * URI reference that identifies the specific occurrence
   * Often the request path
   */
  instance?: string;

  /**
   * Request correlation ID for tracing
   */
  requestId?: string;

  /**
   * Timestamp when error occurred
   */
  timestamp: string;

  /**
   * Additional problem-specific data
   */
  [key: string]: any;
}

// ============================================================================
// Base Error Class
// ============================================================================

export class BaseError extends Error implements ProblemDetails {
  public readonly type: string;
  public readonly title: string;
  public readonly status: number;
  public readonly detail?: string;
  public readonly instance?: string;
  public readonly requestId?: string;
  public readonly timestamp: string;
  public readonly isOperational: boolean; // Operational vs programmer errors

  constructor(options: {
    type: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    isOperational?: boolean;
    cause?: Error;
  }) {
    super(options.detail || options.title);

    this.name = this.constructor.name;
    this.type = options.type;
    this.title = options.title;
    this.status = options.status;
    this.detail = options.detail;
    this.instance = options.instance;
    this.requestId = getRequestId();
    this.timestamp = new Date().toISOString();
    this.isOperational = options.isOperational ?? true;

    if (options.cause) {
      (this as any).cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance,
      requestId: this.requestId,
      timestamp: this.timestamp,
    };
  }
}

// ============================================================================
// Client Errors (4xx)
// ============================================================================

export class BadRequestError extends BaseError {
  constructor(detail?: string, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: detail || 'The request is malformed or contains invalid data',
      instance,
    });
  }
}

export class ValidationError extends BaseError {
  public readonly errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  constructor(
    errors: Array<{ field: string; message: string; value?: any }>,
    instance?: string
  ) {
    super({
      type: 'https://api.wcagai.com/errors/validation-failed',
      title: 'Validation Failed',
      status: 422,
      detail: `${errors.length} validation error(s) occurred`,
      instance,
    });

    this.errors = errors;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

export class UnauthorizedError extends BaseError {
  constructor(detail?: string, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: detail || 'Authentication is required to access this resource',
      instance,
    });
  }
}

export class ForbiddenError extends BaseError {
  constructor(detail?: string, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: detail || 'You do not have permission to access this resource',
      instance,
    });
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string, id?: string, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/not-found',
      title: 'Resource Not Found',
      status: 404,
      detail: id
        ? `${resource} with ID '${id}' was not found`
        : `${resource} was not found`,
      instance,
    });
  }
}

export class ConflictError extends BaseError {
  constructor(detail?: string, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/conflict',
      title: 'Conflict',
      status: 409,
      detail: detail || 'The request conflicts with the current state of the resource',
      instance,
    });
  }
}

export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/rate-limit-exceeded',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
        : 'Rate limit exceeded. Please slow down your requests',
      instance,
    });

    this.retryAfter = retryAfter;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// ============================================================================
// Server Errors (5xx)
// ============================================================================

export class InternalServerError extends BaseError {
  constructor(detail?: string, instance?: string, cause?: Error) {
    super({
      type: 'https://api.wcagai.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: detail || 'An unexpected error occurred while processing your request',
      instance,
      isOperational: false, // Programmer error
      cause,
    });
  }
}

export class ServiceUnavailableError extends BaseError {
  public readonly retryAfter?: number;

  constructor(service: string, retryAfter?: number, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/service-unavailable',
      title: 'Service Unavailable',
      status: 503,
      detail: `The ${service} service is temporarily unavailable${
        retryAfter ? `. Retry after ${retryAfter} seconds` : ''
      }`,
      instance,
    });

    this.retryAfter = retryAfter;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

export class GatewayTimeoutError extends BaseError {
  constructor(service: string, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/gateway-timeout',
      title: 'Gateway Timeout',
      status: 504,
      detail: `The ${service} service did not respond in time`,
      instance,
    });
  }
}

// ============================================================================
// Business Logic Errors
// ============================================================================

export class ScanError extends BaseError {
  public readonly scanId?: string;
  public readonly url?: string;

  constructor(
    detail: string,
    options?: {
      scanId?: string;
      url?: string;
      instance?: string;
      cause?: Error;
    }
  ) {
    super({
      type: 'https://api.wcagai.com/errors/scan-failed',
      title: 'Scan Failed',
      status: 500,
      detail,
      instance: options?.instance,
      cause: options?.cause,
    });

    this.scanId = options?.scanId;
    this.url = options?.url;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      scanId: this.scanId,
      url: this.url,
    };
  }
}

export class AIServiceError extends BaseError {
  public readonly provider?: string;
  public readonly model?: string;

  constructor(
    detail: string,
    options?: {
      provider?: string;
      model?: string;
      instance?: string;
      cause?: Error;
    }
  ) {
    super({
      type: 'https://api.wcagai.com/errors/ai-service-failed',
      title: 'AI Service Error',
      status: 503,
      detail,
      instance: options?.instance,
      cause: options?.cause,
    });

    this.provider = options?.provider;
    this.model = options?.model;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      provider: this.provider,
      model: this.model,
    };
  }
}

export class ExternalAPIError extends BaseError {
  public readonly service: string;
  public readonly statusCode?: number;

  constructor(
    service: string,
    detail: string,
    options?: {
      statusCode?: number;
      instance?: string;
      cause?: Error;
    }
  ) {
    super({
      type: 'https://api.wcagai.com/errors/external-api-failed',
      title: 'External API Error',
      status: 502,
      detail,
      instance: options?.instance,
      cause: options?.cause,
    });

    this.service = service;
    this.statusCode = options?.statusCode;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      service: this.service,
      statusCode: this.statusCode,
    };
  }
}

export class CircuitBreakerOpenError extends BaseError {
  public readonly service: string;
  public readonly retryAfter?: number;

  constructor(service: string, retryAfter?: number, instance?: string) {
    super({
      type: 'https://api.wcagai.com/errors/circuit-breaker-open',
      title: 'Service Temporarily Unavailable',
      status: 503,
      detail: `The ${service} circuit breaker is open due to repeated failures${
        retryAfter ? `. Retry after ${retryAfter}ms` : ''
      }`,
      instance,
    });

    this.service = service;
    this.retryAfter = retryAfter;
  }

  toJSON(): ProblemDetails {
    return {
      ...super.toJSON(),
      service: this.service,
      retryAfter: this.retryAfter,
    };
  }
}

// ============================================================================
// Error Factory
// ============================================================================

export class ErrorFactory {
  /**
   * Convert unknown error to Problem Details format
   */
  static toProblemDetails(
    error: any,
    instance?: string
  ): BaseError {
    // Already a BaseError
    if (error instanceof BaseError) {
      return error;
    }

    // HTTP error from axios
    if (error.response?.status) {
      return new ExternalAPIError(
        error.config?.baseURL || 'External API',
        error.message,
        {
          statusCode: error.response.status,
          instance,
          cause: error,
        }
      );
    }

    // Circuit breaker error
    if (error.message?.includes('Circuit breaker is OPEN')) {
      const match = error.message.match(/Wait (\d+)ms/);
      const retryAfter = match ? parseInt(match[1]) : undefined;
      return new CircuitBreakerOpenError('External Service', retryAfter, instance);
    }

    // Database error (Prisma)
    if (error.code?.startsWith('P')) {
      if (error.code === 'P2025') {
        return new NotFoundError('Resource', undefined, instance);
      }
      if (error.code === 'P2002') {
        return new ConflictError('Resource already exists', instance);
      }
      return new InternalServerError('Database error occurred', instance, error);
    }

    // Generic error
    return new InternalServerError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      instance,
      error
    );
  }

  /**
   * Create validation error from array of field errors
   */
  static validation(
    errors: Array<{ field: string; message: string; value?: any }>,
    instance?: string
  ): ValidationError {
    return new ValidationError(errors, instance);
  }

  /**
   * Create error for missing required field
   */
  static missingField(field: string, instance?: string): ValidationError {
    return new ValidationError(
      [{ field, message: `${field} is required` }],
      instance
    );
  }

  /**
   * Create error for invalid field value
   */
  static invalidField(
    field: string,
    message: string,
    value?: any,
    instance?: string
  ): ValidationError {
    return new ValidationError([{ field, message, value }], instance);
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isBaseError(error: any): error is BaseError {
  return error instanceof BaseError;
}

export function isOperationalError(error: any): boolean {
  return error instanceof BaseError && error.isOperational;
}
