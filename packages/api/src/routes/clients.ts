import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { sendWelcomeEmail } from '../services/email';
import OnboardingService from '../services/onboardingService';
import { log } from '../utils/logger';

const router = Router();

// POST /api/clients/onboard
// Complete client onboarding flow with legal documents and initial scan
router.post('/onboard', async (req: Request, res: Response) => {
  try {
    const { email, company, tier = 'basic', website, websites, contactName, contactPhone, industry } = req.body;

    // Validation
    if (!email || !company) {
      return res.status(400).json({
        success: false,
        error: 'Email and company are required'
      });
    }

    // Check if client already exists
    const existingClient = await prisma.client.findUnique({
      where: { email }
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Client with this email already exists'
      });
    }

    // Execute complete onboarding workflow
    const onboardingResult = await OnboardingService.onboardClient({
      email,
      company,
      website,
      websites,
      tier: tier as 'basic' | 'pro' | 'enterprise',
      contactName,
      contactPhone,
      industry
    });

    log.info('Client onboarding completed', {
      clientId: onboardingResult.clientId,
      company,
      tier
    });

    return res.status(201).json({
      success: true,
      ...onboardingResult
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Client onboarding error:', error instanceof Error ? error : new Error(String(error)));

    return res.status(400).json({
      success: false,
      error: errorMessage || 'Failed to onboard client'
    });
  }
});

// GET /api/clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        email: true,
        company: true,
        tier: true,
        scansRemaining: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch clients'
    });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    return res.json({ success: true, client });
  } catch (error) {
    console.error('Error fetching client:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch client'
    });
  }
});

// PATCH /api/clients/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tier, status, scansRemaining } = req.body;

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(tier && { tier }),
        ...(status && { status }),
        ...(scansRemaining !== undefined && { scansRemaining })
      }
    });

    return res.json({ success: true, client: updatedClient });
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update client'
    });
  }
});

// GET /api/clients/:id/legal-documents
// Retrieve client's legal documents for review/signing
router.get('/:id/legal-documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        company: true,
        tier: true,
        createdAt: true
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Return links to legal documents
    const baseUrl = process.env.DASHBOARD_URL || 'https://dashboard.wcag-ai.com';

    return res.json({
      success: true,
      client: {
        id: client.id,
        email: client.email,
        company: client.company,
        tier: client.tier
      },
      documents: {
        serviceAgreement: {
          title: 'Service Agreement',
          url: `${baseUrl}/legal/${id}/service-agreement`,
          required: true,
          signed: false
        },
        liabilityWaiver: {
          title: 'Liability Waiver',
          url: `${baseUrl}/legal/${id}/liability-waiver`,
          required: true,
          signed: false
        },
        sla: {
          title: 'Service Level Agreement',
          url: `${baseUrl}/legal/${id}/sla`,
          required: true,
          signed: false
        },
        accessibilityStatement: {
          title: 'Accessibility Statement Template',
          url: `${baseUrl}/legal/${id}/accessibility-statement`,
          required: false,
          signed: false
        }
      }
    });
  } catch (error) {
    console.error('Error fetching legal documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch legal documents'
    });
  }
});

export default router;
