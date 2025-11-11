/**
 * ViolationCard Component - The Evidence
 * Displays individual WCAG violations with full detail and context
 */

import React, { useState } from 'react';
import { Violation } from '../types';
import { SEVERITY_CONFIG, WCAG_CRITERIA_INFO } from '../config/constants';
import { copyToClipboard } from '../utils/helpers';

interface ViolationCardProps {
  violation: Violation;
  index: number;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({ violation, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
    </div>
  );
};

export default ViolationCard;
