/**
 * Evidence Vault Dashboard
 * Compliance tracking, metrics visualization, and legal defense documentation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EvidenceRecord, ComplianceMetrics, QuarterlyReport, Notification } from '../types';
import { apiService } from '../services/api';
import { formatDate } from '../utils/helpers';

export const EvidenceVaultDashboard: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [evidenceRecords, setEvidenceRecords] = useState<EvidenceRecord[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [quarterlyReports, setQuarterlyReports] = useState<QuarterlyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [filterScanType, setFilterScanType] = useState<'all' | 'manual' | 'automated' | 'ci-cd'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [selectedPeriod, filterScanType]);

  async function loadData() {
    setIsLoading(true);
    try {
      // Load evidence records
      const filters: any = {};
      if (filterScanType !== 'all') {
        filters.scanType = filterScanType;
      }
      const records = await apiService.getAllEvidence(filters);
      setEvidenceRecords(records);

      // Load metrics
      const metricsData = await apiService.getComplianceMetrics(selectedPeriod);
      setMetrics(metricsData);

      // Load quarterly reports
      const reports = await apiService.getQuarterlyReports();
      setQuarterlyReports(reports);

      // Only show success notification if all data loads without errors
      // Only show success notification if all data loads without errors
      addNotification('success', 'Evidence vault data loaded successfully');
    } catch (error) {
      addNotification('error', 'Failed to load evidence vault data');
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredRecords = useMemo(() => {
    let result = evidenceRecords;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(record =>
        record.url.toLowerCase().includes(query) ||
        record.scanTool.toLowerCase().includes(query) ||
        record.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [evidenceRecords, searchQuery]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  function addNotification(type: Notification['type'], message: string) {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type,
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [notification, ...prev]);
  }

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    const timers = notifications.map(notification => 
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000)
    );
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [notifications]);

  async function handleDeleteEvidence(id: string) {
    if (!confirm('Are you sure you want to delete this evidence record?')) {
      return;
    }

    try {
      await apiService.deleteEvidence(id);
      setEvidenceRecords(prev => prev.filter(r => r.id !== id));
      addNotification('success', 'Evidence record deleted');
    } catch (error) {
      addNotification('error', 'Failed to delete evidence record');
    }
  }

  async function handleGenerateQuarterlyReport() {
    const quarter = prompt('Enter quarter (e.g., Q1-2024):');
    if (!quarter) return;

    const quarterPattern = /^Q[1-4]-\d{4}$/;
    if (!quarterPattern.test(quarter)) {
      addNotification('error', 'Invalid quarter format. Use Q1-2024 format.');
      return;
    }

    try {
      const report = await apiService.generateQuarterlyReport(quarter);
      if (report) {
        setQuarterlyReports(prev => [report, ...prev]);
        addNotification('success', 'Quarterly report generated successfully');
      }
    } catch (error) {
      addNotification('error', 'Failed to generate quarterly report');
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  }

  function getScoreBgColor(score: number): string {
    if (score >= 90) return 'bg-green-500/10';
    if (score >= 75) return 'bg-yellow-500/10';
    if (score >= 60) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-xl">Loading Evidence Vault...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            } text-white`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-400">🔒 Evidence Vault Dashboard</h1>
          <p className="text-gray-400 mt-1">Compliance tracking and legal defense documentation</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Overview */}
        {metrics && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Compliance Metrics</h2>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly', 'quarterly'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      selectedPeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Average Compliance Score */}
              <div className={`${getScoreBgColor(metrics.averageComplianceScore)} rounded-lg p-6 border border-gray-700`}>
                <div className="text-gray-400 text-sm mb-2">Average Compliance Score</div>
                <div className={`text-4xl font-bold ${getScoreColor(metrics.averageComplianceScore)}`}>
                  {metrics.averageComplianceScore}%
                </div>
                <div className="text-gray-500 text-xs mt-2">{metrics.totalScans} scans</div>
              </div>

              {/* Critical Violations */}
              <div className="bg-red-500/10 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Critical Violations</div>
                <div className="text-4xl font-bold text-red-400">{metrics.violationsByType.critical}</div>
                <div className="text-gray-500 text-xs mt-2">Requires immediate attention</div>
              </div>

              {/* High Priority */}
              <div className="bg-orange-500/10 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">High Priority</div>
                <div className="text-4xl font-bold text-orange-400">{metrics.violationsByType.high}</div>
                <div className="text-gray-500 text-xs mt-2">Significant impact</div>
              </div>

              {/* Total Violations */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Total Violations</div>
                <div className="text-4xl font-bold text-white">{metrics.totalViolations}</div>
                <div className="text-gray-500 text-xs mt-2">
                  Medium: {metrics.violationsByType.medium} | Low: {metrics.violationsByType.low}
                </div>
              </div>
            </div>

            {/* Top Violations */}
            {metrics.topViolations.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Top Violations</h3>
                <div className="space-y-3">
                  {metrics.topViolations.slice(0, 5).map((violation, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{index + 1}</span>
                        <div>
                          <div className="font-medium text-white">{violation.wcagCriteria}</div>
                          <div className="text-sm text-gray-400">{violation.count} occurrences</div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        violation.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        violation.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        violation.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {violation.severity.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search evidence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">🔍</span>
            </div>

            <select
              value={filterScanType}
              onChange={(e) => setFilterScanType(e.target.value as any)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Scan Types</option>
              <option value="manual">Manual</option>
              <option value="automated">Automated</option>
              <option value="ci-cd">CI/CD</option>
            </select>
          </div>

          <button
            onClick={handleGenerateQuarterlyReport}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            📄 Generate Quarterly Report
          </button>
        </div>

        {/* Evidence Records List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-xl font-bold text-white">Evidence Records ({filteredRecords.length})</h3>
          </div>

          <div className="divide-y divide-gray-700">
            {filteredRecords.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No evidence records found
              </div>
            ) : (
              filteredRecords.map(record => (
                <div
                  key={record.id}
                  className="px-6 py-4 hover:bg-gray-750 cursor-pointer transition-colors"
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">
                          {record.scanType === 'ci-cd' ? '🔄' : record.scanType === 'automated' ? '🤖' : '👤'}
                        </span>
                        <h4 className="font-medium text-white">{record.url}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(record.complianceScore)} ${getScoreColor(record.complianceScore)}`}>
                          {record.complianceScore}%
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <span>🔧 {record.scanTool}</span>
                        <span>📅 {formatDate(new Date(record.timestamp))}</span>
                        <span>
                          🔴 {record.criticalCount} | 🟠 {record.highCount} | 🟡 {record.mediumCount} | 🟢 {record.lowCount}
                        </span>
                        <span>📊 {record.violationsCount} total violations</span>
                      </div>

                      {record.tags && record.tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {record.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvidence(record.id);
                      }}
                      className="ml-4 px-3 py-1 text-red-400 hover:bg-red-500/20 rounded"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quarterly Reports */}
        {quarterlyReports.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Quarterly Reports ({quarterlyReports.length})</h3>
            </div>

            <div className="divide-y divide-gray-700">
              {quarterlyReports.map(report => (
                <div key={report.id} className="px-6 py-4 hover:bg-gray-750">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white mb-1">{report.quarter}</h4>
                      <p className="text-sm text-gray-400">
                        Generated {formatDate(new Date(report.generatedAt))} | 
                        Score: {report.metrics.averageComplianceScore}% | 
                        {report.evidenceRecords.length} evidence records
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
                      📥 Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenceVaultDashboard;
