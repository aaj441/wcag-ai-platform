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
import clientsRouter from './routes/clients';
import slaRouter from './routes/sla';
import reportsRouter from './routes/reports';
import proposalsRouter from './routes/proposals';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
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

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
    });
  },
});

// Stricter rate limiting for mutation endpoints
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 mutations per minute
  skipSuccessfulRequests: false,
});

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
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

// API routes
app.use('/api/drafts', draftsRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/sla', slaRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/proposals', proposalsRouter);

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
