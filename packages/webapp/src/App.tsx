/**
 * Example App component demonstrating dashboard usage
 */

import React, { useState } from 'react';
import { ConsultantApprovalDashboard } from './components/ConsultantApprovalDashboard';
import { QuarterlyComplianceReportDashboard } from './components/QuarterlyComplianceReportDashboard';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'consultant' | 'quarterly'>('quarterly');

  return (
    <div className="app bg-gray-900 min-h-screen">
      {/* Simple Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 py-3">
            <button
              onClick={() => setActiveView('quarterly')}
              className={`px-4 py-2 rounded-lg transition ${
                activeView === 'quarterly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Quarterly Reports
            </button>
            <button
              onClick={() => setActiveView('consultant')}
              className={`px-4 py-2 rounded-lg transition ${
                activeView === 'consultant'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Consultant Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeView === 'quarterly' ? (
        <QuarterlyComplianceReportDashboard />
      ) : (
        <ConsultantApprovalDashboard />
      )}
    </div>
  );
};

export default App;
