/**
 * Input Validation Middleware using Zod
 * Provides comprehensive schema validation for all API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { log } from '../utils/logger';

// ========================================
// Common Schemas
// ========================================

export const emailSchema = z.string().email('Invalid email address').max(254);

export const urlSchema = z.string().url('Invalid URL').max(2048);

export const wcagLevelSchema = z.enum(['A', 'AA', 'AAA'], {
  errorMap: () => ({ message: 'WCAG level must be A, AA, or AAA' }),
});

export const uuidSchema = z.string().uuid('Invalid UUID format');

// ========================================
// Draft Schemas
// ========================================

export const createDraftSchema = z.object({
  recipient: emailSchema,
  recipientName: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required').max(50000),
  violations: z.array(z.record(z.any())).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateDraftSchema = z.object({
  recipient: emailSchema.optional(),
  recipientName: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
  violations: z.array(z.record(z.any())).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(['draft', 'pending', 'approved', 'sent', 'rejected']).optional(),
});

// ========================================
// Scan Schemas
// ========================================

export const scanRequestSchema = z.object({
  url: urlSchema,
  wcagLevel: wcagLevelSchema.optional().default('AA'),
  includeWarnings: z.boolean().optional().default(false),
  waitForPageLoad: z.number().min(0).max(30000).optional().default(5000),
});

// ========================================
// Violations Schema
// ========================================

export const violationsQuerySchema = z.object({
  url: urlSchema.optional(),
  severity: z.enum(['critical', 'serious', 'moderate', 'minor']).optional(),
  wcagLevel: wcagLevelSchema.optional(),
  status: z.enum(['open', 'in_progress', 'fixed', 'wont_fix']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional().default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).optional().default('0'),
});

// ========================================
// Client Schema
// ========================================

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: emailSchema,
  website: urlSchema.optional(),
  phone: z.string().regex(/^[\d\s\(\)\-\+]+$/, 'Invalid phone number').max(20).optional(),
  company: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'trial', 'cancelled']).optional().default('active'),
});

// ========================================
// Proposal Schema
// ========================================

export const createProposalSchema = z.object({
  clientId: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(10000),
  estimatedHours: z.number().min(0).max(10000),
  hourlyRate: z.number().min(0).max(1000),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional().default('draft'),
  validUntil: z.string().datetime().optional(),
});

// ========================================
// Validation Middleware Factory
// ========================================

interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Create validation middleware from Zod schemas
 */
export function validate(schemas: ValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // Validate query parameters
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // Validate URL parameters
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        log.securityEvent('validation_failed', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          errors: formattedErrors,
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      // Unexpected error
      log.error('Validation middleware error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: 'Validation error',
      });
      return;
    }
  };
}

// ========================================
// Sanitization Helpers
// ========================================

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize HTML input (allow safe HTML only)
 */
export function sanitizeHtml(input: string): string {
  // For now, strip all HTML. In production, use DOMPurify
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
