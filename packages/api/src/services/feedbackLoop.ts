/**
 * AI Drift Feedback Loop
 *
 * Auto-promote shadow models based on user dismissals and A/B test results
 */

import { log } from '../utils/logger';
import { aiRouter } from './aiRouter';
import { recordUserFeedback } from '../utils/metrics';

interface UserFeedback {
  scanId: string;
  userId: string;
  violationId?: string;
  dismissed: boolean;
  reason?: string;
  modelVersion: string;
  timestamp: Date;
}

interface ModelMetrics {
  modelVersion: string;
  totalScans: number;
  dismissalRate: number;
  averageConfidence: number;
  averageProcessingTime: number;
  userSatisfaction: number;
}

interface ABTestResult {
  primaryModel: string;
  shadowModel: string;
  primaryMetrics: ModelMetrics;
  shadowMetrics: ModelMetrics;
  statisticalSignificance: boolean;
  recommendation: 'keep_primary' | 'promote_shadow' | 'needs_more_data';
  confidence: number;
}

class FeedbackLoop {
  private driftThreshold: number;
  private minSampleSize: number;

  constructor() {
    this.driftThreshold = parseFloat(process.env.DRIFT_THRESHOLD || '0.20');
    this.minSampleSize = parseInt(process.env.MIN_SAMPLE_SIZE || '100');

    log.info('Feedback loop initialized', {
      driftThreshold: this.driftThreshold,
      minSampleSize: this.minSampleSize,
    });
  }

  /**
   * Capture user dismissal feedback
   */
  async captureDismissal(
    scanId: string,
    userId: string,
    violationId: string | undefined,
    dismissed: boolean,
    reason?: string
  ): Promise<void> {
    // TODO: Get scan from database
    const scan = await this.getScan(scanId);

    const feedback: UserFeedback = {
      scanId,
      userId,
      violationId,
      dismissed,
      reason,
      modelVersion: scan.modelVersion,
      timestamp: new Date(),
    };

    // Store feedback
    await this.storeFeedback(feedback);

    // Update model metrics
    await this.updateModelMetrics(scan.modelVersion);

    // Record Prometheus metrics
    recordUserFeedback(
      scan.modelVersion,
      dismissed ? 'dismissed' : 'helpful',
      dismissed
    );

    // Send to LaunchDarkly for experimentation tracking
    await aiRouter.logFeedback(scanId, userId, {
      modelVersion: scan.modelVersion,
      feedbackType: dismissed ? 'dismissed' : 'helpful',
      dismissed,
      reason,
      violationId,
    });

    log.info('Feedback captured', {
      scanId,
      userId,
      modelVersion: scan.modelVersion,
      dismissed,
    });
  }

  /**
   * Update model performance metrics
   */
  private async updateModelMetrics(modelVersion: string): Promise<void> {
    const metrics = await this.calculateModelMetrics(modelVersion);

    log.debug('Model metrics updated', {
      modelVersion,
      dismissalRate: metrics.dismissalRate,
      totalScans: metrics.totalScans,
    });

    // Check if drift threshold exceeded
    if (metrics.dismissalRate > this.driftThreshold && metrics.totalScans >= this.minSampleSize) {
      await this.handleDriftDetected(modelVersion, metrics);
    }
  }

  /**
   * Calculate metrics for a specific model version
   */
  private async calculateModelMetrics(modelVersion: string): Promise<ModelMetrics> {
    // TODO: Query database for real metrics
    // Mock implementation
    return {
      modelVersion,
      totalScans: 0,
      dismissalRate: 0,
      averageConfidence: 0.95,
      averageProcessingTime: 2500,
      userSatisfaction: 0.85,
    };
  }

  /**
   * Handle detected model drift
   */
  private async handleDriftDetected(modelVersion: string, metrics: ModelMetrics): Promise<void> {
    log.warn('Model drift detected!', {
      modelVersion,
      dismissalRate: metrics.dismissalRate,
      threshold: this.driftThreshold,
    });

    // Get current shadow model
    const shadowModel = process.env.AI_SHADOW_MODEL || 'gpt-4o-2024-11-20';

    // Auto-promote shadow model to primary
    await this.promoteModel(shadowModel, modelVersion);

    // Send alert
    await this.sendDriftAlert(modelVersion, shadowModel, metrics);
  }

  /**
   * Promote shadow model to primary
   */
  private async promoteModel(newPrimaryModel: string, oldPrimaryModel: string): Promise<void> {
    log.info('Promoting model', {
      from: oldPrimaryModel,
      to: newPrimaryModel,
    });

    // TODO: Update LaunchDarkly feature flags
    // await ldClient.updateFeatureFlag('ai-model-primary', { value: newPrimaryModel });
    // await ldClient.updateFeatureFlag('ai-model-shadow', { value: oldPrimaryModel });

    // Audit log
    log.auditLog('model_promoted', 'system', 'feedback-loop', {
      oldPrimaryModel,
      newPrimaryModel,
      reason: 'drift_threshold_exceeded',
    });
  }

