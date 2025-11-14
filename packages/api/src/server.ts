/**
 * WCAG AI Platform API Server
 * Production-ready Express REST API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { initializeSentry, sentryErrorHandler } from './services/monitoring';
import { getScanQueue } from './services/orchestration/ScanQueue';
import { getPuppeteerService } from './services/orchestration/PuppeteerService';
import { log } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ============================================================================
// MONITORING INITIALIZATION
// ============================================================================

// Initialize Sentry (must be before other middleware)
initializeSentry(app);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      transform: '/api/transform',
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

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
