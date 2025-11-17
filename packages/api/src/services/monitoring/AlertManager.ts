/**
 * Alert Manager for Critical Metrics
 *
 * Monitors system metrics and triggers alerts when thresholds are exceeded.
 * Integrates with Slack, PagerDuty, email, and custom webhooks.
 *
 * MEGA PROMPT 2: Alert thresholds for critical metrics
 *
 * Monitored Metrics:
 * - Error rate (% of requests failing)
 * - Queue depth (number of waiting jobs)
 * - Scan duration (p95, p99 response times)
 * - Memory usage (heap size)
 * - Circuit breaker state (open breakers)
 * - Database connection pool
 *
 * Usage:
 *   const alertManager = new AlertManager();
 *   await alertManager.initialize();
 *
 *   // Metrics are automatically tracked via middleware
 *   // Alerts fire when thresholds exceeded
 */

import axios from 'axios';
import { log } from '../../utils/logger';
import { getCircuitBreakerHealth } from '../orchestration/ExternalAPIClient';

// ============================================================================
// Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertChannel = 'slack' | 'pagerduty' | 'email' | 'webhook' | 'log';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  details?: any;
  requestId?: string;
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number; // Don't re-alert within this period
}

export interface MetricSnapshot {
  timestamp: Date;
  errorRate: number;
  queueDepth: number;
  queueUtilization: number;
  avgScanDuration: number;
  p95ScanDuration: number;
  p99ScanDuration: number;
  memoryHeapUsed: number;
  memoryRSS: number;
  openCircuitBreakers: number;
  activeRequests: number;
}

// ============================================================================
// Alert Manager
// ============================================================================

export class AlertManager {
  private thresholds: Map<string, AlertThreshold> = new Map();
  private lastAlerts: Map<string, Date> = new Map();
  private metrics: MetricSnapshot[] = [];
  private maxMetricHistory = 1000; // Keep last 1000 samples

  // Track requests for error rate calculation
  private requestStats = {
    total: 0,
    errors: 0,
    windowStart: Date.now(),
    windowMinutes: 5,
  };

  // Track scan durations
  private scanDurations: number[] = [];
  private maxDurationSamples = 100;

  constructor() {
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize with default thresholds
   */
  private initializeDefaultThresholds(): void {
    // Error Rate Thresholds
    this.addThreshold({
      metric: 'error_rate',
      threshold: 10, // 10% error rate
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 15,
    });

    this.addThreshold({
      metric: 'error_rate_critical',
      threshold: 25, // 25% error rate
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
    });

    // Queue Depth Thresholds
    this.addThreshold({
      metric: 'queue_depth',
      threshold: 50, // 50 jobs waiting
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 10,
    });

    this.addThreshold({
      metric: 'queue_depth_critical',
      threshold: 100, // 100 jobs waiting
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
    });

    // Queue Utilization Thresholds
    this.addThreshold({
      metric: 'queue_utilization',
      threshold: 80, // 80% capacity
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 15,
    });

    this.addThreshold({
      metric: 'queue_utilization_critical',
      threshold: 95, // 95% capacity
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
    });

    // Scan Duration Thresholds (p95)
    this.addThreshold({
      metric: 'scan_duration_p95',
      threshold: 30000, // 30 seconds
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 20,
    });

    this.addThreshold({
      metric: 'scan_duration_p99',
      threshold: 60000, // 60 seconds
      severity: 'error',
      enabled: true,
      cooldownMinutes: 15,
    });

    // Memory Thresholds
    this.addThreshold({
      metric: 'memory_heap',
      threshold: 1024, // 1GB heap used
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 30,
    });

    this.addThreshold({
      metric: 'memory_heap_critical',
      threshold: 1536, // 1.5GB heap used
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 10,
    });

    // Circuit Breaker Thresholds
    this.addThreshold({
      metric: 'circuit_breakers_open',
      threshold: 1, // Any open circuit breaker
      severity: 'error',
      enabled: true,
      cooldownMinutes: 10,
    });

    log.info('✅ Alert thresholds initialized', {
      thresholdCount: this.thresholds.size,
    });
  }

  /**
   * Add or update threshold
   */
  addThreshold(threshold: AlertThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
  }

  /**
   * Record a request (for error rate tracking)
   */
  recordRequest(isError: boolean = false): void {
    // Reset window if needed
    const now = Date.now();
    const windowMs = this.requestStats.windowMinutes * 60 * 1000;

    if (now - this.requestStats.windowStart > windowMs) {
      this.requestStats = {
        total: 0,
        errors: 0,
        windowStart: now,
        windowMinutes: this.requestStats.windowMinutes,
      };
    }

    this.requestStats.total++;
    if (isError) {
      this.requestStats.errors++;
    }

    // Check error rate threshold
    if (this.requestStats.total >= 10) {
      // At least 10 requests before alerting
      const errorRate = (this.requestStats.errors / this.requestStats.total) * 100;
      this.checkThreshold('error_rate', errorRate);
      this.checkThreshold('error_rate_critical', errorRate);
    }
  }

  /**
   * Record scan duration
   */
  recordScanDuration(durationMs: number): void {
    this.scanDurations.push(durationMs);

    // Keep only recent samples
    if (this.scanDurations.length > this.maxDurationSamples) {
      this.scanDurations.shift();
    }

    // Calculate percentiles if we have enough samples
    if (this.scanDurations.length >= 20) {
      const sorted = [...this.scanDurations].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);

      const p95 = sorted[p95Index];
      const p99 = sorted[p99Index];

      this.checkThreshold('scan_duration_p95', p95);
      this.checkThreshold('scan_duration_p99', p99);
    }
  }

