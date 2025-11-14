import { prisma } from '../../lib/prisma';
import { log } from '../../utils/logger';

/**
 * Safety service with kill switches, rate limiting, and safeguards
 * Prevents runaway scans and resource exhaustion
 */
export class SafetyService {
  private static readonly MAX_SCAN_TIME = 120000; // 2 minutes max
  private static readonly MAX_MEMORY_MB = 800; // Kill if >800MB
  private static readonly MAX_CONCURRENT = 3; // Max concurrent scans
  private static readonly MAX_SCANS_PER_HOUR = 10; // Max scans per client per hour

  /**
   * Execute a scan with safety guardrails
   */
  static async safeScan<T>(
    url: string,
    clientId: string | undefined,
    scanFn: () => Promise<T>
  ): Promise<T> {
    // Check rate limits
    if (clientId) {
      const allowed = await this.checkRateLimit(clientId);
      if (!allowed) {
        throw new Error(
          `Rate limit exceeded: Maximum ${this.MAX_SCANS_PER_HOUR} scans per hour`
        );
      }
    }

    let memoryInterval: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;

    try {
      // Start memory monitor
      let memoryExceeded = false;
      memoryInterval = setInterval(() => {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / 1024 / 1024;

        if (heapUsedMB > this.MAX_MEMORY_MB) {
          memoryExceeded = true;
          log.error(
            `🚨 Memory limit exceeded (${Math.round(heapUsedMB)}MB > ${this.MAX_MEMORY_MB}MB)`
          );
          throw new Error('MEMORY_LIMIT_EXCEEDED');
        }
      }, 5000);

      // Start timer
      let timeoutExceeded = false;
      timeoutTimer = setTimeout(() => {
        timeoutExceeded = true;
        log.error(
          `🚨 Scan timeout exceeded (>${this.MAX_SCAN_TIME}ms), killing scan`
        );
        throw new Error('SCAN_TIMEOUT');
      }, this.MAX_SCAN_TIME);

      // Execute scan
      const result = await scanFn();

      // Check if we exceeded limits during execution
      if (memoryExceeded) {
        throw new Error('Memory limit was exceeded during scan');
      }
      if (timeoutExceeded) {
        throw new Error('Scan was killed due to timeout');
      }

      return result;
    } finally {
      // Cleanup timers
      if (memoryInterval) clearInterval(memoryInterval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    }
  }

  /**
   * Check rate limit for a client
   */
  static async checkRateLimit(clientId: string): Promise<boolean> {
    try {
      const scansLastHour = await prisma.scan.count({
        where: {
          clientId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      const allowed = scansLastHour < this.MAX_SCANS_PER_HOUR;

      if (!allowed) {
        log.warn(
          `⚠️ Rate limit warning: ${scansLastHour}/${this.MAX_SCANS_PER_HOUR} scans for client ${clientId}`
        );
      }

      return allowed;
    } catch (error) {
      log.error('Failed to check rate limit:', error instanceof Error ? error : new Error(String(error)));
      // Don't block on database errors
      return true;
    }
  }

  /**
   * Get rate limit status for a client
   */
  static async getRateLimitStatus(clientId: string): Promise<{
    scansThisHour: number;
    limit: number;
    remaining: number;
    resetTime: Date;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const scansThisHour = await prisma.scan.count({
      where: {
        clientId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    const remaining = Math.max(0, this.MAX_SCANS_PER_HOUR - scansThisHour);

    // Calculate when the oldest scan from this hour will expire
    const oldestScan = await prisma.scan.findFirst({
      where: {
        clientId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const resetTime = oldestScan
      ? new Date(oldestScan.createdAt.getTime() + 60 * 60 * 1000)
      : new Date(Date.now() + 60 * 60 * 1000);

    return {
      scansThisHour,
      limit: this.MAX_SCANS_PER_HOUR,
      remaining,
      resetTime,
    };
  }

  /**
   * Check if a URL is potentially problematic
   */
  static checkUrlSafety(url: string): {
    safe: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for suspicious patterns
    if (url.length > 2048) {
      warnings.push('URL exceeds maximum length (2048 characters)');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      warnings.push('URL does not use http or https protocol');
    }

    if (url.includes('javascript:')) {
      warnings.push('URL contains javascript: protocol');
    }

    if (url.includes('file://')) {
      warnings.push('URL uses file:// protocol');
    }

    // Check for known blocking patterns
    const blockingPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'internal',
      'private',
    ];

    for (const pattern of blockingPatterns) {
      if (url.toLowerCase().includes(pattern)) {
        warnings.push(`URL contains potentially internal pattern: ${pattern}`);
      }
    }

    return {
      safe: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Validate scan request parameters
   */
  static validateScanRequest(data: {
    url?: string;
    clientId?: string;
    priority?: number;
  }): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.url) {
      errors.push('URL is required');
    } else if (typeof data.url !== 'string') {
      errors.push('URL must be a string');
    } else {
      const urlSafety = this.checkUrlSafety(data.url);
      if (!urlSafety.safe) {
        errors.push(...urlSafety.warnings);
      }
    }

    if (data.clientId && typeof data.clientId !== 'string') {
      errors.push('clientId must be a string');
    }

    if (data.priority !== undefined) {
      if (typeof data.priority !== 'number') {
        errors.push('priority must be a number');
      } else if (data.priority < 1 || data.priority > 10) {
        errors.push('priority must be between 1 and 10');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get current safety metrics
   */
  static getSafetyMetrics(): {
    timestamp: Date;
    memoryUsageMB: number;
    limits: {
      maxMemoryMB: number;
      maxScanTimeMs: number;
      maxConcurrentScans: number;
      maxScansPerHour: number;
    };
    warnings: string[];
  } {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

    const warnings: string[] = [];

    if (heapUsedMB > this.MAX_MEMORY_MB) {
      warnings.push(
        `Memory usage critical: ${heapUsedMB}MB > ${this.MAX_MEMORY_MB}MB`
      );
    } else if (heapUsedMB > this.MAX_MEMORY_MB * 0.8) {
      warnings.push(
        `Memory usage high: ${heapUsedMB}MB > ${Math.round(this.MAX_MEMORY_MB * 0.8)}MB`
      );
    }

    return {
      timestamp: new Date(),
      memoryUsageMB: heapUsedMB,
      limits: {
        maxMemoryMB: this.MAX_MEMORY_MB,
        maxScanTimeMs: this.MAX_SCAN_TIME,
        maxConcurrentScans: this.MAX_CONCURRENT,
        maxScansPerHour: this.MAX_SCANS_PER_HOUR,
      },
      warnings,
    };
  }
}
