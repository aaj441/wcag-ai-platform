import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { authMiddleware } from '@/middleware/auth';
import { setupWebSocket } from '@/utils/websocket';
import { connectRedis } from '@/utils/redis';
import { sendEmail } from '@/utils/email';

// Routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import scanRoutes from '@/routes/scans';
import reportRoutes from '@/routes/reports';
import organizationRoutes from '@/routes/organizations';
import projectRoutes from '@/routes/projects';
import auditRoutes from '@/routes/audit';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wsServer = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, authMiddleware, userRoutes);
app.use(`/api/${API_VERSION}/scans`, authMiddleware, scanRoutes);
app.use(`/api/${API_VERSION}/reports`, authMiddleware, reportRoutes);
app.use(`/api/${API_VERSION}/organizations`, authMiddleware, organizationRoutes);
app.use(`/api/${API_VERSION}/projects`, authMiddleware, projectRoutes);
app.use(`/api/${API_VERSION}/audit`, authMiddleware, auditRoutes);

// Public routes (no auth required)
app.get(`/api/${API_VERSION}/public/wcag-guidelines`, (req, res) => {
  res.json({
    success: true,
    data: {
      wcag: {
        '1.1': {
          title: 'Text Alternatives',
          description: 'Provide text alternatives for any non-text content',
          level: 'A',
        },
        '1.2': {
          title: 'Time-based Media',
          description: 'Provide alternatives for time-based media',
          level: 'A',
        },
        '1.3': {
          title: 'Adaptable',
          description: 'Create content that can be presented in different ways',
          level: 'A',
        },
        '1.4': {
          title: 'Distinguishable',
          description: 'Make it easier for users to see and hear content',
          level: 'A',
        },
        '2.1': {
          title: 'Keyboard Accessible',
          description: 'Make all functionality available from a keyboard',
          level: 'A',
        },
        '2.2': {
          title: 'Enough Time',
          description: 'Provide users enough time to read and use content',
          level: 'A',
        },
        '2.3': {
          title: 'Seizures and Physical Reactions',
          description: 'Do not design content in a way that is known to cause seizures',
          level: 'A',
        },
        '2.4': {
          title: 'Navigable',
          description: 'Provide ways to help users navigate, find content, and determine where they are',
          level: 'A',
        },
        '2.5': {
          title: 'Input Modalities',
          description: 'Make it easier for users to operate functionality through various inputs',
          level: 'A',
        },
        '3.1': {
          title: 'Readable',
          description: 'Make text content readable and understandable',
          level: 'A',
        },
        '3.2': {
          title: 'Predictable',
          description: 'Make web pages appear and operate in predictable ways',
          level: 'A',
        },
        '3.3': {
          title: 'Input Assistance',
          description: 'Help users avoid and correct mistakes',
          level: 'A',
        },
        '4.1': {
          title: 'Compatible',
          description: 'Maximize compatibility with current and future user agents',
          level: 'A',
        },
      },
    },
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Setup WebSocket
setupWebSocket(wsServer);

// Start server
async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Connected to Redis');

    // Test email configuration
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
      try {
        await sendEmail({
          to: 'test@example.com',
          subject: 'Test Email',
          text: 'This is a test email to verify the email configuration.',
        });
        logger.info('Email configuration verified');
      } catch (error) {
        logger.warn('Email configuration test failed:', error);
      }
    }

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API version: ${API_VERSION}`);
      logger.info(`WebSocket server listening on ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();