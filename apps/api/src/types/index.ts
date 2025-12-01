import { z } from 'zod'

// Scan request validation schema
export const ScanRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  wcagLevel: z.enum(['A', 'AA', 'AAA']).default('AA'),
  scanType: z.enum(['QUICK', 'FULL', 'DEEP']).default('FULL'),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
})

export type ScanRequest = z.infer<typeof ScanRequestSchema>

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

// Scan response
export interface ScanResponse {
  scanId: string
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  url: string
  wcagLevel: string
  estimatedCompletionTime?: string
  queuePosition?: number
}

// User context (from auth middleware)
export interface UserContext {
  userId: string
  tenantId: string
  email: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
}

// Express request with user context
export interface AuthenticatedRequest extends Express.Request {
  user?: UserContext
}
