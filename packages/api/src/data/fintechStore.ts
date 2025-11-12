/**
 * Fintech Test Data Store
 * Specialized dataset for financial services testing
 */

import { EmailDraft, LegacyViolation } from '../types';
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
