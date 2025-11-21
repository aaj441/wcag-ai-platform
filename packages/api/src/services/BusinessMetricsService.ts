/**
 * Business Metrics Service
 *
 * Calculates consultant dashboard metrics including:
 * - Total projects and revenue
 * - Active clients
 * - Average project value
 * - Maintenance revenue
 * - Growth trends
 */

import { PrismaClient } from '@prisma/client';

export interface BusinessMetrics {
  totalProjects: number;
  monthlyRevenue: number;
  activeClients: number;
  avgProjectValue: number;
  maintenanceRevenue: number;
  metrics: {
    projects: {
      total: number;
      thisMonth: number;
      lastMonth: number;
      growth: number; // percentage
    };
    revenue: {
      total: number;
      monthly: number;
      quarterly: number;
      annual: number;
    };
    clients: {
      total: number;
      active: number;
      churned: number;
      retentionRate: number; // percentage
    };
    maintenance: {
      subscriptions: number;
      monthlyRecurring: number;
      avgSubscriptionValue: number;
    };
  };
}

export class BusinessMetricsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate comprehensive business metrics
   */
  public async calculateMetrics(tenantId?: string): Promise<BusinessMetrics> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get project metrics
    const projectMetrics = await this.calculateProjectMetrics(
      tenantId,
      thisMonthStart,
      lastMonthStart,
      lastMonthEnd
    );

    // Get revenue metrics
    const revenueMetrics = await this.calculateRevenueMetrics(tenantId);

    // Get client metrics
    const clientMetrics = await this.calculateClientMetrics(tenantId);

    // Get maintenance metrics
    const maintenanceMetrics = await this.calculateMaintenanceMetrics(tenantId);

    return {
      totalProjects: projectMetrics.total,
      monthlyRevenue: revenueMetrics.monthly,
      activeClients: clientMetrics.active,
      avgProjectValue: projectMetrics.total > 0
        ? Math.round(revenueMetrics.total / projectMetrics.total)
        : 0,
      maintenanceRevenue: maintenanceMetrics.monthlyRecurring,
      metrics: {
        projects: {
          total: projectMetrics.total,
          thisMonth: projectMetrics.thisMonth,
          lastMonth: projectMetrics.lastMonth,
          growth: projectMetrics.growth,
        },
        revenue: {
          total: revenueMetrics.total,
          monthly: revenueMetrics.monthly,
          quarterly: revenueMetrics.quarterly,
          annual: revenueMetrics.annual,
        },
        clients: {
          total: clientMetrics.total,
          active: clientMetrics.active,
          churned: clientMetrics.churned,
          retentionRate: clientMetrics.retentionRate,
        },
        maintenance: {
          subscriptions: maintenanceMetrics.subscriptions,
          monthlyRecurring: maintenanceMetrics.monthlyRecurring,
          avgSubscriptionValue: maintenanceMetrics.avgSubscriptionValue,
        },
      },
    };
  }

  /**
   * Calculate project-related metrics
   */
  private async calculateProjectMetrics(
    tenantId: string | undefined,
    thisMonthStart: Date,
    lastMonthStart: Date,
    lastMonthEnd: Date
  ) {
    const whereClause = tenantId ? { tenantId } : {};

    const [total, thisMonth, lastMonth] = await Promise.all([
      this.prisma.scan.count({ where: { ...whereClause, reviewed: true } }),
      this.prisma.scan.count({
        where: {
          ...whereClause,
          reviewed: true,
          reviewedAt: { gte: thisMonthStart },
        },
      }),
      this.prisma.scan.count({
        where: {
          ...whereClause,
          reviewed: true,
          reviewedAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
      }),
    ]);

    const growth = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : 0;

    return {
      total,
      thisMonth,
      lastMonth,
      growth,
    };
  }

  /**
   * Calculate revenue metrics
   */
  private async calculateRevenueMetrics(tenantId: string | undefined) {
    // For now, we'll estimate based on scan counts and average pricing
    // In production, this should integrate with actual billing records
    const whereClause = tenantId ? { tenantId } : {};

    const completedScans = await this.prisma.scan.count({
      where: { ...whereClause, reviewed: true, approvalStatus: 'approved' },
    });

    // Estimate average project value at $3,999
    const avgProjectValue = 3999;
    const total = completedScans * avgProjectValue;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [monthlyScans, quarterlyScans, annualScans] = await Promise.all([
      this.prisma.scan.count({
        where: {
          ...whereClause,
          reviewed: true,
          approvalStatus: 'approved',
          reviewedAt: { gte: monthStart },
        },
      }),
      this.prisma.scan.count({
        where: {
          ...whereClause,
          reviewed: true,
          approvalStatus: 'approved',
          reviewedAt: { gte: quarterStart },
        },
      }),
      this.prisma.scan.count({
        where: {
          ...whereClause,
          reviewed: true,
          approvalStatus: 'approved',
          reviewedAt: { gte: yearStart },
        },
      }),
    ]);

    return {
      total,
      monthly: monthlyScans * avgProjectValue,
      quarterly: quarterlyScans * avgProjectValue,
      annual: annualScans * avgProjectValue,
    };
  }

  /**
   * Calculate client metrics
   */
  private async calculateClientMetrics(tenantId: string | undefined) {
    const whereClause = tenantId ? { tenantId } : {};

    const [total, activeWithRecentScans] = await Promise.all([
      this.prisma.client.count({ where: whereClause }),
      this.prisma.client.count({
        where: {
          ...whereClause,
          scans: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
              },
            },
          },
        },
      }),
    ]);

    const churned = total - activeWithRecentScans;
    const retentionRate = total > 0 ? Math.round((activeWithRecentScans / total) * 100) : 0;

    return {
      total,
      active: activeWithRecentScans,
      churned,
      retentionRate,
    };
  }

  /**
   * Calculate maintenance subscription metrics
   */
  private async calculateMaintenanceMetrics(tenantId: string | undefined) {
    // For now, estimate based on active clients
    // In production, this should pull from actual subscription records
    const whereClause = tenantId ? { tenantId } : {};

    const activeClients = await this.prisma.client.count({
      where: {
        ...whereClause,
        scans: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    // Estimate 40% of active clients have maintenance subscriptions
    const subscriptions = Math.round(activeClients * 0.4);

    // Average maintenance package at $399/mo
    const avgSubscriptionValue = 399;
    const monthlyRecurring = subscriptions * avgSubscriptionValue;

    return {
      subscriptions,
      monthlyRecurring,
      avgSubscriptionValue,
    };
  }

  /**
   * Get historical metrics for trend analysis
   */
  public async getHistoricalMetrics(
    tenantId: string | undefined,
    months: number = 12
  ): Promise<Array<{
    month: string;
    projects: number;
    revenue: number;
    clients: number;
  }>> {
    const metrics: Array<{
      month: string;
      projects: number;
      revenue: number;
      clients: number;
    }> = [];

    const whereClause = tenantId ? { tenantId } : {};

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const projects = await this.prisma.scan.count({
        where: {
          ...whereClause,
          reviewed: true,
          reviewedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const revenue = projects * 3999; // Avg project value

      const clients = await this.prisma.client.count({
        where: {
          ...whereClause,
          createdAt: {
            lte: monthEnd,
          },
        },
      });

      metrics.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        projects,
        revenue,
        clients,
      });
    }

    return metrics;
  }
}

export default BusinessMetricsService;
