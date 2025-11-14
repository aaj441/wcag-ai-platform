/**
 * ViolationCard Component - The Evidence
 * Displays individual WCAG violations with full detail and context
 */

import React, { useState } from 'react';
import { Violation, FixResult } from '../types';
import { SEVERITY_CONFIG, WCAG_CRITERIA_INFO } from '../config/constants';
import { copyToClipboard } from '../utils/helpers';
import { apiService } from '../services/api';
import { FixPreviewModal } from './FixPreviewModal';

interface ViolationCardProps {
  violation: Violation;
  index: number;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({ violation, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingFix, setGeneratingFix] = useState(false);
  const [currentFix, setCurrentFix] = useState<FixResult | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const severityConfig = SEVERITY_CONFIG[violation.severity];
  const wcagInfo = WCAG_CRITERIA_INFO[violation.wcagCriteria];

  const handleCopyCode = async () => {
    if (violation.codeSnippet) {
      const success = await copyToClipboard(violation.codeSnippet);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleGenerateFix = async () => {
    setGeneratingFix(true);
    setFixError(null);
    try {
      const fix = await apiService.generateFix(violation.id);
      if (fix) {
        setCurrentFix(fix);
        setShowFixModal(true);
      } else {
        setFixError('Failed to generate fix. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate fix:', error);
      setFixError('Failed to generate fix. Please try again.');
    } finally {
      setGeneratingFix(false);
    }
  };

  const handleApplyFix = async (fix: FixResult) => {
    const success = await copyToClipboard(fix.codeFix.fixed);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{severityConfig.icon}</span>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityConfig.color} ${severityConfig.bgColor} ${severityConfig.borderColor} border`}>
                  {severityConfig.label}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-700">
                  WCAG {violation.wcagCriteria} ({violation.wcagLevel})
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                  #{index + 1}
                </span>
              </div>
              {wcagInfo && (
                <a
                  href={wcagInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {wcagInfo.title} →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Page Info */}
        <div className="text-sm text-gray-300 mb-2">
          <span className="font-semibold">{violation.pageTitle}</span>
        </div>
        <div className="text-xs text-gray-400 mb-2">
          <span className="font-mono">{violation.url}</span>
        </div>
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">Element:</span>{' '}
          <span className="font-mono text-purple-300">{violation.element}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Description */}
        <div>
          <h4 className="text-sm font-semibold text-gray-200 mb-2">Description</h4>
          <p className="text-sm text-gray-300 leading-relaxed">{violation.description}</p>
        </div>

        {/* Recommendation */}
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center">
            <span className="mr-2">✓</span>
            Recommendation
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed bg-green-900/20 p-3 rounded border border-green-700/30">
            {violation.recommendation}
          </p>
          
          {/* AI FIX Button */}
          <div className="mt-3">
            <button
              onClick={handleGenerateFix}
              disabled={generatingFix}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all font-semibold flex items-center justify-center space-x-2"
              aria-label={generatingFix ? "Generating AI fix, please wait" : "Generate AI fix for this violation"}
            >
              {generatingFix ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating Fix...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>AI FIX - Generate Code</span>
                </>
              )}
            </button>
            {fixError && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-400">
                {fixError}
              </div>
            )}
            {copySuccess && (
              <div className="mt-2 p-2 bg-green-900/20 border border-green-700/30 rounded text-sm text-green-400">
                ✓ Fix code copied to clipboard! Follow the implementation steps to apply it.
              </div>
            )}
          </div>
        </div>

        {/* Affected Users */}
        {violation.affectedUsers && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">👥 Impact</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{violation.affectedUsers}</p>
          </div>
        )}

        {/* Expandable Technical Details */}
        {(violation.codeSnippet || violation.technicalDetails) && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center transition-colors"
            >
              <span className={`mr-2 transform transition-transform ${expanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              Technical Details
            </button>

            {expanded && (
              <div className="mt-3 space-y-3">
                {violation.technicalDetails && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Details:</p>
                    <p className="text-sm text-gray-300 font-mono bg-gray-900 p-3 rounded border border-gray-700">
                      {violation.technicalDetails}
                    </p>
                  </div>
                )}

                {violation.codeSnippet && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">Code Snippet:</p>
                      <button
                        onClick={handleCopyCode}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {copied ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <pre className="text-sm text-green-300 font-mono bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                      <code>{violation.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Screenshot */}
        {violation.screenshot && (
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-2">📸 Screenshot</h4>
            <img
              src={violation.screenshot}
              alt={`Screenshot showing ${violation.description}`}
              className="w-full rounded border border-gray-700"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Fix Preview Modal */}
      {showFixModal && (
        <FixPreviewModal
          fix={currentFix}
          onClose={() => setShowFixModal(false)}
          onApply={handleApplyFix}
        />
      )}
    </div>
  );
};

export default ViolationCard;
