/**
 * Input Validation Schemas (Zod)
 *
 * Request validation for API endpoints
 */

import { z } from 'zod';

// EmailStatus enum
export const EmailStatusSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'sent',
  'rejected',
]);

// ViolationSeverity enum
export const ViolationSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

// WCAG Level enum
export const WCAGLevelSchema = z.enum(['A', 'AA', 'AAA']);

// Violation schema
export const ViolationSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  pageTitle: z.string(),
  element: z.string(),
  wcagCriteria: z.string(),
  wcagLevel: WCAGLevelSchema,
  severity: ViolationSeveritySchema,
  description: z.string(),
  recommendation: z.string(),
  technicalDetails: z.string().optional(),
  screenshot: z.string().optional(),
  codeSnippet: z.string().optional(),
  affectedUsers: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  priority: z.number().int().min(1),
});

// EmailDraft create schema
export const CreateEmailDraftSchema = z.object({
  recipient: z.string().email('Invalid email address'),
  recipientName: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  violations: z.array(ViolationSchema).default([]),
  keywords: z.array(z.string()).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// EmailDraft update schema
export const UpdateEmailDraftSchema = z.object({
  recipient: z.string().email().optional(),
  recipientName: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  violations: z.array(ViolationSchema).optional(),
  keywords: z.array(z.string()).optional(),
  status: EmailStatusSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  approvedBy: z.string().optional(),
});

export type CreateEmailDraftInput = z.infer<typeof CreateEmailDraftSchema>;
export type UpdateEmailDraftInput = z.infer<typeof UpdateEmailDraftSchema>;
