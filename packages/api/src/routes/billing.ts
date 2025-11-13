/**
 * Stripe Billing Routes
 * Handles webhooks, subscriptions, and usage-based billing
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { sendPaymentConfirmationEmail, sendPaymentFailureEmail } from '../services/email';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover'
});

// Webhook signature verification middleware
const verifyWebhookSignature = (req: Request, res: Response, next: any) => {
  const signature = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({
      success: false,
      error: 'Webhook configuration error'
    });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
    req.body = event;
    next();
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid webhook signature'
    });
  }
};

// POST /api/billing/webhook - Stripe webhook endpoint
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  verifyWebhookSignature,
  async (req: Request, res: Response) => {
    try {
      const event = req.body as Stripe.Event;

      console.log(`Received Stripe event: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ success: true, received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }
);

// POST /api/billing/create-subscription - Create new subscription
router.post('/create-subscription', async (req: Request, res: Response) => {
  try {
    const { clientId, priceId } = req.body;

    if (!clientId || !priceId) {
      return res.status(400).json({
        success: false,
        error: 'clientId and priceId are required'
      });
    }

    // Get client
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Create or get Stripe customer
    let customerId = client.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        metadata: {
          clientId: client.id,
          company: client.company
        }
      });
      customerId = customer.id;

      // Update client with Stripe customer ID
      await prisma.client.update({
        where: { id: clientId },
        data: { stripeCustomerId: customerId }
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        clientId: client.id
      }
    });

    // Update client with subscription ID
    await prisma.client.update({
      where: { id: clientId },
      data: {
        subscriptionId: subscription.id,
        status: 'active'
      }
    });

    return res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end
      }
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

// GET /api/billing/usage/:clientId - Get usage metrics
router.get('/usage/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        scans: {
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30))
            }
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const usage = {
      scansUsed: client.scans.length,
      scansRemaining: client.scansRemaining,
      tier: client.tier,
      billingPeriod: 'monthly'
    };

    return res.json({ success: true, usage });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch usage'
    });
  }
});

// Helper functions
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const clientId = subscription.metadata.clientId;
  if (!clientId) return;

  const tierMap: Record<string, string> = {
    'price_basic': 'basic',
    'price_pro': 'pro',
    'price_enterprise': 'enterprise'
  };

  const priceId = subscription.items.data[0]?.price.id;
  const tier = tierMap[priceId] || 'basic';

  const scanLimits = {
    basic: 10,
    pro: 100,
    enterprise: 1000
  };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      subscriptionId: subscription.id,
      tier,
      scansRemaining: scanLimits[tier as keyof typeof scanLimits],
      status: 'active'
    }
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const clientId = subscription.metadata.clientId;
  if (!clientId) return;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      subscriptionId: null,
      tier: 'basic',
      scansRemaining: 0,
      status: 'inactive'
    }
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const client = await prisma.client.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (client) {
    console.log(`Payment succeeded for client ${client.id}`);
    await sendPaymentConfirmationEmail(
      client.email,
      invoice.amount_paid,
      client.tier
    );
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const client = await prisma.client.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (client) {
    console.log(`Payment failed for client ${client.id}`);
    await sendPaymentFailureEmail(client.email);
    
    await prisma.client.update({
      where: { id: client.id },
      data: { status: 'suspended' }
    });
  }
}

export default router;
