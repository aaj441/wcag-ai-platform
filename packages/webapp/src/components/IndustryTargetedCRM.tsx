/**
 * Industry-Targeted CRM Dashboard
 * Optimized for Fintech, Healthcare, and Debt Collection verticals
 */

import React, { useState, useEffect } from 'react';

interface Prospect {
  id: string;
  companyName: string;
  industry: 'fintech' | 'healthcare' | 'debt-collection';
  website: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactLinkedin?: string;

  // Accessibility Scan Data
  violationCount: number;
  criticalViolations: number;
  highViolations: number;
  wcagScore: number; // 0-100
  scanDate?: string;
  screenshotUrl?: string;

  // Scoring
  priorityScore: number; // 1-40 (from scoring system)
  dealSize: string; // "$10K-$20K", "$20K-$50K", "$50K+"

  // Outreach Status
  status: 'not-contacted' | 'emailed' | 'responded' | 'demo-scheduled' | 'proposal-sent' | 'closed-won' | 'closed-lost';
  lastContactedAt?: string;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;

  // Notes
  notes?: string;
  tags?: string[];
}

interface Stats {
  total: number;
  byIndustry: { fintech: number; healthcare: number; 'debt-collection': number };
  byStatus: Record<string, number>;
  avgPriorityScore: number;
  totalPipeline: string; // "$XX,XXX"
  closedDeals: number;
}

