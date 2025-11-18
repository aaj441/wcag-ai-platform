/**
 * Quarterly Compliance Report Dashboard
 * 
 * Displays quarterly compliance metrics, evidence vault summaries,
 * and progress tracking for client retention and value demonstration.
 */

import React, { useState, useEffect } from 'react';
import type { QuarterlyReport } from '../types';

export function QuarterlyComplianceReportDashboard() {
  const [reports, setReports] = useState<QuarterlyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<QuarterlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/quarterly-reports');
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data || []);
        // Select the most recent report by default
        if (data.data && data.data.length > 0) {
          setSelectedReport(data.data[0]);
        }
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching quarterly reports:', err);
      setError('Failed to load quarterly reports');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(reportId: string) {
    try {
      const response = await fetch(`/api/quarterly-reports/${reportId}/export?format=markdown`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport?.quarter?.replace(/\s+/g, '-')}-compliance-report.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading quarterly reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h3 className="text-red-400 font-semibold mb-2">Error</h3>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={fetchReports}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">
                Quarterly Compliance & Evidence Report
              </h1>
              <p className="text-gray-400 mt-1">
                Track accessibility compliance progress and demonstrate ongoing value
              </p>
            </div>
            {selectedReport && (
              <button
                onClick={() => handleExport(selectedReport.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Report
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Report Selection */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Select Report</h2>
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedReport?.id === report.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-semibold">{report.quarter}</div>
                    <div className="text-sm opacity-80">
                      Score: {report.overallComplianceScore}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedReport ? (
              <>
                {/* Executive Summary */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-100 mb-4">
                    Executive Summary - {selectedReport.quarter}
                  </h2>
                  {selectedReport.clientName && (
                    <p className="text-gray-400 mb-4">Client: {selectedReport.clientName}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-blue-400">
                        {selectedReport.overallComplianceScore}%
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Compliance Score</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-green-400">
                        {selectedReport.criticalIssuesResolved}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Issues Resolved</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-purple-400">
                        {selectedReport.automatedScansPerformed}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Automated Scans</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-orange-400">
                        {selectedReport.manualReviewsCompleted}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Manual Reviews</div>
                    </div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">Legal Risk Snapshot</h3>
                    <p className="text-gray-300">{selectedReport.legalRiskSnapshot}</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-100 mb-4">
                    Performance Metrics (Quarter-over-Quarter)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Metric</th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">Last Quarter</th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">This Quarter</th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.metrics.map((metric, index) => {
                          const isPositive = metric.change.startsWith('+');
                          const isNegative = metric.change.startsWith('-');
                          const changeColor = isPositive 
                            ? 'text-green-400' 
                            : isNegative 
                            ? 'text-red-400' 
                            : 'text-gray-400';
                          
                          return (
                            <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                              <td className="py-3 px-4 text-gray-200">{metric.metric}</td>
                              <td className="py-3 px-4 text-center text-gray-300">{metric.lastQuarter}</td>
                              <td className="py-3 px-4 text-center text-gray-300">{metric.thisQuarter}</td>
                              <td className={`py-3 px-4 text-center font-semibold ${changeColor}`}>
                                {metric.change}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Evidence Vault Summary */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-100 mb-4">
                    Evidence Vault Summary
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-400">
                        {selectedReport.evidenceVault.datedScans}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Dated Scans Logged</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-400">
                        {selectedReport.evidenceVault.remediationTickets}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">Remediation Tickets</div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h3 className="text-gray-300 font-semibold mb-3">
                      Manual Attestations & Policy Updates
                    </h3>
                    <ul className="space-y-2">
                      {selectedReport.evidenceVault.manualAttestations.map((attestation, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-300">
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {attestation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Key Improvements & Next Steps */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-100 mb-6">
                    Key Improvements & Next Steps
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Key Wins */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Key Wins This Quarter
                      </h3>
                      <ul className="space-y-3">
                        {selectedReport.keyImprovements.map((improvement, index) => (
                          <li key={index} className="bg-gray-700/30 rounded-lg p-3">
                            <p className="text-gray-300">{improvement}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next Focus */}
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Roadmap for Next Quarter
                      </h3>
                      <ul className="space-y-3">
                        {selectedReport.nextSteps.map((step, index) => (
                          <li key={index} className="bg-gray-700/30 rounded-lg p-3">
                            <p className="text-gray-300">{step}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                  <p className="text-sm text-gray-400 text-center italic">
                    This quarterly dashboard serves as proof of diligence and continuous improvement in accessibility compliance.
                    Generated on {new Date(selectedReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <p className="text-gray-400">Select a quarterly report to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuarterlyComplianceReportDashboard;
