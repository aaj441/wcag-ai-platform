/**
 * Daily Scan Scheduler Service
 * Manages automated daily WCAG compliance scans for subscribed clients
 */

import { DailyScanSchedule, WARRANTY_TIERS, WarrantyTier } from '../types/warranty';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (replace with database in production)
const scanSchedules: Map<string, DailyScanSchedule> = new Map();
const activeScanJobs: Map<string, NodeJS.Timeout> = new Map();

/**
 * Create a daily scan schedule for a client
 */
export function createDailyScanSchedule(
  clientId: string,
  websiteUrl: string,
  notificationEmail: string,
  scanTime: string = '02:00:00',
  timezone: string = 'UTC'
): DailyScanSchedule {
  const schedule: DailyScanSchedule = {
    id: uuidv4(),
    clientId,
    websiteUrl,
    enabled: true,
    scanTime,
    timezone,
    lastScanAt: null,
    nextScanAt: calculateNextScanTime(scanTime, timezone),
    consecutiveFailures: 0,
    notificationEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  scanSchedules.set(schedule.id, schedule);
  scheduleScanJob(schedule);
  
  return schedule;
}

/**
 * Get schedule by ID
 */
export function getDailyScanSchedule(scheduleId: string): DailyScanSchedule | null {
  return scanSchedules.get(scheduleId) || null;
}

/**
 * Get all schedules for a client
 */
export function getClientScanSchedules(clientId: string): DailyScanSchedule[] {
  return Array.from(scanSchedules.values()).filter(s => s.clientId === clientId);
}

/**
 * Update scan schedule
 */
export function updateDailyScanSchedule(
  scheduleId: string,
  updates: Partial<Pick<DailyScanSchedule, 'enabled' | 'scanTime' | 'timezone' | 'notificationEmail'>>
): DailyScanSchedule | null {
  const schedule = scanSchedules.get(scheduleId);
  if (!schedule) {
    return null;
  }
  
  Object.assign(schedule, updates);
  schedule.updatedAt = new Date();
  
  // Recalculate next scan if time/timezone changed
  if (updates.scanTime || updates.timezone) {
    schedule.nextScanAt = calculateNextScanTime(
      schedule.scanTime,
      schedule.timezone
    );
  }
  
  // Reschedule the job
  cancelScanJob(scheduleId);
  if (schedule.enabled) {
    scheduleScanJob(schedule);
  }
  
  return schedule;
}

/**
 * Delete scan schedule
 */
export function deleteDailyScanSchedule(scheduleId: string): boolean {
  cancelScanJob(scheduleId);
  return scanSchedules.delete(scheduleId);
}

/**
 * Calculate next scan time based on preferred time and timezone
 */
function calculateNextScanTime(scanTime: string, timezone: string): Date {
  const now = new Date();
  const [hours, minutes, seconds] = scanTime.split(':').map(Number);
  
  // Simple implementation - in production use a timezone library like date-fns-tz
  const nextScan = new Date(now);
  nextScan.setHours(hours, minutes, seconds || 0, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (nextScan <= now) {
    nextScan.setDate(nextScan.getDate() + 1);
  }
  
  return nextScan;
}

/**
 * Schedule a scan job
 * Handles large delays by rescheduling if delay exceeds JavaScript's max timeout (~24.8 days)
 */
function scheduleScanJob(schedule: DailyScanSchedule): void {
  if (!schedule.enabled || !schedule.nextScanAt) {
    return;
  }
  
  const delay = schedule.nextScanAt.getTime() - Date.now();
  
  if (delay < 0) {
    // Schedule is in the past, recalculate
    schedule.nextScanAt = calculateNextScanTime(schedule.scanTime, schedule.timezone);
    scheduleScanJob(schedule);
    return;
  }
  
  // JavaScript's maximum timeout is 2^31-1 milliseconds (~24.8 days)
  // If delay exceeds 24 hours, schedule a check for 23 hours from now
  const MAX_TIMEOUT = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
  const actualDelay = Math.min(delay, MAX_TIMEOUT);
  
  const timeout = setTimeout(() => {
    if (actualDelay < delay) {
      // We used a shortened delay, reschedule to check again
      scheduleScanJob(schedule);
    } else {
      // Time to execute the scan
      executeDailyScan(schedule);
    }
  }, actualDelay);
  
  activeScanJobs.set(schedule.id, timeout);
}

/**
 * Cancel a scheduled scan job
 */
function cancelScanJob(scheduleId: string): void {
  const timeout = activeScanJobs.get(scheduleId);
  if (timeout) {
    clearTimeout(timeout);
    activeScanJobs.delete(scheduleId);
  }
}

/**
 * Execute a daily scan
 */
async function executeDailyScan(schedule: DailyScanSchedule): Promise<void> {
  console.log(`[Daily Scan] Starting scan for ${schedule.websiteUrl} (client: ${schedule.clientId})`);
  
  try {
    // Update last scan timestamp
    schedule.lastScanAt = new Date();
    schedule.updatedAt = new Date();
    
    // Execute the scan (integrate with actual scan service)
    const scanResult = await performWCAGScan(schedule);
    
    if (scanResult.success) {
      schedule.consecutiveFailures = 0;
      console.log(`[Daily Scan] ✓ Completed scan for ${schedule.websiteUrl}`);
      
      // Send notification if violations found
      if (scanResult.violationCount && scanResult.violationCount > 0) {
        await sendScanNotification(schedule, scanResult);
      }
    } else {
      schedule.consecutiveFailures++;
      console.error(`[Daily Scan] ✗ Failed scan for ${schedule.websiteUrl} (attempt ${schedule.consecutiveFailures})`);
      
      // Disable after 3 consecutive failures
      if (schedule.consecutiveFailures >= 3) {
        schedule.enabled = false;
        await sendFailureNotification(schedule);
        console.error(`[Daily Scan] Disabled schedule ${schedule.id} after 3 failures`);
      }
    }
  } catch (error) {
    console.error('[Daily Scan] Error executing scan:', error);
    schedule.consecutiveFailures++;
  }
  
  // Schedule next scan (24 hours from now)
  schedule.nextScanAt = calculateNextScanTime(schedule.scanTime, schedule.timezone);
  schedule.updatedAt = new Date();
  
  if (schedule.enabled) {
    scheduleScanJob(schedule);
  }
}

/**
 * Perform WCAG scan (stub - integrate with actual scanning service)
 */
async function performWCAGScan(schedule: DailyScanSchedule): Promise<{
  success: boolean;
  scanId?: string;
  violationCount?: number;
  criticalCount?: number;
  highCount?: number;
}> {
  // TODO: Integrate with actual WCAG scanning engine
  // This is a placeholder that simulates a scan
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate scan result
      resolve({
        success: true,
        scanId: uuidv4(),
        violationCount: 0,
        criticalCount: 0,
        highCount: 0,
      });
    }, 1000);
  });
}

