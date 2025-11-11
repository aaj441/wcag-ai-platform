/**
 * Fintech Test Script
 * Demonstrates complete workflow with financial services companies
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as fintechStore from './data/fintechStore';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================================
// FINTECH TEST ENDPOINTS
// ============================================================================

// Get all fintech drafts
app.get('/api/fintech/drafts', (req, res) => {
  const drafts = fintechStore.getAllDrafts();
  res.json({
    success: true,
    data: drafts,
    message: `Retrieved ${drafts.length} fintech company drafts`,
  });
});

// Get drafts by company
app.get('/api/fintech/drafts/company/:company', (req, res) => {
  const { company } = req.params;
  const allDrafts = fintechStore.getAllDrafts();
  const drafts = allDrafts.filter(d =>
    d.company?.toLowerCase().includes(company.toLowerCase())
  );

  res.json({
    success: true,
    data: drafts,
    message: `Found ${drafts.length} drafts for ${company}`,
  });
});

// Get fintech violations
app.get('/api/fintech/violations', (req, res) => {
  const violations = fintechStore.getAllViolations();
  res.json({
    success: true,
    data: violations,
    message: `Retrieved ${violations.length} fintech-specific violations`,
  });
});

// Get violations statistics
app.get('/api/fintech/stats', (req, res) => {
  const drafts = fintechStore.getAllDrafts();
  const violations = fintechStore.getAllViolations();

  const stats = {
    totalDrafts: drafts.length,
    totalViolations: violations.length,
    companiesTested: [...new Set(drafts.map(d => d.company))].length,
    byStatus: {
      draft: drafts.filter(d => d.status === 'draft').length,
      pending_review: drafts.filter(d => d.status === 'pending_review').length,
      approved: drafts.filter(d => d.status === 'approved').length,
      sent: drafts.filter(d => d.status === 'sent').length,
      rejected: drafts.filter(d => d.status === 'rejected').length,
    },
    bySeverity: {
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length,
    },
    companies: [...new Set(drafts.map(d => d.company))],
  };

  res.json({
    success: true,
    data: stats,
  });
});

// Approve fintech draft
app.patch('/api/fintech/drafts/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;

  const updated = fintechStore.updateDraft(id, {
    status: 'approved',
    approvedBy: approvedBy || 'admin@wcag-ai.com',
    approvedAt: new Date(),
  });

  if (!updated) {
    return res.status(404).json({
      success: false,
      error: 'Draft not found',
    });
  }

  res.json({
    success: true,
    data: updated,
    message: `Approved email to ${updated.company}`,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Fintech Test Server Running',
    timestamp: new Date().toISOString(),
  });
});

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'WCAG AI Platform - Fintech Test Server',
    version: '1.0.0',
    description: 'Test server with fintech company data',
    endpoints: {
      drafts: '/api/fintech/drafts',
      violations: '/api/fintech/violations',
      stats: '/api/fintech/stats',
      health: '/health',
    },
    companies: [
      'Stripe Corporation',
      'Robinhood Markets Inc',
      'Coinbase Global Inc',
      'SoFi Technologies',
      'Plaid Inc',
    ],
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 WCAG AI Platform - Fintech Test Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Fintech API: http://localhost:${PORT}/api/fintech`);
  console.log(`🏦 Companies: 5 major fintech firms`);
  console.log(`📧 Email Drafts: ${fintechStore.getAllDrafts().length}`);
  console.log(`⚠️  Violations: ${fintechStore.getAllViolations().length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 TEST COMMANDS:');
  console.log('');
  console.log(`curl http://localhost:${PORT}/api/fintech/stats`);
  console.log(`curl http://localhost:${PORT}/api/fintech/drafts`);
  console.log(`curl http://localhost:${PORT}/api/fintech/violations`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
