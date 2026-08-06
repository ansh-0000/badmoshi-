import { Router, Request, Response } from 'express';
import { stripe, createConnectAccount, createConnectAccountLink, createCheckoutSession } from '../services/stripe';
import { db } from '@workspace/db';
import { transactions, listings, users } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth';
import crypto from 'crypto';
import { logger } from '../lib/logger';
import { env } from '../config/env';

const router = Router();

// POST /api/payments/connect-account
//
// requireAuth is not optional here. Without it this endpoint accepted an
// arbitrary email from an unauthenticated request body and returned a live
// Stripe Connect onboarding URL for it - anyone on the internet could drive
// payout onboarding against any address. The account is now always created for
// the authenticated caller; the client does not get to name the subject.
router.post('/connect-account', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.email) {
      return res.status(400).json({ error: 'Add an email to your account before setting up payouts.' });
    }

    const account = await createConnectAccount(user.email);
    const url = await createConnectAccountLink(account.id);
    return res.json({ url });
  } catch (error) {
    logger.error({ err: error }, 'connect-account failed');
    return res.status(500).json({ error: 'Failed to create connect account' });
  }
});

// POST /api/payments/subscribe
//
// The payer is the authenticated caller, never req.body.userId. Taking the
// identity from the body meant an unauthenticated request could open a
// checkout session and write a transactions row attributed to any user id -
// the classic trust-the-client-identity bug, on the money path.
router.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { listingId } = req.body;
    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    // Fetch listing price
    const listingData = await db.select().from(listings).where(eq(listings.id, listingId));
    if (listingData.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const amount = listingData[0].price;

    const session = await createCheckoutSession(userId, amount, listingId);

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      user_id: userId,
      amount: amount,
      status: 'pending',
      stripe_session_id: session.id,
    });

    return res.json({ url: session.url });
  } catch (error) {
    logger.error({ err: error }, 'subscribe failed');
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /api/payments/webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  // Fail closed. This used to fall back to the literal 'whsec_test_mock', which
  // is published in a public repo - anyone could sign a payload with it and have
  // constructEvent accept the event as genuine, then drive whatever the handler
  // below does (marking rent as paid, crediting a lease). An unconfigured
  // webhook endpoint must reject everything, not trust everything.
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured; rejecting');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    // req.body must be the raw Buffer parsed by express.raw()
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    logger.error({ err }, "Webhook signature verification failed");
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      logger.info({ invoiceId: invoice.id }, 'Invoice payment succeeded');
      
      const subscriptionId = invoice.subscription;
      logger.info({ subscriptionId, invoiceObj: invoice }, 'Debugging invoice');
      
      if (subscriptionId) {
        let listingId = invoice.subscription_details?.metadata?.listingId;
        let userId = invoice.subscription_details?.metadata?.userId;
        logger.info({ listingId, userId }, 'Extracted from subscription_details');
        
        if (!listingId || !userId) {
          try {
            logger.info('Fetching from stripe...');
            const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
            listingId = subscription.metadata.listingId;
            userId = subscription.metadata.userId;
          } catch (e: any) {
            logger.warn({ error: e.message }, "Could not fetch subscription metadata");
          }
        }
        
        logger.info({ finalUserId: userId, finalListingId: listingId }, 'Final vars');
        if (userId && listingId) {
          try {
            // Record the successful rent payment
            await db.insert(transactions).values({
              id: crypto.randomUUID(),
              user_id: userId,
              amount: invoice.amount_paid / 100,
              status: 'completed',
              stripe_session_id: subscriptionId, // using subscription id here to link recurring hits
            });
            logger.info({ userId, listingId }, 'Recorded rent payment');
          } catch (insertError: any) {
            logger.error({ userId, listingId, error: insertError.message, stack: insertError.stack }, "DB INSERT ERROR");
            throw insertError;
          }
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      logger.info({ invoiceId: invoice.id }, 'Invoice payment failed');
    }
  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, "Error processing webhook");
    return res.status(500).send('Internal Error');
  }

  return res.send();
});

export default router;
