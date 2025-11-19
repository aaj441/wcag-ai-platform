/**
 * State Replay Engine
 * 
 * Records and replays the exact state of any scan for debugging purposes.
 * Uses Polly.js to capture HTTP interactions and allows diffing between
 * original and replayed scan results.
 * 
 * @module replayEngine
 */

const { Polly } = require('@pollyjs/core');
const FSPersister = require('@pollyjs/persister-fs');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { diff } = require('deep-diff');
const { sanitizeIdentifier, safePathJoin } = require('../utils/securityUtils');

// Register adapters and persisters
Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

/**
 * Replay Engine for debugging scans
 */
class ReplayEngine {
  constructor() {
    this.recordingsPath = process.env.REPLAY_RECORDINGS_PATH || './data/replay-recordings';
    this.activeSessions = new Map(); // scanId -> { polly, metadata }
    this.recordingIndex = new Map(); // scanId -> { path, timestamp, metadata }
  }

  /**
   * Initialize the replay engine
   */
  async initialize() {
    try {
      await fs.mkdir(this.recordingsPath, { recursive: true });
      await this.loadRecordingIndex();
      console.log('✅ Replay Engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Replay Engine:', error);
      throw error;
    }
  }

  /**
   * Start recording a scan session
   * @param {string} scanId - Unique scan identifier
   * @param {Object} metadata - Scan metadata (url, options, user, etc.)
   * @returns {Object} Recording session info
   */
  async startRecording(scanId, metadata = {}) {
    if (this.activeSessions.has(scanId)) {
      throw new Error(`Recording already active for scan ${scanId}`);
    }

    const recordingName = this.generateRecordingName(scanId);
    
    // Create Polly instance for this scan
    const polly = new Polly(recordingName, {
      adapters: ['node-http'],
      persister: 'fs',
      persisterOptions: {
        fs: {
          recordingsDir: this.recordingsPath
        }
      },
      recordIfMissing: true,
      recordFailedRequests: true,
      matchRequestsBy: {
        method: true,
        headers: {
          exclude: ['authorization', 'x-api-key', 'cookie']
        },
        body: true,
        order: false
      }
    });

    const sessionInfo = {
      scanId,
      recordingName,
      polly,
      metadata: {
        ...metadata,
        startTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      events: [],
      state: {}
    };

    this.activeSessions.set(scanId, sessionInfo);

    console.log(`🔴 Recording started: ${scanId}`);
    
    return {
      scanId,
      recordingName,
      status: 'recording'
    };
  }

  /**
   * Stop recording and save the session
   * @param {string} scanId - Scan identifier
   * @param {Object} finalState - Final state of the scan
   * @returns {Object} Recording info
   */
  async stopRecording(scanId, finalState = {}) {
    const session = this.activeSessions.get(scanId);
    if (!session) {
      throw new Error(`No active recording for scan ${scanId}`);
    }

    // Stop Polly recording
    await session.polly.stop();

    // Save final state and metadata
    const recordingInfo = {
      scanId,
      recordingName: session.recordingName,
      metadata: session.metadata,
      finalState,
      events: session.events,
      recordedAt: new Date().toISOString(),
      duration: Date.now() - new Date(session.metadata.startTime).getTime()
    };

    await this.saveRecordingMetadata(scanId, recordingInfo);
    this.recordingIndex.set(scanId, recordingInfo);
    this.activeSessions.delete(scanId);

    console.log(`⏹️  Recording stopped: ${scanId}`);
    
    return recordingInfo;
  }

  /**
   * Log an event during recording
   * @param {string} scanId - Scan identifier
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   */
  logEvent(scanId, eventType, eventData) {
    const session = this.activeSessions.get(scanId);
    if (!session) {
      console.warn(`⚠️  No active recording for scan ${scanId}`);
      return;
    }

    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data: eventData
    };

    session.events.push(event);
  }

