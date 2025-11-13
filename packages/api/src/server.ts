/**
 * WCAG AI Platform API Server
 * Production-ready Express REST API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import draftsRouter from './routes/drafts';
import violationsRouter from './routes/violations';
import clientsRouter from './routes/clients';
import slaRouter from './routes/sla';
import reportsRouter from './routes/reports';
import proposalsRouter from './routes/proposals';
import targetDemographicsRouter from './routes/targetDemographics';
import billingRouter from './routes/billing';
import healthRouter from './routes/health';
import { initializeSentry, sentryErrorHandler } from './services/monitoring';

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

// API routes
app.use('/api/drafts', draftsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/sla', slaRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/target-demographics', targetDemographicsRouter);
app.use('/api/billing', billingRouter);

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
      targetDemographics: '/api/target-demographics',
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
