/**
 * ConsultantApprovalDashboard - Main dashboard component for reviewing and approving
 * email drafts to consultants about WCAG violations
 */

import React, { useState, useEffect } from 'react';
import { EmailDraft, DashboardState } from '../types';
import { ViolationReviewCard } from './ViolationReviewCard';
import { hubspotService } from '../services/hubspot';

export const ConsultantApprovalDashboard: React.FC = () => {
  // State management for email editing and dashboard
  const [state, setState] = useState<DashboardState>({
    emailDrafts: [],
    selectedDraft: null,
    editMode: false,
    isLoading: true,
    error: null,
  });

  // Temporary state for editing
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [editedRecipient, setEditedRecipient] = useState('');

  // Load email drafts on component mount
  useEffect(() => {
    loadEmailDrafts();
  }, []);

  // Update edit fields when selected draft changes
  useEffect(() => {
    if (state.selectedDraft) {
      setEditedSubject(state.selectedDraft.subject);
      setEditedBody(state.selectedDraft.body);
      setEditedRecipient(state.selectedDraft.recipient);
    }
  }, [state.selectedDraft]);

  const loadEmailDrafts = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // In a real app, this would fetch from an API
      // For now, using mock data
      const mockDrafts: EmailDraft[] = [
        {
          id: '1',
          recipient: 'consultant@example.com',
          subject: 'WCAG Accessibility Issues Found',
          body: 'We have identified several WCAG compliance issues on your website...',
          violations: [
            {
              id: 'v1',
              url: 'https://example.com/page1',
              element: 'button.submit',
              wcagCriteria: 'WCAG 2.1 - 1.4.3 Contrast (Minimum)',
              severity: 'high',
              description: 'Button has insufficient color contrast ratio (2.8:1)',
              recommendation: 'Increase contrast to at least 4.5:1 for normal text',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
        },
      ];

      setState((prev) => ({
        ...prev,
        emailDrafts: mockDrafts,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to load email drafts',
        isLoading: false,
      }));
    }
  };

  const selectDraft = (draft: EmailDraft) => {
    setState((prev) => ({
      ...prev,
      selectedDraft: draft,
      editMode: false,
    }));
  };

  const toggleEditMode = () => {
    setState((prev) => ({ ...prev, editMode: !prev.editMode }));
  };

  const saveDraft = () => {
    if (!state.selectedDraft) return;

    const updatedDraft: EmailDraft = {
      ...state.selectedDraft,
      subject: editedSubject,
      body: editedBody,
      recipient: editedRecipient,
      updatedAt: new Date(),
    };

    setState((prev) => ({
      ...prev,
      emailDrafts: prev.emailDrafts.map((d) =>
        d.id === updatedDraft.id ? updatedDraft : d
      ),
      selectedDraft: updatedDraft,
      editMode: false,
    }));
  };

  const approveDraft = async () => {
    if (!state.selectedDraft) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Log to HubSpot
      await hubspotService.logEmailActivity(state.selectedDraft);

      const approvedDraft: EmailDraft = {
        ...state.selectedDraft,
        status: 'approved',
        updatedAt: new Date(),
      };

      setState((prev) => ({
        ...prev,
        emailDrafts: prev.emailDrafts.map((d) =>
          d.id === approvedDraft.id ? approvedDraft : d
        ),
        selectedDraft: approvedDraft,
        isLoading: false,
      }));

      alert('Email approved and logged to HubSpot!');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to approve email',
        isLoading: false,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-100">
            Consultant Approval Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Review and approve WCAG violation emails
          </p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Error message */}
        {state.error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {state.error}
          </div>
        )}

        {/* Loading state */}
        {state.isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        )}

        {/* Main content */}
        {!state.isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Email drafts list */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-gray-100">
                Email Drafts ({state.emailDrafts.length})
              </h2>
              <div className="space-y-3">
                {state.emailDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => selectDraft(draft)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                      state.selectedDraft?.id === draft.id
                        ? 'bg-blue-900 border-blue-700'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-100">
                        {draft.recipient}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          draft.status === 'approved'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {draft.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {draft.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {draft.violations.length} violation(s)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Email preview and editor */}
            <div className="lg:col-span-2">
              {state.selectedDraft ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
                  {/* Email header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-100">
                      Email Preview
                    </h2>
                    <div className="space-x-2">
                      <button
                        onClick={toggleEditMode}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        {state.editMode ? 'Cancel' : 'Edit'}
                      </button>
                      {state.editMode && (
                        <button
                          onClick={saveDraft}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Save
                        </button>
                      )}
                      {!state.editMode &&
                        state.selectedDraft.status === 'draft' && (
                          <button
                            onClick={approveDraft}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          >
                            Approve
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Email fields */}
                  {state.editMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Recipient
                        </label>
                        <input
                          type="email"
                          value={editedRecipient}
                          onChange={(e) => setEditedRecipient(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Body
                        </label>
                        <textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={10}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500 font-mono text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">To:</p>
                        <p className="text-gray-100">
                          {state.selectedDraft.recipient}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Subject:</p>
                        <p className="text-gray-100">
                          {state.selectedDraft.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Body:</p>
                        <div className="p-4 bg-gray-900 border border-gray-700 rounded">
                          <p className="text-gray-200 whitespace-pre-wrap">
                            {state.selectedDraft.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Violations */}
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-100">
                      Violations ({state.selectedDraft.violations.length})
                    </h3>
                    <div className="space-y-4">
                      {state.selectedDraft.violations.map((violation) => (
                        <ViolationReviewCard
                          key={violation.id}
                          violation={violation}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center shadow-lg">
                  <p className="text-gray-400 text-lg">
                    Select an email draft to preview
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