  /**
   * Send drift alert to team
   */
  private async sendDriftAlert(
    oldModel: string,
    newModel: string,
    metrics: ModelMetrics
  ): Promise<void> {
    const slackWebhook = process.env.SLACK_WEBHOOK;
    if (!slackWebhook) {
      return;
    }

    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🚨 AI Model Drift Detected - Auto-Promotion Triggered',
          attachments: [
            {
              color: 'warning',
              fields: [
                {
                  title: 'Old Model',
                  value: oldModel,
                  short: true,
                },
                {
                  title: 'New Model',
                  value: newModel,
                  short: true,
                },
                {
                  title: 'Dismissal Rate',
                  value: `${(metrics.dismissalRate * 100).toFixed(1)}%`,
                  short: true,
                },
                {
                  title: 'Threshold',
                  value: `${(this.driftThreshold * 100).toFixed(0)}%`,
                  short: true,
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      log.error('Failed to send drift alert', error as Error);
    }
  }

  /**
   * Get A/B test results comparing primary and shadow models
   */
  async getABResults(): Promise<ABTestResult> {
    const primaryModel = process.env.AI_PRIMARY_MODEL || 'gpt-4-turbo-2024-04-09';
    const shadowModel = process.env.AI_SHADOW_MODEL || 'gpt-4o-2024-11-20';

    const primaryMetrics = await this.calculateModelMetrics(primaryModel);
    const shadowMetrics = await this.calculateModelMetrics(shadowModel);

    // Calculate statistical significance
    const significance = this.calculatePValue(primaryMetrics, shadowMetrics);

    // Determine recommendation
    let recommendation: 'keep_primary' | 'promote_shadow' | 'needs_more_data' = 'needs_more_data';
    let confidence = 0;

    if (primaryMetrics.totalScans < this.minSampleSize || shadowMetrics.totalScans < this.minSampleSize) {
      recommendation = 'needs_more_data';
      confidence = 0.5;
    } else if (significance && shadowMetrics.dismissalRate < primaryMetrics.dismissalRate) {
      recommendation = 'promote_shadow';
      confidence = 0.95;
    } else {
      recommendation = 'keep_primary';
      confidence = 0.8;
    }

    return {
      primaryModel,
      shadowModel,
      primaryMetrics,
      shadowMetrics,
      statisticalSignificance: significance,
      recommendation,
      confidence,
    };
  }

  /**
   * Calculate p-value for statistical significance
   */
  private calculatePValue(metrics1: ModelMetrics, metrics2: ModelMetrics): boolean {
    // Simplified t-test
    // Returns true if p-value < 0.05 (statistically significant)

    if (metrics1.totalScans < this.minSampleSize || metrics2.totalScans < this.minSampleSize) {
      return false;
    }

    // TODO: Implement proper t-test using statistics library
    // For now, use simple threshold
    const difference = Math.abs(metrics1.dismissalRate - metrics2.dismissalRate);
    return difference > 0.05; // 5% difference is significant
  }

  /**
   * Generate canary analysis report
   */
  async generateCanaryReport(): Promise<string> {
    const abResults = await this.getABResults();

    const report = `
# Canary Analysis Report

**Generated:** ${new Date().toISOString()}

## Models Under Test
- **Primary:** ${abResults.primaryModel}
- **Shadow:** ${abResults.shadowModel}

## Metrics Comparison

| Metric | Primary | Shadow | Better |
|--------|---------|--------|--------|
| Dismissal Rate | ${(abResults.primaryMetrics.dismissalRate * 100).toFixed(1)}% | ${(abResults.shadowMetrics.dismissalRate * 100).toFixed(1)}% | ${abResults.shadowMetrics.dismissalRate < abResults.primaryMetrics.dismissalRate ? '✅ Shadow' : 'Primary'} |
| Avg Confidence | ${(abResults.primaryMetrics.averageConfidence * 100).toFixed(1)}% | ${(abResults.shadowMetrics.averageConfidence * 100).toFixed(1)}% | ${abResults.shadowMetrics.averageConfidence > abResults.primaryMetrics.averageConfidence ? '✅ Shadow' : 'Primary'} |
| Avg Processing Time | ${abResults.primaryMetrics.averageProcessingTime}ms | ${abResults.shadowMetrics.averageProcessingTime}ms | ${abResults.shadowMetrics.averageProcessingTime < abResults.primaryMetrics.averageProcessingTime ? '✅ Shadow' : 'Primary'} |
| Total Scans | ${abResults.primaryMetrics.totalScans} | ${abResults.shadowMetrics.totalScans} | - |

## Statistical Significance
${abResults.statisticalSignificance ? '✅ Results are statistically significant (p < 0.05)' : '⚠️ More data needed for statistical significance'}

## Recommendation
**${abResults.recommendation.toUpperCase()}** (Confidence: ${(abResults.confidence * 100).toFixed(0)}%)

${abResults.recommendation === 'promote_shadow' ? '### Action Required\n- Promote shadow model to primary\n- Archive old primary model\n- Monitor for 24 hours post-promotion' : ''}
${abResults.recommendation === 'needs_more_data' ? '### Next Steps\n- Continue collecting data\n- Re-evaluate when sample size reaches ' + this.minSampleSize : ''}

---
Generated by feedbackLoop.ts
    `.trim();

    return report;
  }

  /**
   * Helper: Get scan from database
   */
  private async getScan(scanId: string): Promise<any> {
    // TODO: Query database
    return {
      scanId,
      modelVersion: 'gpt-4-turbo-2024-04-09',
      violations: [],
    };
  }

  /**
   * Helper: Store feedback
   */
  private async storeFeedback(feedback: UserFeedback): Promise<void> {
    // TODO: Store in database
    log.debug('Storing feedback', { scanId: feedback.scanId });
  }
}

// Singleton instance
export const feedbackLoop = new FeedbackLoop();
export default feedbackLoop;
