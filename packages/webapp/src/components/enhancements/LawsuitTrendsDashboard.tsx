import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface LawsuitTrend {
  metro: string;
  count: number;
  change: number;
  topIndustries: Array<{ industry: string; count: number }>;
  topLawFirms: Array<{ firm: string; count: number }>;
  averageSettlement?: number;
}

interface LawsuitStatistics {
  totalLawsuits: number;
  last30Days: number;
  last90Days: number;
  topStates: Array<{ state: string; count: number }>;
  topIndustries: Array<{ industry: string; count: number }>;
  averageSettlement: number;
}

export function LawsuitTrendsDashboard() {
  const [trends, setTrends] = useState<LawsuitTrend[]>([]);
  const [statistics, setStatistics] = useState<LawsuitStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [selectedDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trendsRes, statsRes] = await Promise.all([
        axios.get(`/api/enhancements/lawsuits/trends?days=${selectedDays}`),
        axios.get('/api/enhancements/lawsuits/statistics'),
      ]);

      setTrends(trendsRes.data.data.trends);
      setStatistics(statsRes.data.data);
    } catch (error) {
      console.error('Failed to load lawsuit data', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Real-Time ADA Lawsuit Tracker
          </h1>
          <p className="text-gray-600">
            Monitor lawsuit trends across US metros and industries
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {[7, 30, 90, 365].map(days => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDays === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last {days} days
            </button>
          ))}
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Lawsuits</div>
              <div className="text-3xl font-bold text-gray-900">
                {statistics.totalLawsuits.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Last 30 Days</div>
              <div className="text-3xl font-bold text-red-600">
                {statistics.last30Days.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                +{Math.round((statistics.last30Days / statistics.last90Days) * 100)}% vs 90-day avg
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Last 90 Days</div>
              <div className="text-3xl font-bold text-orange-600">
                {statistics.last90Days.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Avg Settlement</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(statistics.averageSettlement)}
              </div>
            </div>
          </div>
        )}

        {/* Metro Trends */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Lawsuit Trends by Metro</h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading trends...</div>
            ) : trends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No lawsuit data available</div>
            ) : (
              <div className="space-y-6">
                {trends.map((trend, index) => (
                  <div key={index} className="border-b pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{trend.metro}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          {trend.count} lawsuits filed
                          {trend.averageSettlement && (
                            <span className="ml-3">
                              • Avg settlement: {formatCurrency(trend.averageSettlement)}
                            </span>
                          )}
                        </div>
                      </div>

                      {trend.change !== 0 && (
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            trend.change > 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {trend.change > 0 ? '+' : ''}
                          {trend.change}%
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Top Industries */}
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">
                          Top Industries
                        </div>
                        <div className="space-y-1">
                          {trend.topIndustries.map((ind, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">{ind.industry}</span>
                              <span className="font-medium">{ind.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Law Firms */}
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">
                          Top Plaintiff Law Firms
                        </div>
                        <div className="space-y-1">
                          {trend.topLawFirms.map((firm, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">{firm.firm}</span>
                              <span className="font-medium">{firm.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top States & Industries */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top States */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Most Targeted States
              </h3>
              <div className="space-y-3">
                {statistics.topStates.map((state, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{state.state}</div>
                      <div className="text-sm text-gray-600">{state.count} lawsuits</div>
                    </div>
                    <div className="text-right">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${(state.count / statistics.topStates[0].count) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Industries */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Most Targeted Industries
              </h3>
              <div className="space-y-3">
                {statistics.topIndustries.map((industry, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{industry.industry}</div>
                      <div className="text-sm text-gray-600">{industry.count} lawsuits</div>
                    </div>
                    <div className="text-right">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600"
                          style={{
                            width: `${(industry.count / statistics.topIndustries[0].count) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