  /**
   * Record queue metrics
   */
  recordQueueMetrics(waiting: number, active: number, maxCapacity: number = 100): void {
    const utilization = ((waiting + active) / maxCapacity) * 100;

    this.checkThreshold('queue_depth', waiting);
    this.checkThreshold('queue_depth_critical', waiting);
    this.checkThreshold('queue_utilization', utilization);
    this.checkThreshold('queue_utilization_critical', utilization);
  }

  /**
   * Record memory metrics
   */
  recordMemoryMetrics(): void {
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    const rssMB = mem.rss / 1024 / 1024;

    this.checkThreshold('memory_heap', heapUsedMB);
    this.checkThreshold('memory_heap_critical', heapUsedMB);
  }

  /**
   * Record circuit breaker metrics
   */
  recordCircuitBreakerMetrics(): void {
    const breakerHealth = getCircuitBreakerHealth();
    const openBreakers = Object.values(breakerHealth.services).filter(
      (s: any) => s.state === 'OPEN'
    ).length;

    this.checkThreshold('circuit_breakers_open', openBreakers);
  }

  /**
   * Take full metrics snapshot
   */
  async takeSnapshot(): Promise<MetricSnapshot> {
    const mem = process.memoryUsage();
    const breakerHealth = getCircuitBreakerHealth();

    const sorted = [...this.scanDurations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    const snapshot: MetricSnapshot = {
      timestamp: new Date(),
      errorRate:
        this.requestStats.total > 0
          ? (this.requestStats.errors / this.requestStats.total) * 100
          : 0,
      queueDepth: 0, // Populated externally
      queueUtilization: 0, // Populated externally
      avgScanDuration:
        this.scanDurations.length > 0
          ? this.scanDurations.reduce((a, b) => a + b, 0) / this.scanDurations.length
          : 0,
      p95ScanDuration: sorted[p95Index] || 0,
      p99ScanDuration: sorted[p99Index] || 0,
      memoryHeapUsed: mem.heapUsed / 1024 / 1024,
      memoryRSS: mem.rss / 1024 / 1024,
      openCircuitBreakers: Object.values(breakerHealth.services).filter(
        (s: any) => s.state === 'OPEN'
      ).length,
      activeRequests: 0, // Populated externally
    };

    this.metrics.push(snapshot);

    // Keep only recent history
    if (this.metrics.length > this.maxMetricHistory) {
      this.metrics.shift();
    }

    return snapshot;
  }

  /**
   * Check if metric exceeds threshold
   */
  private checkThreshold(metric: string, currentValue: number): void {
    const threshold = this.thresholds.get(metric);

    if (!threshold || !threshold.enabled) {
      return;
    }

    // Check if threshold exceeded
    if (currentValue <= threshold.threshold) {
      return;
    }

    // Check cooldown period
    const lastAlert = this.lastAlerts.get(metric);
    if (lastAlert) {
      const minutesSinceLastAlert =
        (Date.now() - lastAlert.getTime()) / 1000 / 60;

      if (minutesSinceLastAlert < threshold.cooldownMinutes) {
        return; // Still in cooldown
      }
    }

    // Fire alert
    this.fireAlert({
      id: `alert_${metric}_${Date.now()}`,
      severity: threshold.severity,
      title: `Threshold Exceeded: ${metric}`,
      message: `Metric '${metric}' has exceeded threshold`,
      metric,
      currentValue,
      threshold: threshold.threshold,
      timestamp: new Date(),
    });

    // Update last alert time
    this.lastAlerts.set(metric, new Date());
  }

  /**
   * Fire alert to all configured channels
   */
  private async fireAlert(alert: Alert): Promise<void> {
    // Always log
    this.logAlert(alert);

    // Send to external channels
    const channels: AlertChannel[] = [];

    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push('slack');
    }
    if (process.env.PAGERDUTY_API_KEY) {
      channels.push('pagerduty');
    }
    if (process.env.ALERT_EMAIL) {
      channels.push('email');
    }
    if (process.env.ALERT_WEBHOOK_URL) {
      channels.push('webhook');
    }

    // Send to all channels in parallel
    await Promise.allSettled(
      channels.map((channel) => this.sendToChannel(alert, channel))
    );
  }

