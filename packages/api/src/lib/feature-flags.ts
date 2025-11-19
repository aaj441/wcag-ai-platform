/**
 * Feature Flag System
 * Enables instant feature toggling without deployment
 * Uses Redis for fast, distributed flag storage
 */

interface FeatureFlagConfig {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;  // 0-100
  allowedUserIds?: string[];
  disabledReason?: string;
}

interface FeatureFlagCache {
  value: FeatureFlagConfig;
  timestamp: number;
}

/**
 * Feature Flags Manager
 * Provides instant feature enable/disable capability
 */
export class FeatureFlags {
  private static cache = new Map<string, FeatureFlagCache>();
  private static readonly CACHE_TTL = 60000; // 1 minute
  private static redis: any = null;

  /**
   * Initialize Redis connection
   * Falls back to in-memory if Redis unavailable
   */
  private static async getRedis() {
    if (this.redis) {
      return this.redis;
    }

    try {
      // Only import Redis if URL is configured
      if (process.env.REDIS_URL) {
        const Redis = require('ioredis');
        this.redis = new Redis(process.env.REDIS_URL, {
          retryStrategy: (times: number) => {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 100, 3000);
          }
        });
        return this.redis;
      }
    } catch (error) {
      console.warn('Redis not available, using in-memory feature flags');
    }

    return null;
  }

  /**
   * Check if a feature is enabled
   * Supports gradual rollout and user-specific flags
   */
  static async isEnabled(
    flag: string,
    userId?: string
  ): Promise<boolean> {
    const config = await this.getConfig(flag);

    // Feature disabled globally
    if (!config.enabled) {
      return false;
    }

    // User-specific override
    if (userId && config.allowedUserIds?.includes(userId)) {
      return true;
    }

    // Gradual rollout (percentage-based)
    if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
      if (!userId) return false; // Need userId for percentage rollout

      // Consistent hashing for stable rollout
      const hash = this.hashString(userId + flag);
      const percentage = hash % 100;
      return percentage < config.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get feature flag configuration
   */
  static async getConfig(flag: string): Promise<FeatureFlagConfig> {
    // Check cache first
    const cached = this.cache.get(flag);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.value;
    }

    // Get from Redis or defaults
    const config = await this.fetchConfig(flag);

    // Update cache
    this.cache.set(flag, {
      value: config,
      timestamp: now
    });

    return config;
  }

  /**
   * Fetch configuration from Redis or return defaults
   */
  private static async fetchConfig(flag: string): Promise<FeatureFlagConfig> {
    const redis = await this.getRedis();

    if (redis) {
      try {
        const value = await redis.get(`feature:${flag}`);
        if (value) {
          return JSON.parse(value);
        }
      } catch (error) {
        console.error(`Error fetching feature flag ${flag}:`, error);
      }
    }

    // Return default configuration
    return this.getDefaultConfig(flag);
  }

  /**
   * Get default configuration for known flags
   */
  private static getDefaultConfig(flag: string): FeatureFlagConfig {
    const defaults: Record<string, FeatureFlagConfig> = {
      'scan_creation': {
        enabled: true,
        description: 'Allow users to create new accessibility scans'
      },
      'email_automation': {
        enabled: true,
        description: 'Send automated emails for WCAG violations'
      },
      'ai_remediation': {
        enabled: true,
        description: 'AI-powered violation remediation suggestions'
      },
      'vpat_generation': {
        enabled: true,
        description: 'VPAT report generation'
      },
      'lead_discovery': {
        enabled: true,
        description: 'Automated lead discovery and prospecting'
      },
      'batch_scanning': {
        enabled: false,
        description: 'Batch scan multiple URLs',
        rolloutPercentage: 25  // Gradual rollout to 25% of users
      },
      'advanced_analytics': {
        enabled: false,
        description: 'Advanced analytics dashboard (beta)',
        rolloutPercentage: 10
      }
    };

    return defaults[flag] || {
      enabled: true,
      description: `Feature flag: ${flag}`
    };
  }

  /**
   * Enable a feature flag
   */
  static async enable(
    flag: string,
    options?: Partial<Omit<FeatureFlagConfig, 'enabled'>>
  ): Promise<void> {
    const config: FeatureFlagConfig = {
      enabled: true,
      description: options?.description || `Feature flag: ${flag}`,
      ...options
    };

    await this.setConfig(flag, config);
  }

  /**
   * Disable a feature flag
   */
  static async disable(flag: string, reason?: string): Promise<void> {
    const currentConfig = await this.getConfig(flag);
    const config: FeatureFlagConfig = {
      ...currentConfig,
      enabled: false,
      disabledReason: reason
    };

    await this.setConfig(flag, config);
  }

  /**
   * Set gradual rollout percentage
   */
  static async setRollout(flag: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const currentConfig = await this.getConfig(flag);
    const config: FeatureFlagConfig = {
      ...currentConfig,
      rolloutPercentage: percentage
    };

    await this.setConfig(flag, config);
  }

  /**
   * Set feature flag configuration
   */
  private static async setConfig(flag: string, config: FeatureFlagConfig): Promise<void> {
    const redis = await this.getRedis();

    if (redis) {
      try {
        await redis.set(`feature:${flag}`, JSON.stringify(config));
      } catch (error) {
        console.error(`Error setting feature flag ${flag}:`, error);
      }
    }

    // Clear cache
    this.cache.delete(flag);
  }

  /**
   * List all feature flags
   */
  static async listAll(): Promise<Record<string, FeatureFlagConfig>> {
    const redis = await this.getRedis();
    const flags: Record<string, FeatureFlagConfig> = {};

    if (redis) {
      try {
        const keys = await redis.keys('feature:*');
        for (const key of keys) {
          const flagName = key.replace('feature:', '');
          const value = await redis.get(key);
          if (value) {
            flags[flagName] = JSON.parse(value);
          }
        }
      } catch (error) {
        console.error('Error listing feature flags:', error);
      }
    }

    // Add defaults for missing flags
    const defaultFlags = [
      'scan_creation',
      'email_automation',
      'ai_remediation',
      'vpat_generation',
      'lead_discovery',
      'batch_scanning',
      'advanced_analytics'
    ];

    for (const flagName of defaultFlags) {
      if (!flags[flagName]) {
        flags[flagName] = this.getDefaultConfig(flagName);
      }
    }

    return flags;
  }

  /**
   * Simple hash function for consistent rollout
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Cleanup Redis connection on shutdown
   */
  static async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

