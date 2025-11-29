import { log } from '../../utils/logger';

export interface CircuitBreakerOptions {
  failureThreshold: number; // Consecutive failures before opening
  successThreshold: number; // Consecutive successes before closing
  timeout: number; // Time (ms) before attempting reset
  name?: string; // For logging
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker Pattern for API resilience
 * Prevents cascading failures by stopping requests to failing services
 */
export class CircuitBreaker<T = any> {
  private failures = 0;
  private successes = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private nextAttempt = Date.now();
  private lastError: Error | null = null;

  constructor(private options: CircuitBreakerOptions) {
    log.info(`🔌 Circuit breaker created: ${this.options.name || 'default'}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async call<R>(fn: () => Promise<R>): Promise<R> {
    // Check if circuit should be opened
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitTime = this.nextAttempt - Date.now();
        const error = new Error(
          `Circuit breaker is OPEN. Wait ${waitTime}ms before retrying.`
        );
        log.error(`🚫 ${error.message}`);
        throw error;
      }

      // Try to transition to HALF_OPEN
      log.info(`⚡ Attempting recovery (HALF_OPEN state)`);
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.successes++;
    this.failures = 0;

    log.debug(
      `✅ Success (${this.successes}/${this.options.successThreshold}) - State: ${this.state}`
    );

    // If in HALF_OPEN state and enough successes, close the circuit
    if (this.state === 'HALF_OPEN' && this.successes >= this.options.successThreshold) {
      this.reset();
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(error: Error): void {
    this.failures++;
    this.successes = 0;
    this.lastError = error;

    log.debug(
      `❌ Failure (${this.failures}/${this.options.failureThreshold}) - State: ${this.state}`
    );

    // If failures exceed threshold, open the circuit
    if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit (stop accepting requests)
   */
  private open(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.options.timeout;

    log.error(
      `🚨 Circuit breaker OPENED (${this.options.name || 'default'}). ` +
        `Will retry in ${this.options.timeout}ms. ` +
        `Last error: ${this.lastError?.message}`
    );
  }

  /**
   * Reset the circuit to CLOSED state
   */
  reset(): void {
    log.info(`🔄 Circuit breaker reset (${this.options.name || 'default'})`);
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastError = null;

    log.info(`✅ Circuit breaker CLOSED (${this.options.name || 'default'})`);
  }

  /**
   * Get current circuit breaker state
   */
  getState(): {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    nextAttempt: number;
    lastError: string | null;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      lastError: this.lastError?.message || null,
    };
  }

  /**
   * Get human-readable state description
   */
  getDescription(): string {
    return `${this.options.name || 'Circuit Breaker'} [${this.state}] ` +
      `(${this.failures} failures, ${this.successes} successes)`;
  }
}
