/**
 * Audit Log Service
 *
 * Cryptographically signed, immutable audit logs stored in S3
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createSign, createVerify, createHash } from 'crypto';
import { log } from '../utils/logger';

interface AuditLogEntry {
  scanId: string;
  timestamp: string;
  scannerVersion: string;
  wcagRulesVersion: string;
  url: string;
  userId?: string;
  violations: any[];
  complianceScore: number;
  modelVersion: string;
  workerId: string;
  duration: number;
  signature?: string;
  sha256?: string;
}

interface ExportRequest {
  clientId: string;
  startDate: Date;
  endDate: Date;
  includeViolations?: boolean;
}

class AuditLog {
  private s3Client: S3Client;
  private bucket: string;
  private signingKey: string | null;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucket = process.env.AUDIT_LOG_BUCKET || 'wcagai-audit-logs';
    this.signingKey = process.env.SIGNING_PRIVATE_KEY || null;

    if (!this.signingKey) {
      log.warn('Audit log signing key not configured');
    }
  }

  /**
   * Log a completed scan to S3
   */
  async logScan(entry: Omit<AuditLogEntry, 'timestamp' | 'signature' | 'sha256'>): Promise<void> {
    const timestamp = new Date().toISOString();

    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp,
      workerId: process.env.HOSTNAME || 'unknown',
    };

    // Calculate SHA256 hash
    const entryJson = JSON.stringify(logEntry);
    logEntry.sha256 = createHash('sha256').update(entryJson).digest('hex');

    // Sign the entry
    if (this.signingKey) {
      logEntry.signature = this.sign(logEntry);
    }

    // Store in S3
    const key = this.generateKey(entry.scanId, timestamp);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: JSON.stringify(logEntry, null, 2),
          ContentType: 'application/json',
          ServerSideEncryption: 'aws:kms',
          StorageClass: 'GLACIER_IR', // Immediate retrieval Glacier (cheaper for long-term)
          Metadata: {
            scanId: entry.scanId,
            sha256: logEntry.sha256 || '',
            userId: entry.userId || 'anonymous',
          },
          Tagging: `environment=${process.env.NODE_ENV || 'production'}&compliance=SOC2`,
        })
      );

      log.auditLog('scan_logged', entry.userId || 'anonymous', entry.scanId, {
        url: entry.url,
        violations: entry.violations.length,
        complianceScore: entry.complianceScore,
      });
    } catch (error) {
      log.error('Failed to write audit log to S3', error as Error, {
        scanId: entry.scanId,
        key,
      });
      throw error;
    }
  }

  /**
   * Generate S3 key for audit log
   */
  private generateKey(scanId: string, timestamp: string): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Partition by date for efficient querying
    return `scans/${year}/${month}/${day}/${scanId}/${Date.now()}.json`;
  }

  /**
   * Sign audit log entry with private key
   */
  private sign(entry: AuditLogEntry): string {
    if (!this.signingKey) {
      throw new Error('Signing key not configured');
    }

    const sign = createSign('SHA256');
    sign.update(JSON.stringify(entry));
    sign.end();

    return sign.sign(this.signingKey, 'base64');
  }

  /**
   * Verify audit log signature
   */
  verifySignature(entry: AuditLogEntry, publicKey: string): boolean {
    if (!entry.signature) {
      return false;
    }

    const signature = entry.signature;
    const entryWithoutSignature = { ...entry };
    delete entryWithoutSignature.signature;

    const verify = createVerify('SHA256');
    verify.update(JSON.stringify(entryWithoutSignature));
    verify.end();

    return verify.verify(publicKey, signature, 'base64');
  }

  /**
   * Retrieve audit log from S3
   */
  async getAuditLog(scanId: string, timestamp: string): Promise<AuditLogEntry | null> {
    const key = this.generateKey(scanId, timestamp);

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        return null;
      }

      const body = await response.Body.transformToString();
      return JSON.parse(body) as AuditLogEntry;
    } catch (error) {
      log.error('Failed to retrieve audit log from S3', error as Error, {
        scanId,
        key,
      });
      return null;
    }
  }

  /**
   * Export audit logs for a client (compliance requirement)
   */
  async exportForClient(request: ExportRequest): Promise<{
    logs: AuditLogEntry[];
    manifest: {
      totalScans: number;
      dateRange: { start: string; end: string };
      generatedAt: string;
      signature: string;
    };
  }> {
    log.info('Generating audit log export', {
      clientId: request.clientId,
      startDate: request.startDate,
      endDate: request.endDate,
    });

    // TODO: Implement S3 query by date range and userId
    // For now, return a stub
    const logs: AuditLogEntry[] = [];

    const manifest = {
      totalScans: logs.length,
      dateRange: {
        start: request.startDate.toISOString(),
        end: request.endDate.toISOString(),
      },
      generatedAt: new Date().toISOString(),
      signature: this.signingKey
        ? this.sign({
            scanId: 'export',
            timestamp: new Date().toISOString(),
            scannerVersion: '1.0.0',
            wcagRulesVersion: '1.0.0',
            url: 'export',
            violations: [],
            complianceScore: 0,
            modelVersion: '',
            workerId: '',
            duration: 0,
          } as AuditLogEntry)
        : 'unsigned',
    };

    log.auditLog('export_generated', request.clientId, 'audit-logs', {
      totalScans: logs.length,
    });

    return { logs, manifest };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalScans: number;
    averageComplianceScore: number;
    topViolations: Array<{ guideline: string; count: number }>;
    dateRange: { start: string; end: string };
  }> {
    // TODO: Aggregate data from S3 or maintain a separate database index
    return {
      totalScans: 0,
      averageComplianceScore: 0,
      topViolations: [],
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }
}

export const auditLog = new AuditLog();
export default auditLog;
