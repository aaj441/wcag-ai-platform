/**
 * Secrets Manager - AWS Secrets Manager Integration
 * WCAG AI Platform - Secure credential management
 * 
 * This service provides secure access to secrets stored in AWS Secrets Manager
 * with fallback to environment variables for local development.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface SecretConfig {
  secretName: string;
  region: string;
}

interface AppSecrets {
  // AI Services
  anthropicApiKey?: string;
  openaiApiKey?: string;
  
  // Database
  databaseUrl?: string;
  redisUrl?: string;
  
  // Email
  sendgridApiKey?: string;
  
  // CRM
  hubspotApiKey?: string;
  
  // Payment
  stripeSecretKey?: string;
  
  // Insurance APIs
  medicareApiKey?: string;
  
  // Music APIs
  spotifyClientSecret?: string;
  appleMusicPrivateKey?: string;
  
  // Security
  jwtSecret?: string;
  sessionSecret?: string;
  
  // AWS
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  
  // Monitoring
  sentryDsn?: string;
}

class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, AppSecrets> = new Map();
  private cacheTTL: number = 3600000; // 1 hour in milliseconds
  private cacheTimestamps: Map<string, number> = new Map();
  
  constructor() {
    // Initialize AWS Secrets Manager client
    this.client = new SecretsManagerClient({
      region: process.env.AWS_SECRETS_MANAGER_REGION || 'us-east-1',
    });
  }
  
  /**
   * Retrieve secrets from AWS Secrets Manager or environment variables
   */
  async getSecrets(config?: SecretConfig): Promise<AppSecrets> {
    // Use default config if not provided
    const secretName = config?.secretName || process.env.AWS_SECRETS_MANAGER_SECRET_NAME || 'wcag-platform-secrets';
    const region = config?.region || process.env.AWS_SECRETS_MANAGER_REGION || 'us-east-1';
    
    // Check cache first
    if (this.isCacheValid(secretName)) {
      console.log(`[SecretsManager] Using cached secrets for ${secretName}`);
      return this.cache.get(secretName)!;
    }
    
    try {
      // Try to fetch from AWS Secrets Manager (production)
      console.log(`[SecretsManager] Fetching secrets from AWS Secrets Manager: ${secretName}`);
      const secrets = await this.fetchFromAWS(secretName);
      
      // Update cache
      this.cache.set(secretName, secrets);
      this.cacheTimestamps.set(secretName, Date.now());
      
      return secrets;
    } catch (error) {
      console.warn('[SecretsManager] Failed to fetch from AWS Secrets Manager, falling back to environment variables');
      console.error(error);
      
      // Fallback to environment variables (development/local)
      return this.getFromEnvironment();
    }
  }
  
  /**
   * Fetch secrets from AWS Secrets Manager
   */
  private async fetchFromAWS(secretName: string): Promise<AppSecrets> {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });
    
    const response = await this.client.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret string is empty');
    }
    
    return JSON.parse(response.SecretString);
  }
  
  /**
   * Get secrets from environment variables (fallback)
   */
  private getFromEnvironment(): AppSecrets {
    return {
      // AI Services
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      
      // Database
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      
      // Email
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      
      // CRM
      hubspotApiKey: process.env.HUBSPOT_API_KEY,
      
      // Payment
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      
      // Insurance APIs
      medicareApiKey: process.env.MEDICARE_API_KEY,
      
      // Music APIs
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      appleMusicPrivateKey: process.env.APPLE_MUSIC_PRIVATE_KEY,
      
      // Security
      jwtSecret: process.env.JWT_SECRET,
      sessionSecret: process.env.SESSION_SECRET,
      
      // AWS
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      
      // Monitoring
      sentryDsn: process.env.SENTRY_DSN,
    };
  }
  
  /**
   * Check if cached secrets are still valid
   */
  private isCacheValid(secretName: string): boolean {
    if (!this.cache.has(secretName)) {
      return false;
    }
    
    const timestamp = this.cacheTimestamps.get(secretName);
    if (!timestamp) {
      return false;
    }
    
    return (Date.now() - timestamp) < this.cacheTTL;
  }
  
  /**
   * Clear cache (useful for forcing refresh)
   */
  clearCache(secretName?: string): void {
    if (secretName) {
      this.cache.delete(secretName);
      this.cacheTimestamps.delete(secretName);
      console.log(`[SecretsManager] Cleared cache for ${secretName}`);
    } else {
      this.cache.clear();
      this.cacheTimestamps.clear();
      console.log('[SecretsManager] Cleared all cached secrets');
    }
  }
  
  /**
   * Validate that required secrets are present
   */
  validateSecrets(secrets: AppSecrets, required: (keyof AppSecrets)[]): void {
    const missing: string[] = [];
    
    for (const key of required) {
      if (!secrets[key]) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required secrets: ${missing.join(', ')}`);
    }
  }
  
  /**
   * Get a single secret value
   */
  async getSecret(key: keyof AppSecrets): Promise<string | undefined> {
    const secrets = await this.getSecrets();
    return secrets[key];
  }
}

// Singleton instance
const secretsManager = new SecretsManager();

/**
 * Initialize secrets on application startup
 */
export async function initializeSecrets(): Promise<AppSecrets> {
  console.log('[SecretsManager] Initializing application secrets...');
  
  const secrets = await secretsManager.getSecrets();
  
  // Validate required secrets for WCAG platform
  const requiredSecrets: (keyof AppSecrets)[] = [
    'databaseUrl',
    'jwtSecret',
  ];
  
  try {
    secretsManager.validateSecrets(secrets, requiredSecrets);
    console.log('[SecretsManager] All required secrets loaded successfully');
  } catch (error) {
    console.error('[SecretsManager] Secret validation failed:', error);
    throw error;
  }
  
  return secrets;
}

/**
 * Get secrets (use this in your application code)
 */
export async function getSecrets(): Promise<AppSecrets> {
  return secretsManager.getSecrets();
}

/**
 * Get a single secret by key
 */
export async function getSecret(key: keyof AppSecrets): Promise<string | undefined> {
  return secretsManager.getSecret(key);
}

/**
 * Clear secrets cache (useful for secret rotation)
 */
export function clearSecretsCache(secretName?: string): void {
  secretsManager.clearCache(secretName);
}

export default secretsManager;

/**
 * Usage Examples:
 * 
 * // In server.ts initialization:
 * import { initializeSecrets } from './config/secrets-manager';
 * 
 * async function startServer() {
 *   const secrets = await initializeSecrets();
 *   // Use secrets to configure services
 *   const db = connectDatabase(secrets.databaseUrl);
 *   // ...
 * }
 * 
 * // In a service/route:
 * import { getSecret } from './config/secrets-manager';
 * 
 * async function sendEmail() {
 *   const apiKey = await getSecret('sendgridApiKey');
 *   // Use apiKey
 * }
 * 
 * // After secret rotation:
 * import { clearSecretsCache } from './config/secrets-manager';
 * clearSecretsCache(); // Forces re-fetch from AWS on next access
 */
