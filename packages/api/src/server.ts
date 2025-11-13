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
import { apiLimiter } from './middleware/security';
import { register, httpRequestDuration } from './utils/metrics';
import { initializeTracing, getTracer } from './instrumentation';
import { log } from './utils/logger';
import { extractKeywords, combineTexts } from './utils/keywords';
import { getAllDrafts, updateDraft } from './data/store';

// Load environment variables & initialize tracing
dotenv.config();
initializeTracing();
const tracer = getTracer();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Rate limiting
app.use(apiLimiter);

// Security headers
app.use(helmet());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging + metrics + tracing span
app.use((req: Request, res: Response, next: NextFunction) => {
  const incomingTrace = req.header('traceparent') || req.header('x-correlation-id');
  const correlationId = incomingTrace || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  res.locals.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  log.info(`${req.method} ${req.path}`, { correlationId, ip: req.ip });

  const endTimer = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  tracer.startActiveSpan(`http ${req.method} ${req.path}`, (span: any) => {
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
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'WCAG AI Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Readiness check (dependencies & basic readiness heuristics)
app.get('/ready', async (req: Request, res: Response) => {
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
});

// API routes
app.use('/api/drafts', draftsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/keywords', keywordsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'WCAG AI Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      drafts: '/api/drafts',
      keywords: '/api/keywords',
      violations: '/api/violations',
    },
    documentation: 'https://github.com/aaj441/wcag-ai-platform',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

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
  log.error('Unhandled error', err, { path: req.path, method: req.method });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================================
// SERVER START
// ============================================================================

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
  log.info('WCAG AI Platform API Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    corsOrigin: CORS_ORIGIN,
  });
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
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📚 API: http://localhost:${PORT}/api`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
}

export default app;
