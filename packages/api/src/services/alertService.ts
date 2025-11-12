/**
 * Alerting Service
 * Handles keyword-based alerts and notifications
 */

import { LegacyViolation, EmailDraft } from '../types';
import { checkViolationAlerts, AlertTrigger } from './keywordExtractor';

export interface Alert {
  id: string;
  draftId: string;
  timestamp: Date;
  trigger: AlertTrigger;
  violation?: LegacyViolation;
  notified: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertNotification {
  alerts: Alert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  actionRequired: boolean;
}

// In-memory alert store (production would use database)
const alertsDB: Alert[] = [];

/**
 * Process draft and generate alerts
 */
export function processAlertsForDraft(draft: EmailDraft): Alert[] {
  const triggers = checkViolationAlerts(draft.violations);
  const alerts: Alert[] = [];
  
  for (const trigger of triggers) {
    // Find the violation that triggered this alert
    const matchingViolation = draft.violations.find(v => {
      const text = `${v.description} ${v.recommendation} ${v.technicalDetails || ''}`.toLowerCase();
      return text.includes(trigger.keyword) || v.severity === trigger.keyword;
    });
    
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      draftId: draft.id,
      timestamp: new Date(),
      trigger,
      violation: matchingViolation,
      notified: false,
    };
    
    alerts.push(alert);
    alertsDB.push(alert);
  }
  
  return alerts;
}

/**
 * Get all alerts for a draft
 */
export function getAlertsForDraft(draftId: string): Alert[] {
  return alertsDB.filter(a => a.draftId === draftId);
}

/**
 * Get all unacknowledged alerts
 */
export function getUnacknowledgedAlerts(): Alert[] {
  return alertsDB.filter(a => !a.acknowledgedAt);
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert | null {
  const alert = alertsDB.find(a => a.id === alertId);
  if (!alert) return null;
  
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = acknowledgedBy;
  
  return alert;
}

/**
 * Get alert summary
 */
export function getAlertSummary(): AlertNotification {
  const unacknowledged = getUnacknowledgedAlerts();
  
  const summary = {
    total: unacknowledged.length,
    critical: unacknowledged.filter(a => a.trigger.priority === 'critical').length,
    high: unacknowledged.filter(a => a.trigger.priority === 'high').length,
    medium: unacknowledged.filter(a => a.trigger.priority === 'medium').length,
    low: unacknowledged.filter(a => a.trigger.priority === 'low').length,
  };
  
  return {
    alerts: unacknowledged,
    summary,
    actionRequired: summary.critical > 0 || summary.high > 0,
  };
}

/**
 * Mark alert as notified
 */
export function markAlertNotified(alertId: string): Alert | null {
  const alert = alertsDB.find(a => a.id === alertId);
  if (!alert) return null;
  
  alert.notified = true;
  
  return alert;
}

/**
 * Get alerts by priority
 */
export function getAlertsByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): Alert[] {
  return alertsDB.filter(a => a.trigger.priority === priority);
}

/**
 * Get alerts by type
 */
export function getAlertsByType(alertType: AlertTrigger['alertType']): Alert[] {
  return alertsDB.filter(a => a.trigger.alertType === alertType);
}

/**
 * Clear acknowledged alerts older than specified days
 */
export function clearOldAlerts(daysOld: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const initialLength = alertsDB.length;
  
  // Remove acknowledged alerts older than cutoff
  for (let i = alertsDB.length - 1; i >= 0; i--) {
    const alert = alertsDB[i];
    if (alert.acknowledgedAt && alert.acknowledgedAt < cutoffDate) {
      alertsDB.splice(i, 1);
    }
  }
  
  return initialLength - alertsDB.length;
}

/**
 * Send alert notification (placeholder for email/webhook integration)
 */
export async function sendAlertNotification(alert: Alert): Promise<boolean> {
  // In production, this would:
  // 1. Send email notification to administrators
  // 2. Post to Slack/Teams webhook
  // 3. Create ticket in issue tracking system
  // 4. Log to monitoring system
  
  console.log(`[ALERT] ${alert.trigger.priority.toUpperCase()}: ${alert.trigger.message}`);
  console.log(`  Draft ID: ${alert.draftId}`);
  console.log(`  Type: ${alert.trigger.alertType}`);
  
  if (alert.violation) {
    console.log(`  Violation: ${alert.violation.wcagCriteria} - ${alert.violation.severity}`);
  }
  
  return true;
}

/**
 * Batch send notifications for all unnotified alerts
 */
export async function sendPendingNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  const unnotified = alertsDB.filter(a => !a.notified && !a.acknowledgedAt);
  let sent = 0;
  let failed = 0;
  
  for (const alert of unnotified) {
    try {
      const success = await sendAlertNotification(alert);
      if (success) {
        markAlertNotified(alert.id);
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send notification for alert ${alert.id}:`, error);
      failed++;
    }
  }
  
  return { sent, failed };
}

/**
 * Get alert statistics
 */
export function getAlertStatistics(): {
  total: number;
  acknowledged: number;
  unacknowledged: number;
  notified: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
} {
  const byPriority: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  const byType: Record<string, number> = {
    lawsuit_risk: 0,
    critical_severity: 0,
    immediate_action: 0,
    compliance_issue: 0,
  };
  
  let acknowledged = 0;
  let notified = 0;
  
  for (const alert of alertsDB) {
    byPriority[alert.trigger.priority]++;
    byType[alert.trigger.alertType]++;
    
    if (alert.acknowledgedAt) acknowledged++;
    if (alert.notified) notified++;
  }
  
  return {
    total: alertsDB.length,
    acknowledged,
    unacknowledged: alertsDB.length - acknowledged,
    notified,
    byPriority,
    byType,
  };
}
