/**
 * Worker Attestation Service
 *
 * Cryptographic signing of scan workers for surgical cache invalidation
 * Enables identification and revocation of compromised workers
 */

import { createSign, createVerify, generateKeyPairSync, createHash } from 'crypto';
import { log } from '../utils/logger';

interface WorkerIdentity {
  workerId: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
}

interface ScanAttestation {
  workerId: string;
  scanId: string;
  signature: string;
  timestamp: number;
  version: string;
}

interface ScanResult {
  scanId: string;
  url: string;
  violations: any[];
  complianceScore: number;
  metadata: any;
}

class WorkerAttestation {
  private identity: WorkerIdentity | null = null;
  private revokedWorkers: Set<string> = new Set();

  constructor() {
    this.initializeIdentity();
    this.loadRevokedWorkers();
  }

  /**
   * Generate unique RSA keypair for this worker instance
   */
  private initializeIdentity(): void {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // Generate deterministic worker ID from public key
    const workerId = createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 16);

    this.identity = {
      workerId,
      publicKey,
      privateKey,
      createdAt: new Date(),
    };

    log.info('Worker identity initialized', {
      workerId: this.identity.workerId,
      hostname: process.env.HOSTNAME,
    });
  }

  /**
   * Load list of revoked workers from persistent storage
   */
  private async loadRevokedWorkers(): Promise<void> {
    try {
      // TODO: Load from database or Redis
      // For now, use environment variable
      const revoked = process.env.REVOKED_WORKERS?.split(',') || [];
      this.revokedWorkers = new Set(revoked);

      log.info('Loaded revoked workers list', {
        count: this.revokedWorkers.size,
      });
    } catch (error) {
      log.error('Failed to load revoked workers', error as Error);
    }
  }

  /**
   * Sign scan result with worker's private key
   */
  signScanResult(scanData: ScanResult): ScanAttestation {
    if (!this.identity) {
      throw new Error('Worker identity not initialized');
    }

    // Create canonical representation for signing
    const canonical = JSON.stringify({
      scanId: scanData.scanId,
      url: scanData.url,
      violationCount: scanData.violations.length,
      complianceScore: scanData.complianceScore,
      timestamp: Date.now(),
    });

    const sign = createSign('SHA256');
    sign.update(canonical);
    sign.end();

    const signature = sign.sign(this.identity.privateKey, 'base64');

    const attestation: ScanAttestation = {
      workerId: this.identity.workerId,
      scanId: scanData.scanId,
      signature,
      timestamp: Date.now(),
      version: '1.0',
    };

    log.debug('Scan result signed', {
      scanId: scanData.scanId,
      workerId: this.identity.workerId,
    });

    return attestation;
  }

  /**
   * Verify scan result signature
   */
  static verifyScanResult(
    scanData: ScanResult,
    attestation: ScanAttestation,
    publicKey: string
  ): boolean {
    try {
      const canonical = JSON.stringify({
        scanId: scanData.scanId,
        url: scanData.url,
        violationCount: scanData.violations.length,
        complianceScore: scanData.complianceScore,
        timestamp: attestation.timestamp,
      });

      const verify = createVerify('SHA256');
      verify.update(canonical);
      verify.end();

      const isValid = verify.verify(publicKey, attestation.signature, 'base64');

      return isValid;
    } catch (error) {
      log.error('Signature verification failed', error as Error, {
        scanId: scanData.scanId,
        workerId: attestation.workerId,
      });
      return false;
    }
  }

  /**
   * Check if worker is revoked
   */
  isWorkerRevoked(workerId: string): boolean {
    return this.revokedWorkers.has(workerId);
  }

  /**
   * Revoke compromised worker and invalidate all its scans
   */
  static async revokeWorker(
    workerId: string,
    reason: string
  ): Promise<{
    invalidatedScans: number;
    affectedTimeRange: { start: Date; end: Date };
  }> {
    log.warn('Revoking worker', { workerId, reason });

    // TODO: Implement database queries
    // For now, return mock data
    const result = {
      invalidatedScans: 0,
      affectedTimeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };

    // Mark worker as revoked in persistent storage
    // await redis.sadd('revoked_workers', workerId);

    // Find all scans signed by this worker
    // const scans = await prisma.scan.findMany({
    //   where: { workerId },
    // });

    // Invalidate those scans
    // await prisma.scan.updateMany({
    //   where: { workerId },
    //   data: { isValid: false, invalidatedAt: new Date(), invalidationReason: reason },
    // });

    // Invalidate cache entries
    // await redis.del(`scan:*:worker:${workerId}`);

    log.auditLog('worker_revoked', 'system', workerId, {
      reason,
      invalidatedScans: result.invalidatedScans,
    });

    return result;
  }

  /**
   * Get blast radius for a compromised worker
   */
  static async getWorkerBlastRadius(workerId: string): Promise<{
    totalScans: number;
    affectedUsers: string[];
    affectedUrls: string[];
    dateRange: { start: Date; end: Date };
  }> {
    // TODO: Query database for worker's scan history
    return {
      totalScans: 0,
      affectedUsers: [],
      affectedUrls: [],
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }

  /**
   * Generate worker health report
   */
  async generateHealthReport(): Promise<{
    workerId: string;
    uptime: number;
    scansProcessed: number;
    averageProcessingTime: number;
    errorRate: number;
    lastSeen: Date;
  }> {
    if (!this.identity) {
      throw new Error('Worker identity not initialized');
    }

    const uptime = Date.now() - this.identity.createdAt.getTime();

    // TODO: Gather metrics from database
    return {
      workerId: this.identity.workerId,
      uptime,
      scansProcessed: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      lastSeen: new Date(),
    };
  }

  /**
   * Get current worker ID
   */
  getWorkerId(): string {
    if (!this.identity) {
      throw new Error('Worker identity not initialized');
    }
    return this.identity.workerId;
  }

  /**
   * Get public key for verification
   */
  getPublicKey(): string {
    if (!this.identity) {
      throw new Error('Worker identity not initialized');
    }
    return this.identity.publicKey;
  }
}

// Singleton instance
export const workerAttestation = new WorkerAttestation();
export default workerAttestation;
