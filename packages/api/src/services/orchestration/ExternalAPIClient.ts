/**
 * External API Client with Circuit Breaker Protection
 *
 * Wraps all external API calls with circuit breaker pattern to prevent
 * cascading failures and provide graceful degradation.
 *
 * MEGA PROMPT 1: Add circuit breakers to all external API calls
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { CircuitBreaker, type CircuitBreakerOptions } from './CircuitBreaker';
import { log } from '../../utils/logger';

// ============================================================================
// Circuit Breaker Configurations
// ============================================================================

const BREAKER_CONFIGS: Record<string, CircuitBreakerOptions> = {
  // AI Services (OpenAI, Anthropic)
  ai: {
    name: 'AI Service (OpenAI/Anthropic)',
    failureThreshold: 3, // Open after 3 failures
    successThreshold: 2, // Close after 2 successes
    timeout: 30000, // 30s cooldown
  },

  // Apollo.io (Company Discovery)
  apollo: {
    name: 'Apollo API',
    failureThreshold: 5, // More lenient (external data source)
    successThreshold: 2,
    timeout: 60000, // 1min cooldown
  },

  // SendGrid (Email)
  sendgrid: {
    name: 'SendGrid Email',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 20000, // 20s cooldown
  },

  // Stripe (Billing)
  stripe: {
    name: 'Stripe Billing',
    failureThreshold: 2, // Critical - fail fast
    successThreshold: 3, // Require more successes to close
    timeout: 10000, // 10s cooldown
  },

  // AWS S3 (Storage)
  s3: {
    name: 'AWS S3 Storage',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30s cooldown
  },

  // HubSpot CRM
  hubspot: {
    name: 'HubSpot CRM',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1min cooldown
  },

  // Generic external API
  default: {
    name: 'External API',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
  },
};

// ============================================================================
// Circuit Breaker Registry
// ============================================================================

class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(service: string): CircuitBreaker {
    if (!this.breakers.has(service)) {
      const config = BREAKER_CONFIGS[service] || BREAKER_CONFIGS.default;
      this.breakers.set(service, new CircuitBreaker(config));
    }
    return this.breakers.get(service)!;
  }

  getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  getStates(): Record<string, any> {
    const states: Record<string, any> = {};
    this.breakers.forEach((breaker, service) => {
      states[service] = breaker.getState();
    });
    return states;
  }

  reset(service: string): void {
    const breaker = this.breakers.get(service);
    if (breaker) {
      breaker.reset();
    }
  }

  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// ============================================================================
// Protected HTTP Client (Axios)
// ============================================================================

export class ProtectedHTTPClient {
  /**
   * Make a protected HTTP request with circuit breaker
   */
  static async request<T = any>(
    service: string,
    config: AxiosRequestConfig,
    options?: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<AxiosResponse<T>> {
    const breaker = circuitBreakerRegistry.get(service);

    return breaker.call(async () => {
      const finalConfig: AxiosRequestConfig = {
        ...config,
        timeout: options?.timeout || config.timeout || 30000,
      };

      let lastError: any;
      const retries = options?.retries || 0;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const startTime = Date.now();
          const response = await axios.request<T>(finalConfig);
          const duration = Date.now() - startTime;

          log.info(`🌐 ${service} API call succeeded`, {
            method: config.method,
            url: config.url,
            status: response.status,
            duration,
            attempt: attempt + 1,
          });

          return response;
        } catch (error: any) {
          lastError = error;
          const duration = Date.now();

          log.warn(`🌐 ${service} API call failed (attempt ${attempt + 1}/${retries + 1})`, {
            method: config.method,
            url: config.url,
            status: error.response?.status,
            error: error.message,
            duration,
          });

          // Don't retry on 4xx errors (client errors)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            throw error;
          }

          // Wait before retry
          if (attempt < retries && options?.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, options.retryDelay));
          }
        }
      }

      // All retries failed
      throw lastError;
    });
  }

  /**
   * Protected GET request
   */
  static async get<T = any>(
    service: string,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(service, {
      ...config,
      method: 'GET',
      url,
    });
  }

  /**
   * Protected POST request
   */
  static async post<T = any>(
    service: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(service, {
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  /**
   * Protected PUT request
   */
  static async put<T = any>(
    service: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(service, {
      ...config,
      method: 'PUT',
      url,
      data,
    });
  }

  /**
   * Protected DELETE request
   */
  static async delete<T = any>(
    service: string,
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>(service, {
      ...config,
      method: 'DELETE',
      url,
    });
  }
}

// ============================================================================
// Protected Fetch Client (for native fetch calls)
// ============================================================================

export class ProtectedFetchClient {
  /**
   * Make a protected fetch request with circuit breaker
   */
  static async fetch(
    service: string,
    url: string,
    init?: RequestInit,
    options?: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<Response> {
    const breaker = circuitBreakerRegistry.get(service);

    return breaker.call(async () => {
      const controller = new AbortController();
      const timeout = options?.timeout || 30000;

      // Set up timeout
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let lastError: any;
      const retries = options?.retries || 0;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const startTime = Date.now();

          const response = await fetch(url, {
            ...init,
            signal: controller.signal,
          });

          const duration = Date.now() - startTime;

          log.info(`🌐 ${service} fetch succeeded`, {
            method: init?.method || 'GET',
            url,
            status: response.status,
            duration,
            attempt: attempt + 1,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error: any) {
          lastError = error;

          log.warn(`🌐 ${service} fetch failed (attempt ${attempt + 1}/${retries + 1})`, {
            method: init?.method || 'GET',
            url,
            error: error.message,
          });

          // Wait before retry
          if (attempt < retries && options?.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, options.retryDelay));
          }
        }
      }

      clearTimeout(timeoutId);
      throw lastError;
    });
  }

  /**
   * Protected fetch with JSON parsing
   */
  static async fetchJSON<T = any>(
    service: string,
    url: string,
    init?: RequestInit,
    options?: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<T> {
    const response = await this.fetch(service, url, init, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// ============================================================================
// Service-Specific Clients (Convenience Wrappers)
// ============================================================================

/**
 * AI Service Client (OpenAI/Anthropic)
 */
export class AIServiceClient {
  static async chat(
    apiKey: string,
    messages: any[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      provider?: 'openai' | 'anthropic';
    }
  ): Promise<any> {
    const provider = options?.provider || 'openai';

    if (provider === 'openai') {
      return ProtectedFetchClient.fetchJSON(
        'ai',
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: options?.model || 'gpt-4',
            messages,
            temperature: options?.temperature || 0.3,
            max_tokens: options?.maxTokens || 2000,
          }),
        },
        {
          timeout: 60000, // AI calls can be slow
          retries: 1, // Retry once on failure
          retryDelay: 2000,
        }
      );
    } else {
      // Anthropic Claude
      return ProtectedFetchClient.fetchJSON(
        'ai',
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: options?.model || 'claude-3-sonnet-20240229',
            messages,
            temperature: options?.temperature || 0.3,
            max_tokens: options?.maxTokens || 2000,
          }),
        },
        {
          timeout: 60000,
          retries: 1,
          retryDelay: 2000,
        }
      );
    }
  }
}

