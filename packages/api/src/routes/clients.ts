/**
 * Client Management API Routes
 * Handles client onboarding, management, and multi-tenant operations
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendOnboardingEmail } from '../services/emailService';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/clients/onboard
 * Automated client onboarding flow
 */
router.post('/onboard', async (req: Request, res: Response) => {
  try {
    const { email, company, tier = 'free' } = req.body;

    // Validation
    if (!email || !company) {
      return res.status(400).json({
        success: false,
        error: 'Email and company are required'
      });
    }

    if (!['free', 'starter', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be free, starter, pro, or enterprise'
      });
    }

    // Check for existing client
    const existingClient = await prisma.client.findUnique({
      where: { email }
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Client already exists with this email'
      });
    }

    // Determine scans based on tier
    const scansRemaining = tier === 'free' ? 5 : tier === 'starter' ? 20 : tier === 'pro' ? 100 : 9999;

    // Generate API key for the client
    const apiKey = `wcag_${crypto.randomBytes(32).toString('hex')}`;

    // Create new client in database
    const client = await prisma.client.create({
      data: {
        email,
        company,
        tier,
        scansRemaining,
        status: 'active',
        apiKey,
        // These would be populated by Stripe/Clerk in production
        subscriptionId: tier !== 'free' ? `sub_temp_${Date.now()}` : undefined,
        stripeCustomerId: tier !== 'free' ? `cus_temp_${Date.now()}` : undefined,
      }
    });

    // TODO: In production, this would:
    // 1. Create Clerk user with limited permissions
    // 2. Create Stripe customer + subscription
    // 3. Send welcome email with API key
    // 4. Trigger onboarding email via SendGrid

    // Send onboarding email
    const emailSent = await sendOnboardingEmail(email, company, apiKey, tier);
    
    if (!emailSent) {
      console.warn('Failed to send onboarding email, but client was created');
    }

    res.status(201).json({
      success: true,
      data: client,
      message: 'Client onboarded successfully'
    });
  } catch (error) {
    console.error('Client onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to onboard client'
    });
  }
});

/**
 * GET /api/clients
 * List all clients
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tier, status } = req.query;

    const where: any = {};

    if (tier) {
      where.tier = tier;
    }

    if (status) {
      where.status = status;
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: clients,
      total: clients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients'
    });
  }
});

/**
 * GET /api/clients/:id
 * Get client by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        scans: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client'
    });
  }
});

/**
 * PATCH /api/clients/:id/scans
 * Update client scan count
 */
router.patch('/:id/scans', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scansRemaining } = req.body;

    if (typeof scansRemaining !== 'number' || scansRemaining < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scansRemaining value'
      });
    }

    const client = await prisma.client.update({
      where: { id },
      data: { scansRemaining }
    });

    res.json({
      success: true,
      data: client,
      message: 'Client scan count updated'
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
    console.error('Error updating client scans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client scans'
    });
  }
});

export default router;
