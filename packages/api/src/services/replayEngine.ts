/**
 * State Replay Engine
 *
 * Record and replay exact scan states for debugging and reproduction
 */

import { log } from '../utils/logger';

interface ReplayRecording {
  scanId: string;
  url: string;
  timestamp: Date;
  requests: Array<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    response: {
      status: number;
      headers: Record<string, string>;
      body: any;
    };
    duration: number;
  }>;
  environmentSnapshot: {
    nodeVersion: string;
    dependencies: Record<string, string>;
    env: Record<string, string>;
  };
}

interface ScanComparison {
  scanId: string;
  differences: Array<{
    type: string;
    path: string;
    original: any;
    replay: any;
  }>;
  identical: boolean;
  similarity: number;
}

class ReplayEngine {
  private recordingsDir: string;
  private recordings: Map<string, ReplayRecording> = new Map();

  constructor() {
    this.recordingsDir = process.env.REPLAY_RECORDINGS_DIR || '/app/replay-recordings';
    log.info('Replay engine initialized', { recordingsDir: this.recordingsDir });
  }

  /**
   * Record a scan with full fidelity
   */
  async recordScan(
    scanId: string,
    url: string,
    options: any
  ): Promise<{ recordingId: string; path: string }> {
    log.info('Starting scan recording', { scanId, url });

    const recording: ReplayRecording = {
      scanId,
      url,
      timestamp: new Date(),
      requests: [],
      environmentSnapshot: {
        nodeVersion: process.version,
        dependencies: this.getInstalledDependencies(),
        env: this.sanitizeEnvironment(),
      },
    };

    this.recordings.set(scanId, recording);

    return {
      recordingId: scanId,
      path: `${this.recordingsDir}/${scanId}.json`,
    };
  }

  /**
   * Add HTTP request/response to recording
   */
  recordRequest(
    scanId: string,
    method: string,
    url: string,
    headers: Record<string, string>,
    body: any,
    response: any,
    duration: number
  ): void {
    const recording = this.recordings.get(scanId);
    if (!recording) {
      log.warn('No recording found for scan', { scanId });
      return;
    }

    // Sanitize sensitive headers
    const sanitizedHeaders = this.sanitizeHeaders(headers);

    recording.requests.push({
      method,
      url,
      headers: sanitizedHeaders,
      body: this.sanitizeBody(body),
      response: {
        status: response.status,
        headers: this.sanitizeHeaders(response.headers),
        body: response.body,
      },
      duration,
    });
  }

  /**
   * Finalize and save recording
   */
  async finalizeRecording(scanId: string): Promise<void> {
    const recording = this.recordings.get(scanId);
    if (!recording) {
      throw new Error(`No recording found for scan: ${scanId}`);
    }

    // TODO: Save to filesystem or S3
    const path = `${this.recordingsDir}/${scanId}.json`;
    log.info('Recording finalized', { scanId, path, requestCount: recording.requests.length });

    // Clean up from memory
    this.recordings.delete(scanId);
  }

  /**
   * Replay an exact scan state
   */
  async replayScan(
    scanId: string,
    targetEnvironment: 'local' | 'staging' | 'production' = 'local'
  ): Promise<{
    original: any;
    replay: any;
    comparison: ScanComparison;
    traceUrl?: string;
  }> {
    log.info('Starting scan replay', { scanId, targetEnvironment });

    // TODO: Load recording from storage
    const recording = this.recordings.get(scanId);
    if (!recording) {
      throw new Error(`Recording not found for scan: ${scanId}`);
    }

    // Get original scan result
    const originalScan = await this.loadOriginalScan(scanId);

    // Execute replay
    const replayResult = await this.executeReplay(recording, targetEnvironment);

    // Compare results
    const comparison = this.compareResults(originalScan, replayResult);

    log.info('Replay completed', {
      scanId,
      identical: comparison.identical,
      similarity: comparison.similarity,
      differences: comparison.differences.length,
    });

    return {
      original: originalScan,
      replay: replayResult,
      comparison,
      traceUrl: this.generateTraceUrl(scanId),
    };
  }

  /**
   * Execute replay in target environment
   */
  private async executeReplay(
    recording: ReplayRecording,
    targetEnvironment: string
  ): Promise<any> {
    // TODO: Implement actual replay logic
    log.debug('Executing replay', {
      scanId: recording.scanId,
      requestCount: recording.requests.length,
    });

    // Mock implementation
    return {
      scanId: `replay-${recording.scanId}`,
      url: recording.url,
      violations: [],
      complianceScore: 100,
    };
  }

