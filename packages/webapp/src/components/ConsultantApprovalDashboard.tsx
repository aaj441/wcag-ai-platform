/**
 * Consultant Approval Dashboard - The Grand Lodge
 * Complete workflow for reviewing and approving accessibility violation emails
 * Architecture: Hierarchical state management with clear separation of concerns
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EmailDraft, EmailStatus, Notification } from '../types';
import { mockEmailDrafts } from '../services/mockData';
import { STATUS_CONFIG, APP_CONFIG } from '../config/constants';
import {
  formatDate,
  sortDrafts,
  searchDrafts,
  getViolationStats,
  validateDraft,
  estimateReadTime,
} from '../utils/helpers';
import { ViolationCard } from './ViolationCard';

export const ConsultantApprovalDashboard: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT - The Foundation
  // ============================================================================

  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<EmailStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'severity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Edit form state
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [editedRecipient, setEditedRecipient] = useState('');
  const [editedNotes, setEditedNotes] = useState('');

  // ============================================================================
  // INITIALIZATION - Load Data
  // ============================================================================

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDrafts(mockEmailDrafts);
      setIsLoading(false);
      addNotification('success', 'Email drafts loaded successfully');
    }, 500);
  }, []);

  // ============================================================================
  // COMPUTED VALUES - Derived State
  // ============================================================================

  const filteredAndSortedDrafts = useMemo(() => {
    let result = drafts;

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(d => d.status === filterStatus);
    }

    // Keyword filter
    if (keywordFilter.trim()) {
      const keywords = keywordFilter.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
      result = result.filter(d => {
        const draftKeywords = [
          ...(d.keywords || []),
          ...(d.keywordTags || []),
        ].map(k => k.toLowerCase());
        
        return keywords.some(k => 
          draftKeywords.some(dk => dk.includes(k))
        );
      });
    }

    // Search
    result = searchDrafts(result, searchQuery);

    // Sort
    result = sortDrafts(result, sortBy, sortOrder);

    return result;
  }, [drafts, filterStatus, keywordFilter, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    return {
      total: drafts.length,
      draft: drafts.filter(d => d.status === 'draft').length,
      pending_review: drafts.filter(d => d.status === 'pending_review').length,
      approved: drafts.filter(d => d.status === 'approved').length,
      sent: drafts.filter(d => d.status === 'sent').length,
      rejected: drafts.filter(d => d.status === 'rejected').length,
    };
  }, [drafts]);

  // ============================================================================
  // ACTIONS - The Rituals
  // ============================================================================

  function addNotification(type: Notification['type'], message: string) {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type,
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [notification, ...prev]);

    // Auto-remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, APP_CONFIG.notificationDuration);
  }

  function selectDraft(draft: EmailDraft) {
    setSelectedDraft(draft);
    setEditMode(false);
    setEditedSubject(draft.subject);
    setEditedBody(draft.body);
    setEditedRecipient(draft.recipient);
    setEditedNotes(draft.notes || '');
  }

  function toggleEditMode() {
    if (!selectedDraft) return;

    if (editMode) {
      // Exiting edit mode - reset to original values
      setEditedSubject(selectedDraft.subject);
      setEditedBody(selectedDraft.body);
      setEditedRecipient(selectedDraft.recipient);
      setEditedNotes(selectedDraft.notes || '');
    }

    setEditMode(!editMode);
  }

  function saveDraft() {
    if (!selectedDraft) return;

    const updatedDraft: EmailDraft = {
      ...selectedDraft,
      subject: editedSubject,
      body: editedBody,
      recipient: editedRecipient,
      notes: editedNotes,
      updatedAt: new Date(),
    };

    const validation = validateDraft(updatedDraft);
    if (!validation.valid) {
      addNotification('error', validation.errors[0]);
      return;
    }

    setDrafts(prev => prev.map(d => d.id === updatedDraft.id ? updatedDraft : d));
    setSelectedDraft(updatedDraft);
    setEditMode(false);
    addNotification('success', 'Draft saved successfully');
  }

  function approveDraft() {
    if (!selectedDraft) return;

    const updatedDraft: EmailDraft = {
      ...selectedDraft,
      status: 'approved',
      approvedBy: 'admin@wcag-ai.com',
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    setDrafts(prev => prev.map(d => d.id === updatedDraft.id ? updatedDraft : d));
    setSelectedDraft(updatedDraft);
    addNotification('success', `Email to ${updatedDraft.recipient} approved!`);
  }

  function rejectDraft() {
    if (!selectedDraft) return;

    const updatedDraft: EmailDraft = {
      ...selectedDraft,
      status: 'rejected',
      updatedAt: new Date(),
    };

    setDrafts(prev => prev.map(d => d.id === updatedDraft.id ? updatedDraft : d));
    setSelectedDraft(updatedDraft);
    addNotification('warning', 'Draft rejected');
  }

  function markAsSent() {
    if (!selectedDraft || selectedDraft.status !== 'approved') return;

    const updatedDraft: EmailDraft = {
      ...selectedDraft,
      status: 'sent',
      updatedAt: new Date(),
    };

    setDrafts(prev => prev.map(d => d.id === updatedDraft.id ? updatedDraft : d));
    setSelectedDraft(updatedDraft);
    addNotification('success', 'Email marked as sent');
  }

  // ============================================================================
  // RENDER - The Manifestation
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 flex items-center">
                <span className="mr-3 text-3xl">🏛️</span>
                {APP_CONFIG.name}
              </h1>
              <p className="text-sm text-gray-400 mt-1">{APP_CONFIG.tagline}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-300">{stats.total} Total Drafts</div>
                <div className="text-xs text-gray-500">{stats.pending_review} Pending Review</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="fixed top-20 right-6 z-50 space-y-2 max-w-md">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`p-4 rounded-lg shadow-lg border animate-slide-in ${
              notif.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
              notif.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
              notif.type === 'warning' ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100' :
              'bg-blue-900/90 border-blue-700 text-blue-100'
            }`}
          >
            <div className="flex items-start">
              <span className="text-xl mr-3">
                {notif.type === 'success' ? '✓' : notif.type === 'error' ? '✕' : notif.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{notif.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Draft List */}
          <div className="lg:col-span-1">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['pending_review', 'approved'] as const).map(status => {
                const config = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`p-3 rounded-lg border transition-all ${
                      filterStatus === status
                        ? 'bg-blue-900/50 border-blue-600'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl font-bold text-gray-100">{stats[status]}</div>
                    <div className="text-xs text-gray-400 mt-1">{config.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Search & Filter */}
            <div className="mb-4 space-y-2">
              <input
                type="text"
                placeholder="Search drafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                placeholder="Filter by keywords (e.g., alt text, color contrast, keyboard)..."
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-600"
              />

              <div className="flex space-x-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as EmailStatus | 'all')}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-600"
                >
                  <option value="all">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-600"
                >
                  <option value="date">Date</option>
                  <option value="priority">Priority</option>
                  <option value="severity">Severity</option>
                </select>
              </div>
            </div>

            {/* Draft List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredAndSortedDrafts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No drafts found</p>
                </div>
              ) : (
                filteredAndSortedDrafts.map(draft => {
                  const statusConfig = STATUS_CONFIG[draft.status];
                  const isSelected = selectedDraft?.id === draft.id;
                  const violationStats = getViolationStats(draft.violations);

                  return (
                    <button
                      key={draft.id}
                      onClick={() => selectDraft(draft)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-900/30 border-blue-600 shadow-lg'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(draft.updatedAt)}</span>
                      </div>

                      <div className="font-semibold text-gray-100 mb-1 truncate">
                        {draft.recipientName || draft.recipient}
                      </div>
                      {draft.company && (
                        <div className="text-xs text-gray-400 mb-2">{draft.company}</div>
                      )}

                      <div className="text-sm text-gray-300 truncate mb-2">{draft.subject}</div>

                      <div className="flex items-center space-x-2 text-xs">
                        {violationStats.critical > 0 && (
                          <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-200 border border-red-700">
                            {violationStats.critical} Critical
                          </span>
                        )}
                        {violationStats.high > 0 && (
                          <span className="px-2 py-0.5 rounded bg-orange-900/50 text-orange-200 border border-orange-700">
                            {violationStats.high} High
                          </span>
                        )}
                        <span className="text-gray-500">{violationStats.total} total</span>
                      </div>

                      {draft.tags && draft.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {draft.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {draft.keywords && draft.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {draft.keywords.slice(0, 3).map(keyword => (
                            <span key={keyword} className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-300 border border-blue-800">
                              🔑 {keyword}
                            </span>
                          ))}
                          {draft.keywords.length > 3 && (
                            <span className="px-2 py-0.5 rounded text-xs text-gray-400">
                              +{draft.keywords.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Draft Preview/Edit */}
          <div className="lg:col-span-2">
            {!selectedDraft ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📧</div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Select a draft to review</h3>
                <p className="text-gray-500">Choose an email draft from the list to preview and manage it</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview Header */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded font-medium ${STATUS_CONFIG[selectedDraft.status].color} ${STATUS_CONFIG[selectedDraft.status].bgColor}`}>
                          {STATUS_CONFIG[selectedDraft.status].icon} {STATUS_CONFIG[selectedDraft.status].label}
                        </span>
                        {selectedDraft.tags && selectedDraft.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div>Created: {formatDate(selectedDraft.createdAt)}</div>
                        <div>Updated: {formatDate(selectedDraft.updatedAt)}</div>
                        {selectedDraft.approvedBy && (
                          <div>Approved by: {selectedDraft.approvedBy} on {formatDate(selectedDraft.approvedAt!)}</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {selectedDraft.status === 'pending_review' && (
                        <>
                          <button
                            onClick={approveDraft}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={rejectDraft}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {selectedDraft.status === 'approved' && (
                        <button
                          onClick={markAsSent}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          📧 Mark as Sent
                        </button>
                      )}
                      {(selectedDraft.status === 'draft' || selectedDraft.status === 'pending_review') && (
                        <button
                          onClick={toggleEditMode}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                        >
                          {editMode ? '✕ Cancel' : '✏️ Edit'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Email Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">To:</label>
                      {editMode ? (
                        <input
                          type="email"
                          value={editedRecipient}
                          onChange={(e) => setEditedRecipient(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-600"
                        />
                      ) : (
                        <div className="text-gray-100">
                          {selectedDraft.recipientName && (
                            <span className="font-semibold">{selectedDraft.recipientName}</span>
                          )}
                          {' '}<span className="text-gray-400">&lt;{selectedDraft.recipient}&gt;</span>
                          {selectedDraft.company && (
                            <span className="text-gray-500"> - {selectedDraft.company}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Subject:</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-600"
                        />
                      ) : (
                        <div className="text-gray-100 font-medium">{selectedDraft.subject}</div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-400">Message:</label>
                        <span className="text-xs text-gray-500">
                          {estimateReadTime(selectedDraft.body)} min read
                        </span>
                      </div>
                      {editMode ? (
                        <textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={12}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 font-mono text-sm focus:outline-none focus:border-blue-600 resize-none"
                        />
                      ) : (
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-300 whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                          {selectedDraft.body}
                        </div>
                      )}
                    </div>

                    {(editMode || selectedDraft.notes) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Internal Notes:</label>
                        {editMode ? (
                          <textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            rows={3}
                            placeholder="Add internal notes..."
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-blue-600"
                          />
                        ) : (
                          <div className="text-gray-400 text-sm italic">{selectedDraft.notes}</div>
                        )}
                      </div>
                    )}

                    {/* Keywords Display */}
                    {(selectedDraft.keywords && selectedDraft.keywords.length > 0) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Auto-Extracted Keywords:</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedDraft.keywords.map(keyword => (
                            <span key={keyword} className="px-3 py-1.5 rounded-lg text-sm bg-blue-900/30 text-blue-300 border border-blue-800">
                              🔑 {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedDraft.keywordTags && selectedDraft.keywordTags.length > 0) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Manual Keyword Tags:</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedDraft.keywordTags.map(tag => (
                            <span key={tag} className="px-3 py-1.5 rounded-lg text-sm bg-purple-900/30 text-purple-300 border border-purple-800">
                              🏷️ {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {editMode && (
                      <div className="flex justify-end">
                        <button
                          onClick={saveDraft}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          💾 Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Violations */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
                    <span className="mr-2">🔍</span>
                    Violations ({selectedDraft.violations.length})
                  </h3>
                  <div className="space-y-4">
                    {selectedDraft.violations.map((violation, index) => (
                      <ViolationCard key={violation.id} violation={violation} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantApprovalDashboard;