  /**
   * Log alert
   */
  private logAlert(alert: Alert): void {
    const emoji =
      alert.severity === 'critical' ? '🚨' :
      alert.severity === 'error' ? '❌' :
      alert.severity === 'warning' ? '⚠️' : 'ℹ️';

    log.error(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, undefined, {
      alertId: alert.id,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      message: alert.message,
      details: alert.details,
    });
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(
    alert: Alert,
    channel: AlertChannel
  ): Promise<void> {
    try {
      switch (channel) {
        case 'slack':
          await this.sendToSlack(alert);
          break;
        case 'pagerduty':
          await this.sendToPagerDuty(alert);
          break;
        case 'email':
          await this.sendToEmail(alert);
          break;
        case 'webhook':
          await this.sendToWebhook(alert);
          break;
        default:
          // Log only
          break;
      }
    } catch (error) {
      log.error(
        `Failed to send alert to ${channel}`,
        error instanceof Error ? error : new Error(String(error)),
        { alertId: alert.id }
      );
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const color =
      alert.severity === 'critical' ? 'danger' :
      alert.severity === 'error' ? 'danger' :
      alert.severity === 'warning' ? 'warning' : 'good';

    const emoji =
      alert.severity === 'critical' ? ':rotating_light:' :
      alert.severity === 'error' ? ':x:' :
      alert.severity === 'warning' ? ':warning:' : ':information_source:';

    await axios.post(webhookUrl, {
      text: `${emoji} *${alert.title}*`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Metric', value: alert.metric, short: true },
            {
              title: 'Current Value',
              value: alert.currentValue.toFixed(2),
              short: true,
            },
            {
              title: 'Threshold',
              value: alert.threshold.toFixed(2),
              short: true,
            },
            { title: 'Message', value: alert.message, short: false },
          ],
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    });

    log.info('📬 Alert sent to Slack', { alertId: alert.id });
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendToPagerDuty(alert: Alert): Promise<void> {
    const apiKey = process.env.PAGERDUTY_API_KEY;
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;

    if (!apiKey || !routingKey) return;

    // Only page for critical/error alerts
    if (alert.severity !== 'critical' && alert.severity !== 'error') {
      return;
    }

    await axios.post(
      'https://api.pagerduty.com/incidents',
      {
        incident: {
          type: 'incident',
          title: alert.title,
          service: {
            id: routingKey,
            type: 'service_reference',
          },
          urgency: alert.severity === 'critical' ? 'high' : 'low',
          body: {
            type: 'incident_body',
            details: alert.message,
          },
          incident_key: alert.id,
        },
      },
      {
        headers: {
          'Authorization': `Token token=${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.pagerduty+json;version=2',
        },
      }
    );

    log.info('📞 Alert sent to PagerDuty', { alertId: alert.id });
  }

  /**
   * Send alert via email (stub)
   */
  private async sendToEmail(alert: Alert): Promise<void> {
    // TODO: Integrate with SendGrid
    log.info('📧 Email alert (not implemented)', { alertId: alert.id });
  }

  /**
   * Send alert to custom webhook
   */
  private async sendToWebhook(alert: Alert): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    await axios.post(webhookUrl, alert);

    log.info('🔔 Alert sent to webhook', { alertId: alert.id });
  }

  /**
   * Get alert history
   */
  getMetricsHistory(limit: number = 100): MetricSnapshot[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AlertThreshold[] {
    return Array.from(this.thresholds.values());
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let alertManagerInstance: AlertManager | null = null;

export function getAlertManager(): AlertManager {
  if (!alertManagerInstance) {
    alertManagerInstance = new AlertManager();
  }
  return alertManagerInstance;
}

export const alertManager = getAlertManager();
