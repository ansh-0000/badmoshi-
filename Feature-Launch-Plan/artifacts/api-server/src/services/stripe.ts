import Stripe from 'stripe';
import { logger } from '../lib/logger';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function createConnectAccount(email: string) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account;
  } catch (error) {
    logger.error({ error }, "Error creating Stripe Connect account");
    throw error;
  }
}

export async function createConnectAccountLink(accountId: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL || 'http://localhost:8081'}/stripe/refresh`,
      return_url: `${process.env.APP_URL || 'http://localhost:8081'}/stripe/return`,
      type: 'account_onboarding',
    });
    return accountLink.url;
  } catch (error) {
    logger.error({ error }, "Error creating Stripe Connect account link");
    throw error;
  }
}

export async function createCheckoutSession(userId: string, amount: number, listingId: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'upi'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Monthly Rent',
            },
            unit_amount: amount * 100, // Amount in paise
            recurring: { interval: 'month' }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          listingId,
          userId
        }
      },
      success_url: `${process.env.APP_URL || 'roamos://payment'}/success`,
      cancel_url: `${process.env.APP_URL || 'roamos://payment'}/cancel`,
    });
    return session;
  } catch (error) {
    logger.error({ error }, "Error creating Stripe Checkout Session");
    throw error;
  }
}
