/**
 * Type-safe configuration with Zod validation
 * Validates all environment variables on startup
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

// Define schema
const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().positive().default(3001),
  
  // CORS
  cors: z.object({
    origins: z.string().transform(str => str.split(',').map(s => s.trim())),
  }),

  // Rate limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().default(900000), // 15 minutes
    maxRequests: z.coerce.number().default(100),
  }),

  // Redis (optional)
  redis: z.object({
    url: z.string().optional(),
    enabled: z.coerce.boolean().default(false),
  }),

  // Security
  security: z.object({
    apiKeyHeader: z.string().default('x-api-key'),
    apiKey: z.string().optional(),
  }),

  // Observability
  otel: z.object({
    enabled: z.coerce.boolean().default(false),
    jaegerEndpoint: z.string().optional(),
  }),

  sentry: z.object({
    dsn: z.string().optional(),
  }),

  // Logging
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  logPretty: z.coerce.boolean().default(false),

  // External APIs
  serpApi: z.object({
    key: z.string().optional(),
  }),
});

// Parse and validate
const env = {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  
  cors: {
    origins: process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  },

  redis: {
    url: process.env.REDIS_URL,
    enabled: process.env.REDIS_ENABLED,
  },

  security: {
    apiKeyHeader: process.env.API_KEY_HEADER,
    apiKey: process.env.API_KEY,
  },

  otel: {
    enabled: process.env.OTEL_ENABLED,
    jaegerEndpoint: process.env.JAEGER_ENDPOINT,
  },

  sentry: {
    dsn: process.env.SENTRY_DSN,
  },

  logLevel: process.env.LOG_LEVEL,
  logPretty: process.env.LOG_PRETTY,

  serpApi: {
    key: process.env.SERPAPI_KEY,
  },
};

// Validate and export
export const config = configSchema.parse(env);

// Log configuration summary (without secrets)
export const getConfigSummary = () => ({
  environment: config.nodeEnv,
  port: config.port,
  corsEnabled: config.cors.origins.length > 0,
  redisEnabled: config.redis.enabled,
  otelEnabled: config.otel.enabled,
  sentryConfigured: !!config.sentry.dsn,
  apiKeyRequired: !!config.security.apiKey,
});
