/**
 * AI Model Feedback Loop System
 * 
 * Captures user feedback on AI-generated findings, detects model drift,
 * and implements A/B testing with automatic model promotion when drift
 * is detected.
 * 
 * @module feedbackLoop
 */

const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Feedback Loop Manager
 */
class FeedbackLoopManager extends EventEmitter {
  constructor() {
    super();
    
    // Configuration
    this.config = {
      driftThreshold: 0.15,  // 15% dismissal rate triggers drift alert
      confidenceWindow: 100,  // Number of samples for confidence
      abTestSampleSize: 1000,  // Minimum samples for A/B test
      autoPromoteThreshold: 0.10,  // 10% improvement required for auto-promotion
    };

    // Model tracking
    this.models = new Map();  // modelId -> { version, status, metrics }
    this.activeModel = null;
    this.candidateModel = null;
    
    // Feedback storage
    this.feedback = [];  // Array of feedback entries
    this.dismissalsByModel = new Map();  // modelId -> dismissal count
    this.totalFindingsByModel = new Map();  // modelId -> total findings count
    
    // A/B test tracking
    this.abTestActive = false;
    this.abTestStartTime = null;
    this.abTestResults = new Map();  // modelId -> { shown, dismissed, acceptanceRate }
  }

  /**
   * Initialize the feedback loop system
   */
  async initialize() {
    // Register default models
    await this.registerModel('gpt-4-turbo', '1.0.0', 'active');
    this.activeModel = 'gpt-4-turbo';
    
    console.log('✅ Feedback Loop System initialized');
    console.log(`📊 Active model: ${this.activeModel}`);
  }

  /**
   * Register a model in the system
   */
  async registerModel(modelId, version, status = 'candidate') {
    const modelInfo = {
      modelId,
      version,
      status,  // 'active', 'candidate', 'deprecated'
      registeredAt: new Date().toISOString(),
      metrics: {
        totalFindings: 0,
        dismissals: 0,
        acceptances: 0,
        acceptanceRate: 1.0,
        avgConfidenceScore: 0,
        lastUpdated: new Date().toISOString()
      }
    };

    this.models.set(modelId, modelInfo);
    this.dismissalsByModel.set(modelId, 0);
    this.totalFindingsByModel.set(modelId, 0);

    console.log(`📝 Model registered: ${modelId} v${version} (${status})`);
    return modelInfo;
  }

  /**
   * Record user feedback on an AI-generated finding
   * @param {Object} feedback - Feedback data
   */
  recordFeedback(feedback) {
    const {
      findingId,
      modelId,
      modelVersion,
      action,  // 'dismiss', 'accept', 'modify'
      reason,
      userId,
      timestamp = new Date().toISOString(),
      findingDetails = {}
    } = feedback;

    const feedbackEntry = {
      feedbackId: this.generateFeedbackId(),
      findingId,
      modelId,
      modelVersion,
      action,
      reason,
      userId,
      timestamp,
      findingDetails
    };

    this.feedback.push(feedbackEntry);

    // Update model metrics
    this.updateModelMetrics(modelId, action);

    // Check for drift
    this.checkForDrift(modelId);

    // Emit event
    this.emit('feedback-recorded', feedbackEntry);

    console.log(`📝 Feedback recorded: ${action} on finding ${findingId} from ${modelId}`);

    return feedbackEntry;
  }

  /**
   * Update model metrics based on feedback
   * @private
   */
  updateModelMetrics(modelId, action) {
    const model = this.models.get(modelId);
    if (!model) return;

    const metrics = model.metrics;
    metrics.totalFindings += 1;

    if (action === 'dismiss') {
      metrics.dismissals += 1;
      this.dismissalsByModel.set(
        modelId, 
        this.dismissalsByModel.get(modelId) + 1
      );
    } else if (action === 'accept') {
      metrics.acceptances += 1;
    }

    this.totalFindingsByModel.set(
      modelId,
      this.totalFindingsByModel.get(modelId) + 1
    );

    // Calculate acceptance rate
    metrics.acceptanceRate = metrics.acceptances / metrics.totalFindings;
    metrics.lastUpdated = new Date().toISOString();

    // Calculate dismissal rate
    const dismissalRate = metrics.dismissals / metrics.totalFindings;
    metrics.dismissalRate = dismissalRate;
  }

