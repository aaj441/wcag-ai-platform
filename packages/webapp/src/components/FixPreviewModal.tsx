/**
 * FixPreviewModal Component - AI-Powered Fix Preview
 * Shows before/after code comparison and implementation instructions
 */

import React, { useEffect, useRef, useState } from 'react';
import { FixResult } from '../types';
import { copyToClipboard } from '../utils/helpers';

interface FixPreviewModalProps {
  fix: FixResult | null;
  onClose: () => void;
  onApply?: (fix: FixResult) => void;
}

export const FixPreviewModal: React.FC<FixPreviewModalProps> = ({ fix, onClose, onApply }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!fix) return;

    // Focus trap: focus the modal when it opens
    const previouslyFocused = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Return focus to previously focused element
      previouslyFocused?.focus();
    };
  }, [fix, onClose]);

  if (!fix) return null;

  const handleApply = () => {
    if (onApply) {
      onApply(fix);
    }
    onClose();
  };

  const handleCopyFixed = async () => {
    const success = await copyToClipboard(fix.codeFix.fixed);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const confidencePercentage = Math.round(fix.confidence * 100);
  const confidenceColor = 
    fix.confidence >= 0.9 ? 'text-green-400' :
    fix.confidence >= 0.7 ? 'text-yellow-400' :
    'text-orange-400';

  // Safely parse the date
  const generatedDate = fix.generatedAt ? new Date(fix.generatedAt) : null;
  const isValidDate = generatedDate && !isNaN(generatedDate.getTime());

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 id="modal-title" className="text-2xl font-bold text-gray-100 flex items-center">
              🤖 AI-Generated Fix
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Confidence: <span className={`font-semibold ${confidenceColor}`}>{confidencePercentage}%</span>
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close fix preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Explanation */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 What this fix does</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{fix.codeFix.explanation}</p>
          </div>

          {/* Code Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-red-400">❌ Before (Original)</h3>
              </div>
              <pre className="bg-gray-900 border border-red-700/30 rounded-lg p-4 text-sm text-red-300 font-mono overflow-x-auto">
                <code>{fix.codeFix.original}</code>
              </pre>
            </div>

            {/* After */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-400">✓ After (Fixed)</h3>
                <button
                  onClick={handleCopyFixed}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  aria-label="Copy fixed code to clipboard"
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <pre className="bg-gray-900 border border-green-700/30 rounded-lg p-4 text-sm text-green-300 font-mono overflow-x-auto">
                <code>{fix.codeFix.fixed}</code>
              </pre>
            </div>
          </div>

          {/* Implementation Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">🛠️ Implementation Steps</h3>
            <ol className="space-y-2">
              {fix.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-300 pt-0.5">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Files Affected */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-2">📁 Files to Update</h3>
            <div className="flex flex-wrap gap-2">
              {fix.filesAffected.map((file, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono"
                >
                  {file}
                </span>
              ))}
            </div>
          </div>

          {/* Effort Estimate */}
          <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Estimated Effort</p>
              <p className="text-lg font-semibold text-gray-200">{fix.estimatedEffort}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <p className="text-lg font-semibold text-gray-200 capitalize">{fix.type}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900/50">
          <div className="text-xs text-gray-500">
            {isValidDate ? `Generated: ${generatedDate.toLocaleString()}` : 'Generated: Just now'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
            {onApply && (
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                Copy & Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixPreviewModal;