  /**
   * Update state during recording
   * @param {string} scanId - Scan identifier
   * @param {Object} stateUpdate - State update
   */
  updateState(scanId, stateUpdate) {
    const session = this.activeSessions.get(scanId);
    if (!session) {
      console.warn(`⚠️  No active recording for scan ${scanId}`);
      return;
    }

    session.state = {
      ...session.state,
      ...stateUpdate,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Replay a recorded scan session
   * @param {string} scanId - Scan identifier
   * @param {Object} options - Replay options
   * @returns {Object} Replay results
   */
  async replayScan(scanId, options = {}) {
    const recordingInfo = this.recordingIndex.get(scanId);
    if (!recordingInfo) {
      throw new Error(`No recording found for scan ${scanId}`);
    }

    const replayId = `${scanId}_replay_${Date.now()}`;
    
    // Create Polly instance in replay mode
    const polly = new Polly(recordingInfo.recordingName, {
      adapters: ['node-http'],
      persister: 'fs',
      persisterOptions: {
        fs: {
          recordingsDir: this.recordingsPath
        }
      },
      mode: 'replay', // Replay recorded interactions
      recordIfMissing: false
    });

    const replaySession = {
      scanId: replayId,
      originalScanId: scanId,
      polly,
      startTime: new Date().toISOString(),
      events: [],
      state: {}
    };

    this.activeSessions.set(replayId, replaySession);

    console.log(`▶️  Replaying scan: ${scanId} -> ${replayId}`);

    return {
      replayId,
      originalScanId: scanId,
      polly,
      metadata: recordingInfo.metadata
    };
  }

  /**
   * Stop replay and compare results
   * @param {string} replayId - Replay identifier
   * @param {Object} replayResults - Results from replay
   * @returns {Object} Comparison results
   */
  async stopReplay(replayId, replayResults = {}) {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      throw new Error(`No active replay for ${replayId}`);
    }

    await session.polly.stop();
    
    const originalRecording = this.recordingIndex.get(session.originalScanId);
    
    // Compare original and replay results
    const comparison = this.compareResults(
      originalRecording.finalState,
      replayResults
    );

    const replayInfo = {
      replayId,
      originalScanId: session.originalScanId,
      replayedAt: new Date().toISOString(),
      duration: Date.now() - new Date(session.startTime).getTime(),
      comparison
    };

    this.activeSessions.delete(replayId);

    console.log(`⏹️  Replay stopped: ${replayId}`);
    
    return replayInfo;
  }

  /**
   * Compare original and replayed results
   * @private
   */
  compareResults(original, replayed) {
    const differences = diff(original, replayed) || [];
    
    const categorized = {
      identical: differences.length === 0,
      differences: differences.map(d => ({
        kind: d.kind,
        path: d.path ? d.path.join('.') : 'root',
        original: d.lhs,
        replayed: d.rhs,
        type: this.getDifferenceType(d.kind)
      })),
      summary: {
        totalDifferences: differences.length,
        newInReplay: differences.filter(d => d.kind === 'N').length,
        deletedInReplay: differences.filter(d => d.kind === 'D').length,
        edited: differences.filter(d => d.kind === 'E').length,
        arrayChanges: differences.filter(d => d.kind === 'A').length
      }
    };

    return categorized;
  }

  /**
   * Get human-readable difference type
   * @private
   */
  getDifferenceType(kind) {
    const types = {
      'N': 'new',
      'D': 'deleted',
      'E': 'edited',
      'A': 'array-change'
    };
    return types[kind] || 'unknown';
  }

  /**
   * Get recording by scan ID
   * @param {string} scanId - Scan identifier
   * @returns {Object} Recording info
   */
  getRecording(scanId) {
    return this.recordingIndex.get(scanId) || null;
  }

  /**
   * List all recordings
   * @param {Object} filters - Filter options
   * @returns {Array} List of recordings
   */
  listRecordings(filters = {}) {
    let recordings = Array.from(this.recordingIndex.values());

    // Apply filters
    if (filters.startDate) {
      recordings = recordings.filter(r => 
        new Date(r.recordedAt) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      recordings = recordings.filter(r => 
        new Date(r.recordedAt) <= new Date(filters.endDate)
      );
    }

    if (filters.userId) {
      recordings = recordings.filter(r => 
        r.metadata.userId === filters.userId
      );
    }

    // Sort by date (newest first)
    recordings.sort((a, b) => 
      new Date(b.recordedAt) - new Date(a.recordedAt)
    );

    return recordings.map(r => ({
      scanId: r.scanId,
      recordedAt: r.recordedAt,
      duration: r.duration,
      metadata: r.metadata,
      eventCount: r.events.length
    }));
  }

  /**
   * Delete a recording
   * @param {string} scanId - Scan identifier
   */
  async deleteRecording(scanId) {
    try {
      // Sanitize scanId to prevent path traversal
      const sanitizedScanId = sanitizeIdentifier(scanId);

      const recording = this.recordingIndex.get(sanitizedScanId);
      if (!recording) {
        throw new Error(`Recording not found: ${scanId}`);
      }

      // Delete recording files using safe path joining
      const recordingPath = safePathJoin(this.recordingsPath, `${recording.recordingName}.har`);
      const metadataPath = safePathJoin(this.recordingsPath, `${sanitizedScanId}_metadata.json`);

      await fs.unlink(recordingPath).catch(() => {});
      await fs.unlink(metadataPath).catch(() => {});

      this.recordingIndex.delete(sanitizedScanId);

      console.log(`🗑️  Recording deleted: ${scanId}`);
    } catch (error) {
      console.error(`Failed to delete recording ${scanId}:`, error);
      throw error;
    }
  }

  /**
   * Export recording for sharing/analysis
   * @param {string} scanId - Scan identifier
   * @returns {Object} Exported recording data
   */
  async exportRecording(scanId) {
    try {
      // Sanitize scanId to prevent path traversal
      const sanitizedScanId = sanitizeIdentifier(scanId);

      const recording = this.recordingIndex.get(sanitizedScanId);
      if (!recording) {
        throw new Error(`Recording not found: ${scanId}`);
      }

      const recordingPath = safePathJoin(this.recordingsPath, `${recording.recordingName}.har`);
      const harContent = await fs.readFile(recordingPath, 'utf8');

      return {
        scanId: sanitizedScanId,
        recordedAt: recording.recordedAt,
        metadata: recording.metadata,
        events: recording.events,
        finalState: recording.finalState,
        harFile: harContent,
        duration: recording.duration
      };
    } catch (error) {
      console.error(`Failed to export recording ${scanId}:`, error);
      throw error;
    }
  }

  /**
   * Generate recording name
   * @private
   */
  generateRecordingName(scanId) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(scanId).digest('hex').substring(0, 8);
    return `scan_${hash}_${timestamp}`;
  }

  /**
   * Save recording metadata
   * @private
   */
  async saveRecordingMetadata(scanId, recordingInfo) {
    try {
      // Sanitize scanId to prevent path traversal
      const sanitizedScanId = sanitizeIdentifier(scanId);
      const metadataPath = safePathJoin(this.recordingsPath, `${sanitizedScanId}_metadata.json`);
      await fs.writeFile(metadataPath, JSON.stringify(recordingInfo, null, 2));
    } catch (error) {
      console.error(`Failed to save metadata for ${scanId}:`, error);
      throw error;
    }
  }

  /**
   * Load recording index from disk
   * @private
   */
  async loadRecordingIndex() {
    try {
      const files = await fs.readdir(this.recordingsPath);
      const metadataFiles = files.filter(f => f.endsWith('_metadata.json'));

      for (const file of metadataFiles) {
        try {
          // Safe path joining - file comes from fs.readdir
          const metadataPath = safePathJoin(this.recordingsPath, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

          // Sanitize scanId from metadata
          const sanitizedScanId = sanitizeIdentifier(metadata.scanId);
          this.recordingIndex.set(sanitizedScanId, metadata);
        } catch (error) {
          console.warn(`Failed to load metadata file ${file}:`, error.message);
        }
      }

      console.log(`📦 Loaded ${this.recordingIndex.size} recordings`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading recording index:', error);
      }
    }
  }

  /**
   * Get statistics about recordings
   */
  getStats() {
    const recordings = Array.from(this.recordingIndex.values());
    
    return {
      totalRecordings: recordings.length,
      activeRecordings: this.activeSessions.size,
      oldestRecording: recordings.length > 0 
        ? recordings.reduce((oldest, r) => 
            new Date(r.recordedAt) < new Date(oldest.recordedAt) ? r : oldest
          ).recordedAt
        : null,
      newestRecording: recordings.length > 0
        ? recordings.reduce((newest, r) => 
            new Date(r.recordedAt) > new Date(newest.recordedAt) ? r : newest
          ).recordedAt
        : null,
      totalDuration: recordings.reduce((sum, r) => sum + (r.duration || 0), 0),
      averageDuration: recordings.length > 0 
        ? recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / recordings.length
        : 0
    };
  }
}

// Export singleton instance
const replayEngine = new ReplayEngine();

module.exports = {
  ReplayEngine,
  replayEngine,
  
  // Convenience methods
  startRecording: (scanId, metadata) => replayEngine.startRecording(scanId, metadata),
  stopRecording: (scanId, finalState) => replayEngine.stopRecording(scanId, finalState),
  logEvent: (scanId, eventType, eventData) => replayEngine.logEvent(scanId, eventType, eventData),
  updateState: (scanId, stateUpdate) => replayEngine.updateState(scanId, stateUpdate),
  replayScan: (scanId, options) => replayEngine.replayScan(scanId, options),
  stopReplay: (replayId, replayResults) => replayEngine.stopReplay(replayId, replayResults),
  getRecording: (scanId) => replayEngine.getRecording(scanId),
  listRecordings: (filters) => replayEngine.listRecordings(filters),
  deleteRecording: (scanId) => replayEngine.deleteRecording(scanId),
  exportRecording: (scanId) => replayEngine.exportRecording(scanId),
  getStats: () => replayEngine.getStats(),
  initialize: () => replayEngine.initialize()
};
