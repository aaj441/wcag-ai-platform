/**
 * Prometheus Metrics Collection
 *
 * Custom metrics for WCAG AI Platform monitoring
 */

import * as promClient from 'prom-client';

// Create a Registry
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'wcagai_',
});

// ========================================
// Custom Metrics
// ========================================

/**
 * WCAG Scan Duration
 * Tracks how long scans take to complete
 */
export const scanDuration = new promClient.Histogram({
  name: 'wcagai_scan_duration_seconds',
  help: 'Duration of WCAG accessibility scans',
  labelNames: ['status', 'url_host', 'wcag_level'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // seconds
  registers: [register],
});

/**
 * Browser Pool Utilization
 * Tracks browser pool usage percentage
 */
export const browserPoolUtilization = new promClient.Gauge({
  name: 'wcagai_browser_pool_utilization',
  help: 'Browser pool utilization percentage (0-100)',
  registers: [register],
});

/**
 * Active Browser Instances
 */
export const activeBrowsers = new promClient.Gauge({
  name: 'wcagai_active_browsers',
  help: 'Number of active browser instances',
  registers: [register],
});

/**
 * AI Token Usage
 * Tracks OpenAI token consumption
 */
export const aiTokenUsage = new promClient.Counter({
  name: 'wcagai_ai_tokens_total',
  help: 'Total AI tokens consumed',
  labelNames: ['model', 'operation'] as const,
  registers: [register],
});

/**
 * AI Request Cost
 * Tracks estimated cost of AI requests
 */
export const aiRequestCost = new promClient.Counter({
  name: 'wcagai_ai_cost_usd_total',
  help: 'Total estimated cost of AI requests in USD',
  labelNames: ['model'] as const,
  registers: [register],
});

/**
 * Scan Success Rate
 */
export const scanSuccess = new promClient.Counter({
  name: 'wcagai_scans_total',
  help: 'Total number of scans',
  labelNames: ['status', 'error_type'] as const,
  registers: [register],
});

/**
 * WCAG Violations Detected
 */
export const wcagViolations = new promClient.Counter({
  name: 'wcagai_violations_total',
  help: 'Total WCAG violations detected',
  labelNames: ['level', 'principle', 'guideline'] as const,
  registers: [register],
});

/**
 * API Request Duration
 */
export const httpRequestDuration = new promClient.Histogram({
  name: 'wcagai_http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Queue Length
 */
export const queueLength = new promClient.Gauge({
  name: 'wcagai_queue_length',
  help: 'Number of scans waiting in queue',
  labelNames: ['priority'] as const,
  registers: [register],
});

/**
 * AI Model Drift Detection
 */
export const aiModelDrift = new promClient.Histogram({
  name: 'wcagai_ai_model_drift',
  help: 'Drift score between primary and shadow AI models',
  labelNames: ['primary_model', 'shadow_model'] as const,
  buckets: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0],
  registers: [register],
});

/**
 * User Feedback on AI Results
 */
export const userFeedback = new promClient.Counter({
  name: 'wcagai_user_feedback_total',
  help: 'User feedback on AI-generated results',
  labelNames: ['model_version', 'feedback_type', 'dismissed'] as const,
  registers: [register],
});

/**
 * Database Connection Pool
 */
export const dbConnectionPool = new promClient.Gauge({
  name: 'wcagai_db_connections',
  help: 'Database connection pool status',
  labelNames: ['state'] as const, // 'active', 'idle', 'total'
  registers: [register],
});

// ========================================
// Helper Functions
// ========================================

/**
 * Record scan metrics
 */
export function recordScan(
  durationSeconds: number,
  status: 'success' | 'error' | 'timeout',
  urlHost: string,
  wcagLevel: string = 'AA'
) {
  scanDuration.observe({ status, url_host: urlHost, wcag_level: wcagLevel }, durationSeconds);
  scanSuccess.inc({ status, error_type: status === 'error' ? 'unknown' : 'none' });
}

/**
 * Record AI usage
 */
export function recordAIUsage(
  model: string,
  tokens: number,
  operation: 'scan' | 'consultation' | 'summary'
) {
  aiTokenUsage.inc({ model, operation }, tokens);

  // Calculate cost (approximate rates as of 2024)
  const costPer1kTokens: Record<string, number> = {
    'gpt-4-turbo': 0.01,
    'gpt-4': 0.03,
    'gpt-4o': 0.005,
    'gpt-3.5-turbo': 0.002,
  };

  const rate = costPer1kTokens[model] || 0.01;
  const cost = (tokens / 1000) * rate;
  aiRequestCost.inc({ model }, cost);
}

/**
 * Record HTTP request
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
) {
  httpRequestDuration.observe(
    { method, route, status_code: statusCode.toString() },
    durationSeconds
  );
}

/**
 * Update browser pool metrics
 */
export function updateBrowserPool(active: number, total: number) {
  activeBrowsers.set(active);
  const utilization = total > 0 ? (active / total) * 100 : 0;
  browserPoolUtilization.set(utilization);
}

/**
 * Record WCAG violation
 */
export function recordViolation(
  level: 'A' | 'AA' | 'AAA',
  principle: string,
  guideline: string
) {
  wcagViolations.inc({ level, principle, guideline });
}

/**
 * Update queue metrics
 */
export function updateQueue(length: number, priority: 'high' | 'normal' | 'low') {
  queueLength.set({ priority }, length);
}

/**
 * Record model drift
 */
export function recordModelDrift(
  primaryModel: string,
  shadowModel: string,
  driftScore: number
) {
  aiModelDrift.observe({ primary_model: primaryModel, shadow_model: shadowModel }, driftScore);
}

/**
 * Record user feedback
 */
export function recordUserFeedback(
  modelVersion: string,
  feedbackType: 'helpful' | 'not_helpful' | 'dismissed',
  dismissed: boolean
) {
  userFeedback.inc({
    model_version: modelVersion,
    feedback_type: feedbackType,
    dismissed: dismissed.toString(),
  });
}

export default register;
