import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { logger } from './lib/logger'
import { apiRateLimiter } from './middleware/rate-limit'
import { errorHandler, notFoundHandler } from './middleware/error-handler'
import scansRouter from './routes/scans'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

// Body parsing middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  })
  next()
})

// Apply rate limiting to all API routes
app.use('/api', apiRateLimiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
})

// API routes
app.use('/api/scans', scansRouter)

// 404 handler (must be before error handler)
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`InfinitySoul API server started`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

export default app
