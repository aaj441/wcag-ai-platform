/**
 * Example App component demonstrating dashboard usage
 */

import React, { useState } from 'react';
import { ConsultantApprovalDashboard } from './components/ConsultantApprovalDashboard';
import { EvidenceVaultDashboard } from './components/EvidenceVaultDashboard';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'consultant' | 'evidence'>('consultant');

  return (
    <div className="app">
      {/* Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-4 py-4">
            <button
              onClick={() => setActiveView('consultant')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'consultant'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              📧 Consultant Dashboard
            </button>
            <button
              onClick={() => setActiveView('evidence')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'evidence'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              🔒 Evidence Vault
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeView === 'consultant' && <ConsultantApprovalDashboard />}
      {activeView === 'evidence' && <EvidenceVaultDashboard />}
    </div>
  );
};

export default App;
