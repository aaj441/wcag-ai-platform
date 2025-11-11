/**
 * SLA Monitoring & Reporting Service
 * Monitors scan completion times and enforces SLA agreements
 */

export interface ScanRecord {
  id: string;
  url: string;
  tier: 'basic' | 'pro' | 'enterprise';
  customerId: string;
  createdAt: Date;
  completedAt: Date | null;
  duration?: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface SLABreach {
  scanId: string;
  url: string;
  tier: string;
  expectedDuration: number;
  actualDuration: number;
  breach: number;
  customerId: string;
}

export interface SLAReport {
  total: number;
  completed: number;
  breaches: number;
  slaBreaches: SLABreach[];
  complianceRate: number;
}

// SLA thresholds in milliseconds
const SLA_THRESHOLDS = {
  basic: 30 * 60 * 1000,      // 30 minutes
  pro: 5 * 60 * 1000,         // 5 minutes
  enterprise: 2 * 60 * 1000   // 2 minutes
};

// In-memory scan records (replace with database in production)
const scanRecords: ScanRecord[] = [];

/**
 * Register a new scan
 */
export function registerScan(
  id: string,
  url: string,
  tier: 'basic' | 'pro' | 'enterprise',
  customerId: string
): ScanRecord {
  const scan: ScanRecord = {
    id,
    url,
    tier,
    customerId,
    createdAt: new Date(),
    completedAt: null,
    status: 'pending'
  };
  
  scanRecords.push(scan);
  return scan;
}

/**
 * Mark scan as completed
 */
export function completeScan(scanId: string): ScanRecord | null {
  const scan = scanRecords.find(s => s.id === scanId);
  
  if (!scan) {
    return null;
  }
  
  scan.completedAt = new Date();
  scan.duration = scan.completedAt.getTime() - scan.createdAt.getTime();
  scan.status = 'completed';
  
  return scan;
}

/**
 * Check SLA compliance for a specific scan
 */
export function checkScanSLA(scan: ScanRecord): {
  compliant: boolean;
  breach?: SLABreach;
} {
  if (!scan.completedAt || !scan.duration) {
    return { compliant: true };
  }
  
  const threshold = SLA_THRESHOLDS[scan.tier];
  const compliant = scan.duration <= threshold;
  
  if (!compliant) {
    return {
      compliant: false,
      breach: {
        scanId: scan.id,
        url: scan.url,
        tier: scan.tier,
        expectedDuration: threshold,
        actualDuration: scan.duration,
        breach: scan.duration - threshold,
        customerId: scan.customerId
      }
    };
  }
  
  return { compliant: true };
}

/**
 * Check SLA compliance for all scans in a time window
 */
export function checkSLACompliance(
  hoursAgo: number = 1
): SLAReport {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  const recentScans = scanRecords.filter(
    scan => scan.createdAt >= cutoffTime && scan.completedAt !== null
  );
  
  const slaBreaches: SLABreach[] = [];
  
  for (const scan of recentScans) {
    const { compliant, breach } = checkScanSLA(scan);
    if (!compliant && breach) {
      slaBreaches.push(breach);
    }
  }
  
  const complianceRate = recentScans.length > 0
    ? ((recentScans.length - slaBreaches.length) / recentScans.length) * 100
    : 100;
  
  return {
    total: recentScans.length,
    completed: recentScans.length,
    breaches: slaBreaches.length,
    slaBreaches,
    complianceRate: Math.round(complianceRate * 100) / 100
  };
}

/**
 * Get all scans for a customer
 */
export function getCustomerScans(customerId: string): ScanRecord[] {
  return scanRecords.filter(s => s.customerId === customerId);
}

/**
 * Get SLA statistics
 */
export function getSLAStatistics(): {
  totalScans: number;
  averageDuration: number;
  breachRate: number;
  byTier: {
    [tier: string]: {
      count: number;
      averageDuration: number;
      breachCount: number;
    };
  };
} {
  const completedScans = scanRecords.filter(s => s.completedAt && s.duration);
  
  if (completedScans.length === 0) {
    return {
      totalScans: 0,
      averageDuration: 0,
      breachRate: 0,
      byTier: {}
    };
  }
  
  const totalDuration = completedScans.reduce((sum, s) => sum + (s.duration || 0), 0);
  const averageDuration = totalDuration / completedScans.length;
  
  let totalBreaches = 0;
  const tierStats: { [tier: string]: { count: number; totalDuration: number; breachCount: number } } = {
    basic: { count: 0, totalDuration: 0, breachCount: 0 },
    pro: { count: 0, totalDuration: 0, breachCount: 0 },
    enterprise: { count: 0, totalDuration: 0, breachCount: 0 }
  };
  
  for (const scan of completedScans) {
    const stats = tierStats[scan.tier];
    stats.count++;
    stats.totalDuration += scan.duration || 0;
    
    const { compliant } = checkScanSLA(scan);
    if (!compliant) {
      stats.breachCount++;
      totalBreaches++;
    }
  }
  
  const byTier: any = {};
  for (const [tier, stats] of Object.entries(tierStats)) {
    byTier[tier] = {
      count: stats.count,
      averageDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
      breachCount: stats.breachCount
    };
  }
  
  return {
    totalScans: completedScans.length,
    averageDuration: Math.round(averageDuration),
    breachRate: (totalBreaches / completedScans.length) * 100,
    byTier
  };
}

/**
 * Send SLA breach notification (stub for PagerDuty integration)
 */
export async function notifySLABreach(breach: SLABreach): Promise<boolean> {
  // TODO: Integrate with PagerDuty
  console.log('SLA Breach Notification:', {
    scanId: breach.scanId,
    url: breach.url,
    tier: breach.tier,
    breach: `${Math.round(breach.breach / 1000)}s over SLA`
  });
  
  // In production, this would:
  // 1. Send PagerDuty event
  // 2. Apply Stripe credit to customer
  // 3. Send notification email
  
  return true;
}

/**
 * Auto-apply SLA credit (stub for Stripe integration)
 */
export async function applySLACredit(
  customerId: string,
  amount: number = 500
): Promise<{ success: boolean; creditId?: string }> {
  // TODO: Integrate with Stripe
  console.log(`Applied $${amount / 100} SLA credit to customer ${customerId}`);
  
  return {
    success: true,
    creditId: `credit_${Date.now()}`
  };
}
