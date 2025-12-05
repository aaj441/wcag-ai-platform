/**
 * Worker Identity & Attestation System
 * 
 * Provides cryptographic attestation for scan results from distributed workers.
 * Allows surgical invalidation of results from compromised workers without
 * affecting the entire cache.
 * 
 * @module workerIdentity
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { sanitizeIdentifier, safePathJoin } = require('../utils/securityUtils');

/**
 * Worker Identity Manager
 * Manages worker registration, attestation, and result signing
 */
class WorkerIdentityManager {
  constructor() {
    this.workers = new Map(); // workerId -> { publicKey, privateKey, status, lastSeen }
    this.signedResults = new Map(); // resultId -> { workerId, signature, timestamp, data }
    this.revokedWorkers = new Set();
    this.keystorePath = process.env.WORKER_KEYSTORE_PATH || './data/worker-keys';
  }

  /**
   * Initialize the worker identity system
   */
  async initialize() {
    try {
      await fs.mkdir(this.keystorePath, { recursive: true });
      await this.loadWorkerKeys();
      console.log('✅ Worker Identity System initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Worker Identity System:', error);
      throw error;
    }
  }

  /**
   * Register a new worker and generate key pair
   * @param {string} workerId - Unique worker identifier
   * @param {Object} metadata - Worker metadata (hostname, region, etc.)
   * @returns {Object} Worker registration info with public key
   */
  async registerWorker(workerId, metadata = {}) {
    try {
      // Sanitize workerId to prevent path traversal
      const sanitizedWorkerId = sanitizeIdentifier(workerId);

      if (this.workers.has(sanitizedWorkerId)) {
        throw new Error(`Worker ${sanitizedWorkerId} already registered`);
      }

      // Generate RSA key pair for worker
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: process.env.WORKER_KEY_PASSPHRASE || 'default-passphrase'
        }
      });

      const workerInfo = {
        workerId: sanitizedWorkerId,
        publicKey,
        privateKey,
        status: 'active',
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        metadata
      };

      this.workers.set(sanitizedWorkerId, workerInfo);
      await this.saveWorkerKey(sanitizedWorkerId, workerInfo);

      console.log(`✅ Worker registered: ${sanitizedWorkerId}`);
      return {
        workerId: sanitizedWorkerId,
        publicKey,
        status: 'active',
        registeredAt: workerInfo.registeredAt
      };
    } catch (error) {
      console.error(`Failed to register worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Sign a scan result with worker's private key
   * @param {string} workerId - Worker ID
   * @param {Object} scanResult - Scan result data
   * @returns {Object} Signed result with signature
   */
  signScanResult(workerId, scanResult) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    if (this.revokedWorkers.has(workerId)) {
      throw new Error(`Worker ${workerId} has been revoked`);
    }

    // Create canonical representation of result for signing
    const canonical = this.canonicalize(scanResult);
    const resultId = crypto.createHash('sha256').update(canonical).digest('hex');

    // Sign the canonical form
    const sign = crypto.createSign('SHA256');
    sign.update(canonical);
    sign.end();

    const signature = sign.sign({
      key: worker.privateKey,
      passphrase: process.env.WORKER_KEY_PASSPHRASE || 'default-passphrase'
    }, 'base64');

    const signedResult = {
      resultId,
      workerId,
      signature,
      timestamp: new Date().toISOString(),
      data: scanResult
    };

    this.signedResults.set(resultId, signedResult);
    worker.lastSeen = new Date().toISOString();

    return signedResult;
  }

  /**
   * Verify a signed scan result
   * @param {Object} signedResult - Signed result to verify
   * @returns {boolean} True if signature is valid
   */
  verifyScanResult(signedResult) {
    const { workerId, signature, data } = signedResult;

    const worker = this.workers.get(workerId);
    if (!worker) {
      console.warn(`⚠️  Worker ${workerId} not found`);
      return false;
    }

    if (this.revokedWorkers.has(workerId)) {
      console.warn(`⚠️  Worker ${workerId} has been revoked`);
      return false;
    }

    try {
      const canonical = this.canonicalize(data);
      const verify = crypto.createVerify('SHA256');
      verify.update(canonical);
      verify.end();

      return verify.verify(worker.publicKey, signature, 'base64');
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Revoke a worker (e.g., if compromised)
   * This allows surgical invalidation of all results from this worker
   * @param {string} workerId - Worker to revoke
   * @param {string} reason - Reason for revocation
   */
  async revokeWorker(workerId, reason = 'Manual revocation') {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    this.revokedWorkers.add(workerId);
    worker.status = 'revoked';
    worker.revokedAt = new Date().toISOString();
    worker.revocationReason = reason;

    await this.saveWorkerKey(workerId, worker);

    console.log(`🚨 Worker revoked: ${workerId} - Reason: ${reason}`);

    // Return list of affected results for cache invalidation
    const affectedResults = Array.from(this.signedResults.values())
      .filter(result => result.workerId === workerId)
      .map(result => result.resultId);

    return {
      workerId,
      affectedResultsCount: affectedResults.length,
      affectedResults
    };
  }

  /**
   * Get all results from a specific worker
   * @param {string} workerId - Worker ID
   * @returns {Array} Array of results from this worker
   */
  getResultsByWorker(workerId) {
    return Array.from(this.signedResults.values())
      .filter(result => result.workerId === workerId);
  }

  /**
   * Invalidate all cached results from a revoked worker
   * @param {string} workerId - Worker ID
   * @returns {Array} List of invalidated result IDs
   */
  invalidateWorkerResults(workerId) {
    if (!this.revokedWorkers.has(workerId)) {
      throw new Error(`Worker ${workerId} is not revoked`);
    }

    const invalidatedResults = [];
    for (const [resultId, result] of this.signedResults.entries()) {
      if (result.workerId === workerId) {
        this.signedResults.delete(resultId);
        invalidatedResults.push(resultId);
      }
    }

    console.log(`🗑️  Invalidated ${invalidatedResults.length} results from worker ${workerId}`);
    return invalidatedResults;
  }

  /**
   * Get worker status and statistics
   * @param {string} workerId - Worker ID
   * @returns {Object} Worker status information
   */
  getWorkerStatus(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return null;
    }

    const resultCount = Array.from(this.signedResults.values())
      .filter(r => r.workerId === workerId).length;

    return {
      workerId,
      status: worker.status,
      registeredAt: worker.registeredAt,
      lastSeen: worker.lastSeen,
      revokedAt: worker.revokedAt,
      revocationReason: worker.revocationReason,
      resultCount,
      metadata: worker.metadata
    };
  }

  /**
   * Get system-wide statistics
   * @returns {Object} System statistics
   */
  getSystemStats() {
    const activeWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'active').length;
    const revokedWorkers = this.revokedWorkers.size;
    const totalResults = this.signedResults.size;

    return {
      totalWorkers: this.workers.size,
      activeWorkers,
      revokedWorkers,
      totalResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create canonical representation of data for signing
   * @private
   */
  canonicalize(data) {
    // Sort keys and create deterministic JSON representation
    const sortedKeys = Object.keys(data).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const sorted = JSON.stringify(data, sortedKeys);
    return sorted;
  }

  /**
   * Save worker key to persistent storage
   * @private
   */
  async saveWorkerKey(workerId, workerInfo) {
    try {
      // Sanitize workerId to prevent path traversal
      const sanitizedWorkerId = sanitizeIdentifier(workerId);
      const keyPath = safePathJoin(this.keystorePath, `${sanitizedWorkerId}.json`);

      const keyData = {
        workerId: workerInfo.workerId,
        publicKey: workerInfo.publicKey,
        privateKey: workerInfo.privateKey,
        status: workerInfo.status,
        registeredAt: workerInfo.registeredAt,
        lastSeen: workerInfo.lastSeen,
        revokedAt: workerInfo.revokedAt,
        revocationReason: workerInfo.revocationReason,
        metadata: workerInfo.metadata
      };

      await fs.writeFile(keyPath, JSON.stringify(keyData, null, 2));
    } catch (error) {
      console.error(`Failed to save worker key for ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Load worker keys from persistent storage
   * @private
   */
    async loadWorkerKeys() {
    try {
      const files = await fs.readdir(this.keystorePath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // Load all files in parallel for better performance
      const loadPromises = jsonFiles.map(async (file) => {
        try {
          // Safe path joining - file comes from fs.readdir
          const keyPath = safePathJoin(this.keystorePath, file);
          const keyData = JSON.parse(await fs.readFile(keyPath, 'utf8'));
          
          // Sanitize workerId from loaded data
          const sanitizedWorkerId = sanitizeIdentifier(keyData.workerId);
          keyData.workerId = sanitizedWorkerId;
          
          return keyData;
        } catch (error) {
          console.warn(`Failed to load worker key file ${file}:`, error.message);
          return null;
        }
      });
      
      const allKeyData = await Promise.all(loadPromises);
      
      // Process loaded data (filter out nulls from failed loads)
      for (const keyData of allKeyData) {
        if (!keyData) continue;
        
        this.workers.set(keyData.workerId, keyData);
        
        if (keyData.status === 'revoked') {
          this.revokedWorkers.add(keyData.workerId);
        }
      }
      console.log(`📦 Loaded ${this.workers.size} worker keys`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading worker keys:', error);
      }
    }
  }
}

// Export singleton instance
const workerIdentityManager = new WorkerIdentityManager();

module.exports = {
  WorkerIdentityManager,
  workerIdentityManager,
  
  // Convenience methods
  registerWorker: (workerId, metadata) => workerIdentityManager.registerWorker(workerId, metadata),
  signScanResult: (workerId, scanResult) => workerIdentityManager.signScanResult(workerId, scanResult),
  verifyScanResult: (signedResult) => workerIdentityManager.verifyScanResult(signedResult),
  revokeWorker: (workerId, reason) => workerIdentityManager.revokeWorker(workerId, reason),
  invalidateWorkerResults: (workerId) => workerIdentityManager.invalidateWorkerResults(workerId),
  getWorkerStatus: (workerId) => workerIdentityManager.getWorkerStatus(workerId),
  getSystemStats: () => workerIdentityManager.getSystemStats(),
  initialize: () => workerIdentityManager.initialize()
};
