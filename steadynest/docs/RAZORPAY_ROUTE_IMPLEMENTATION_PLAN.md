# Razorpay Route replacement plan

Status: planned only. No Razorpay credentials, accounts, webhooks, payment
orders, mandates, transfers or customer notifications have been created by this
repository.

## Verified current state

The only current provider implementation is legacy Stripe:

| Surface | Current behaviour | Replacement disposition |
| --- | --- | --- |
| `artifacts/api-server/src/services/stripe.ts` | Creates Stripe Connect accounts and subscription Checkout sessions | Remove after the Route implementation and data migration are verified. |
| `artifacts/api-server/src/routes/payments.ts` | Exposes `/connect-account`, `/subscribe` and a Stripe webhook | Disable before launch; replace only after founder decisions below. |
| `artifacts/api-server/src/app.ts` | Parses a Stripe webhook as a raw body | Remove only with the Stripe webhook route. |
| `artifacts/api-server/src/config/env.ts` | Declares `STRIPE_*` variables and exposes `features.payments` from Stripe | Replace with Razorpay-specific configuration only when credentials are supplied. |
| `artifacts/api-server/package.json` | Includes the Stripe SDK | Remove after no source imports it. |
| `lib/db/src/schema/index.ts` and migration snapshots | `transactions.stripe_session_id` is the only provider reference | Replace with provider-neutral IDs, a lease foreign key, and Route account/transfer references. |
| `app/booking/payment.tsx`, `app/payments/setup.tsx`, tenant profile | Present Stripe Checkout and claim an autopay state from mock UI data | Disable or replace with an honest unavailable state before launch. |

The current `transactions` table does **not** link a payment to a verified lease
or landlord recipient. It therefore cannot safely drive collection, payout,
autopay, refund, dispute, or payment-status UI.

## Official Route facts verified on 4 August 2026

- Route uses linked accounts for recipients. Creating an account requires Route
  enablement and linked-account/KYC and bank details; Razorpay documents a
  penny test before transfers are allowed.
  [Linked Accounts](https://razorpay.com/docs/payments/route/linked-account/)
- Route APIs require linked accounts, stakeholders and a product configuration
  before transfers. Route supports transfer creation from orders, captured
  payments, or direct transfers.
  [Route API overview](https://razorpay.com/docs/api/payments/route/)
- Route transactions are INR-only. For an order/payment transfer, the payment
  must be captured and the transfer cannot exceed the captured amount.
  [Transfer funds to linked accounts](https://razorpay.com/docs/payments/route/transfer-funds-to-linked-accounts/)
- For ordinary UPI Autopay use cases, subsequent debits above ₹15,000 require
  the customer to approve with their UPI PIN. Mandates have a token lifecycle
  that supports fetch, cancellation and deletion.
  [UPI Autopay](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi/)

These facts do not settle SteadyNest's commercial, legal, customer-support, or
notification policies.

## Target architecture

1. A verified landlord has exactly one stored Route linked-account ID. The
   server, never the mobile client, associates it with the authenticated owner.
2. A rent collection is created only from a verified active lease. The server
   derives the tenant, listing owner, rent amount and recipient from database
   ownership checks; request bodies may not supply an owner or recipient.
3. Route splits funds at source to the linked landlord account in INR. The app
   must never present a SteadyNest balance, pooled funds, or escrow state.
4. Provider events are signature-verified and persisted idempotently against a
   provider-neutral payment attempt, its lease, and any Route transfer IDs.
5. A mandate stores its provider token/reference, maximum amount, schedule,
   status and lease end date. The scheduler cancels or stops it at lease end.
6. The tenant UI distinguishes the below-₹15,000 and at-or-above-₹15,000
   paths. It never describes the latter as fully automatic and sends the
   required pre-debit notification through an approved channel.

## Proposed data model (not implemented)

- `landlord_payout_accounts`: owner user ID, Route linked-account ID, provider
  account state, verification timestamps. No bank details are stored locally.
- `lease_payment_mandates`: lease ID, provider token/reference, amount cap,
  frequency, start/end date, status, cancellation event.
- `lease_payment_attempts`: lease ID, idempotency key, INR paise amount,
  threshold mode, provider order/payment IDs, result and timestamps.
- `payment_transfers`: payment-attempt ID, linked-account ID, provider transfer
  ID, INR paise amount and transfer status.
- `payment_provider_events`: provider event ID, verified event type, processed
  timestamp and minimal non-sensitive audit data for idempotency.

Every new table needs an empty-database Drizzle migration, owner/lease access
tests and webhook-signature tests before a provider is enabled.

## Implementation sequence after approval

1. Obtain Route access, a test account, test keys and the product
   configuration; store credentials only in local/deployment secret storage.
2. Implement the provider-neutral schema and migrations, including an explicit
   migration plan for `stripe_session_id`.
3. Add authenticated landlord onboarding that creates/links only the current
   owner and persists the Route account ID after provider verification.
4. Add verified lease-based order/transfer creation with server-side
   idempotency, INR-only validation and no client-supplied payout recipient.
5. Implement Route webhook verification and idempotent payment/transfer state
   transitions using test events only.
6. Implement UPI mandate registration, pre-debit notification and lease-end
   cancellation according to the approved policy. Test below and at/above
   ₹15,000 behaviour separately.
7. Replace the tenant Stripe UI with accurate mandate/payment states; remove
   the Stripe SDK, routes, configuration and raw-body middleware only after
   the Route flows and data migration are verified.

## Founder decisions required before step 1 or 6

- Who may receive landlord payout/onboarding capability and the listing
  verification policy required before it.
- Razorpay Route account onboarding, KYC/legal ownership and production/test
  credentials.
- Failed-payment and retry policy.
- Dispute, refund, partial-payment, gateway-fee and platform-fee policies.
- Landlord onboarding failure handling.
- The pre-debit notification channel, timing and consent contract.

Until those decisions are made, tenant-facing Stripe collection must not be
described as active and no real payment or notification may be initiated.