  /**
   * Compare original and replay results
   */
  private compareResults(original: any, replay: any): ScanComparison {
    const differences: Array<{
      type: string;
      path: string;
      original: any;
      replay: any;
    }> = [];

    // Compare violation counts
    const originalViolationCount = original.violations?.length || 0;
    const replayViolationCount = replay.violations?.length || 0;

    if (originalViolationCount !== replayViolationCount) {
      differences.push({
        type: 'violation_count',
        path: 'violations.length',
        original: originalViolationCount,
        replay: replayViolationCount,
      });
    }

    // Compare compliance scores
    if (original.complianceScore !== replay.complianceScore) {
      differences.push({
        type: 'compliance_score',
        path: 'complianceScore',
        original: original.complianceScore,
        replay: replay.complianceScore,
      });
    }

    // Calculate similarity score
    const identical = differences.length === 0;
    const similarity = this.calculateSimilarity(original, replay);

    return {
      scanId: original.scanId,
      differences,
      identical,
      similarity,
    };
  }

  /**
   * Calculate similarity percentage
   */
  private calculateSimilarity(original: any, replay: any): number {
    // Simple implementation - can be enhanced
    const originalViolations = original.violations?.length || 0;
    const replayViolations = replay.violations?.length || 0;

    if (originalViolations === 0 && replayViolations === 0) {
      return 100;
    }

    const diff = Math.abs(originalViolations - replayViolations);
    const max = Math.max(originalViolations, replayViolations);

    return ((max - diff) / max) * 100;
  }

  /**
   * Load original scan from database
   */
  private async loadOriginalScan(scanId: string): Promise<any> {
    // TODO: Query database
    log.debug('Loading original scan', { scanId });

    return {
      scanId,
      url: 'https://example.com',
      violations: [],
      complianceScore: 100,
    };
  }

  /**
   * Generate Jaeger trace URL
   */
  private generateTraceUrl(scanId: string): string {
    const jaegerUrl = process.env.JAEGER_UI_URL || 'http://localhost:16686';
    return `${jaegerUrl}/trace/${scanId}`;
  }

  /**
   * Sanitize environment variables
   */
  private sanitizeEnvironment(): Record<string, string> {
    const env: Record<string, string> = {};
    const safeKeys = [
      'NODE_ENV',
      'PORT',
      'LOG_LEVEL',
      'SCAN_TIMEOUT',
      'MIN_POOL_SIZE',
      'MAX_POOL_SIZE',
    ];

    for (const key of safeKeys) {
      if (process.env[key]) {
        env[key] = process.env[key]!;
      }
    }

    return env;
  }

  /**
   * Sanitize HTTP headers
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const blockedHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers)) {
      if (!blockedHeaders.includes(key.toLowerCase())) {
        sanitized[key] = value;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request body
   */
  private sanitizeBody(body: any): any {
    if (typeof body !== 'object') {
      return body;
    }

    // Deep clone and redact sensitive fields
    const sanitized = JSON.parse(JSON.stringify(body));

    // TODO: Implement recursive sanitization
    return sanitized;
  }

  /**
   * Get installed dependencies
   */
  private getInstalledDependencies(): Record<string, string> {
    try {
      const packageJson = require('../../../package.json');
      return packageJson.dependencies || {};
    } catch (error) {
      log.error('Failed to load dependencies', error as Error);
      return {};
    }
  }

  /**
   * List all recordings
   */
  async listRecordings(): Promise<
    Array<{
      scanId: string;
      url: string;
      timestamp: Date;
      requestCount: number;
    }>
  > {
    // TODO: Query filesystem or database
    return Array.from(this.recordings.values()).map((rec) => ({
      scanId: rec.scanId,
      url: rec.url,
      timestamp: rec.timestamp,
      requestCount: rec.requests.length,
    }));
  }

  /**
   * Delete recording
   */
  async deleteRecording(scanId: string): Promise<void> {
    this.recordings.delete(scanId);
    log.info('Recording deleted', { scanId });
  }
}

// Singleton instance
export const replayEngine = new ReplayEngine();
export default replayEngine;
