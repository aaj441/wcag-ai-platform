/**
 * Cost Controller with Kill Switch
 *
 * Hard budget limits with automatic AI shutdown and real-time cost tracking
 */

import { EventEmitter } from 'events';
import { log } from '../utils/logger';
import { aiRequestCost } from '../utils/metrics';

interface CostEntry {
  userId: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
}

interface BudgetAlert {
  type: 'warning' | 'critical' | 'exceeded';
  currentSpend: number;
  budgetLimit: number;
  percentage: number;
  timestamp: Date;
}

class CostController extends EventEmitter {
  private dailyBudget: number;
  private monthlyBudget: number;
  private currentDailySpend: number = 0;
  private currentMonthlySpend: number = 0;
  private killSwitchActive: boolean = false;
  private costHistory: CostEntry[] = [];

  // Cost per 1K tokens (as of 2024)
  private readonly TOKEN_COSTS: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-2024-04-09': { input: 0.01, output: 0.03 },
    'gpt-4-2024-08-06': { input: 0.0025, output: 0.01 },
    'gpt-4o-2024-11-20': { input: 0.0025, output: 0.01 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  };

  constructor() {
    super();
    this.dailyBudget = parseFloat(process.env.DAILY_AI_BUDGET || '1000');
    this.monthlyBudget = parseFloat(process.env.MONTHLY_AI_BUDGET || '15000');

    log.info('Cost controller initialized', {
      dailyBudget: this.dailyBudget,
      monthlyBudget: this.monthlyBudget,
    });

    // Real-time cost tracking (every minute)
    setInterval(() => this.checkBudget(), 60000);

    // Daily reset at midnight UTC
    this.scheduleDailyReset();
  }

  /**
   * Track AI token usage and costs
   */
  trackCost(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { cost: number; budgetRemaining: number; killSwitchActive: boolean } {
    if (this.killSwitchActive) {
      log.warn('Cost kill switch active - blocking AI request', { userId, model });
      throw new Error('AI_BUDGET_EXCEEDED: Daily budget limit reached');
    }

    const costs = this.TOKEN_COSTS[model] || this.TOKEN_COSTS['gpt-4-turbo-2024-04-09'];
    const cost = (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;

    this.currentDailySpend += cost;
    this.currentMonthlySpend += cost;

    // Record cost entry
    const entry: CostEntry = {
      userId,
      model,
      tokens: inputTokens + outputTokens,
      cost,
      timestamp: new Date(),
    };
    this.costHistory.push(entry);

    // Update Prometheus metrics
    aiRequestCost.inc({ model }, cost);

    // Emit events for cost tracking
    this.emit('cost-tracked', {
      userId,
      cost,
      dailyTotal: this.currentDailySpend,
      monthlyTotal: this.currentMonthlySpend,
    });

    // Check thresholds
    this.checkThresholds();

    log.debug('Cost tracked', {
      userId,
      model,
      cost: cost.toFixed(4),
      dailySpend: this.currentDailySpend.toFixed(2),
      budgetRemaining: (this.dailyBudget - this.currentDailySpend).toFixed(2),
    });

    return {
      cost,
      budgetRemaining: this.dailyBudget - this.currentDailySpend,
      killSwitchActive: this.killSwitchActive,
    };
  }

  /**
   * Check budget thresholds and trigger alerts
   */
  private checkThresholds(): void {
    const dailyPercentage = (this.currentDailySpend / this.dailyBudget) * 100;
    const monthlyPercentage = (this.currentMonthlySpend / this.monthlyBudget) * 100;

    // 80% warning threshold
    if (dailyPercentage >= 80 && dailyPercentage < 90 && !this.hasAlertedToday('warning')) {
      this.emitBudgetAlert('warning', this.currentDailySpend, this.dailyBudget);
    }

    // 90% critical threshold
    if (dailyPercentage >= 90 && dailyPercentage < 100 && !this.hasAlertedToday('critical')) {
      this.emitBudgetAlert('critical', this.currentDailySpend, this.dailyBudget);
    }

    // 100% kill switch
    if (dailyPercentage >= 100 && !this.killSwitchActive) {
      this.activateKillSwitch('daily_budget_exceeded');
    }

    // Monthly budget check
    if (monthlyPercentage >= 100 && !this.killSwitchActive) {
      this.activateKillSwitch('monthly_budget_exceeded');
    }
  }

  /**
   * Activate emergency kill switch
   */
  private activateKillSwitch(reason: string): void {
    this.killSwitchActive = true;

    log.error('Cost kill switch activated', undefined, {
      reason,
      dailySpend: this.currentDailySpend,
      monthlySpend: this.currentMonthlySpend,
      dailyBudget: this.dailyBudget,
      monthlyBudget: this.monthlyBudget,
    });

    this.emitBudgetAlert('exceeded', this.currentDailySpend, this.dailyBudget);

    // Set environment flag to disable AI globally
    process.env.AI_DISABLED = 'true';

    // Emit event for other services
    this.emit('kill-switch-activated', {
      reason,
      dailySpend: this.currentDailySpend,
      monthlySpend: this.currentMonthlySpend,
      timestamp: new Date(),
    });
  }

  /**
   * Emit budget alert
   */
  private emitBudgetAlert(
    type: 'warning' | 'critical' | 'exceeded',
    currentSpend: number,
    budgetLimit: number
  ): void {
    const alert: BudgetAlert = {
      type,
      currentSpend,
      budgetLimit,
      percentage: (currentSpend / budgetLimit) * 100,
      timestamp: new Date(),
    };

    this.emit('budget-alert', alert);

    log.warn('Budget alert triggered', {
      type,
      currentSpend: currentSpend.toFixed(2),
      budgetLimit: budgetLimit.toFixed(2),
      percentage: alert.percentage.toFixed(1),
    });
  }

  /**
   * Check budget via external API (OpenAI/Anthropic)
   */
  async checkBudget(): Promise<void> {
    // TODO: Query actual OpenAI/Anthropic usage API
    // For now, rely on internal tracking

    log.debug('Budget check', {
      dailySpend: this.currentDailySpend.toFixed(2),
      dailyBudget: this.dailyBudget,
      dailyPercentage: ((this.currentDailySpend / this.dailyBudget) * 100).toFixed(1),
      monthlySpend: this.currentMonthlySpend.toFixed(2),
      monthlyBudget: this.monthlyBudget,
    });
  }

  /**
   * Generate cost projection model
   */
  generateProjection(scansPerDay: number, tokensPerScan: number, model: string): {
    dailyCost: number;
    monthlyCost: number;
    yearlyCost: number;
    atScale10x: number;
    atScale100x: number;
  } {
    const costs = this.TOKEN_COSTS[model] || this.TOKEN_COSTS['gpt-4-turbo-2024-04-09'];
    const costPerScan = ((tokensPerScan / 1000) * costs.input + (tokensPerScan / 1000) * costs.output);

    const dailyCost = scansPerDay * costPerScan;
    const monthlyCost = dailyCost * 30;
    const yearlyCost = dailyCost * 365;

    return {
      dailyCost,
      monthlyCost,
      yearlyCost,
      atScale10x: yearlyCost * 10,
      atScale100x: yearlyCost * 100,
    };
  }

  /**
   * Get cost breakdown by user
   */
  getCostBreakdownByUser(): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const entry of this.costHistory) {
      breakdown[entry.userId] = (breakdown[entry.userId] || 0) + entry.cost;
    }

    return breakdown;
  }

