/**
 * WCAG AI Platform Laboratory - Production Server
 * 
 * Security: ✅ Helmet, CORS, Rate Limiting, Input Sanitization
 * Observability: ✅ Pino Logging, OpenTelemetry Tracing
 * Reliability: ✅ Graceful Shutdown, Health Checks, Error Boundaries
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pino } from 'pino';
import pinoHttp from 'pino-http';
import { config } from './config';
import { healthRouter } from './routes/health';
import { discoveryRouter } from './routes/discovery';
import { scanRouter } from './routes/scan';
import { violationsRouter } from './routes/violations';
import { fixesRouter } from './routes/fixes';
import { initializeTracing } from './instrumentation/tracing';
import { sanitizeInput } from './middleware/sanitization';

// Initialize logger
const logger = pino({
  level: config.logLevel,
  ...(config.logPretty && { transport: { target: 'pino-pretty' } })
});

// Initialize tracing if enabled
if (config.otel.enabled) {
  initializeTracing();
  logger.info('OpenTelemetry tracing initialized');
}

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE (MUST BE FIRST)
// ============================================================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
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
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS - Restrict origins
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', config.security.apiKeyHeader],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// ============================================================================
// REQUEST PROCESSING
// ============================================================================

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with pino
app.use(pinoHttp({ logger }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health checks (no rate limit)
app.use('/health', healthRouter);

// API routes
app.use('/api/discovery', discoveryRouter);
app.use('/api/scan', scanRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/fixes', fixesRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'WCAG AI Platform Laboratory API',
    version: '1.0.0',
    status: 'operational',
    environment: config.nodeEnv,
    endpoints: {
      health: '/health',
      discovery: '/api/discovery',
      scan: '/api/scan',
      violations: '/api/violations',
      fixes: '/api/fixes',
    },
    documentation: 'https://github.com/aaj441/wcag-ai-platform/tree/main/lab',
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn({ path: req.path, method: req.method }, 'Route not found');
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler (NEVER leak stack traces in production)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
// SERVER LIFECYCLE
// ============================================================================

const server = app.listen(config.port, () => {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('🚀 WCAG AI Platform Laboratory API');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`📍 Port: ${config.port}`);
  logger.info(`🌐 Environment: ${config.nodeEnv}`);
  logger.info(`🔒 CORS Origins: ${config.cors.origins.join(', ')}`);
  logger.info(`🔗 Health: http://localhost:${config.port}/health`);
  logger.info(`📚 API: http://localhost:${config.port}/api`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

export default app;
