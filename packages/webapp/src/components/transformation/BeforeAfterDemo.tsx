import React, { useState } from 'react';
import axios from 'axios';

interface DemoState {
  url: string;
  loading: boolean;
  beforeUrl: string | null;
  afterUrl: string | null;
  complianceImprovement: number;
  violationsFixed: number;
  error: string | null;
}

export function BeforeAfterDemo() {
  const [state, setState] = useState<DemoState>({
    url: '',
    loading: false,
    beforeUrl: null,
    afterUrl: null,
    complianceImprovement: 0,
    violationsFixed: 0,
    error: null,
  });

  const [showAfter, setShowAfter] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const response = await axios.post('/api/screenshot', {
        url: state.url,
      });

      const { data } = response.data;
      setState((s) => (
        {
          ...s,
          beforeUrl: data.beforeUrl,
          afterUrl: data.afterUrl,
          complianceImprovement: data.complianceImprovement,
          violationsFixed: data.violationsFixed,
          loading: false,
        }
      ));
      setShowAfter(false);
    } catch (error) {
      setState((s) => (
        {
          ...s,
          error: (error as any).response?.data?.error || 'Failed to generate screenshots',
          loading: false,
        }
      ));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            WCAG Compliance Transformation
          </h1>
          <p className="text-lg text-gray-600">
            See your website transformed to be 100% WCAG 2.1 AA compliant in seconds
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4">
              <input
                type="url"
                placeholder="https://example.com"
                value={state.url}
                onChange={(e) => setState((s) => ({ ...s, url: e.target.value }))}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={state.loading}
              />
              <button
                type="submit"
                disabled={state.loading}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
              >
                {state.loading ? 'Analyzing...' : 'Transform'}
              </button>
            </div>
            {state.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {state.error}
              </div>
            )}
          </form>
        </div>

        {/* Results Section */}
        {state.beforeUrl && state.afterUrl && (
          <div className="space-y-8">
            {/* Comparison */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {showAfter ? '✅ After Transformation' : '❌ Before'}
                  </h2>
                  <button
                    onClick={() => setShowAfter(!showAfter)}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200 transition"
                  >
                    {showAfter ? 'Show Before' : 'Show After'}
                  </button>
                </div>

                {/* Screenshot */}
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={showAfter ? state.afterUrl : state.beforeUrl}
                    alt={showAfter ? 'After transformation' : 'Before transformation'}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-gray-600 text-sm">Violations Fixed</div>
                <div className="text-4xl font-bold text-green-600">
                  {state.violationsFixed}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-gray-600 text-sm">Compliance Improvement</div>
                <div className="text-4xl font-bold text-blue-600">
                  {state.complianceImprovement.toFixed(0)}%
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-gray-600 text-sm">Final Score</div>
                <div className="text-4xl font-bold text-indigo-600">
                  {(0.2 + state.complianceImprovement / 100).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Guarantee */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-8 border border-green-200">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🎯</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    100% Compliance Guaranteed
                  </h3>
                  <p className="text-gray-700">
                    All violations fixed with SLA backing and insurance coverage. Ready to
                    deploy to production in 24-48 hours.
                  </p>
                  <button className="mt-4 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">
                    Download Proposal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
