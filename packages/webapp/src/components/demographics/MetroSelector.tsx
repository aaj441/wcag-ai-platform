import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Metro {
  metroId: string;
  name: string;
  state: string;
  population: number;
  adaLawsuitTrend: string;
}

interface Industry {
  verticalId: string;
  name: string;
  adaRiskLevel: string;
  estimatedProspectsInMetro: number;
  recentLawsuitCount: number;
}

interface DiscoveryResult {
  metro: string;
  industries: string[];
  discovered: number;
  auditable: number;
  ready: number;
}

export function MetroSelector() {
  const [metros, setMetros] = useState<Metro[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedMetro, setSelectedMetro] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [batchJob, setBatchJob] = useState<any>(null);
  const [error, setError] = useState('');

  // Load metros and industries on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const metrosRes = await axios.get('/api/demographics/metros?sort=population_desc');
        setMetros(metrosRes.data.data.metros.slice(0, 50)); // Top 50

        const industriesRes = await axios.get('/api/demographics/industries');
        setIndustries(industriesRes.data.data.industries);
      } catch (err) {
        setError('Failed to load metros and industries');
        console.error(err);
      }
    };

    loadData();
  }, []);

  const handleMetroSelect = (metroId: string) => {
    setSelectedMetro(metroId);
    setResult(null);
  };

  const handleIndustryToggle = (verticalId: string) => {
    setSelectedIndustries(prev =>
      prev.includes(verticalId)
        ? prev.filter(id => id !== verticalId)
        : [...prev, verticalId]
    );
  };

  const handleDiscover = async () => {
    if (!selectedMetro || selectedIndustries.length === 0) {
      setError('Please select a metro and at least one industry');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/demographics/discover', {
        metro: selectedMetro,
        industries: selectedIndustries,
        limit: 100,
        enrichData: true,
      });

      setResult(response.data.data);

      // Show success message and start batch audit if prospects found
      if (response.data.data.discovered > 0) {
        // Could start batch audit here
        console.log(`Discovered ${response.data.data.discovered} prospects`);
      }
    } catch (err) {
      setError((err as any).response?.data?.error || 'Discovery failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedMetroName = metros.find(m => m.metroId === selectedMetro)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            National Lead Targeting Engine
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover WCAG-vulnerable businesses in any US metro area. Instantly identify lawsuit risks and priority leads.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Step 1: Metro Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Select Metro Area</h2>

              {selectedMetro && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600">Selected Metro</p>
                  <p className="text-xl font-bold text-blue-600">{selectedMetroName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {metros.map(metro => (
                  <button
                    key={metro.metroId}
                    onClick={() => handleMetroSelect(metro.metroId)}
                    className={`p-4 rounded-lg border-2 transition ${
                      selectedMetro === metro.metroId
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold text-sm">{metro.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {(metro.population / 1000000).toFixed(1)}M people
                    </div>
                    {metro.adaLawsuitTrend === 'increasing' && (
                      <div className="text-xs mt-2 px-2 py-1 bg-red-100 text-red-700 rounded w-fit">
                        ⚠️ Rising lawsuits
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Industry Selection */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Select Industries</h2>

              <div className="space-y-4">
                {industries.map(industry => (
                  <label
                    key={industry.verticalId}
                    className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndustries.includes(industry.verticalId)}
                      onChange={() => handleIndustryToggle(industry.verticalId)}
                      className="mt-1 w-5 h-5 text-blue-600"
                    />
                    <div className="ml-4 flex-1">
                      <div className="font-bold text-gray-900">{industry.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {industry.estimatedProspectsInMetro} prospects in this metro
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {industry.recentLawsuitCount} lawsuits nationwide (past 24 months)
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            industry.adaRiskLevel === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : industry.adaRiskLevel === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {industry.adaRiskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: Summary & Action */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-8 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Campaign Summary</h3>

              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-sm text-gray-600">Selected Metro</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedMetroName || 'None selected'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Selected Industries</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedIndustries.length || '0'}
                  </p>
                </div>

                {result && (
                  <>
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600">Prospects Found</p>
                      <p className="text-2xl font-bold text-green-600">{result.discovered}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Ready for Outreach</p>
                      <p className="text-lg font-bold text-gray-900">{result.ready}</p>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleDiscover}
                disabled={!selectedMetro || selectedIndustries.length === 0 || loading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Discovering...' : 'Discover Prospects'}
              </button>

              {result && (
                <>
                  <button
                    onClick={() => {
                      // Could implement batch audit trigger here
                      console.log('Starting batch audit for discovered prospects');
                    }}
                    className="w-full mt-3 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Audit All ({result.discovered})
                  </button>

                  <button
                    onClick={() => {
                      // Could implement batch recommendations trigger here
                      console.log('Generating recommendations');
                    }}
                    className="w-full mt-3 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition"
                  >
                    Get Recommendations
                  </button>
                </>
              )}

              {/* Quick Stats */}
              <div className="border-t mt-8 pt-6">
                <h4 className="text-sm font-bold text-gray-700 mb-4">How It Works</h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      1
                    </div>
                    <div>Select metro & industries</div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      2
                    </div>
                    <div>Auto-discover prospects</div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      3
                    </div>
                    <div>Scan for WCAG violations</div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      4
                    </div>
                    <div>Score lawsuit risk</div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      5
                    </div>
                    <div>Generate outreach emails</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
