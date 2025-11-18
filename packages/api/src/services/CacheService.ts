/**
 * In-Memory Cache Service
 * Simple cache for static/semi-static data (metros, industries)
 * Performance optimization for <5s query requirement
 */

export class CacheService {
  private static cache = new Map<string, { data: any; expiresAt: number }>();
  private static defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data
   */
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cached data
   */
  static set(key: string, data: any, ttlMs: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Clear specific key
   */
  static clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const entries = Array.from(this.cache.entries());
    const expired = entries.filter(([, v]) => Date.now() > v.expiresAt).length;

    return {
      totalKeys: this.cache.size,
      expiredKeys: expired,
      activeKeys: this.cache.size - expired,
    };
  }
}
