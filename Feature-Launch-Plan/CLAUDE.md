# SteadyNest / ROAM OS — Project Context for Claude Code

Read this whole file before writing or changing any code. It is the source of truth for what
exists, what's real vs. stubbed, and what NOT to do. **If anything here conflicts with what you
see in the actual code, trust the code and flag the mismatch** — this file can go stale.

---

## ⚠️ 0. There is a SEPARATE Supabase prototype — this repo is NOT it

An earlier-stage, **Supabase-based prototype** of this same product concept exists elsewhere (a
different folder / repo, plain JavaScript, Supabase Auth + Supabase Postgres + RLS + Supabase
Realtime). **This repository is not that project.** This repo uses self-hosted Postgres via
Drizzle, JWT auth, socket.io, and Stripe — no Supabase anywhere.

If a future prompt references any of the following, it almost certainly means the *other*
project's docs got pasted into this repo by mistake — **stop and flag it immediately, do not act
on it**:

- `transitAi.js` / a `TransitAIScreen` / `composeAnswer()`
- a `tira_ai_sessions`, `transit_knowledge_base`, or `transit_ai_queries` table
- a Supabase `service_role` key, `SUPABASE_SERVICE_ROLE_KEY`, RLS policies, or `supabase.channel(...)`
- a `backend/` + `mobile/` folder layout, or `*.js` screen files like `PropertyDiscoveryScreen.js`

None of those exist here. See §2 for what actually does.

---

## 1. What this app is

A mobile app for renters and landlords, launching first in **Delhi NCR only** (geofenced — don't
build flows assuming national/international reach). It covers rental life end-to-end and adds a
social / safety / travel layer for people new to the area, including a Gemini-powered in-app
concierge, **Tira AI**.

**Users:** tenants (renters, often new to the city) and landlords (property owners). The app has
a dual-role switcher.

**Founder context:** solo, non-technical, no team, building with AI-assisted coding tools (you).
Not yet incorporated, not launched, pre-revenue. Every recommendation should assume no QA team,
no DevOps team, and a near-zero infra budget.

---

## 2. Confirmed tech stack (verified against the code)

**Monorepo:** pnpm workspaces, Node.js, TypeScript 5.9. Build for the server is esbuild (CJS/ESM
bundle); the app is Expo.

- **Frontend:** `artifacts/roamos` — Expo / React Native, **expo-router** (file-based routing,
  `typedRoutes` on, new architecture enabled), TypeScript `.tsx`. Key libs: `@shopify/flash-list`
  v2, `react-native-maps`, `expo-camera`, `expo-location`, `expo-secure-store`, `expo-sqlite`
  (offline chat outbox), `socket.io-client`, `@tanstack/react-query`, `react-native-reanimated`.
- **Backend:** `artifacts/api-server` — **Express 5** (TypeScript). `helmet`, `cors`,
  `express-rate-limit`, `pino` structured logging. HTTP server + **socket.io** booted together in
  `src/index.ts`.
- **Database:** **PostgreSQL + PostGIS**, self-hosted via `docker-compose.yml`
  (`postgis/postgis:15-3.4`). Accessed through **Drizzle ORM** in the `lib/db` package. Schema in
  `lib/db/src/schema/index.ts`; SQL migrations in `lib/db/drizzle/` (`0000`, `0001`, `0002`).
- **Auth:** custom — email/password (**argon2** hashing) **and phone/OTP**. JWT access (15m) +
  refresh (7d) with rotation (`jsonwebtoken`). See §4.
- **OTP delivery:** **MSG91** behind a swappable `OtpProvider` interface
  (`api-server/src/services/otpProvider.ts`); falls back to a dev console logger when no key is
  set. (Gupshup/Kaleyra are the documented swap-in alternatives.)
- **Payments:** **Stripe** Checkout (subscription mode, INR) + webhook
  (`api-server/src/services/stripe.ts`, `routes/payments.ts`).
- **AI (Tira):** **Google Gemini** via `@google/genai` in `routes/guide.ts`, with a local
  fallback engine when no key / quota.

### Explicitly NOT in use right now — don't introduce without re-raising the tradeoff first

| Tech | Why rejected at this stage |
|---|---|
| **Supabase** | This repo deliberately self-hosts Postgres via Drizzle + docker-compose and rolls its own JWT auth. A separate Supabase prototype exists (§0); do not migrate this one onto Supabase without an explicit decision. |
| Kubernetes | One backend container doesn't need cluster orchestration. |
| Kafka | One backend writing to one DB. Nothing to stream yet. |
| DynamoDB | Would undo the PostGIS geo-search decision. |
| TensorFlow / custom ML | Tira calls an existing LLM API (Gemini); no in-house training. |
| Sharding / partitioning | Tables are near-empty pre-launch. |
| Redis / heavy caching | No endpoint measured as slow yet. |

---

## 3. Repo layout

