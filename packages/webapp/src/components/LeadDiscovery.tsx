import React, { useState, useEffect } from 'react';

interface Lead {
  id: string;
  email: string;
  company?: {
    name: string;
    website: string;
    industry: string;
    employeeCount?: number;
  };
  relevanceScore: number;
  priorityTier: string;
  status: string;
  lastContacted?: string;
  notes?: string;
}

interface SearchStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export function LeadDiscovery() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  async function fetchLeads() {
    if (!token) return;

    try {
      setLoading(true);
      const url = filter !== 'all' ? `/api/leads?status=${filter}` : '/api/leads';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLeads(data.data || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (keywords.length === 0) {
      alert('Add at least one keyword');
      return;
    }

    if (!token) {
      alert('Not authenticated');
      return;
    }

    try {
      setSearching(true);
      const response = await fetch('/api/leads/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          keywords,
          minEmployees: 50,
          maxEmployees: 500,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          `✅ Found ${data.data.companiesFound} companies, created ${data.data.leadsCreated} leads!`
        );
        setTimeout(() => setSuccessMessage(''), 5000);
        setKeywords([]);
        await fetchLeads();
      } else {
        alert('Search failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed');
    } finally {
      setSearching(false);
    }
  }

  function addKeyword() {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  }

  function removeKeyword(keyword: string) {
    setKeywords(keywords.filter((k) => k !== keyword));
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">🎯 Lead Discovery</h1>
      <p className="text-gray-600 mb-8">
        Search for companies by keywords and automatically create leads
      </p>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg border mb-8 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Search by Keywords</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter keywords like "fintech", "healthcare", "saas", etc.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Enter keyword (e.g., fintech, healthcare)"
            className="flex-1 px-3 py-2 border rounded font-sm"
          />
          <button
            onClick={addKeyword}
            disabled={!keywordInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
          >
            Add Keyword
          </button>
        </div>

        {/* Keywords Display */}
        <div className="flex flex-wrap gap-2 mb-6">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold flex items-center gap-2"
            >
              #{kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="text-blue-600 hover:text-blue-900 font-bold ml-1"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={searching || keywords.length === 0}
          className="px-6 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400 w-full text-lg"
        >
          {searching ? '🔍 Searching...' : `🚀 Search ${keywords.length > 0 ? `(${keywords.length} keywords)` : ''}`}
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded border">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Leads</div>
          </div>
          <div className="bg-purple-50 p-4 rounded border">
            <div className="text-2xl font-bold text-purple-600">{stats.byPriority.high}</div>
            <div className="text-sm text-gray-600">High Priority</div>
          </div>
          <div className="bg-green-50 p-4 rounded border">
            <div className="text-2xl font-bold text-green-600">{stats.byStatus.won}</div>
            <div className="text-sm text-gray-600">Won</div>
          </div>
          <div className="bg-orange-50 p-4 rounded border">
            <div className="text-2xl font-bold text-orange-600">{stats.byStatus.new}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'new', 'contacted', 'qualified', 'won'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded font-bold transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p>Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded border-2 border-dashed">
          <p className="text-lg mb-2">📭 No leads found</p>
          <p className="text-sm">
            Search for keywords above to discover companies and create leads
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={fetchLeads} token={token!} />
          ))}
        </div>
      )}
    </div>
  );
}

// Lead card component
interface LeadCardProps {
  lead: Lead;
  onUpdate: () => Promise<void>;
  token: string;
}

function LeadCard({ lead, onUpdate, token }: LeadCardProps) {
  const [status, setStatus] = React.useState(lead.status);
  const [updating, setUpdating] = React.useState(false);

  async function updateLead(newStatus: string) {
    try {
      setUpdating(true);
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatus(newStatus);
        await onUpdate();
      }
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setUpdating(false);
    }
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{lead.company?.name || 'Unknown'}</h3>
          <a
            href={`mailto:${lead.email}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {lead.email}
          </a>
          {lead.company && (
            <p className="text-xs text-gray-600">
              {lead.company.industry}
              {lead.company.employeeCount && ` · ${lead.company.employeeCount} employees`}
            </p>
          )}
        </div>
        <div className="text-right">
          <div
            className={`px-3 py-1 rounded text-xs font-bold border ${
              lead.relevanceScore >= 0.8
                ? 'bg-green-100 text-green-800 border-green-200'
                : lead.relevanceScore >= 0.6
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  : 'bg-red-100 text-red-800 border-red-200'
            }`}
          >
            {(lead.relevanceScore * 100).toFixed(0)}% Match
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-bold border mt-2 ${
              priorityColors[lead.priorityTier as keyof typeof priorityColors]
            }`}
          >
            {lead.priorityTier.charAt(0).toUpperCase() + lead.priorityTier.slice(1)}
          </div>
        </div>
      </div>

      {/* Status Buttons */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {['new', 'contacted', 'interested', 'qualified', 'won'].map((s) => (
          <button
            key={s}
            onClick={() => updateLead(s)}
            disabled={updating}
            className={`px-3 py-1 rounded text-xs font-bold transition ${
              status === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Website Link */}
      {lead.company?.website && (
        <a
          href={`https://${lead.company.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm inline-block"
        >
          Visit Website →
        </a>
      )}

      {lead.lastContacted && (
        <p className="text-xs text-gray-500 mt-2">
          Last contacted: {new Date(lead.lastContacted).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
