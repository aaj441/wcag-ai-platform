/**
 * Application Constants & Configuration
 * The Pillars: Immutable truths that support the entire structure
 */

import { SeverityConfig, StatusConfig } from '../types';

// ============================================================================
// SEVERITY CONFIGURATION - The Degrees of Impact
// ============================================================================

export const SEVERITY_CONFIG: SeverityConfig = {
  critical: {
    label: 'Critical',
    color: 'text-red-200',
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-700',
    icon: '⚠️',
  },
  high: {
    label: 'High',
    color: 'text-orange-200',
    bgColor: 'bg-orange-900/50',
    borderColor: 'border-orange-700',
    icon: '🔶',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-200',
    bgColor: 'bg-yellow-900/50',
    borderColor: 'border-yellow-700',
    icon: '⚡',
  },
  low: {
    label: 'Low',
    color: 'text-blue-200',
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-700',
    icon: 'ℹ️',
  },
};

// ============================================================================
// STATUS CONFIGURATION - The Journey States
// ============================================================================

export const STATUS_CONFIG: StatusConfig = {
  draft: {
    label: 'Draft',
    color: 'text-gray-300',
    bgColor: 'bg-gray-700/50',
    icon: '📝',
  },
  pending_review: {
    label: 'Pending Review',
    color: 'text-yellow-200',
    bgColor: 'bg-yellow-900/50',
    icon: '⏳',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-200',
    bgColor: 'bg-green-900/50',
    icon: '✅',
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-200',
    bgColor: 'bg-blue-900/50',
    icon: '📧',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-200',
    bgColor: 'bg-red-900/50',
    icon: '❌',
  },
};

// ============================================================================
// WCAG CRITERIA - The Standards
// ============================================================================

export const WCAG_CRITERIA_INFO: Record<string, { title: string; level: string; url: string }> = {
  '1.1.1': {
    title: 'Non-text Content',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
  },
  '1.3.1': {
    title: 'Info and Relationships',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
  '1.4.3': {
    title: 'Contrast (Minimum)',
    level: 'AA',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
  },
  '2.1.1': {
    title: 'Keyboard',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
  },
  '2.4.3': {
    title: 'Focus Order',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
  },
  '3.3.2': {
    title: 'Labels or Instructions',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
  },
  '4.1.2': {
    title: 'Name, Role, Value',
    level: 'A',
    url: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  },
};

// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

export const APP_CONFIG = {
  name: 'WCAG AI Platform',
  version: '1.0.0',
  tagline: 'Consultant Approval Dashboard',
  apiTimeout: 30000,
  maxDraftsPerPage: 50,
  autoSaveInterval: 30000, // 30 seconds
  notificationDuration: 5000, // 5 seconds
};

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const ENV = {
  hubspotApiUrl: import.meta.env.VITE_HUBSPOT_API_URL || 'https://api.hubapi.com',
  hubspotApiKey: import.meta.env.VITE_HUBSPOT_API_KEY || '',
  senderEmail: import.meta.env.VITE_SENDER_EMAIL || 'noreply@wcag-ai.com',
  environment: import.meta.env.MODE || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
  sidebarWidth: 320,
  headerHeight: 64,
  maxViolationsDisplay: 100,
  animationDuration: 200,
  debounceDelay: 300,
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  minSubjectLength: 5,
  maxSubjectLength: 200,
  minBodyLength: 20,
  maxBodyLength: 10000,
};
