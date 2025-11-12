/**
 * Client Management API Routes
 * Handles client onboarding, management, and multi-tenant operations
 * NOW USES PRISMA DATABASE (Production-Ready)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

// Generate API Key
function generateApiKey(): string {
  return `wcagaii_${crypto.randomBytes(24).toString('hex')}`;
}

// POST /api/clients/onboard - Create new client
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

    // Determine scans based on tier
    const scansRemaining = tier === 'enterprise' ? 1000 : tier === 'pro' ? 100 : tier === 'starter' ? 20 : 5;

    // Create client with Prisma
    const client = await prisma.client.create({
      data: {
        email,
        company,
        tier,
        scansRemaining,
        apiKey: generateApiKey(),
        status: 'active'
      }
    });

    // TODO Phase 4: Send welcome email via SendGrid

    return res.status(201).json({ success: true, client });
  } catch (error) {
    console.error('Error onboarding client:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to onboard client'
    });
  }
});

// GET /api/clients - List all clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
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

// GET /api/clients/:id - Get client by ID
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

// PATCH /api/clients/:id - Update client
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

export default router;
