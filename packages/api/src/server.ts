/**
 * WCAG AI Platform API Server
 * Production-ready Express REST API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import draftsRouter from './routes/drafts';
import violationsRouter from './routes/violations';
import leadsRouter from './routes/leads';
import consultantRouter from './routes/consultant';
import fixesRouter from './routes/fixes';
import screenshotRouter from './routes/screenshot';
import demographicsRouter from './routes/demographics';
import clientsRouter from './routes/clients';
import slaRouter from './routes/sla';
import reportsRouter from './routes/reports';
import proposalsRouter from './routes/proposals';
import targetDemographicsRouter from './routes/targetDemographics';
import billingRouter from './routes/billing';
import healthRouter from './routes/health';
import monitoringRouter from './routes/monitoring';
import transformRouter from './routes/transform';
import demoRouter from './routes/demo';
import pitchRouter from './routes/pitch';
import { initializeSentry, sentryErrorHandler } from './services/monitoring';
import { getScanQueue } from './services/orchestration/ScanQueue';
import { getPuppeteerService } from './services/orchestration/PuppeteerService';
import { log } from './utils/logger';
import { apiLimiter, scanLimiter } from './middleware/security';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// SECURITY: Default to localhost in development, require explicit CORS_ORIGIN in production
const CORS_ORIGIN = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000');

// ============================================================================
// MONITORING INITIALIZATION
// ============================================================================

// Initialize Sentry (must be before other middleware)
initializeSentry(app);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers (MUST be first)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for API responses
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
}));

// CORS configuration (restricted origins)
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-tenant-id'],
  maxAge: 86400, // 24 hours
}));

// Body parsing (with size limits)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting for all API routes
app.use('/api', apiLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check routes
app.use('/health', healthRouter);

// Monitoring routes (queue, reliability, health)
app.use('/api/monitoring', monitoringRouter);

// API routes
app.use('/api/drafts', draftsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/consultant', consultantRouter);
app.use('/api/fixes', fixesRouter);
app.use('/api/screenshot', screenshotRouter);
app.use('/api/demographics', demographicsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/sla', slaRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/target-demographics', targetDemographicsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/transform', transformRouter);
app.use('/api/demo', demoRouter);
app.use('/api/pitch', pitchRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'WCAG AI Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      monitoring: '/api/monitoring',
      drafts: '/api/drafts',
      violations: '/api/violations',
      leads: '/api/leads',
      consultant: '/api/consultant',
      fixes: '/api/fixes',
      screenshot: '/api/screenshot',
      demographics: '/api/demographics',
      clients: '/api/clients',
      sla: '/api/sla',
      reports: '/api/reports',
      proposals: '/api/proposals',
      targetDemographics: '/api/target-demographics',
      billing: '/api/billing',
      transform: '/api/transform',
      demo: '/api/demo',
      pitch: '/api/pitch',
    },
    documentation: 'https://github.com/aaj441/wcag-ai-platform',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler (SECURITY: Never leak stack traces in production)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Log full error details internally
  log.error('Unhandled error', err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Return sanitized error to client
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    // Only expose error details in development
    ...(process.env.NODE_ENV === 'development' && {
      message: err.message,
      // Stack traces are NEVER sent, even in development
    }),
  });
});

// ============================================================================
// SERVER START
// ============================================================================

const server = app.listen(PORT, async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏛️  WCAG AI Platform API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Base: http://localhost:${PORT}/api`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring/dashboard`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Initialize Puppeteer service
  try {
    const puppeteer = getPuppeteerService();
    await puppeteer.initialize();
    console.log('✅ Puppeteer service initialized');
  } catch (error) {
    console.error('⚠️ Failed to initialize Puppeteer:', error);
  }

  // Initialize scan queue
  try {
    const scanQueue = getScanQueue();
    await scanQueue.initialize();
    console.log('✅ Scan queue initialized');
  } catch (error) {
    console.error('⚠️ Failed to initialize scan queue:', error);
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n⏹️  Shutting down gracefully...');

  try {
    const puppeteer = getPuppeteerService();
    await puppeteer.close();
    console.log('✅ Puppeteer closed');
  } catch (error) {
    console.error('Error closing Puppeteer:', error);
  }

  try {
    const scanQueue = getScanQueue();
    await scanQueue.close();
    console.log('✅ Scan queue closed');
  } catch (error) {
    console.error('Error closing queue:', error);
  }

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