  /**
   * Get cost breakdown by model
   */
  getCostBreakdownByModel(): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const entry of this.costHistory) {
      breakdown[entry.model] = (breakdown[entry.model] || 0) + entry.cost;
    }

    return breakdown;
  }

  /**
   * Emergency budget reset (requires manual approval)
   */
  emergencyReset(newDailyBudget?: number): void {
    if (process.env.EMERGENCY_OVERRIDE !== 'true') {
      throw new Error('Emergency override not enabled. Set EMERGENCY_OVERRIDE=true');
    }

    const oldDailyBudget = this.dailyBudget;
    const oldSpend = this.currentDailySpend;

    if (newDailyBudget) {
      this.dailyBudget = newDailyBudget;
    }

    this.currentDailySpend = 0;
    this.killSwitchActive = false;
    delete process.env.AI_DISABLED;

    log.warn('Emergency budget reset executed', {
      oldDailyBudget,
      newDailyBudget: this.dailyBudget,
      previousSpend: oldSpend,
    });

    // Audit log
    log.auditLog('emergency_budget_reset', 'system', 'cost-controller', {
      oldDailyBudget,
      newDailyBudget: this.dailyBudget,
      previousSpend: oldSpend,
    });
  }

  /**
   * Schedule daily reset at midnight UTC
   */
  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.dailyReset();
      // Schedule next reset
      setInterval(() => this.dailyReset(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Daily budget reset
   */
  private dailyReset(): void {
    log.info('Daily budget reset', {
      previousSpend: this.currentDailySpend.toFixed(2),
      budget: this.dailyBudget,
    });

    this.currentDailySpend = 0;
    this.killSwitchActive = false;
    delete process.env.AI_DISABLED;

    // Clear daily alerts
    this.clearDailyAlerts();
  }

  /**
   * Helper methods for alert tracking
   */
  private hasAlertedToday(type: string): boolean {
    // TODO: Track alerts in Redis or memory
    return false;
  }

  private clearDailyAlerts(): void {
    // TODO: Clear alert state
  }

  /**
   * Get current status
   */
  getStatus(): {
    dailySpend: number;
    dailyBudget: number;
    dailyPercentage: number;
    monthlySpend: number;
    monthlyBudget: number;
    monthlyPercentage: number;
    killSwitchActive: boolean;
    topUsers: Array<{ userId: string; cost: number }>;
    topModels: Array<{ model: string; cost: number }>;
  } {
    const userBreakdown = this.getCostBreakdownByUser();
    const modelBreakdown = this.getCostBreakdownByModel();

    return {
      dailySpend: this.currentDailySpend,
      dailyBudget: this.dailyBudget,
      dailyPercentage: (this.currentDailySpend / this.dailyBudget) * 100,
      monthlySpend: this.currentMonthlySpend,
      monthlyBudget: this.monthlyBudget,
      monthlyPercentage: (this.currentMonthlySpend / this.monthlyBudget) * 100,
      killSwitchActive: this.killSwitchActive,
      topUsers: Object.entries(userBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, cost]) => ({ userId, cost })),
      topModels: Object.entries(modelBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([model, cost]) => ({ model, cost })),
    };
  }
}

// Singleton instance
export const costController = new CostController();
export default costController;
