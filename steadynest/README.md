# SteadyNest / ROAM OS

SteadyNest is a Delhi NCR rental-lifecycle mobile app for renters and landlords. The working
checkout includes discovery, authenticated chat, a guarded Tira AI route, SOS request handling,
and a first owner-facing landlord slice.

Read [AGENTS.md](AGENTS.md) before changing code and
[the verified takeover state](docs/VERIFIED_TAKEOVER_STATE.md) for the current, evidence-backed
status. Historical reports in this checkout are retained as context and can be stale.

## Important environment facts

- Work in `C:\dev\steadynest`. The Git root is `C:\dev`, and a clean clone is **not** currently a
  reproducible runnable checkout. Do not stage the old-tree deletions or rewrite the tree without
  founder approval.
- PostgreSQL runs from the portable installation at `C:\dev\steadynest-pg`; it is **not** a Docker
  service.
- This is a pnpm workspace, but `node_modules` was intentionally restored with `npm ci`. Do not
  run a full `pnpm install` as routine maintenance.
- Android emulator API routing uses `10.0.2.2`. Do not replace it with `adb reverse`.

## Stack

- Expo / React Native app: `artifacts/roamos`
- Express + Socket.IO API: `artifacts/api-server`
- Drizzle ORM with PostgreSQL + PostGIS: `lib/db`
- JWT authentication, Gemini-backed Tira provider when configured

## Run locally

Ensure `DATABASE_URL` is available to the shell that runs migration and seed commands, and that
the portable PostgreSQL service is already running.

```powershell
# Apply migrations, then add the small fictional Delhi NCR launch inventory.
Set-Location C:\dev\steadynest\lib\db
npm run migrate
npm run seed:launch

# Optional: add the separate 10,000-row performance fixture. This is not launch inventory.
npm run seed:load

# Build and run the API on port 8080.
Set-Location C:\dev\steadynest\artifacts\api-server
npm run build
node --env-file=.env --enable-source-maps .\dist\index.mjs

# In another terminal, run the Android development client / Metro.
Set-Location C:\dev\steadynest\artifacts\roamos
npx expo start --lan --port 8081
```

The app has been exercised on the local Pixel 7a Android AVD. That AVD lacks Google Play
services, so a map-provider warning there is expected; it does not indicate an API failure.

## Verification commands

```powershell
Set-Location C:\dev\steadynest\lib\db
C:\dev\steadynest\node_modules\.bin\tsc.cmd --build --verbose

Set-Location C:\dev\steadynest\artifacts\api-server
npm run typecheck
npm run test:sos
npm run test:chat
npm run test:tira

Set-Location C:\dev\steadynest\artifacts\roamos
npm run typecheck
```

## Data seeding

- `npm run seed:launch` is idempotent fictional launch data: 15 listings, three `.test`
  landlords, INR prices, and Delhi NCR locations.
- `npm run seed:load` is a performance-only fixture of 10,000 records. It must remain clearly
  separated from launch inventory in demos and product claims.

## Current limitations and founder gates

- Payments are not enabled. Legacy Stripe source remains and the approved direction is a
  Razorpay Route replacement plan, not an implementation.
- SOS dispatch fails closed when SMS delivery is not configured; consent, delivery, escalation,
  and physical-device testing still need approval and validation.
- The active UI mode derives from the authenticated role, but a durable capability model and
  landlord capability policy are awaiting founder direction.
- Valid paid-provider credentials and spend limits (Gemini and SMS) still need founder approval.

See [VERIFIED_TAKEOVER_STATE.md](docs/VERIFIED_TAKEOVER_STATE.md) for the full status matrix and
the decisions that must be made before launch.
