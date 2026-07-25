# Proposal: Phone OTP Auth (Firebase) — SUPERSEDED by the shipped SMS-provider implementation

**Status update:** Phone/OTP auth is now implemented in the app, but **not** via the Firebase approach in this folder. It ships as an **SMS-provider** design (MSG91 behind a swappable `OtpProvider` interface — `artifacts/api-server/src/services/otpProvider.ts`), with the backend owning OTP generation/hashing/verification in the `otp_challenges` table. No Firebase, no native modules, no Expo dev-client changes. This folder is kept for historical reference only; the code under `frontend/`/`backend/` here is **not** what runs.

**Known limitation (by design, documented in `artifacts/api-server/src/routes/auth.ts`):** account linking is out of scope. A person who signs up by email and later by phone gets **two separate accounts**. Unifying them is a deliberate future decision.

---

_Original proposal below._

**Status: reference/proposal only. Nothing in this folder is imported by the app or server yet.** It's placed under `docs/proposals/` deliberately, not in `artifacts/api-server/src` or `lib/db`, because it does not match what's actually running today — see the conflict below.

## Why this is a proposal, not a merge

Checked the live repo before dropping this in, and `artifacts/api-server/src/routes/auth.ts` already has a working auth system: **email + password**, argon2-hashed, JWT access (15m) + refresh (7d) with rotation, backed by an **in-memory `Map<string, User>`** (explicitly commented `// Phase 1 demo`, not yet reading/writing through `lib/db`'s Drizzle schema). It does not do phone/OTP/Firebase at all right now.

This proposal (`frontend/`, `backend/`) designs a **phone-number + OTP** flow instead, using Firebase Phone Auth on the client and a Node/Express backend that verifies the Firebase ID token and issues its own access/refresh pair, on a Postgres schema (`backend/migration.sql`) rather than the in-memory Map. Full reasoning and trade-offs are in `../../OTP_AUTH_SYSTEM_DESIGN.md`.

**These are two different auth strategies pointed at the same problem.** Dropping the OTP code directly into `artifacts/api-server/src/routes/auth.ts` would either silently replace the working email/password flow or leave two parallel, non-integrated auth systems in the codebase — neither is something to do without a decision from you first, especially with Claude Code actively editing this same repo right now (real risk of a straight file-conflict on `auth.ts`/`middlewares/auth.ts` if two agents touch it at once).

## The actual decision needed

1. **Is phone OTP replacing email/password, or additive (both login methods)?** SteadyNest's Delhi NCR users likely default to phone numbers over email, so OTP-first makes sense — but that's a product call, not just an engineering one (Arjun's lane as much as Kavya's).
2. **Where does the in-memory `users` Map go?** Regardless of the OTP decision, that Phase 1 store is the more urgent underlying issue — it doesn't persist across server restarts and doesn't use the Drizzle schema already set up in `lib/db`. Worth fixing this before adding a second auth method on top of it.
3. **Coordinate with whatever Claude Code is doing right now** on `auth.ts` before either of us edits it — check current file state immediately before merging any of this in, not just at proposal time.

## If you decide to proceed with the OTP approach

- `backend/migration.sql` needs to be translated into a Drizzle schema addition (`lib/db/src/schema/index.ts` + a generated migration under `lib/db/drizzle/`), not run as raw SQL — that's the existing convention in this repo.
- `backend/otp-auth-routes.js` was written against a raw `pg` Pool and plain Express — needs adapting to whatever DB client `artifacts/api-server` actually uses to talk to `lib/db`, and to the existing `validate`/zod-schema pattern already used in `auth.ts` (see `loginSchema`, `registerSchema` imports there).
- `frontend/firebase.ts` requires `@react-native-firebase/auth`, which needs a custom Expo dev client build — check `artifacts/roamos`'s current Expo config before assuming this drops in cleanly; a bare/managed workflow mismatch here would block the whole approach.
