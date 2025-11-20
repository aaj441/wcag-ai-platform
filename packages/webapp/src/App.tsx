/**
 * Example App component demonstrating Consultant Approval Dashboard usage
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ConsultantApprovalDashboard } from './components/ConsultantApprovalDashboard';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }>{
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Placeholder for telemetry: intentionally referencing params to satisfy linter
    if (error && info) {
      // no-op; integrate logger or tracing here (e.g., OpenTelemetry span) in future
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-gray-300 mb-4">An unexpected error occurred. Please refresh the page or try again later.</p>
            <pre className="text-xs text-gray-400 overflow-auto bg-gray-900 p-3 rounded border border-gray-700">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <div className="app">
      <ErrorBoundary>
        <ConsultantApprovalDashboard />
      </ErrorBoundary>
    </div>
  );
};

export default App;
