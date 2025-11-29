/**
 * WCAG AI Platform API Server
 * Production-ready Express REST API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import draftsRouter from './routes/drafts';
import violationsRouter from './routes/violations';
import keywordsRouter from './routes/keywords';
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
// import billingRouter from './routes/billing';
import healthRouter from './routes/health';
import monitoringRouter from './routes/monitoring';
import transformRouter from './routes/transform';
import { apiLimiter } from './middleware/security';
import { register, httpRequestDuration } from './utils/metrics';
import { initializeTracing, getTracer } from './instrumentation';
import { log } from './utils/logger';
import { extractKeywords, combineTexts } from './utils/keywords';
import { getAllDrafts, updateDraft } from './data/store';
import { initializeSentry } from './services/monitoring';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/errorHandler';
import { getScanQueue } from './services/orchestration/ScanQueue';
import { getPuppeteerService } from './services/orchestration/PuppeteerService';

// Load environment variables & initialize tracing
dotenv.config();
setupGlobalErrorHandlers();
initializeTracing();
const tracer = getTracer() as {
  startActiveSpan: (name: string, fn: (span: { setAttribute: (key: string, value: unknown) => void; end: () => void }) => void) => void;
};

const app = express();
initializeSentry(app);
const PORT = process.env.PORT || 3001;
// SECURITY: Default to localhost in development, require explicit CORS_ORIGIN in production
const CORS_ORIGIN = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000');

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

// Request logging + metrics + tracing span
app.use((req: Request, res: Response, next: NextFunction) => {
  const incomingTrace = req.header('traceparent') || req.header('x-correlation-id');
  const correlationId = incomingTrace || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  res.locals.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  log.info(`${req.method} ${req.path}`, { correlationId, ip: req.ip });

  const endTimer = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  tracer.startActiveSpan(`http ${req.method} ${req.path}`, (span) => {
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.target', req.path);
    span.setAttribute('http.correlation_id', correlationId);
    res.on('finish', () => {
      endTimer({ status_code: String(res.statusCode) });
      span.setAttribute('http.status_code', res.statusCode);
      span.end();
    });
    next();
  });
});

// Metrics endpoint
app.get('/metrics', (_req: Request, res: Response) => {
  void (async () => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  })();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'WCAG AI Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Readiness check (dependencies & basic readiness heuristics)
app.get('/ready', (_req: Request, res: Response) => {
  void (async () => {
    try {
      const uptimeOk = process.uptime() > 3; // basic warmup
      // Try to compute a model config only if LD is configured; otherwise rely on defaults
      const flagsOk = true;
      const status = uptimeOk && flagsOk;
      res.json({
        success: status,
        ready: status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ success: false, ready: false, error: 'readiness check failed' });
    }
  })();
});

// Monitoring routes (queue, reliability, health)
app.use('/api/monitoring', monitoringRouter);
app.use('/api/health', healthRouter);

// API routes - All routes combined from both branches
app.use('/api/drafts', draftsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/keywords', keywordsRouter);
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
// app.use('/api/billing', billingRouter);
app.use('/api/transform', transformRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'WCAG AI Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      metrics: '/metrics',
      monitoring: '/api/monitoring',
      drafts: '/api/drafts',
      violations: '/api/violations',
      keywords: '/api/keywords',
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
      // billing: '/api/billing',
      transform: '/api/transform',
    },
    documentation: 'https://github.com/aaj441/wcag-ai-platform',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
// 404 handler
app.use(notFoundHandler);

// Global error handler (SECURITY: Never leak stack traces in production)
app.use(errorHandler);

// ============================================================================
// SERVER START
// ============================================================================

const server = app.listen(PORT, async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏛️  WCAG AI Platform API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Seed keywords for existing drafts on startup
  try {
    const drafts = getAllDrafts();
    let refreshed = 0;
    for (const d of drafts) {
      const combined = combineTexts(d.subject, d.body, ...(d.violations || []).map(v => v.description || ''));
      const keywords = extractKeywords(combined, 15);
      const updated = updateDraft(d.id, { keywords });
      if (updated) refreshed++;
    }
    log.info('Keyword seeding complete', { refreshed });
  } catch (err) {
    log.error('Failed to seed keywords on startup', err instanceof Error ? err : undefined);
  }

  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📚 API Base: http://localhost:${PORT}/api`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring/dashboard`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Initialize Puppeteer service
  try {
    const puppeteer = getPuppeteerService();
    await puppeteer.initialize();
    console.log('✅ Puppeteer service initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize Puppeteer:', error);
  }

  // Initialize scan queue
  try {
    const scanQueue = getScanQueue();
    await scanQueue.initialize();
    console.log('✅ Scan queue initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize scan queue:', error);
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
