# Verified takeover state — 4 August 2026

This is the current, evidence-backed state of the working checkout at `C:\dev\steadynest`. It
supersedes conflicting runtime claims in historical reports and handoff notes. Historical context
is retained for incident history, not as an assertion of present behaviour.

## Verified working state

| Area | Current state | Evidence |
| --- | --- | --- |
| Database | Portable PostgreSQL with PostGIS is running; it is not Docker-managed. | PostGIS 3.6.2 and `geo_idx` verified against the live instance. |
| Migrations | Six versioned Drizzle migrations apply from an empty database. | Fresh-database migration run completed; migration ledger reached 6. |
| Discovery data | The launch seed creates 15 fictional Delhi NCR listings owned by three `.test` landlords. A 10,000-row performance fixture is a separate command. | Launch-seed counts, INR pricing, geofence/radius queries, and `geo_idx` plan verified. |
| SOS | API identity comes from JWT; contacts are read from the database; a real 5/hour limiter is mounted. | `npm run test:sos` — 5 passing tests. Actual SMS delivery remains unverified and fails closed without configuration. |
| Chat | HTTP and Socket.IO membership checks are server-side. | `npm run test:chat` — 4 passing tests; unsigned and non-member socket attempts rejected at runtime. |
| Tira AI | The route is authenticated, rate/cost limited, Delhi-NCR scoped, and does not fabricate fallback/provider answers. | `npm run test:tira` passing; out-of-scope runtime response verified. A valid Gemini credential is not configured. |
| Android development | The Expo development build boots on the local Pixel 7a AVD and the tenant and landlord flows render responsively. | Metro watch scope was reduced; live screenshots captured. The AVD lacks Google Play services, so the map warning is expected. |
| Landlord UI | A first authenticated owner slice exists: portfolio, bounded properties, add property, unavailable payments notice, Tira and profile. | JWT-derived listing ownership and a 50-item page bound verified in API and emulator. |

## Deliberately not represented as complete

- Capability-based access is only partial. Active UI mode now derives from the authenticated role, but a durable capability schema and the policy assigning landlord capability need a founder decision.
- Payment processing is **not enabled**. The app still contains legacy Stripe source that must be replaced under an approved Razorpay Route design; that design is documented, not implemented.
- Live SOS / SMS consent, physical-device escalation, payment onboarding, KYC, credentials, retries, refunds, disputes, and fees are founder/product gates, not verified launch features.
- The historical 10,000-row data remains in the local development database as a performance fixture. It is not approved launch inventory and must not be presented as such.
- The Git repository still needs a founder-authorized tree rewrite/flatten. The runnable checkout is complete on disk but is not safely reproducible by a clean clone.

## Operating instructions

- Use the portable database installation at `C:\dev\steadynest-pg`; do not substitute Docker.
- Keep the existing npm-restored `node_modules`. Do not run a full `pnpm install` until the workspace change is deliberately verified.
- For Android-hosted API URLs, preserve `10.0.2.2`; do not add `adb reverse` as a workaround.
- Run `npm run migrate` before seed commands in `lib/db`. Use `npm run seed:launch` for the small fictional inventory and `npm run seed:load` only for performance testing.

## Founder decisions needed before launch

1. Authorize the repository tree rewrite/flatten and its recovery plan.
2. Define who may receive landlord capability and how listing verification works.
3. Confirm the exact Delhi NCR production boundary.
4. Approve the Razorpay Route payment/onboarding design, including KYC, credentials, retries, refunds, disputes, and fees.
5. Approve SMS/SOS consent, escalation, delivery provider, and physical-device validation.
6. Approve any paid API credentials and spend limits, including Gemini and SMS.
