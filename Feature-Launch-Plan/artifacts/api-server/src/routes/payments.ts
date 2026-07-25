import { Router, Request, Response } from 'express';
import { stripe, createConnectAccount, createConnectAccountLink, createCheckoutSession } from '../services/stripe';
import { db } from '@workspace/db';
import { transactions, listings } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../lib/logger';

const router = Router();

// POST /api/payments/connect-account
router.post('/connect-account', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const account = await createConnectAccount(email);
    const url = await createConnectAccountLink(account.id);
    return res.json({ url });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create connect account' });
  }
});

// POST /api/payments/subscribe
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { userId, listingId } = req.body;
    if (!userId || !listingId) {
      return res.status(400).json({ error: 'User ID and listingId are required' });
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
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /api/payments/webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';
  
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
