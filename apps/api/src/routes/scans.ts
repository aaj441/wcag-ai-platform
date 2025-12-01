import { Router, Request, Response } from 'express'
import { ScanRequestSchema } from '../types'
import { ApiResponseHandler } from '../lib/response'
import { ScannerService } from '../lib/scanner-service'
import { scanRateLimiter } from '../middleware/rate-limit'
import { optionalAuth } from '../middleware/auth'
import { logger } from '../lib/logger'

const router = Router()

/**
 * POST /api/scans
 * Submit a new WCAG scan request
 */
router.post(
  '/',
  scanRateLimiter,
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = ScanRequestSchema.safeParse(req.body)

      if (!validationResult.success) {
        return ApiResponseHandler.validationError(res, validationResult.error.errors)
      }

      const scanRequest = validationResult.data

      logger.info('Scan request received', {
        url: scanRequest.url,
        wcagLevel: scanRequest.wcagLevel,
      })

      // Submit scan to queue
      const result = await ScannerService.submitScan({
        url: scanRequest.url,
        wcagLevel: scanRequest.wcagLevel,
        scanType: scanRequest.scanType,
        tenantId: scanRequest.tenantId,
        userId: scanRequest.userId,
      })

      return ApiResponseHandler.success(res, result, 201)
    } catch (error) {
      logger.error('Error processing scan request', { error })
      return ApiResponseHandler.serverError(res, error)
    }
  }
)

/**
 * GET /api/scans/:scanId
 * Get scan status and results
 */
router.get('/:scanId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params

    if (!scanId) {
      return ApiResponseHandler.error(res, 'INVALID_SCAN_ID', 'Scan ID is required')
    }

    logger.info('Fetching scan status', { scanId })

    // Get scan status
    const status = await ScannerService.getScanStatus(scanId)

    return ApiResponseHandler.success(res, status)
  } catch (error) {
    logger.error('Error fetching scan status', { error })
    return ApiResponseHandler.serverError(res, error)
  }
})

/**
 * GET /api/scans/:scanId/results
 * Get detailed scan results
 */
router.get('/:scanId/results', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params

    if (!scanId) {
      return ApiResponseHandler.error(res, 'INVALID_SCAN_ID', 'Scan ID is required')
    }

    logger.info('Fetching scan results', { scanId })

    // Get scan results
    const results = await ScannerService.getScanResults(scanId)

    return ApiResponseHandler.success(res, results)
  } catch (error) {
    logger.error('Error fetching scan results', { error })
    return ApiResponseHandler.serverError(res, error)
  }
})

/**
 * GET /api/scans
 * List all scans for the authenticated user/tenant
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    // TODO: Implement listing scans from database
    logger.info('Listing scans')

    const scans = []

    return ApiResponseHandler.success(res, {
      scans,
      total: scans.length,
      page: 1,
      pageSize: 20,
    })
  } catch (error) {
    logger.error('Error listing scans', { error })
    return ApiResponseHandler.serverError(res, error)
  }
})

export default router
