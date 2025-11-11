/**
 * Client Management API Routes
 * Handles client onboarding, management, and multi-tenant operations
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory client store (replace with database in production)
interface Client {
  id: string;
  email: string;
  company: string;
  tier: 'basic' | 'pro' | 'enterprise';
  scansRemaining: number;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  subscriptionId?: string;
  stripeCustomerId?: string;
}

const clients: Client[] = [];

/**
 * POST /api/clients/onboard
 * Automated client onboarding flow
 */
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

    if (!['basic', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be basic, pro, or enterprise'
      });
    }

    // Check for existing client
    const existingClient = clients.find(c => c.email === email);
    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Client already exists with this email'
      });
    }

    // Determine scans based on tier
    const scansRemaining = tier === 'basic' ? 1 : tier === 'pro' ? 10 : 9999;

    // Create new client
    const client: Client = {
      id: uuidv4(),
      email,
      company,
      tier,
      scansRemaining,
      status: 'active',
      createdAt: new Date(),
      // These would be populated by Stripe/Clerk in production
      subscriptionId: `sub_${uuidv4().substring(0, 8)}`,
      stripeCustomerId: `cus_${uuidv4().substring(0, 8)}`
    };

    clients.push(client);

    // TODO: In production, this would:
    // 1. Create Clerk user with limited permissions
    // 2. Create Stripe customer + subscription
    // 3. Create isolated database schema (multi-tenant)
    // 4. Send welcome email with magic link
    // 5. Create PagerDuty service for this client

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

    let filteredClients = [...clients];

    if (tier) {
      filteredClients = filteredClients.filter(c => c.tier === tier);
    }

    if (status) {
      filteredClients = filteredClients.filter(c => c.status === status);
    }

    res.json({
      success: true,
      data: filteredClients,
      total: filteredClients.length
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
    const client = clients.find(c => c.id === id);

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

    const client = clients.find(c => c.id === id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    if (typeof scansRemaining !== 'number' || scansRemaining < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scansRemaining value'
      });
    }

    client.scansRemaining = scansRemaining;

    res.json({
      success: true,
      data: client,
      message: 'Client scan count updated'
    });
  } catch (error) {
    console.error('Error updating client scans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client scans'
    });
  }
});

export default router;
