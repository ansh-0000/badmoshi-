import Stripe from 'stripe';
import { logger } from '../lib/logger';
import { env } from '../config/env';

// STRIPE_SECRET_KEY is optional outside production so the rest of the app can
// run without payment credentials. The placeholder that used to stand in for it
// ('sk_test_mock') is gone - it made an unconfigured server look configured.
//
// Construction is deferred rather than done at import time for two reasons:
// the Stripe SDK throws on an empty key, so eager construction would take the
// whole API down at boot just because payments aren't set up; and a failure
// should surface at the call that actually needs Stripe, naming the missing
// variable, rather than as a module-load stack trace. env.ts requires the key
// when NODE_ENV=production, so this path is a development-only concern.
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured - payment operations are unavailable. ' +
        'Set it in artifacts/api-server/.env.',
    );
  }
  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia' as any,
  });
  return stripeClient;
}

/**
 * Stripe client. Property access constructs the real client on first use, so
 * existing `stripe.foo.bar()` call sites are unchanged.
 */
export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop, receiver) => Reflect.get(getStripe(), prop, receiver),
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