```
Feature-Launch-Plan/
  CLAUDE.md                    — this file
  README.md                    — run/operate instructions
  docker-compose.yml           — Postgres+PostGIS (postgis/postgis:15-3.4) on :5432
  pnpm-workspace.yaml
  lib/
    db/                        — @workspace/db: Drizzle client, schema, migrations, seed
      src/index.ts             — pg Pool + drizzle() (NOTE: connection string is hardcoded)
      src/schema/index.ts      — all tables (source of truth for schema)
      drizzle/                 — generated SQL migrations (0000–0002)
      src/seed.ts              — demo users + bulk listings
  artifacts/
    api-server/                — @workspace/api-server (Express + TS)
      src/index.ts             — HTTP + socket.io boot
      src/app.ts               — middleware chain + route mount
      src/routes/*.ts          — health, auth, chat, sos, match, guide, listings, calls, payments
      src/websockets/chatGateway.ts — socket.io chat gateway
      src/services/            — stripe.ts, otpProvider.ts, googlePlaces.ts
      src/middlewares/auth.ts  — requireAuth / requireRole (verifies JWT)
      src/lib/                 — jwt.ts, validation.ts (zod), logger.ts
      .env                     — GEMINI_API_KEY (+ optional STRIPE_*, MSG91_*, TWILIO_*, JWT_*)
    roamos/                    — @workspace/roamos (Expo app)
      app/                     — expo-router screens (see §4)
      context/AppContext.tsx   — auth + global state
      hooks/useChatClient.ts   — socket.io client + offline queue
      lib/api.ts, lib/syncQueue.ts, constants/data.ts (mock data)
```

---

## 4. Feature status — real vs. scaffolded vs. stubbed (verified this pass)

| Feature | Backend | Mobile screen | Real status |
|---|---|---|---|
| **Auth — email/password + phone OTP** | `routes/auth.ts` (`/api/auth/login`, `/register`, `/refresh`, `/otp/request`, `/otp/verify`, `/role`) | `app/login.tsx`, `phone-login.tsx`, `verify-otp.tsx`, `role-select.tsx` | **Working & tested this session.** Users persist in Postgres (Drizzle); survives restart; argon2 only (no plaintext path); OTP via MSG91 w/ dev fallback; per-phone rate limit; new phone users pick a role. Refresh-token store is still in-memory (deferred). |
| Property discovery (radius search) | `GET /api/listings/nearby` (PostGIS `ST_DWithin`), `/:id`, `POST /` | `app/(tabs)/index.tsx`, `listing/[id].tsx` | **Works** against real DB when it's running + seeded. |
| "What's new around here" / Eat & Drink | (uses listings + Google Places service) | `app/eat-drink.tsx` | **Partial** — calls real API but also renders mock `FOOD_PLACES` constants. |
| Autopay / rent payments | Stripe Checkout + webhook (`routes/payments.ts`) | `app/booking/*`, `payments/setup.tsx` | **Consolidated & wired this session** to the real `/payments/subscribe` flow (was 4 disconnected/fake flows). Needs `STRIPE_SECRET_KEY` to actually charge; INR currency. |
| Tenant / landlord dashboards | `routes/listings.ts`, `payments.ts` | `app/(tabs)/me.tsx`, `app/(landlord)/*` | Basic — landlord dashboard/inquiries/listings hit real API; some stats (`activeLease`, landlord totals) still mock. |
| Roommate / local matching | `POST /api/match/swipe` (real: records swipes, detects reciprocal match, emits `match_found`) | `app/(tabs)/match.tsx` | **Frontend is 100% mock** (hardcoded profiles, no API call, right-swipe does nothing). Backend is real but **never called**. No discover/feed endpoint yet. |
| Real-time chat | `GET /api/chat/:roomId/messages`, `POST /api/chat/message` (auth-required); `websockets/chatGateway.ts` (socket.io) | `app/(tabs)/chat.tsx`, `app/chat/[id].tsx` | **Room list is mock** (`CHAT_ROOMS`). Rooms render **empty** due to a real bug (see §6). Transport is socket.io + expo-sqlite offline outbox. |
| Tira AI (concierge) | `POST /api/guide/ask` (Gemini + Google Places grounding, local fallback) | `app/(tabs)/tira.tsx` | **Works when backend is reachable** — returns real answers even without a Gemini key (fallback). "fetch failed" in the UI = the app couldn't reach the server (network/config), not a backend crash. |
| AI voice translator | none | `app/translator.tsx` | **Frontend-only / unbuilt** — no backend route. Treat as mock. |
| Emergency SOS | `POST /api/sos/trigger` (Twilio SMS when `TWILIO_*` set, else honest `dispatched:false`) | `app/settings.tsx` | **Reworked this session.** On-device SMS (with a live Google Maps location link) is the guaranteed primary action; server-side auto-dispatch activates only when Twilio env vars are set. |
| Masked calling | `POST /api/calls/mask` | `app/listing/[id].tsx` (call button) | **Mock** Twilio number provisioning. |

**Security/ops in place (verified):** `helmet`, global + auth + SOS `express-rate-limit`, `pino`
structured logging with a sanitized global error handler, `docker-compose` for the DB.

