/**
 * LEAD TRACKING SERVICE
 * Tracks prospect lifecycle from discovery through conversion
 *
 * Status flow:
 * discovered → contacted → engaged → audited → negotiating → customer
 */

export type ProspectStatus =
  | 'discovered'
  | 'contacted'
  | 'engaged'
  | 'audited'
  | 'negotiating'
  | 'customer'
  | 'lost';

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced';

export interface ProspectRecord {
  id: string;
  companyName: string;
  email: string;
  phone?: string;
  industry: string;
  icpId: string;

  // Status tracking
  status: ProspectStatus;
  createdAt: Date;
  lastContactedAt?: Date;

  // Scoring
  icpScore: number; // 0-100

  // Email tracking
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  lastEmailAt?: Date;

  // Engagement
  auditRequested: boolean;
  auditCompletedAt?: Date;

  // Deal info
  estimatedDealSize?: number;
  closingProbability?: number;
  expectedCloseDate?: Date;

  // Notes & history
  notes: string[];
  metadata?: Record<string, any>;
}

export interface LeadFunnelStats {
  discovered: number;
  contacted: number;
  engaged: number;
  audited: number;
  negotiating: number;
  customer: number;
  lost: number;
  conversionRate: number;
  avgTimeToConversion: number; // days
}

// ============================================================================
// IN-MEMORY LEAD TRACKING (for MVP)
// In production, this would use the Prisma database
// ============================================================================

export class LeadTrackingService {
  private leads: Map<string, ProspectRecord> = new Map();
  private emailLog: Array<{
    prospectId: string;
    status: EmailStatus;
    timestamp: Date;
  }> = [];

  /**
   * Add a new prospect to the database
   */
  addProspect(prospect: Omit<ProspectRecord, 'id' | 'createdAt'>): ProspectRecord {
    const id = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: ProspectRecord = {
      ...prospect,
      id,
      createdAt: new Date(),
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      notes: [],
    };

    this.leads.set(id, record);
    console.log(`✅ Added prospect: ${prospect.companyName} (${id})`);
    return record;
  }

  /**
   * Update prospect status
   */
  updateProspectStatus(prospectId: string, status: ProspectStatus): void {
    const prospect = this.leads.get(prospectId);
    if (!prospect) {
      throw new Error(`Prospect not found: ${prospectId}`);
    }

    console.log(`📊 Status update: ${prospect.companyName} → ${status}`);
    prospect.status = status;

    if (status === 'contacted') {
      prospect.lastContactedAt = new Date();
    }
  }

  /**
   * Track email event
   */
  trackEmailEvent(prospectId: string, status: EmailStatus): void {
    const prospect = this.leads.get(prospectId);
    if (!prospect) throw new Error(`Prospect not found: ${prospectId}`);

    if (status === 'sent') {
      prospect.emailsSent++;
      prospect.lastEmailAt = new Date();
    } else if (status === 'opened') {
      prospect.emailsOpened++;
      if (prospect.status === 'discovered') {
        this.updateProspectStatus(prospectId, 'contacted');
      }
    } else if (status === 'clicked') {
      prospect.emailsClicked++;
      if (prospect.status === 'contacted') {
        this.updateProspectStatus(prospectId, 'engaged');
      }
    }

    this.emailLog.push({
      prospectId,
      status,
      timestamp: new Date(),
    });

    console.log(`📧 Email event: ${prospectId} → ${status}`);
  }

  /**
   * Mark audit request received
   */
  markAuditRequested(prospectId: string): void {
    const prospect = this.leads.get(prospectId);
    if (!prospect) throw new Error(`Prospect not found: ${prospectId}`);

    prospect.auditRequested = true;
    prospect.auditCompletedAt = new Date();
    this.updateProspectStatus(prospectId, 'audited');
    console.log(`✅ Audit requested: ${prospect.companyName}`);
  }

  /**
   * Move prospect to negotiating
   */
  startNegotiation(prospectId: string, dealSize: number, expectedClose: Date): void {
    const prospect = this.leads.get(prospectId);
    if (!prospect) throw new Error(`Prospect not found: ${prospectId}`);

    prospect.estimatedDealSize = dealSize;
    prospect.expectedCloseDate = expectedClose;
    this.updateProspectStatus(prospectId, 'negotiating');
    console.log(`💰 Negotiating: ${prospect.companyName} - $${dealSize.toLocaleString()}`);
  }

