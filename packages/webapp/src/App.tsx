/**
 * Example App component demonstrating Consultant Approval Dashboard usage
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ConsultantApprovalDashboard } from './components/ConsultantApprovalDashboard';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry/DataDog)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-8 max-w-2xl" role="alert">
            <h1 className="text-2xl font-bold text-red-200 mb-4">
              Application Error
            </h1>
            <p className="text-gray-300 mb-4">
              We're sorry, but something went wrong. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Reload Application
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-4 text-xs text-gray-400 overflow-auto">
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="app">
        <ConsultantApprovalDashboard />
      </div>
    </ErrorBoundary>
  );
};

export default App;