export function IndustryTargetedCRM() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'violations' | 'date'>('priority');

  useEffect(() => {
    fetchProspects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [prospects, industryFilter, statusFilter, priorityFilter, searchQuery, sortBy]);

  async function fetchProspects() {
    try {
      // Replace with actual API call
      const mockProspects: Prospect[] = [
        {
          id: '1',
          companyName: 'Stripe',
          industry: 'fintech',
          website: 'stripe.com',
          contactName: 'Jane Smith',
          contactTitle: 'CTO',
          contactEmail: 'jane@stripe.com',
          violationCount: 23,
          criticalViolations: 5,
          highViolations: 8,
          wcagScore: 62,
          priorityScore: 35,
          dealSize: '$50K+',
          status: 'emailed',
          emailsSent: 1,
          emailsOpened: 1,
          emailsClicked: 0,
          tags: ['payment-processing', 'high-value'],
        },
        {
          id: '2',
          companyName: 'Kaiser Permanente',
          industry: 'healthcare',
          website: 'kp.org',
          contactName: 'Dr. John Doe',
          contactTitle: 'CMIO',
          contactEmail: 'john.doe@kp.org',
          violationCount: 34,
          criticalViolations: 12,
          highViolations: 15,
          wcagScore: 45,
          priorityScore: 38,
          dealSize: '$50K+',
          status: 'responded',
          emailsSent: 2,
          emailsOpened: 2,
          emailsClicked: 1,
          tags: ['patient-portal', 'enterprise'],
        },
        {
          id: '3',
          companyName: 'Midland Credit',
          industry: 'debt-collection',
          website: 'midlandcreditonline.com',
          contactName: 'Sarah Johnson',
          contactTitle: 'VP Operations',
          contactEmail: 'sjohnson@midland.com',
          violationCount: 18,
          criticalViolations: 6,
          highViolations: 7,
          wcagScore: 58,
          priorityScore: 28,
          dealSize: '$20K-$50K',
          status: 'demo-scheduled',
          emailsSent: 3,
          emailsOpened: 3,
          emailsClicked: 2,
          tags: ['payment-portal', 'mid-market'],
        },
      ];

      setProspects(mockProspects);
      calculateStats(mockProspects);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
      setLoading(false);
    }
  }

  function calculateStats(data: Prospect[]) {
    const stats: Stats = {
      total: data.length,
      byIndustry: {
        fintech: data.filter(p => p.industry === 'fintech').length,
        healthcare: data.filter(p => p.industry === 'healthcare').length,
        'debt-collection': data.filter(p => p.industry === 'debt-collection').length,
      },
      byStatus: {},
      avgPriorityScore: data.reduce((sum, p) => sum + p.priorityScore, 0) / data.length,
      totalPipeline: calculatePipeline(data),
      closedDeals: data.filter(p => p.status === 'closed-won').length,
    };

    // Count by status
    data.forEach(p => {
      stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
    });

    setStats(stats);
  }

  function calculatePipeline(data: Prospect[]): string {
    const total = data.reduce((sum, p) => {
      if (p.status === 'closed-won' || p.status === 'closed-lost') return sum;

      const amount = p.dealSize === '$50K+' ? 50000 :
                     p.dealSize === '$20K-$50K' ? 35000 : 15000;

      return sum + amount;
    }, 0);

    return `$${(total / 1000).toFixed(0)}K`;
  }

  function applyFilters() {
    let filtered = [...prospects];

    // Industry filter
    if (industryFilter !== 'all') {
      filtered = filtered.filter(p => p.industry === industryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter === 'high') {
      filtered = filtered.filter(p => p.priorityScore >= 30);
    } else if (priorityFilter === 'medium') {
      filtered = filtered.filter(p => p.priorityScore >= 20 && p.priorityScore < 30);
    } else if (priorityFilter === 'low') {
      filtered = filtered.filter(p => p.priorityScore < 20);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.companyName.toLowerCase().includes(query) ||
        p.contactName?.toLowerCase().includes(query) ||
        p.contactEmail?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'priority') return b.priorityScore - a.priorityScore;
      if (sortBy === 'violations') return b.violationCount - a.violationCount;
      // date sorting would go here
      return 0;
    });

    setFilteredProspects(filtered);
  }

  const industryColors = {
    fintech: 'bg-blue-100 text-blue-800 border-blue-300',
    healthcare: 'bg-green-100 text-green-800 border-green-300',
    'debt-collection': 'bg-purple-100 text-purple-800 border-purple-300',
  };

  const statusColors = {
    'not-contacted': 'bg-gray-100 text-gray-700',
    'emailed': 'bg-yellow-100 text-yellow-700',
    'responded': 'bg-blue-100 text-blue-700',
    'demo-scheduled': 'bg-purple-100 text-purple-700',
    'proposal-sent': 'bg-indigo-100 text-indigo-700',
    'closed-won': 'bg-green-100 text-green-700',
    'closed-lost': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🎯 Industry-Targeted CRM</h1>
        <p className="text-gray-600">
          Fintech | Healthcare | Debt Collection Pipeline
        </p>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border-2 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Prospects</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{stats.byIndustry.fintech}</div>
            <div className="text-sm text-gray-600">Fintech</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 shadow-sm">
            <div className="text-3xl font-bold text-teal-600">{stats.byIndustry.healthcare}</div>
            <div className="text-sm text-gray-600">Healthcare</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{stats.byIndustry['debt-collection']}</div>
            <div className="text-sm text-gray-600">Debt Collection</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 shadow-sm">
            <div className="text-3xl font-bold text-orange-600">{stats.totalPipeline}</div>
            <div className="text-sm text-gray-600">Pipeline Value</div>
          </div>
          <div className="bg-white p-4 rounded-lg border-2 shadow-sm">
            <div className="text-3xl font-bold text-emerald-600">{stats.closedDeals}</div>
            <div className="text-sm text-gray-600">Closed Deals</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border-2 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Industry Filter */}
          <div>
            <label className="block text-sm font-bold mb-2">Industry</label>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Industries</option>
              <option value="fintech">💰 Fintech</option>
              <option value="healthcare">🏥 Healthcare</option>
              <option value="debt-collection">📞 Debt Collection</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-bold mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Statuses</option>
              <option value="not-contacted">Not Contacted</option>
              <option value="emailed">Emailed</option>
              <option value="responded">Responded</option>
              <option value="demo-scheduled">Demo Scheduled</option>
              <option value="proposal-sent">Proposal Sent</option>
              <option value="closed-won">Closed Won</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-bold mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High (30+)</option>
              <option value="medium">🟡 Medium (20-29)</option>
              <option value="low">🟢 Low (&lt;20)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-bold mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Company, contact..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="mt-4 flex gap-2">
          <span className="text-sm font-bold self-center">Sort by:</span>
          <button
            onClick={() => setSortBy('priority')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'priority' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Priority Score
          </button>
          <button
            onClick={() => setSortBy('violations')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'violations' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Violation Count
          </button>
        </div>
      </div>

      {/* Prospects List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading prospects...</p>
        </div>
      ) : filteredProspects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <p className="text-xl text-gray-500">📭 No prospects match your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProspects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} />
          ))}
        </div>
      )}
    </div>
  );
}

// Prospect Card Component
interface ProspectCardProps {
  prospect: Prospect;
}

function ProspectCard({ prospect }: ProspectCardProps) {
  const industryEmoji = {
    fintech: '💰',
    healthcare: '🏥',
    'debt-collection': '📞',
  };

  const industryColors = {
    fintech: 'bg-blue-50 border-blue-200',
    healthcare: 'bg-green-50 border-green-200',
    'debt-collection': 'bg-purple-50 border-purple-200',
  };

  const priorityColor =
    prospect.priorityScore >= 30 ? 'text-red-600' :
    prospect.priorityScore >= 20 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className={`bg-white p-6 rounded-lg border-2 shadow-sm hover:shadow-md transition ${industryColors[prospect.industry]}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-bold">{industryEmoji[prospect.industry]} {prospect.companyName}</h3>
            <span className={`px-2 py-1 rounded text-xs font-bold ${priorityColor}`}>
              Score: {prospect.priorityScore}/40
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            <a href={`https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {prospect.website}
            </a>
            <span className="mx-2">•</span>
            {prospect.dealSize}
          </p>
          {prospect.contactName && (
            <p className="text-sm">
              <span className="font-bold">{prospect.contactName}</span>
              {prospect.contactTitle && ` - ${prospect.contactTitle}`}
              {prospect.contactEmail && (
                <>
                  <span className="mx-2">•</span>
                  <a href={`mailto:${prospect.contactEmail}`} className="text-blue-600 hover:underline">
                    {prospect.contactEmail}
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        <div className="text-right">
          <div className={`px-3 py-1 rounded-full text-xs font-bold mb-2 ${
            prospect.wcagScore >= 80 ? 'bg-green-100 text-green-800' :
            prospect.wcagScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            WCAG Score: {prospect.wcagScore}/100
          </div>
          <div className={`px-3 py-1 rounded text-xs font-bold ${
            prospect.status === 'closed-won' ? 'bg-green-500 text-white' :
            prospect.status === 'demo-scheduled' ? 'bg-purple-500 text-white' :
            prospect.status === 'responded' ? 'bg-blue-500 text-white' :
            'bg-gray-200 text-gray-700'
          }`}>
            {prospect.status.replace('-', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Violations Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white bg-opacity-50 rounded border">
        <div>
          <div className="text-2xl font-bold text-red-600">{prospect.criticalViolations}</div>
          <div className="text-xs text-gray-600">Critical</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">{prospect.highViolations}</div>
          <div className="text-xs text-gray-600">High</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-600">{prospect.violationCount}</div>
          <div className="text-xs text-gray-600">Total Violations</div>
        </div>
      </div>

      {/* Email Stats */}
      {prospect.emailsSent > 0 && (
        <div className="flex gap-4 mb-4 text-sm">
          <span>📧 Sent: {prospect.emailsSent}</span>
          <span>👀 Opened: {prospect.emailsOpened}</span>
          <span>🔗 Clicked: {prospect.emailsClicked}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
          📧 Send Email
        </button>
        <button className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">
          📊 View Full Report
        </button>
        <button className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">
          📅 Schedule Demo
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300">
          📝 Add Note
        </button>
      </div>

      {/* Tags */}
      {prospect.tags && prospect.tags.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {prospect.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
