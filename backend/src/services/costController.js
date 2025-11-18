/**
 * Real-Time Cost Controller
 * 
 * Tracks AI token costs per user and model with hard kill-switch to prevent
 * budget overruns. Integrates with Grafana for real-time monitoring.
 * 
 * @module costController
 */

const EventEmitter = require('events');

/**
 * Cost tracking and control system
 */
class CostController extends EventEmitter {
  constructor() {
    super();
    
    // Configuration
    this.config = {
      dailyBudget: parseFloat(process.env.DAILY_AI_BUDGET || '100.00'),
      monthlyBudget: parseFloat(process.env.MONTHLY_AI_BUDGET || '2500.00'),
      perUserDailyLimit: parseFloat(process.env.PER_USER_DAILY_LIMIT || '10.00'),
      emergencyKillSwitchThreshold: 0.95, // 95% of budget
      warningThreshold: 0.80, // 80% of budget
    };

    // Model pricing (per 1K tokens)
    this.modelPricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
    };

    // Tracking data
    this.dailyCosts = new Map(); // date -> cost
    this.monthlyCosts = new Map(); // month -> cost
    this.userCosts = new Map(); // userId -> { daily: Map<date, cost>, monthly: Map<month, cost> }
    this.modelUsage = new Map(); // modelId -> { inputTokens, outputTokens, cost }
    this.transactionLog = [];
    
    // Kill switch state
    this.killSwitchActive = false;
    const [datePart] = new Date().toISOString().split('T');
    this.lastResetDate = datePart;
    this.lastResetMonth = new Date().toISOString().substring(0, 7);

