import React, { useState } from 'react';

interface FixPreviewProps {
  issueType: string;
  wcagCriteria: string;
  description: string;
  originalCode?: string;
  fixedCode: string;
  explanation: string;
  codeLanguage?: string;
  confidenceScore: number;
  isReviewMode?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
}

export function FixPreview({
  issueType,
  wcagCriteria,
  description,
  originalCode,
  fixedCode,
  explanation,
  codeLanguage = 'html',
  confidenceScore,
  isReviewMode = false,
  onApprove,
  onReject,
  isLoading = false,
}: FixPreviewProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'diff'>('side-by-side');
  const [copied, setCopied] = useState<'original' | 'fixed' | null>(null);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const copyToClipboard = (text: string, type: 'original' | 'fixed') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const highlightDifferences = (original: string, fixed: string) => {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    const maxLines = Math.max(originalLines.length, fixedLines.length);

    const diffs = [];
    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const fixedLine = fixedLines[i] || '';

      if (origLine !== fixedLine) {
        diffs.push({
          type: 'changed',
          original: origLine,
          fixed: fixedLine,
          lineNum: i + 1,
        });
      } else if (origLine) {
        diffs.push({
          type: 'unchanged',
          content: origLine,
          lineNum: i + 1,
        });
      }
    }
    return diffs;
  };

  const diffs = originalCode ? highlightDifferences(originalCode, fixedCode) : [];

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">
              🔧 Fix for {issueType.replace(/_/g, ' ')}
            </h2>
            <p className="text-blue-100 text-sm">WCAG {wcagCriteria}</p>
          </div>
          <div
            className={`px-4 py-2 rounded font-bold text-sm border ${getConfidenceColor(
              confidenceScore
            )}`}
          >
            {getConfidenceLabel(confidenceScore)} Confidence
            <br />
            {(confidenceScore * 100).toFixed(0)}%
          </div>
        </div>
        <p className="text-blue-50">{description}</p>
      </div>

      {/* Explanation Section */}
      <div className="bg-blue-50 border-b px-6 py-4">
        <h3 className="font-bold text-sm text-blue-900 mb-2">Why this fix works:</h3>
        <p className="text-sm text-blue-800 leading-relaxed">{explanation}</p>
      </div>

      {/* Code Comparison */}
      <div className="p-6">
        {originalCode && (
          <>
            {/* View Mode Selector */}
            <div className="flex gap-2 mb-6 border-b pb-4">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-4 py-2 rounded font-bold text-sm transition ${
                  viewMode === 'side-by-side'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                📋 Side by Side
              </button>
              <button
                onClick={() => setViewMode('diff')}
                className={`px-4 py-2 rounded font-bold text-sm transition ${
                  viewMode === 'diff'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                📊 Unified Diff
              </button>
            </div>

            {/* Side by Side View */}
            {viewMode === 'side-by-side' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Original Code */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-red-700">❌ Original Code</h4>
                    <button
                      onClick={() => copyToClipboard(originalCode, 'original')}
                      className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                    >
                      {copied === 'original' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-red-50 border border-red-200 rounded p-4 overflow-x-auto text-xs leading-relaxed font-mono text-red-900">
                    {originalCode}
                  </pre>
                </div>

                {/* Fixed Code */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-green-700">✅ Fixed Code</h4>
                    <button
                      onClick={() => copyToClipboard(fixedCode, 'fixed')}
                      className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                    >
                      {copied === 'fixed' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-green-50 border border-green-200 rounded p-4 overflow-x-auto text-xs leading-relaxed font-mono text-green-900">
                    {fixedCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Unified Diff View */}
            {viewMode === 'diff' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">Changes</h4>
                  <button
                    onClick={() => copyToClipboard(fixedCode, 'fixed')}
                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    {copied === 'fixed' ? '✓ Copied' : 'Copy Fixed Code'}
                  </button>
                </div>
                <div className="bg-gray-50 border rounded overflow-x-auto">
                  {diffs.map((diff, idx) => (
                    <div key={idx} className="flex font-mono text-xs">
                      {diff.type === 'unchanged' ? (
                        <>
                          <span className="w-12 text-gray-500 bg-gray-100 px-2 py-1 text-right border-r">
                            {diff.lineNum}
                          </span>
                          <span className="px-3 py-1 w-full text-gray-700 bg-gray-50">
                            {diff.content}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-12 text-gray-500 bg-gray-100 px-2 py-1 text-right border-r">
                            {diff.lineNum}
                          </span>
                          <div className="flex-1">
                            <div className="px-3 py-1 bg-red-50 text-red-900 border-b border-red-200">
                              − {diff.original}
                            </div>
                            <div className="px-3 py-1 bg-green-50 text-green-900">
                              + {diff.fixed}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Fixed Code Only (if no original provided) */}
        {!originalCode && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-green-700">✅ Recommended Fix</h4>
              <button
                onClick={() => copyToClipboard(fixedCode, 'fixed')}
                className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
              >
                {copied === 'fixed' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-green-50 border border-green-200 rounded p-4 overflow-x-auto text-xs leading-relaxed font-mono text-green-900">
              {fixedCode}
            </pre>
          </div>
        )}

        {/* Code Language Badge */}
        <div className="flex gap-2 mb-6">
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
            Language: {codeLanguage.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Review Actions (if in review mode) */}
      {isReviewMode && (
        <div className="bg-gray-50 border-t px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:bg-gray-400 transition"
          >
            👎 Reject Fix
          </button>
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {isLoading ? '⏳ Approving...' : '👍 Approve & Apply'}
          </button>
        </div>
      )}
    </div>
  );
}
