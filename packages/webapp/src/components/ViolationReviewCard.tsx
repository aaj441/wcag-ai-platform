/**
 * ViolationReviewCard component - displays individual WCAG violation details
 * Styled with dark theme for the Consultant Approval Dashboard
 */

import React from 'react';
import { Violation } from '../types';

interface ViolationReviewCardProps {
  violation: Violation;
  onSelect?: (violation: Violation) => void;
}

export const ViolationReviewCard: React.FC<ViolationReviewCardProps> = ({
  violation,
  onSelect,
}) => {
  const severityColors = {
    critical: 'bg-red-900 text-red-200 border-red-700',
    high: 'bg-orange-900 text-orange-200 border-orange-700',
    medium: 'bg-yellow-900 text-yellow-200 border-yellow-700',
    low: 'bg-blue-900 text-blue-200 border-blue-700',
  };

  const severityClass = severityColors[violation.severity];

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer shadow-lg"
      onClick={() => onSelect?.(violation)}
    >
      {/* Header with severity badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            {violation.wcagCriteria}
          </h3>
          <p className="text-sm text-gray-400">{violation.url}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${severityClass}`}
        >
          {violation.severity.toUpperCase()}
        </span>
      </div>

      {/* Element selector */}
      <div className="mb-3 p-2 bg-gray-900 rounded border border-gray-700">
        <p className="text-xs text-gray-500 mb-1">Element:</p>
        <code className="text-sm text-green-400 font-mono">
          {violation.element}
        </code>
      </div>

      {/* Description */}
      <div className="mb-3">
        <p className="text-sm text-gray-300">{violation.description}</p>
      </div>

      {/* Recommendation */}
      <div className="p-3 bg-gray-900 rounded border border-gray-700">
        <p className="text-xs text-gray-500 mb-1">Recommendation:</p>
        <p className="text-sm text-gray-200">{violation.recommendation}</p>
      </div>

      {/* Screenshot preview if available */}
      {violation.screenshot && (
        <div className="mt-3">
          <img
            src={violation.screenshot}
            alt="Violation screenshot"
            className="w-full rounded border border-gray-700 hover:border-gray-500 transition-colors"
          />
        </div>
      )}
    </div>
  );
};
