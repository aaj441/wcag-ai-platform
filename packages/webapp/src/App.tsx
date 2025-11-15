/**
 * Main App component with navigation
 */

import React, { useState } from 'react';
import { ConsultantApprovalDashboard } from './components/ConsultantApprovalDashboard';
import { OfferSheet } from './components/OfferSheet';

type ViewType = 'dashboard' | 'offer-sheet';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-white text-xl font-bold mr-8">
                WCAG AI Platform
              </h1>
              <div className="flex space-x-4" role="navigation" aria-label="Primary">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  aria-current={currentView === 'dashboard' ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('offer-sheet')}
                  aria-current={currentView === 'offer-sheet' ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'offer-sheet'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Service Tiers
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <div className="content">
        {currentView === 'dashboard' && <ConsultantApprovalDashboard />}
        {currentView === 'offer-sheet' && <OfferSheet />}
      </div>
    </div>
  );
};

export default App;
