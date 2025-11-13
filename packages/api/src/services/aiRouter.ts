/**
 * AI Model Router with Feature Flags
 *
 * Dynamic model selection, shadow deployments, and A/B testing
 */

import LaunchDarkly from 'launchdarkly-node-server-sdk';
import { log } from '../utils/logger';
import { recordModelDrift, recordUserFeedback } from '../utils/metrics';

interface ModelConfig {
  model: string;
  shadowModel: string | null;
  shadowEnabled: boolean;
  temperature: number;
  maxTokens: number;
}

interface ScanContext {
  scanId: string;
  userId: string;
  url: string;
  wcagLevel: string;
}

class AIRouter {
  private ldClient: LaunchDarkly.LDClient | null = null;
  private initPromise: Promise<void>;
  private ready = false;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;

    if (!sdkKey) {
      log.warn('LaunchDarkly SDK key not configured, using defaults');
      this.ready = true;
      return;
    }

    try {
      this.ldClient = LaunchDarkly.init(sdkKey);

      await this.ldClient.waitForInitialization();
      this.ready = true;
      log.info('LaunchDarkly initialized successfully');
    } catch (error) {
      log.error('Failed to initialize LaunchDarkly', error as Error);
      this.ready = true; // Continue with defaults
    }
  }

  /**
   * Get model configuration for a scan
   */
  async getModelConfig(context: ScanContext): Promise<ModelConfig> {
    await this.initPromise;

    if (!this.ldClient) {
      return this.getDefaultConfig();
    }

    const ldContext: LaunchDarkly.LDContext = {
      kind: 'user',
      key: context.userId,
      custom: {
        scanId: context.scanId,
        urlHost: new URL(context.url).hostname,
        wcagLevel: context.wcagLevel,
      },
    };

    try {
      // Get primary model
      const primaryModel = await this.ldClient.variation(
        'ai-model-primary',
        ldContext,
        'gpt-4-turbo-2024-04-09'
      );

      // Check if shadow deployment is enabled
      const shadowEnabled = await this.ldClient.variation(
        'ai-shadow-deployment-enabled',
        ldContext,
        false
      );

      let shadowModel = null;
      if (shadowEnabled) {
        shadowModel = await this.ldClient.variation(
          'ai-model-shadow',
          ldContext,
          'gpt-4o-2024-11-20'
        );
      }

      // Get model parameters
      const temperature = await this.ldClient.variation(
        'ai-model-temperature',
        ldContext,
        0.3
      );

      const maxTokens = await this.ldClient.variation(
        'ai-model-max-tokens',
        ldContext,
        2000
      );

      log.info('Model configuration retrieved', {
        scanId: context.scanId,
        primaryModel,
        shadowModel,
        shadowEnabled,
      });

      return {
        model: primaryModel,
        shadowModel,
        shadowEnabled,
        temperature,
        maxTokens,
      };
    } catch (error) {
      log.error('Error getting model config from LaunchDarkly', error as Error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration (fallback)
   */
  private getDefaultConfig(): ModelConfig {
    return {
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-2024-04-09',
      shadowModel: null,
      shadowEnabled: false,
      temperature: 0.3,
      maxTokens: 2000,
    };
  }

  /**
   * Compare results from primary and shadow models
   */
  async compareResults(
    primaryResult: any,
    shadowResult: any,
    context: ScanContext
  ): Promise<number> {
    // Calculate drift score (0 = identical, 1 = completely different)
    const driftScore = this.calculateDrift(primaryResult, shadowResult);

    // Record metrics
    recordModelDrift(
      primaryResult.modelVersion || 'unknown',
      shadowResult.modelVersion || 'unknown',
      driftScore
    );

    // Log significant drift
    if (driftScore > 0.3) {
      log.warn('Significant model drift detected', {
        scanId: context.scanId,
        driftScore,
        primaryModel: primaryResult.modelVersion,
        shadowModel: shadowResult.modelVersion,
      });
    }

    return driftScore;
  }

  /**
   * Calculate drift between two results
   */
  private calculateDrift(primary: any, shadow: any): number {
    // Simple implementation: compare violation counts
    const primaryCount = primary.violations?.length || 0;
    const shadowCount = shadow.violations?.length || 0;

    if (primaryCount === 0 && shadowCount === 0) {
      return 0;
    }

    const maxCount = Math.max(primaryCount, shadowCount);
    const diff = Math.abs(primaryCount - shadowCount);

    return diff / maxCount;
  }

  /**
   * Log user feedback on AI results
   */
  async logFeedback(
    scanId: string,
    userId: string,
    feedback: {
      modelVersion: string;
      feedbackType: 'helpful' | 'not_helpful' | 'dismissed';
      dismissed: boolean;
      reason?: string;
      violationId?: string;
    }
  ): Promise<void> {
    // Record metrics
    recordUserFeedback(feedback.modelVersion, feedback.feedbackType, feedback.dismissed);

    // Log for analysis
    log.auditLog('ai_feedback', userId, scanId, feedback);

    // Send to LaunchDarkly for experimentation tracking
    if (this.ldClient) {
      try {
        const ldContext: LaunchDarkly.LDContext = {
          kind: 'user',
          key: userId,
        };

        await this.ldClient.track('ai-feedback', ldContext, {
          scanId,
          ...feedback,
        });
      } catch (error) {
        log.error('Error sending feedback to LaunchDarkly', error as Error);
      }
    }
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(featureKey: string, userId: string): Promise<boolean> {
    await this.initPromise;

    if (!this.ldClient) {
      return false;
    }

    try {
      const ldContext: LaunchDarkly.LDContext = {
        kind: 'user',
        key: userId,
      };

      return await this.ldClient.variation(featureKey, ldContext, false);
    } catch (error) {
      log.error('Error checking feature flag', error as Error, { featureKey });
      return false;
    }
  }

  /**
   * Gracefully close LaunchDarkly connection
   */
  async close(): Promise<void> {
    if (this.ldClient) {
      await this.ldClient.close();
      log.info('LaunchDarkly connection closed');
    }
  }
}

export const aiRouter = new AIRouter();
export default aiRouter;
