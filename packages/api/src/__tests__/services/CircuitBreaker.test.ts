/**
 * CircuitBreaker Tests
 * Complete test coverage for circuit breaker pattern
 */

import { CircuitBreaker, CircuitBreakerState } from '../../services/orchestration/CircuitBreaker';
import { wait, createFlakeyFunction } from '../helpers/testUtils';

describe('CircuitBreaker', () => {
  describe('initialization', () => {
    it('should initialize in CLOSED state', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        name: 'test-breaker',
      });

      const state = breaker.getState();

      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
    });

    it('should accept configuration options', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 2000,
        name: 'custom-breaker',
      });

      const state = breaker.getState();
      expect(state.state).toBe('CLOSED');
    });

    it('should work without name', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      expect(breaker.getDescription()).toContain('Circuit Breaker');
    });
  });

  describe('call - success scenarios', () => {
    it('should execute successful function', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.call(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track successful calls', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockResolvedValue('success');

      await breaker.call(fn);
      await breaker.call(fn);

      const state = breaker.getState();
      expect(state.successes).toBe(2);
      expect(state.failures).toBe(0);
    });

    it('should reset failure count on success', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn1 = jest.fn().mockRejectedValue(new Error('fail'));
      const fn2 = jest.fn().mockResolvedValue('success');

      await breaker.call(fn1).catch(() => {});
      await breaker.call(fn1).catch(() => {});

      const state1 = breaker.getState();
      expect(state1.failures).toBe(2);

      await breaker.call(fn2);

      const state2 = breaker.getState();
      expect(state2.failures).toBe(0);
      expect(state2.successes).toBe(1);
    });
  });

  describe('call - failure scenarios', () => {
    it('should track failed calls', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});

      const state = breaker.getState();
      expect(state.failures).toBe(2);
      expect(state.successes).toBe(0);
    });

    it('should open circuit after failure threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});

      const state = breaker.getState();
      expect(state.state).toBe('OPEN');
    });

    it('should reject calls when circuit is OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});

      const state = breaker.getState();
      expect(state.state).toBe('OPEN');

      await expect(breaker.call(fn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(fn).toHaveBeenCalledTimes(2); // Should not call function again
    });

    it('should reset success count on failure', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 1000,
      });

      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      await breaker.call(successFn);
      await breaker.call(successFn);

      const state1 = breaker.getState();
      expect(state1.successes).toBe(2);

      await breaker.call(failFn).catch(() => {});

      const state2 = breaker.getState();
      expect(state2.successes).toBe(0);
      expect(state2.failures).toBe(1);
    });
  });

  describe('HALF_OPEN state', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      expect(breaker.getState().state).toBe('OPEN');

      // Wait for timeout
      await wait(150);

      // Next call should attempt HALF_OPEN
      await breaker.call(successFn);

      const state = breaker.getState();
      expect(state.state).toBe('HALF_OPEN');
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      // Wait for timeout
      await wait(150);

      // Succeed enough times to close
      await breaker.call(successFn);
      await breaker.call(successFn);

      const state = breaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
    });

    it('should reopen if failure occurs in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      // Wait for timeout
      await wait(150);

      // Partial recovery
      await breaker.call(successFn);

      expect(breaker.getState().state).toBe('HALF_OPEN');

      // Fail again
      await breaker.call(failFn).catch(() => {});

      expect(breaker.getState().state).toBe('OPEN');
    });
  });

  describe('reset', () => {
    it('should reset circuit to CLOSED state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});

      expect(breaker.getState().state).toBe('OPEN');

      breaker.reset();

      const state = breaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
      expect(state.lastError).toBeNull();
    });

    it('should allow calls after reset', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      breaker.reset();

      // Should work now
      const result = await breaker.call(successFn);
      expect(result).toBe('success');
    });
  });

  describe('getState', () => {
    it('should return current state information', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('test error'));

      await breaker.call(failFn).catch(() => {});

      const state = breaker.getState();

      expect(state).toEqual({
        state: 'CLOSED',
        failures: 1,
        successes: 0,
        nextAttempt: expect.any(Number),
        lastError: 'test error',
      });
    });

    it('should include lastError message', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('specific error message'));

      await breaker.call(fn).catch(() => {});

      const state = breaker.getState();
      expect(state.lastError).toBe('specific error message');
    });
  });

  describe('getDescription', () => {
    it('should return human-readable description', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        name: 'api-breaker',
      });

      const description = breaker.getDescription();

      expect(description).toContain('api-breaker');
      expect(description).toContain('CLOSED');
      expect(description).toContain('0 failures');
      expect(description).toContain('0 successes');
    });
  });

  describe('timeout behavior', () => {
    it('should prevent calls before timeout expires', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});

      // Try immediately (should fail)
      await expect(breaker.call(fn)).rejects.toThrow('Circuit breaker is OPEN');

      // Wait partial time (should still fail)
      await wait(500);
      await expect(breaker.call(fn)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should allow retry after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 100,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      // Wait for timeout
      await wait(150);

      // Should work now
      const result = await breaker.call(successFn);
      expect(result).toBe('success');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle flaky service that eventually recovers', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
      });

      const flakeyFn = createFlakeyFunction('success', 2);

      // First attempts fail
      await breaker.call(flakeyFn).catch(() => {});
      await breaker.call(flakeyFn).catch(() => {});
      await breaker.call(flakeyFn).catch(() => {});

      // Circuit should be open
      expect(breaker.getState().state).toBe('OPEN');

      // Wait for timeout
      await wait(150);

      // Service recovered, should succeed
      const result1 = await breaker.call(flakeyFn);
      const result2 = await breaker.call(flakeyFn);

      expect(result1).toBe('success');
      expect(result2).toBe('success');
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should handle cascading failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 100,
      });

      const fn = jest.fn().mockRejectedValue(new Error('service down'));

      // Simulate many concurrent failures
      const promises = Array.from({ length: 10 }, () => breaker.call(fn).catch(() => {}));

      await Promise.all(promises);

      expect(breaker.getState().state).toBe('OPEN');
      expect(fn).toHaveBeenCalledTimes(5); // Only called until threshold
    });

    it('should handle partial recovery', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 3,
        timeout: 50,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      // Wait for timeout
      await wait(100);

      // Partial recovery (not enough to close)
      await breaker.call(successFn);
      await breaker.call(successFn);

      expect(breaker.getState().state).toBe('HALF_OPEN');
      expect(breaker.getState().successes).toBe(2);

      // One more success should close it
      await breaker.call(successFn);

      expect(breaker.getState().state).toBe('CLOSED');
    });
  });

  describe('edge cases', () => {
    it('should handle synchronous errors', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn(() => {
        throw new Error('sync error');
      });

      await breaker.call(fn).catch(() => {});
      await breaker.call(fn).catch(() => {});

      expect(breaker.getState().state).toBe('OPEN');
    });

    it('should handle very high failure threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1000,
        successThreshold: 2,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Should stay closed even with many failures
      for (let i = 0; i < 100; i++) {
        await breaker.call(fn).catch(() => {});
      }

      expect(breaker.getState().state).toBe('CLOSED');
      expect(breaker.getState().failures).toBe(100);
    });

    it('should handle zero timeout (immediate retry)', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 0,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open circuit
      await breaker.call(failFn).catch(() => {});
      await breaker.call(failFn).catch(() => {});

      // Should be able to retry immediately
      const result = await breaker.call(successFn);

      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should handle concurrent calls correctly', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 1000,
      });

      const successFn = jest.fn().mockResolvedValue('success');

      const promises = Array.from({ length: 20 }, () => breaker.call(successFn));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      expect(results.every(r => r === 'success')).toBe(true);
      expect(breaker.getState().successes).toBe(20);
    });
  });
});
