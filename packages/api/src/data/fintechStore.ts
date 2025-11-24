/**
 * Fintech Test Data Store
 * Specialized dataset for financial services testing
 */

import { EmailDraft, LegacyViolation, QuarterlyReport } from '../types';
import { fintechViolations, fintechEmailDrafts, fintechConsultants } from './fintechTestData';

// Fintech violations database
export const violationsDB: LegacyViolation[] = [...fintechViolations];

// Fintech email drafts database
export const emailDraftsDB: EmailDraft[] = [...fintechEmailDrafts];

// Fintech consultants database
export const consultantsDB = [...fintechConsultants];

// Helper functions
export function getAllDrafts(): EmailDraft[] {
  return [...emailDraftsDB];
}

export function getDraftById(id: string): EmailDraft | undefined {
  return emailDraftsDB.find(d => d.id === id);
}

export function createDraft(draft: Omit<EmailDraft, 'id' | 'createdAt' | 'updatedAt'>): EmailDraft {
  const newDraft: EmailDraft = {
    ...draft,
    id: `fintech-draft${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  emailDraftsDB.push(newDraft);
  return newDraft;
}

export function updateDraft(id: string, updates: Partial<EmailDraft>): EmailDraft | null {
  const index = emailDraftsDB.findIndex(d => d.id === id);
  if (index === -1) return null;

  emailDraftsDB[index] = {
    ...emailDraftsDB[index],
    ...updates,
    updatedAt: new Date(),
  };
  return emailDraftsDB[index];
}

export function deleteDraft(id: string): boolean {
  const index = emailDraftsDB.findIndex(d => d.id === id);
  if (index === -1) return false;

  emailDraftsDB.splice(index, 1);
  return true;
}

export function getAllViolations(): LegacyViolation[] {
  return [...violationsDB];
}

export function getViolationsByCompany(company: string): LegacyViolation[] {
  // Filter violations by company in URL or pageTitle
  return violationsDB.filter(v =>
    v.url.toLowerCase().includes(company.toLowerCase()) ||
    v.pageTitle.toLowerCase().includes(company.toLowerCase())
  );
}

export function getAllConsultants() {
  return [...consultantsDB];
}

export function getConsultantByEmail(email: string) {
  return consultantsDB.find(c => c.email === email);
}

// Quarterly Reports Database
export const quarterlyReportsDB: QuarterlyReport[] = [
  {
    id: 'q4-2024-report',
    quarter: 'Q4 2024',
    year: 2024,
    startDate: new Date('2024-10-01'),
    endDate: new Date('2024-12-31'),
    clientId: 'client-fintech-001',
    clientName: 'Acme Financial Services',
    
    // Executive Summary
    overallComplianceScore: 87,
    criticalIssuesResolved: 23,
    automatedScansPerformed: 156,
    manualReviewsCompleted: 42,
    legalRiskSnapshot: 'Proactive documentation in Evidence Vault has strengthened \'good-faith effort\' ADA/EAA defense.',
    
    // Performance Metrics
    metrics: [
      {
        metric: 'New Critical Issues Found',
        lastQuarter: 31,
        thisQuarter: 18,
        change: '-41.9%'
      },
      {
        metric: 'Avg. Time to Remediate',
        lastQuarter: '7.2 days',
        thisQuarter: '4.8 days',
        change: '-33.3%'
      },
      {
        metric: 'Automated Checks Passed',
        lastQuarter: 142,
        thisQuarter: 156,
        change: '+9.9%'
      },
      {
        metric: 'Manually Verified User Flows',
        lastQuarter: 38,
        thisQuarter: 42,
        change: '+10.5%'
      }
    ],
    
    // Evidence Vault
    evidenceVault: {
      datedScans: 156,
      remediationTickets: 87,
      manualAttestations: [
        'WCAG 2.2 AA Compliance Policy Updated',
        'Screen Reader Testing Protocol Documented',
        'Keyboard Navigation Standards Established'
      ]
    },
    
    // Key Improvements
    keyImprovements: [
      'Reduced critical accessibility violations by 42% through automated monitoring',
      'Implemented real-time scanning for all production deployments',
      'Enhanced consultant approval workflow reducing review time by 33%'
    ],
    nextSteps: [
      'Expand automated testing to cover WCAG 2.2 AAA criteria',
      'Integrate with CI/CD pipeline for pre-deployment scanning',
      'Develop self-service remediation tools for common violations'
    ],
    
    createdAt: new Date('2024-12-31'),
    updatedAt: new Date('2024-12-31')
  },
  {
    id: 'q3-2024-report',
    quarter: 'Q3 2024',
    year: 2024,
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-09-30'),
    clientId: 'client-fintech-001',
    clientName: 'Acme Financial Services',
    
    // Executive Summary
    overallComplianceScore: 78,
    criticalIssuesResolved: 19,
    automatedScansPerformed: 142,
    manualReviewsCompleted: 38,
    legalRiskSnapshot: 'Evidence vault established with comprehensive audit trail for regulatory compliance.',
    
    // Performance Metrics
    metrics: [
      {
        metric: 'New Critical Issues Found',
        lastQuarter: 42,
        thisQuarter: 31,
        change: '-26.2%'
      },
      {
        metric: 'Avg. Time to Remediate',
        lastQuarter: '9.5 days',
        thisQuarter: '7.2 days',
        change: '-24.2%'
      },
      {
        metric: 'Automated Checks Passed',
        lastQuarter: 128,
        thisQuarter: 142,
        change: '+10.9%'
      },
      {
        metric: 'Manually Verified User Flows',
        lastQuarter: 35,
        thisQuarter: 38,
        change: '+8.6%'
      }
    ],
    
    // Evidence Vault
    evidenceVault: {
      datedScans: 142,
      remediationTickets: 73,
      manualAttestations: [
        'Accessibility Testing Procedures Documented',
        'Color Contrast Policy Implemented',
        'Alt Text Guidelines Established'
      ]
    },
    
    // Key Improvements
    keyImprovements: [
      'Launched automated scanning platform',
      'Established monthly consultant review process',
      'Created evidence vault for audit trail documentation'
    ],
    nextSteps: [
      'Reduce critical issue discovery rate',
      'Improve remediation response time',
      'Expand coverage to all user-facing features'
    ],
    
    createdAt: new Date('2024-09-30'),
    updatedAt: new Date('2024-09-30')
  }
];

export function getAllQuarterlyReports(): QuarterlyReport[] {
  return [...quarterlyReportsDB];
}

export function getQuarterlyReportById(id: string): QuarterlyReport | undefined {
  return quarterlyReportsDB.find(r => r.id === id);
}

export function getQuarterlyReportsByClient(clientId: string): QuarterlyReport[] {
  return quarterlyReportsDB.filter(r => r.clientId === clientId);
}

export function createQuarterlyReport(report: Omit<QuarterlyReport, 'id' | 'createdAt' | 'updatedAt'>): QuarterlyReport {
  const newReport: QuarterlyReport = {
    ...report,
    id: `q${report.quarter.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  quarterlyReportsDB.push(newReport);
  return newReport;
}
