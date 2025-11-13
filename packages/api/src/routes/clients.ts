import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

// POST /api/clients/onboard
// Automated client onboarding flow
router.post('/onboard', async (req: Request, res: Response) => {
  try {
    const { email, company, tier = 'basic' } = req.body;

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

    // Generate API key
    const apiKey = `wcag_${crypto.randomBytes(32).toString('hex')}`;

    // Determine scan limits based on tier
    const scanLimits = {
      basic: 10,
      pro: 100,
      enterprise: 1000
    };

    // Create new client
    const newClient = await prisma.client.create({
      data: {
        email,
        company,
        tier,
        scansRemaining: scanLimits[tier as keyof typeof scanLimits] || 10,
        apiKey,
        status: 'active'
      }
    });

    // TODO: Send welcome email (Phase 4)
    // await emailService.sendWelcome(newClient.email, newClient.apiKey);

    return res.status(201).json({
      success: true,
      client: {
        id: newClient.id,
        email: newClient.email,
        company: newClient.company,
        tier: newClient.tier,
        apiKey: newClient.apiKey,
        scansRemaining: newClient.scansRemaining
      }
    });
  } catch (error) {
    console.error('Client onboarding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to onboard client'
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

export default router;
