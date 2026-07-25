# SteadyNest / ROAM OS

A Delhi NCR–focused mobile app for renters and landlords: property discovery (GPS/radius search
on a map), rent autopay, dual tenant/landlord dashboards, a swipe-based social layer, real-time
chat, a Gemini-powered concierge (**Tira AI**), and emergency SOS.

> **Note:** A separate, earlier-stage **Supabase** prototype of this concept exists elsewhere.
> **This repo is not that project** — it self-hosts Postgres via Drizzle, rolls its own JWT auth,
> and uses socket.io + Stripe. See [`CLAUDE.md`](CLAUDE.md) §0 before acting on any prompt that
> mentions Supabase, `service_role`, `transitAi.js`, or `tira_ai_sessions`.

## Stack

- **Monorepo:** pnpm workspaces, Node.js, TypeScript 5.9
- **App:** `artifacts/roamos` — Expo / React Native, expo-router, socket.io-client, react-native-maps
- **API:** `artifacts/api-server` — Express 5 + socket.io, Drizzle ORM, Stripe, Google Gemini
- **DB:** PostgreSQL + PostGIS (self-hosted via `docker-compose`, `postgis/postgis:15-3.4`)
- **Auth:** email/password (argon2) + phone OTP (MSG91), JWT access/refresh
- **Build:** esbuild (API), Expo (app)

## Prerequisites

- Node.js + `pnpm`
- Docker Desktop (for the Postgres+PostGIS container)
- Expo Go on a phone, or an emulator, for real-device testing (the Android prebuild lives at
  `artifacts/roamos/android`)

## Run it locally

```bash
# 1. Install
pnpm install

# 2. Start the database (Postgres + PostGIS)
docker compose up -d db

# 3. Apply schema + seed demo data
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed

# 4. Start the API server (Express + socket.io) on :8080
pnpm --filter @workspace/api-server run dev

# 5. Start the app (Expo web) on :3003
pnpm --filter @workspace/roamos run web
#    ...or on a device:
pnpm --filter @workspace/roamos run start   # scan the QR with Expo Go
```

Demo login: `priya@roamos.in` / `password123` (tenant), `rahul@roamos.in` / `password123`
(landlord). Or use **Continue with phone** — with no `MSG91_AUTH_KEY` set, the OTP code is
returned to the app in dev mode so you can log in without SMS.

## Environment

`artifacts/api-server/.env`:

| Var | Required? | What it enables |
|---|---|---|
| `GEMINI_API_KEY` | recommended | Live Tira AI answers (falls back to a local engine without it) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | for real payments | Stripe Checkout + webhook |
| `MSG91_AUTH_KEY` (+ `MSG91_SENDER_ID`) | for real OTP SMS | Sends OTP via MSG91 (else dev console) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | for server SOS SMS | Server-side SOS dispatch (else on-device SMS) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | recommended | Stable JWT signing (else dev defaults) |

**Never commit `.env`.** It currently holds a live `GEMINI_API_KEY` that has leaked into git
history once already — rotate it.

## Useful commands

```bash
pnpm run typecheck                              # full monorepo typecheck
pnpm --filter @workspace/db run push            # push schema changes to the DB (dev)
docker compose exec db psql -U steady_user -d steady_nest   # inspect the DB
```

## Status at a glance

Working: auth (email/password + phone OTP), property radius search, Stripe payment wiring, Tira
AI (with fallback), SOS on-device dispatch. Partial/mock: swipe/match screen (frontend mock,
backend real but unused), chat (room list mock + a known empty-room bug), translator (unbuilt),
masked calling (mock). Full detail and known issues are in [`CLAUDE.md`](CLAUDE.md) §4 and §6.