    // Metrics for Grafana
    this.metrics = {
      totalSpend: 0,
      dailySpend: 0,
      monthlySpend: 0,
      transactionCount: 0,
      killSwitchTriggered: 0,
    };
  }

  /**
   * Initialize the cost controller
   */
  async initialize() {
    this.startDailyResetScheduler();
    console.log('✅ Cost Controller initialized');
    console.log(`💰 Daily Budget: $${this.config.dailyBudget}`);
    console.log(`💰 Monthly Budget: $${this.config.monthlyBudget}`);
  }

  /**
   * Track AI token usage and calculate cost
   * @param {Object} usage - Token usage details
   * @returns {Object} Cost tracking result
   */
  trackUsage(usage) {
    const {
      userId,
      model,
      inputTokens,
      outputTokens,
      operation = 'scan',
      metadata = {}
    } = usage;

    // Check kill switch
    if (this.killSwitchActive) {
      console.error('🚨 KILL SWITCH ACTIVE - Request denied');
      throw new Error('COST_LIMIT_EXCEEDED: AI operations temporarily disabled due to budget limits');
    }

    // Calculate cost
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    
    // Check if this would exceed limits
    this.checkLimits(userId, cost);

    // Record the transaction
    const transaction = {
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      userId,
      model,
      inputTokens,
      outputTokens,
      cost,
      operation,
      metadata
    };

    this.transactionLog.push(transaction);
    
    // Update tracking data
    this.updateCostTracking(userId, model, cost, inputTokens, outputTokens);
    
    // Update metrics
    this.metrics.totalSpend += cost;
    this.metrics.transactionCount += 1;
    
    // Check thresholds
    this.checkThresholds();

    // Emit event for monitoring
    this.emit('usage-tracked', transaction);

    return {
      transactionId: transaction.transactionId,
      cost,
      dailyTotal: this.getDailyCost(),
      monthlyTotal: this.getMonthlyCost(),
      dailyRemaining: this.config.dailyBudget - this.getDailyCost(),
      monthlyRemaining: this.config.monthlyBudget - this.getMonthlyCost(),
      userDailyTotal: this.getUserDailyCost(userId),
      userDailyRemaining: this.config.perUserDailyLimit - this.getUserDailyCost(userId)
    };
  }

  /**
   * Calculate cost based on model and token usage
   * @private
   */
  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      console.warn(`⚠️  Unknown model: ${model}, using default pricing`);
      return (inputTokens + outputTokens) * 0.001 / 1000; // Default fallback
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Check if usage would exceed limits
   * @private
   */
  checkLimits(userId, additionalCost) {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Check daily budget
    const currentDailyCost = this.dailyCosts.get(today) || 0;
    if (currentDailyCost + additionalCost > this.config.dailyBudget) {
      this.activateKillSwitch('DAILY_BUDGET_EXCEEDED');
      throw new Error(`DAILY_BUDGET_EXCEEDED: Would exceed daily budget of $${this.config.dailyBudget}`);
    }

    // Check monthly budget
    const currentMonthlyCost = this.monthlyCosts.get(currentMonth) || 0;
    if (currentMonthlyCost + additionalCost > this.config.monthlyBudget) {
      this.activateKillSwitch('MONTHLY_BUDGET_EXCEEDED');
      throw new Error(`MONTHLY_BUDGET_EXCEEDED: Would exceed monthly budget of $${this.config.monthlyBudget}`);
    }

    // Check per-user daily limit
    const userDailyCost = this.getUserDailyCost(userId);
    if (userDailyCost + additionalCost > this.config.perUserDailyLimit) {
      throw new Error(`USER_DAILY_LIMIT_EXCEEDED: User ${userId} would exceed daily limit of $${this.config.perUserDailyLimit}`);
    }
  }

  /**
   * Update cost tracking data structures
   * @private
   */
  updateCostTracking(userId, model, cost, inputTokens, outputTokens) {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Update daily costs
    this.dailyCosts.set(today, (this.dailyCosts.get(today) || 0) + cost);
    this.metrics.dailySpend = this.dailyCosts.get(today);

    // Update monthly costs
    this.monthlyCosts.set(currentMonth, (this.monthlyCosts.get(currentMonth) || 0) + cost);
    this.metrics.monthlySpend = this.monthlyCosts.get(currentMonth);

    // Update user costs
    if (!this.userCosts.has(userId)) {
      this.userCosts.set(userId, { daily: new Map(), monthly: new Map() });
    }
    const userTracking = this.userCosts.get(userId);
    userTracking.daily.set(today, (userTracking.daily.get(today) || 0) + cost);
    userTracking.monthly.set(currentMonth, (userTracking.monthly.get(currentMonth) || 0) + cost);

    // Update model usage
    if (!this.modelUsage.has(model)) {
      this.modelUsage.set(model, { inputTokens: 0, outputTokens: 0, cost: 0 });
    }
    const modelStats = this.modelUsage.get(model);
    modelStats.inputTokens += inputTokens;
    modelStats.outputTokens += outputTokens;
    modelStats.cost += cost;
  }

  /**
   * Check warning and emergency thresholds
   * @private
   */
  checkThresholds() {
    const dailyUsagePercent = this.getDailyCost() / this.config.dailyBudget;
    const monthlyUsagePercent = this.getMonthlyCost() / this.config.monthlyBudget;

    // Emergency kill switch
    if (dailyUsagePercent >= this.config.emergencyKillSwitchThreshold ||
        monthlyUsagePercent >= this.config.emergencyKillSwitchThreshold) {
      this.activateKillSwitch('EMERGENCY_THRESHOLD_REACHED');
      this.emit('emergency-threshold', {
        dailyUsagePercent,
        monthlyUsagePercent,
        dailyCost: this.getDailyCost(),
        monthlyCost: this.getMonthlyCost()
      });
    }
    // Warning threshold
    else if (dailyUsagePercent >= this.config.warningThreshold ||
             monthlyUsagePercent >= this.config.warningThreshold) {
      this.emit('warning-threshold', {
        dailyUsagePercent,
        monthlyUsagePercent,
        dailyCost: this.getDailyCost(),
        monthlyCost: this.getMonthlyCost()
      });
    }
  }

  /**
   * Activate the emergency kill switch
   * @private
   */
  activateKillSwitch(reason) {
    if (this.killSwitchActive) return;

    this.killSwitchActive = true;
    this.metrics.killSwitchTriggered += 1;
    
    const alert = {
      timestamp: new Date().toISOString(),
      reason,
      dailyCost: this.getDailyCost(),
      monthlyCost: this.getMonthlyCost(),
      dailyBudget: this.config.dailyBudget,
      monthlyBudget: this.config.monthlyBudget
    };

    console.error('🚨🚨🚨 EMERGENCY KILL SWITCH ACTIVATED 🚨🚨🚨');
    console.error('Reason:', reason);
    console.error('All AI operations are now blocked until manual override');
    
    this.emit('kill-switch-activated', alert);
  }

  /**
   * Manually deactivate kill switch (requires admin)
   * @param {string} adminUserId - Admin user ID authorizing override
   */
  deactivateKillSwitch(adminUserId) {
    if (!this.killSwitchActive) return;

    this.killSwitchActive = false;
    console.log(`✅ Kill switch deactivated by admin: ${adminUserId}`);
    
    this.emit('kill-switch-deactivated', {
      timestamp: new Date().toISOString(),
      adminUserId
    });
  }

  /**
   * Get current daily cost
   */
  getDailyCost() {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyCosts.get(today) || 0;
  }

  /**
   * Get current monthly cost
   */
  getMonthlyCost() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return this.monthlyCosts.get(currentMonth) || 0;
  }

  /**
   * Get user's daily cost
   */
  getUserDailyCost(userId) {
    const today = new Date().toISOString().split('T')[0];
    const userTracking = this.userCosts.get(userId);
    return userTracking ? (userTracking.daily.get(today) || 0) : 0;
  }

  /**
   * Get comprehensive cost report
   */
  getCostReport() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    return {
      summary: {
        killSwitchActive: this.killSwitchActive,
        dailyCost: this.getDailyCost(),
        dailyBudget: this.config.dailyBudget,
        dailyRemaining: this.config.dailyBudget - this.getDailyCost(),
        dailyUsagePercent: (this.getDailyCost() / this.config.dailyBudget * 100).toFixed(2),
        monthlyCost: this.getMonthlyCost(),
        monthlyBudget: this.config.monthlyBudget,
        monthlyRemaining: this.config.monthlyBudget - this.getMonthlyCost(),
        monthlyUsagePercent: (this.getMonthlyCost() / this.config.monthlyBudget * 100).toFixed(2),
      },
      modelUsage: Array.from(this.modelUsage.entries()).map(([model, stats]) => ({
        model,
        ...stats,
        avgCostPerRequest: stats.cost / (this.transactionLog.filter(t => t.model === model).length || 1)
      })),
      topUsers: this.getTopUsers(5),
      recentTransactions: this.transactionLog.slice(-10),
      metrics: this.metrics
    };
  }

  /**
   * Get top users by cost
   * @private
   */
  getTopUsers(limit = 5) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const userCostArray = [];

    for (const [userId, tracking] of this.userCosts.entries()) {
      const monthlyCost = tracking.monthly.get(currentMonth) || 0;
      userCostArray.push({ userId, monthlyCost });
    }

    // Sort array before slicing to avoid mutation during chaining
    const sortedUsers = userCostArray.sort((a, b) => b.monthlyCost - a.monthlyCost);
    return sortedUsers.slice(0, limit);
  }

  /**
   * Export metrics in Prometheus format for Grafana
   */
  getPrometheusMetrics() {
    const metrics = [];
    
    metrics.push('# HELP ai_cost_daily_total Daily AI cost in USD');
    metrics.push('# TYPE ai_cost_daily_total gauge');
    metrics.push(`ai_cost_daily_total ${this.getDailyCost().toFixed(4)}`);
    
    metrics.push('# HELP ai_cost_monthly_total Monthly AI cost in USD');
    metrics.push('# TYPE ai_cost_monthly_total gauge');
    metrics.push(`ai_cost_monthly_total ${this.getMonthlyCost().toFixed(4)}`);
    
    metrics.push('# HELP ai_cost_kill_switch_active Kill switch status (1=active, 0=inactive)');
    metrics.push('# TYPE ai_cost_kill_switch_active gauge');
    metrics.push(`ai_cost_kill_switch_active ${this.killSwitchActive ? 1 : 0}`);
    
    metrics.push('# HELP ai_transactions_total Total number of AI transactions');
    metrics.push('# TYPE ai_transactions_total counter');
    metrics.push(`ai_transactions_total ${this.metrics.transactionCount}`);

    // Model-specific metrics
    for (const [model, stats] of this.modelUsage.entries()) {
      metrics.push(`# HELP ai_model_cost_total{model="${model}"} Total cost for model`);
      metrics.push(`# TYPE ai_model_cost_total{model="${model}"} counter`);
      metrics.push(`ai_model_cost_total{model="${model}"} ${stats.cost.toFixed(4)}`);
      
      metrics.push(`# HELP ai_model_tokens_total{model="${model}",type="input"} Input tokens for model`);
      metrics.push(`# TYPE ai_model_tokens_total{model="${model}",type="input"} counter`);
      metrics.push(`ai_model_tokens_total{model="${model}",type="input"} ${stats.inputTokens}`);
      
      metrics.push(`# HELP ai_model_tokens_total{model="${model}",type="output"} Output tokens for model`);
      metrics.push(`# TYPE ai_model_tokens_total{model="${model}",type="output"} counter`);
      metrics.push(`ai_model_tokens_total{model="${model}",type="output"} ${stats.outputTokens}`);
    }

    return metrics.join('\n');
  }

  /**
   * Start scheduler to reset daily costs
   * @private
   */
  startDailyResetScheduler() {
    // Check every hour if we need to reset daily costs
    setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().toISOString().substring(0, 7);

      if (today !== this.lastResetDate) {
        console.log('🔄 Resetting daily costs');
        this.dailyCosts.clear();
        this.lastResetDate = today;
        
        // Also reset daily kill switch if it was activated
        if (this.killSwitchActive) {
          console.log('✅ Auto-resetting kill switch for new day');
          this.killSwitchActive = false;
        }
      }

      if (currentMonth !== this.lastResetMonth) {
        console.log('🔄 Resetting monthly costs');
        this.monthlyCosts.clear();
        this.lastResetMonth = currentMonth;
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Generate unique transaction ID
   * @private
   */
  generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Export singleton instance
const costController = new CostController();

module.exports = {
  CostController,
  costController,
  
  // Convenience methods
  trackUsage: (usage) => costController.trackUsage(usage),
  getCostReport: () => costController.getCostReport(),
  getPrometheusMetrics: () => costController.getPrometheusMetrics(),
  deactivateKillSwitch: (adminUserId) => costController.deactivateKillSwitch(adminUserId),
  initialize: () => costController.initialize()
};