  /**
   * Check if model is experiencing drift
   * @private
   */
  checkForDrift(modelId) {
    const model = this.models.get(modelId);
    if (!model) return;

    const metrics = model.metrics;
    
    // Need minimum sample size for confidence
    if (metrics.totalFindings < this.config.confidenceWindow) {
      return;
    }

    const dismissalRate = metrics.dismissalRate || 0;

    // Check if dismissal rate exceeds threshold
    if (dismissalRate > this.config.driftThreshold) {
      console.warn(`⚠️  Model drift detected for ${modelId}!`);
      console.warn(`   Dismissal rate: ${(dismissalRate * 100).toFixed(2)}%`);
      console.warn(`   Threshold: ${(this.config.driftThreshold * 100).toFixed(2)}%`);

      this.emit('drift-detected', {
        modelId,
        dismissalRate,
        threshold: this.config.driftThreshold,
        totalFindings: metrics.totalFindings,
        timestamp: new Date().toISOString()
      });

      // If this is the active model, initiate A/B test
      if (modelId === this.activeModel && !this.abTestActive) {
        this.initiateABTest();
      }
    }
  }

  /**
   * Initiate A/B test between active and candidate model
   */
  async initiateABTest() {
    if (this.abTestActive) {
      console.log('⚠️  A/B test already in progress');
      return;
    }

    // Check if we have a candidate model
    const candidateModels = Array.from(this.models.values())
      .filter(m => m.status === 'candidate');

    if (candidateModels.length === 0) {
      console.warn('⚠️  No candidate model available for A/B testing');
      this.emit('ab-test-no-candidate', {
        activeModel: this.activeModel,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Select the newest candidate
    this.candidateModel = candidateModels[candidateModels.length - 1].modelId;

    this.abTestActive = true;
    this.abTestStartTime = new Date().toISOString();
    
    // Initialize A/B test results
    this.abTestResults.set(this.activeModel, {
      shown: 0,
      dismissed: 0,
      accepted: 0,
      acceptanceRate: 0
    });
    this.abTestResults.set(this.candidateModel, {
      shown: 0,
      dismissed: 0,
      accepted: 0,
      acceptanceRate: 0
    });

    console.log(`🧪 A/B test initiated`);
    console.log(`   Control (A): ${this.activeModel}`);
    console.log(`   Candidate (B): ${this.candidateModel}`);

    this.emit('ab-test-started', {
      activeModel: this.activeModel,
      candidateModel: this.candidateModel,
      startTime: this.abTestStartTime
    });
  }

  /**
   * Get model assignment for A/B test
   * @param {string} userId - User ID for consistent assignment
   * @returns {string} Model ID to use
   */
  getModelForABTest(userId) {
    if (!this.abTestActive) {
      return this.activeModel;
    }

    // Use consistent hashing for user assignment
    const hash = crypto.createHash('md5')
      .update(userId + this.abTestStartTime)
      .digest('hex');
    
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const bucket = hashValue % 100;

    // 50/50 split
    return bucket < 50 ? this.activeModel : this.candidateModel;
  }

  /**
   * Record A/B test result
   * @param {string} modelId - Model that was used
   * @param {string} action - User action (dismiss, accept)
   */
  recordABTestResult(modelId, action) {
    if (!this.abTestActive) return;

    const results = this.abTestResults.get(modelId);
    if (!results) return;

    results.shown += 1;

    if (action === 'dismiss') {
      results.dismissed += 1;
    } else if (action === 'accept') {
      results.accepted += 1;
    }

    results.acceptanceRate = results.accepted / results.shown;

    // Check if we have enough samples to conclude
    const totalSamples = Array.from(this.abTestResults.values())
      .reduce((sum, r) => sum + r.shown, 0);

    if (totalSamples >= this.config.abTestSampleSize) {
      this.evaluateABTest();
    }
  }

  /**
   * Evaluate A/B test and decide on promotion
   * @private
   */
  evaluateABTest() {
    if (!this.abTestActive) return;

    const activeResults = this.abTestResults.get(this.activeModel);
    const candidateResults = this.abTestResults.get(this.candidateModel);

    const activeAcceptanceRate = activeResults.acceptanceRate;
    const candidateAcceptanceRate = candidateResults.acceptanceRate;

    const improvement = candidateAcceptanceRate - activeAcceptanceRate;
    const improvementPercent = (improvement / activeAcceptanceRate) * 100;

    console.log(`📊 A/B Test Results:`);
    console.log(`   ${this.activeModel}: ${(activeAcceptanceRate * 100).toFixed(2)}% acceptance`);
    console.log(`   ${this.candidateModel}: ${(candidateAcceptanceRate * 100).toFixed(2)}% acceptance`);
    console.log(`   Improvement: ${improvementPercent.toFixed(2)}%`);

    const testResult = {
      activeModel: this.activeModel,
      candidateModel: this.candidateModel,
      activeAcceptanceRate,
      candidateAcceptanceRate,
      improvement: improvementPercent,
      decision: 'no-change',
      timestamp: new Date().toISOString()
    };

    // Auto-promote if improvement exceeds threshold
    if (improvement > 0 && improvementPercent >= this.config.autoPromoteThreshold * 100) {
      console.log(`✅ Auto-promoting ${this.candidateModel} to active`);
      testResult.decision = 'promote';
      this.promoteModel(this.candidateModel);
    } else if (improvement < 0) {
      console.log(`❌ ${this.candidateModel} performs worse, keeping ${this.activeModel}`);
      testResult.decision = 'reject';
    } else {
      console.log(`⚠️  Improvement below threshold, keeping ${this.activeModel}`);
      testResult.decision = 'no-change';
    }

    this.abTestActive = false;
    this.emit('ab-test-completed', testResult);
  }

  /**
   * Promote a candidate model to active
   */
  promoteModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Demote current active model
    if (this.activeModel) {
      const oldModel = this.models.get(this.activeModel);
      if (oldModel) {
        oldModel.status = 'deprecated';
      }
    }

    // Promote new model
    model.status = 'active';
    this.activeModel = modelId;

    console.log(`🚀 Model promoted to active: ${modelId}`);

    this.emit('model-promoted', {
      modelId,
      version: model.version,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get feedback statistics
   */
  getStatistics() {
    const modelStats = Array.from(this.models.entries()).map(([id, model]) => ({
      modelId: id,
      version: model.version,
      status: model.status,
      metrics: model.metrics
    }));

    return {
      totalFeedback: this.feedback.length,
      models: modelStats,
      activeModel: this.activeModel,
      candidateModel: this.candidateModel,
      abTestActive: this.abTestActive,
      abTestResults: this.abTestActive ? 
        Object.fromEntries(this.abTestResults) : null
    };
  }

  /**
   * Get feedback by model
   */
  getFeedbackByModel(modelId) {
    return this.feedback.filter(f => f.modelId === modelId);
  }

  /**
   * Get recent feedback
   */
  getRecentFeedback(limit = 100) {
    return this.feedback.slice(-limit);
  }

  /**
   * Export feedback data for analysis
   */
  exportFeedbackData() {
    return {
      feedback: this.feedback,
      models: Array.from(this.models.entries()),
      statistics: this.getStatistics(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Generate unique feedback ID
   * @private
   */
  generateFeedbackId() {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
const feedbackLoopManager = new FeedbackLoopManager();

module.exports = {
  FeedbackLoopManager,
  feedbackLoopManager,
  
  // Convenience methods
  recordFeedback: (feedback) => feedbackLoopManager.recordFeedback(feedback),
  registerModel: (modelId, version, status) => feedbackLoopManager.registerModel(modelId, version, status),
  getModelForABTest: (userId) => feedbackLoopManager.getModelForABTest(userId),
  recordABTestResult: (modelId, action) => feedbackLoopManager.recordABTestResult(modelId, action),
  promoteModel: (modelId) => feedbackLoopManager.promoteModel(modelId),
  getStatistics: () => feedbackLoopManager.getStatistics(),
  getFeedbackByModel: (modelId) => feedbackLoopManager.getFeedbackByModel(modelId),
  getRecentFeedback: (limit) => feedbackLoopManager.getRecentFeedback(limit),
  exportFeedbackData: () => feedbackLoopManager.exportFeedbackData(),
  initialize: () => feedbackLoopManager.initialize()
};
