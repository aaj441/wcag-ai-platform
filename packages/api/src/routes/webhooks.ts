/**
 * Stripe Webhook Handler
 * Processes subscription events and syncs with database
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
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

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  // Determine tier from price ID
  const tier = getTierFromPriceId(priceId);
  const scansRemaining = getScansForTier(tier);

  // Update client in database
  await prisma.client.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionId: subscription.id,
      tier,
      scansRemaining,
      status: 'active',
      metadata: {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    }
  });

  console.log(`Client subscription activated: ${customerId}`);
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);

  // Update client tier if changed
  await prisma.client.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      tier,
      status: subscription.status === 'active' ? 'active' : 'suspended',
      metadata: {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    }
  });

  console.log(`Client subscription updated: ${customerId}`);
}

/**
 * Handle subscription deleted/cancelled event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const customerId = subscription.customer as string;

  // Downgrade to free tier
  await prisma.client.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      tier: 'free',
      scansRemaining: 5,
      status: 'active',
      subscriptionId: null,
      metadata: {
        subscriptionStatus: 'cancelled',
        cancelledAt: new Date()
      }
    }
  });

  console.log(`Client subscription cancelled: ${customerId}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);

  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (subscriptionId) {
    // Reset scan quota on successful payment
    const client = await prisma.client.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (client) {
      const scansRemaining = getScansForTier(client.tier);
      
      await prisma.client.update({
        where: { id: client.id },
        data: {
          scansRemaining,
          status: 'active'
        }
      });

      console.log(`Client scan quota reset: ${customerId}`);
    }
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);

  const customerId = invoice.customer as string;

  // Suspend account after failed payment
  await prisma.client.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      status: 'suspended',
      metadata: {
        paymentFailed: true,
        failedAt: new Date()
      }
    }
  });

  // TODO: Send email notification to client about payment failure

  console.log(`Client suspended due to payment failure: ${customerId}`);
}

/**
 * Map Stripe price ID to tier
 */
function getTierFromPriceId(priceId?: string): string {
  if (!priceId) return 'free';

  // TODO: Replace with actual Stripe price IDs from environment
  const tierMap: Record<string, string> = {
    'price_starter': 'starter',
    'price_pro': 'pro',
    'price_enterprise': 'enterprise'
  };

  return tierMap[priceId] || 'free';
}

/**
 * Get scan quota for tier
 */
function getScansForTier(tier: string): number {
  const scanMap: Record<string, number> = {
    'free': 5,
    'starter': 20,
    'pro': 100,
    'enterprise': 9999
  };

  return scanMap[tier] || 5;
}

export default router;