---

## 5. Database — current state

Schema lives in `lib/db/src/schema/index.ts` (Drizzle). Query the running DB (`docker compose
exec db psql ...`) for live truth rather than trusting a static copy.

Tables: `users`, `groups`, `group_members`, `messages`, `swipes`, `listings`, `inquiries`,
`transactions`, `otp_challenges`. PostGIS powers listing radius search via a GiST index on
`ST_MakePoint(lng, lat)`. Migrations: `lib/db/drizzle/0000`–`0002`.

Demo accounts (seeded via `lib/db/src/seed.ts`, password `password123`, argon2-hashed):
`priya@roamos.in` (u_001, tenant), `rahul@roamos.in` (u_002, landlord), `aarav@roamos.in`
(u_003, landlord).

---

## 6. Known issues / tech debt (found, not yet fixed — don't rediscover these)

1. **Chat rooms always render empty** — frontend `chat/[id].tsx` fetches `GET /api/chat/:id`
   with **no auth header**, but the backend serves `GET /api/chat/:id/**messages**` and
   **requires auth**. Two bugs: wrong path + missing token.
2. **Swipe screen not wired** — `match.tsx` uses hardcoded profiles and never calls the real
   `/api/match/swipe`. No discover endpoint exists to exclude already-swiped profiles.
3. **Tira token bug** — `tira.tsx` reads the JWT from `AsyncStorage['auth_token']`, but tokens
   are stored in SecureStore under `access_token`. Harmless today (route isn't auth-gated).
4. **SOS rate limiter mis-mounted** — `app.ts` applies the SOS limiter at `/api/security/sos`,
   but the route is `/api/sos`, so the limiter doesn't cover it.
5. **DB connection hardcoded** — `lib/db/src/index.ts` has a literal `localhost:5432` connection
   string; there is no `DATABASE_URL` env wiring.
6. **Migration 0002 drift** — it also contains `transactions`/`listings` statements from earlier
   out-of-band scripts; applies cleanly on a fresh DB, conflicts on an already-drifted dev DB.

---

## 7. Rules for working in this codebase

1. **Don't re-architect what already works** — PostGIS geo-search, the Drizzle schema, the
   phone-OTP auth, and the Stripe pipeline are deliberate and tested. Extend, don't replace.
2. **Never commit `.env` or print secrets.** `artifacts/api-server/.env` holds a live
   `GEMINI_API_KEY` (already leaked into git history once — rotate it). The working tree also
   collects debug scratch scripts and large dumps; **never `git add -A`** — stage explicit files.
3. **Treat every "stub/mock/partial" in §4 as exactly that.** Test before claiming done, and
   always state whether something is *tested & working* vs *written & unverified*.
4. **SOS and payments are safety- and money-critical.** Test failure paths, not just happy paths.
5. **Stay inside Delhi NCR scope.** No new-city flows or non-India locale assumptions unless asked.
6. **Before adding a dependency or infra**, check §2's rejected list — especially don't reach for
   Supabase (§0).
7. **Verify against the running app.** The app runs on **web** (`pnpm --filter @workspace/roamos
   web`, port 3003) after the expo-sqlite web guard; it has **not** been run on a real
   device/emulator yet — flag that as a gap for any "does it feel right on a phone" work.

---

## 8. Run & operate (see README.md for detail)

```bash
docker compose up -d db                                   # Postgres+PostGIS on :5432
pnpm --filter @workspace/db run push                      # apply schema (dev)
pnpm --filter @workspace/db run seed                      # demo users + listings
pnpm --filter @workspace/api-server run dev               # API + socket.io on :8080
pnpm --filter @workspace/roamos run web                   # Expo web on :3003
pnpm run typecheck                                         # full monorepo typecheck
```

Required env (`artifacts/api-server/.env`): `GEMINI_API_KEY`. Optional (features degrade
gracefully without them): `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `MSG91_AUTH_KEY`
(+ `MSG91_SENDER_ID`), `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER`,
`JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`.

---

## 9. Immediate next steps

Things only the founder can do:
- [ ] Rotate the leaked `GEMINI_API_KEY` (and scrub it from git history).
- [ ] Provide real keys when ready: Stripe (payments), MSG91 (OTP SMS), Twilio (SOS SMS).
- [ ] Real-device test via Expo Go / a dev client (Android prebuild exists under
      `artifacts/roamos/android`).

Things you (Claude) can do next from code (all confirmed as real gaps in §6):
- [ ] Fix the chat room fetch (path + auth header) so rooms load real history.
- [ ] Wire `match.tsx` to `/api/match/swipe` and add a discover endpoint that excludes
      already-swiped profiles; navigate to a real chat thread on a match.
- [ ] Replace mock chat-room list previews / online counts with real data.
- [ ] Fix the Tira token key and surface a friendly "can't reach server" state.
- [ ] Fix the SOS limiter mount path and add `DATABASE_URL` env wiring.