/**
 * Send scan notification email
 */
async function sendScanNotification(
  schedule: DailyScanSchedule,
  scanResult: any
): Promise<void> {
  console.log(`[Daily Scan] Sending notification to ${schedule.notificationEmail}`);
  
  // TODO: Integrate with email service (SendGrid, SES, etc.)
  const emailContent = `
    Daily WCAG Scan Report
    
    Website: ${schedule.websiteUrl}
    Scan Date: ${new Date().toISOString()}
    
    Results:
    - Total Violations: ${scanResult.violationCount || 0}
    - Critical: ${scanResult.criticalCount || 0}
    - High: ${scanResult.highCount || 0}
    
    View full report: [Link to dashboard]
  `;
  
  // Log for now (replace with actual email sending)
  console.log(emailContent);
}

/**
 * Send failure notification
 */
async function sendFailureNotification(schedule: DailyScanSchedule): Promise<void> {
  console.log(`[Daily Scan] Sending failure notification to ${schedule.notificationEmail}`);
  
  // TODO: Integrate with email service
  const emailContent = `
    Daily Scan Schedule Disabled
    
    Website: ${schedule.websiteUrl}
    
    Your daily scan schedule has been disabled after 3 consecutive failures.
    
    Possible reasons:
    - Website is unreachable
    - Authentication required
    - Rate limiting or blocking
    
    Please check your website configuration and contact support if you need assistance.
  `;
  
  console.log(emailContent);
}

/**
 * Get scan statistics for a client
 */
export function getClientScanStatistics(clientId: string): {
  totalSchedules: number;
  activeSchedules: number;
  totalScans: number;
  failedScans: number;
  lastScanDate: Date | null;
} {
  const schedules = getClientScanSchedules(clientId);
  
  return {
    totalSchedules: schedules.length,
    activeSchedules: schedules.filter(s => s.enabled).length,
    totalScans: schedules.reduce((sum, s) => sum + (s.lastScanAt ? 1 : 0), 0),
    failedScans: schedules.reduce((sum, s) => sum + s.consecutiveFailures, 0),
    lastScanDate: schedules
      .map(s => s.lastScanAt)
      .filter(d => d !== null)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] || null,
  };
}

/**
 * Initialize scheduler on server start
 */
export function initializeDailyScanScheduler(): void {
  console.log('[Daily Scan Scheduler] Initializing...');
  
  // Load existing schedules from database and schedule them
  // For now, this is a no-op since we're using in-memory storage
  
  // In production:
  // 1. Load all active schedules from database
  // 2. Schedule jobs for each
  // 3. Set up periodic cleanup of old schedules
  
  console.log('[Daily Scan Scheduler] Ready');
}

/**
 * Shutdown scheduler gracefully
 */
export function shutdownDailyScanScheduler(): void {
  console.log('[Daily Scan Scheduler] Shutting down...');
  
  // Cancel all active jobs
  for (const [scheduleId, timeout] of activeScanJobs) {
    clearTimeout(timeout);
  }
  
  activeScanJobs.clear();
  console.log('[Daily Scan Scheduler] Shutdown complete');
}

/**
 * Get warranty tier configuration for a scan
 */
export function getWarrantyTierConfig(tier: WarrantyTier) {
  return WARRANTY_TIERS[tier];
}

/**
 * Check if a client's scan schedule is within tier limits
 */
export function validateScanScheduleAgainstTier(
  scheduleCount: number,
  tier: WarrantyTier
): { valid: boolean; message?: string } {
  
  // For now, allow unlimited schedules but could add tier-based limits
  // Example: Basic tier = 1 site, Pro = 5 sites, Enterprise = unlimited
  
  return { valid: true };
}