/**
 * Express middleware for feature flag checks
 */
export function requireFeature(flagName: string) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const enabled = await FeatureFlags.isEnabled(flagName, userId);

    if (!enabled) {
      const config = await FeatureFlags.getConfig(flagName);
      return res.status(503).json({
        error: 'Feature Unavailable',
        message: config.disabledReason || `The feature '${flagName}' is currently disabled`,
        feature: flagName
      });
    }

    next();
  };
}

/**
 * CLI utility for managing feature flags
 * Usage: node -r ts-node/register src/lib/feature-flags-cli.ts <command>
 */
if (require.main === module) {
  const command = process.argv[2];
  const flag = process.argv[3];
  const value = process.argv[4];

  (async () => {
    switch (command) {
      case 'enable':
        await FeatureFlags.enable(flag);
        console.log(`✓ Enabled feature: ${flag}`);
        break;

      case 'disable':
        await FeatureFlags.disable(flag, value);
        console.log(`✓ Disabled feature: ${flag}`);
        if (value) console.log(`  Reason: ${value}`);
        break;

      case 'rollout':
        const percentage = parseInt(value);
        await FeatureFlags.setRollout(flag, percentage);
        console.log(`✓ Set rollout for ${flag} to ${percentage}%`);
        break;

      case 'list':
        const flags = await FeatureFlags.listAll();
        console.log('\nFeature Flags:\n');
        for (const [name, config] of Object.entries(flags)) {
          const status = config.enabled ? '✓ Enabled' : '✗ Disabled';
          const rollout = config.rolloutPercentage !== undefined
            ? ` (${config.rolloutPercentage}% rollout)`
            : '';
          console.log(`  ${name}: ${status}${rollout}`);
          console.log(`    ${config.description}`);
          if (config.disabledReason) {
            console.log(`    Reason: ${config.disabledReason}`);
          }
          console.log('');
        }
        break;

      default:
        console.log('Feature Flag CLI\n');
        console.log('Commands:');
        console.log('  node feature-flags.ts enable <flag>');
        console.log('  node feature-flags.ts disable <flag> [reason]');
        console.log('  node feature-flags.ts rollout <flag> <percentage>');
        console.log('  node feature-flags.ts list');
        break;
    }

    await FeatureFlags.cleanup();
    process.exit(0);
  })();
}