  /**
   * Convert to customer
   */
  convertToCustomer(prospectId: string): void {
    const prospect = this.leads.get(prospectId);
    if (!prospect) throw new Error(`Prospect not found: ${prospectId}`);

    this.updateProspectStatus(prospectId, 'customer');
    console.log(`🎉 New customer: ${prospect.companyName}`);
  }

  /**
   * Mark as lost
   */
  markAsLost(prospectId: string, reason: string): void {
    const prospect = this.leads.get(prospectId);
    if (!prospect) throw new Error(`Prospect not found: ${prospectId}`);

    this.updateProspectStatus(prospectId, 'lost');
    prospect.notes.push(`Lost: ${reason}`);
    console.log(`❌ Lost: ${prospect.companyName} - ${reason}`);
  }

  /**
   * Get prospect details
   */
  getProspect(prospectId: string): ProspectRecord | null {
    return this.leads.get(prospectId) || null;
  }

  /**
   * Get all prospects with status
   */
  getProspectsByStatus(status: ProspectStatus): ProspectRecord[] {
    return Array.from(this.leads.values()).filter(p => p.status === status);
  }

  /**
   * Get funnel statistics
   */
  getFunnelStats(): LeadFunnelStats {
    const prospects = Array.from(this.leads.values());

    const discovered = prospects.filter(p => p.status === 'discovered').length;
    const contacted = prospects.filter(p => p.status === 'contacted').length;
    const engaged = prospects.filter(p => p.status === 'engaged').length;
    const audited = prospects.filter(p => p.status === 'audited').length;
    const negotiating = prospects.filter(p => p.status === 'negotiating').length;
    const customer = prospects.filter(p => p.status === 'customer').length;
    const lost = prospects.filter(p => p.status === 'lost').length;

    const total = prospects.length;
    const conversionRate = total > 0 ? customer / total : 0;

    // Calculate average time to conversion
    const conversions = prospects.filter(p => p.status === 'customer');
    const avgTimeToConversion =
      conversions.length > 0
        ? conversions.reduce((sum, p) => {
            const days = Math.floor(
              (p.expectedCloseDate?.getTime() || Date.now() - p.createdAt.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / conversions.length
        : 0;

    return {
      discovered,
      contacted,
      engaged,
      audited,
      negotiating,
      customer,
      lost,
      conversionRate,
      avgTimeToConversion: Math.round(avgTimeToConversion),
    };
  }

  /**
   * Get email metrics
   */
  getEmailMetrics() {
    const totalSent = this.emailLog.filter(e => e.status === 'sent').length;
    const totalOpened = this.emailLog.filter(e => e.status === 'opened').length;
    const totalClicked = this.emailLog.filter(e => e.status === 'clicked').length;
    const totalBounced = this.emailLog.filter(e => e.status === 'bounced').length;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      openRate: totalSent > 0 ? (totalOpened / totalSent).toFixed(2) : '0.00',
      clickRate: totalSent > 0 ? (totalClicked / totalSent).toFixed(2) : '0.00',
      bounceRate: totalSent > 0 ? (totalBounced / totalSent).toFixed(2) : '0.00',
    };
  }

  /**
   * Get MRR projection
   */
  getMRRProjection() {
    const prospects = Array.from(this.leads.values());
    const negotiating = prospects.filter(p => p.status === 'negotiating');
    const customers = prospects.filter(p => p.status === 'customer');

    const projectedMRR = negotiating.reduce((sum, p) => sum + (p.estimatedDealSize || 0), 0);
    const currentMRR = customers.reduce((sum, p) => sum + (p.estimatedDealSize || 3000), 0); // Default $3K/mo

    return {
      currentMRR: Math.round(currentMRR),
      projectedMRR: Math.round(projectedMRR),
      totalProjectedMRR: Math.round(currentMRR + projectedMRR),
      customers: customers.length,
      negotiating: negotiating.length,
    };
  }

  /**
   * Get all prospects (for dashboard)
   */
  getAllProspects(): ProspectRecord[] {
    return Array.from(this.leads.values());
  }

  /**
   * Get top opportunities (highest close probability)
   */
  getTopOpportunities(limit: number = 10): ProspectRecord[] {
    return Array.from(this.leads.values())
      .filter(p => p.status === 'negotiating' || p.status === 'audited')
      .sort((a, b) => (b.estimatedDealSize || 0) - (a.estimatedDealSize || 0))
      .slice(0, limit);
  }
}

export default LeadTrackingService;
