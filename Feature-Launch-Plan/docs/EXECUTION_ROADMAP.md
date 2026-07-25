# Execution Roadmap: SteadyNest

This roadmap outlines the phases of development. Do not proceed to the next phase until the Definition of Done (DoD) is met and the human replies "Phase N clear — proceed".

## Phase 1 — Environment, Networking, Auth & Security Foundation
**Tasks:**
- Implement dynamic backend URL resolver (`EXPO_PUBLIC_BACKEND_URL`).
- Configure permissive-but-credentialed CORS on the backend (port 8080).
- Implement JWT auth (short-lived access token + rotating refresh token) and Argon2id hashing.
- Set up rate limiting on `/auth/*` and `/api/security/sos`.
- Integrate secure device storage (Keychain/Keystore) for tokens/emergency contacts.
**DoD:** Sign-in succeeds without network error; token refresh works silently; wrong password rejected securely.

## Phase 2 — Design System
**Tasks:**
- Implement color tokens, radius system, and typographic scale as reusable theme primitives.
- Build base component kit: buttons, pill inputs, cards, modals, chips.
**DoD:** ThemeShowcase screen renders every primitive flawlessly.

## Phase 3 — Backend Data Layer & Migrations
**Tasks:**
- Implement DB schema via ORM (Prisma/Drizzle), including PostGIS GIST index and composite indexes.
- Create seed script with realistic fixture data.
**DoD:** Migrations run clean; radius query within 5km returns in <50ms.

## Phase 4 — Property Listings, Geo-Discovery & Maps
**Tasks:**
- Property CRUD with multi-image upload via signed URLs.
- Home feed: GPS auto-detect to radius-filtered query.
- Map view with category-styled pins.
- Address autocomplete (Places API, 300ms debounce) with animated camera.
- 360° panorama viewer.
- One-click call with number masking (Twilio).
**DoD:** Radius slider updates without jank; masked call connects securely.

## Phase 5 — Dual-Role Dashboards & Autopay
**Tasks:**
- Global role switcher (Tenant ⇄ Landlord).
- Tenant & Landlord dashboards.
- Stripe Connect (Custom) integration for recurring debits.
- Failed payment handling (retry + notification).
**DoD:** Test lease executes Stripe test-mode charge correctly; declined card shows actionable failed state.

## Phase 6 — Real-Time Chat, Offline Queue & Voice Translator
**Tasks:**
- Socket.io client for `/api/chat/messages`.
- Optimistic UI sending states.
- Offline SQLite queue with auto-flush on reconnect.
- "Say It Right" translator (STT → translation → TTS).
**DoD:** Airplane-mode test queues 3 messages, which arrive in order upon reconnection.

## Phase 7 — "Eat & Drink" Social Discovery
**Tasks:**
- Filtered dining layer overlay on home map.
- Swipe deck (right=interest, left=pass).
- Mutual right-swipe matching for instant DM.
**DoD:** Mutual swipe creates an instant, working chat thread.

## Phase 8 — Emergency SOS & Privacy-Safe Security
**Tasks:**
- Onboarding permissions flow.
- SOS Trigger in Settings.
- Silent photo capture + GPS acquisition + payload compilation.
- Dispatch via `/api/security/sos` to Twilio/Email/Push.
- Native SMS fallback for offline dispatch.
- Cleanup local images after transmission/failure.
- Geofence checking on launch (Delhi NCR exclusive).
**DoD:** SOS in airplane mode queues/sends via SMS fallback; captured images are deleted locally.

## Phase 9 — Performance Hardening
**Tasks:**
- Profile and optimize cold start.
- Implement FlashList for all long lists.
- Verify PostGIS index usage via query plans.
- Audit bundle size and memory leaks.
**DoD:** Documented before/after numbers for cold start, bundle size, and query latency.

## Phase 10 — QA, Error-Proofing & Launch Checklist
**Tasks:**
- Complete 5-state requirement check per screen.
- Configure crash reporting (Sentry).
- Final security pass (TLS, secrets, rate limits).
**DoD:** Signed-off checklist per screen, final Phase Completion Report.