/**
 * Apollo.io Client
 */
export class ApolloClient {
  static async searchCompanies(
    apiKey: string,
    params: any
  ): Promise<AxiosResponse> {
    return ProtectedHTTPClient.post(
      'apollo',
      'https://api.apollo.io/v1/mixed_companies/search',
      params,
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      },
      {
        timeout: 10000,
        retries: 2, // Retry twice
        retryDelay: 1000,
      }
    );
  }

  static async enrichCompany(
    apiKey: string,
    domain: string
  ): Promise<AxiosResponse> {
    return ProtectedHTTPClient.post(
      'apollo',
      'https://api.apollo.io/v1/organizations/enrich',
      { domain },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      },
      {
        timeout: 10000,
        retries: 2,
        retryDelay: 1000,
      }
    );
  }
}

/**
 * HubSpot CRM Client
 */
export class HubSpotClient {
  static async getContact(
    apiKey: string,
    email: string
  ): Promise<AxiosResponse> {
    return ProtectedHTTPClient.get(
      'hubspot',
      `https://api.hubapi.com/contacts/v1/contact/email/${email}/profile`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      {
        timeout: 10000,
        retries: 2,
        retryDelay: 1000,
      }
    );
  }

  static async createEngagement(
    apiKey: string,
    engagement: any
  ): Promise<AxiosResponse> {
    return ProtectedHTTPClient.post(
      'hubspot',
      'https://api.hubapi.com/engagements/v1/engagements',
      engagement,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
      {
        timeout: 10000,
        retries: 2,
        retryDelay: 1000,
      }
    );
  }
}

// ============================================================================
// Health Check & Monitoring
// ============================================================================

/**
 * Get circuit breaker health status for all services
 */
export function getCircuitBreakerHealth(): {
  healthy: boolean;
  services: Record<string, any>;
} {
  const states = circuitBreakerRegistry.getStates();
  const healthy = Object.values(states).every(
    (state: any) => state.state !== 'OPEN'
  );

  return {
    healthy,
    services: states,
  };
}

/**
 * Reset all circuit breakers (admin function)
 */
export function resetAllCircuitBreakers(): void {
  log.info('🔄 Resetting all circuit breakers');
  circuitBreakerRegistry.resetAll();
}

/**
 * Reset specific circuit breaker
 */
export function resetCircuitBreaker(service: string): void {
  log.info(`🔄 Resetting circuit breaker: ${service}`);
  circuitBreakerRegistry.reset(service);
}
