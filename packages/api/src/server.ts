/**
 * WCAG AI Platform API Server
 * Production-ready Express REST API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSentry, addSentryErrorHandler } from './services/sentry';
import draftsRouter from './routes/drafts';
import violationsRouter from './routes/violations';
import clientsRouter from './routes/clients';
import slaRouter from './routes/sla';
import reportsRouter from './routes/reports';
import proposalsRouter from './routes/proposals';
import webhooksRouter from './routes/webhooks';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ============================================================================
// SENTRY INITIALIZATION (Must be first)
// ============================================================================
initSentry(app);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Body parsing (except for webhooks which need raw body)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
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

// Health check with database connectivity
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    const { prisma } = await import('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: 'WCAG AI Platform API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected'
    });
  }
});

// API routes
app.use('/api/drafts', draftsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/sla', slaRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/webhooks', webhooksRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'WCAG AI Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      drafts: '/api/drafts',
      violations: '/api/violations',
      clients: '/api/clients',
      sla: '/api/sla',
      reports: '/api/reports',
      proposals: '/api/proposals',
      webhooks: '/api/webhooks',
    },
    documentation: 'https://github.com/aaj441/wcag-ai-platform',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Sentry error handler (must be before other error handlers)
addSentryErrorHandler(app);

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

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏛️  WCAG AI Platform API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Base: http://localhost:${PORT}/api`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

export default app;
