# SteadyNest — OTP Authentication System Design

**Stack:** Expo/React Native (frontend) · Node/Express (backend) · PostgreSQL + PostGIS (database) · Delhi NCR only · solo founder, AI-assisted build.

## 1. Requirements

### Functional
- User enters an Indian mobile number → receives OTP via SMS → enters OTP → gets authenticated.
- On first successful verification, user picks a role (Tenant/Landlord) — this is account creation, not just login.
- Returning users skip role selection and land straight in their last-used mode (with the dual-role switcher still available).
- Session persists across app restarts without re-sending OTP every time.

### Non-functional
- **Security**: no plaintext OTPs at rest, rate-limited to prevent SMS-bombing a phone number or brute-forcing a code, tokens stored in secure device storage (Keychain/Keystore) per the project's zero-vulnerability standard.
- **Cost**: solo, pre-revenue founder — OTP delivery cost per user matters, not just architecture purity.
- **Latency**: OTP should arrive in under ~10s in normal conditions; the UI must not block or freeze while waiting.
- **Reliability**: Delhi NCR carrier SMS delivery is not 100% guaranteed — the flow needs a retry/resend path, not just a happy path.

### Constraints
- One person building this with AI-assisted tools, no dedicated DevOps or security team — favor a managed auth provider over hand-rolled crypto.
- Existing DB is PostgreSQL+PostGIS (already migrated for geo-search) — auth data lives alongside that, not in a separate store.
- No native module lock-in that breaks Expo Go entirely unless unavoidable (flagged explicitly below, because it is unavoidable here).

## 2. High-Level Design

### Decision up front: Firebase Phone Auth, with an eye on its India-specific weak spot

Firebase Phone Auth is the default reach-for-it choice here — it's free up to a healthy quota, handles OTP generation/verification/rate-limiting server-side, and plugs into the existing "Firebase" assumption from the brief. But flag this now rather than after it's built: **Firebase's SMS routes are optimized for global delivery, not for India's TRAI DLT (Distributed Ledger Technology) template-registration regime.** Indian carriers increasingly block or delay SMS from senders not registered on the DLT platform with a pre-approved template, and international OTP aggregators (which is what Firebase uses under the hood for many regions) hit this wall more than India-native providers. In practice this shows up as OTPs arriving late or not at all for a meaningful minority of Indian numbers.

**Recommendation:** build the flow so the SMS delivery mechanism is swappable. Use Firebase Auth for the client-side session/token machinery (it's good at this part), but architect OTP *delivery* behind a small interface so it can be swapped to an India-native provider (MSG91, Gupshup, or Kaleyra — all DLT-compliant by default) without touching the rest of the auth flow. If Delhi NCR delivery reliability becomes a real support complaint, that swap should be a config change, not a rewrite.

### Component diagram (described)

```
[Expo RN App]
   │  1. enter phone number
   ▼
[POST /auth/otp/request]  ──────────────►  [SMS Provider: Firebase Phone Auth
   (Node/Express)                            OR MSG91/Gupshup behind an
   │                                          OtpProvider interface]
   │  2. rate-limit check (Redis or in-memory
   │     for MVP), store hashed challenge
   ▼
[Postgres: otp_challenges table]

[Expo RN App]
   │  3. enter OTP code
   ▼
[POST /auth/otp/verify]
   │  4. verify against Firebase (ID token) or
   │     against hashed OTP + expiry (custom provider)
   │  5. upsert user in Postgres, issue app JWT
   │     (access + refresh pair)
   ▼
[Postgres: users table]
   │
   ▼
[Expo RN App: store tokens in SecureStore/Keychain]
```

### Data flow
1. App calls `/auth/otp/request` with `{ phone: "+91XXXXXXXXXX" }`.
2. Backend rate-limits by phone number and by IP (see §3), then either (a) calls Firebase Admin SDK's phone auth flow, or (b) generates a 6-digit OTP itself, hashes it, stores it with a 5-minute expiry in `otp_challenges`, and sends via the SMS provider.
3. App calls `/auth/otp/verify` with `{ phone, code }` (or, if using Firebase client SDK directly, a Firebase ID token obtained after client-side `confirmationResult.confirm(code)`).
4. Backend verifies (Firebase Admin `verifyIdToken`, or its own hash comparison + expiry check for the custom path), then upserts the user row and issues a short-lived access JWT (15 min) + a longer-lived refresh token (30 days) stored server-side (hashed) for revocation.
5. Tokens go into Expo SecureStore (iOS Keychain / Android Keystore) — never AsyncStorage, which is unencrypted.

### API contracts

```
POST /auth/otp/request
Body: { phone: string }              // E.164, validated server-side to +91 + 10 digits for MVP
Response 200: { requestId: string, expiresInSec: 300 }
Response 429: { error: "rate_limited", retryAfterSec: number }

POST /auth/otp/verify
Body: { requestId: string, phone: string, code: string }   // or { firebaseIdToken } if using Firebase client flow
Response 200: {
  accessToken: string,
  refreshToken: string,
  user: { id, phone, role: "tenant" | "landlord" | null, isNewUser: boolean }
}
Response 401: { error: "invalid_or_expired_code" }
Response 429: { error: "too_many_attempts" }

POST /auth/token/refresh
Body: { refreshToken: string }
Response 200: { accessToken: string }
Response 401: { error: "invalid_refresh_token" }   // forces re-login

POST /auth/role
Body: { role: "tenant" | "landlord" }   // only callable once per user, or gated behind explicit change-role flow
Response 200: { user }
```

### Storage choices
- **Postgres** (existing instance): `users`, `otp_challenges`, `refresh_tokens` tables — no new datastore needed for MVP scale.
- **Rate limiting**: in-memory (e.g. a simple sliding-window counter in the Node process) is *acceptable for a solo-founder MVP with one server instance*, but call this out as the first thing to move to Redis the moment there's more than one backend instance — in-memory counters don't share state across processes.

## 3. Deep Dive

### Data model

```sql
-- users table (extends whatever profile fields already exist)
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(15) UNIQUE NOT NULL,       -- E.164, e.g. +919876543210
  firebase_uid      VARCHAR(128) UNIQUE,               -- null if using custom OTP provider path
  role              VARCHAR(10) CHECK (role IN ('tenant','landlord')),
  role_set_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at     TIMESTAMPTZ
);

-- only needed if NOT using Firebase's own OTP generation/verification
CREATE TABLE IF NOT EXISTS otp_challenges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(15) NOT NULL,
  code_hash         VARCHAR(255) NOT NULL,              -- bcrypt/argon2 hash, never plaintext
  attempts          SMALLINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone ON otp_challenges(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        VARCHAR(255) NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
```

### Caching strategy
Not much to cache at MVP scale — the one thing worth an in-memory (later Redis) cache is the rate-limit counters themselves (§ below), since those are read/written on every request and don't need durability beyond their TTL window.

### Queue/event design
No queue needed at this scale. If SMS provider calls start timing out under load later, move OTP dispatch to a lightweight job queue (BullMQ + Redis) so `/auth/otp/request` can return immediately while delivery retries in the background — not needed for launch.

### Error handling and retry logic
- **SMS send failure** (provider timeout/error): return a distinct error to the client so the UI can show "Couldn't send code, tap to retry" rather than a generic failure — don't silently swallow provider errors.
- **OTP verify failure**: increment `attempts` on the `otp_challenges` row; lock out after 5 failed attempts on the same `requestId` (force a fresh `/request` call) — this bounds brute-force attempts on a 6-digit code without needing a CAPTCHA on every attempt.
- **Expired code**: explicit `invalid_or_expired_code` response distinct from wrong-code, so the client can prompt "request a new code" vs. "check your code" — much better UX than a generic error.
- **Refresh token reuse after revocation**: if a refresh token is used after being marked `revoked_at`, treat it as a possible token-theft signal — revoke *all* refresh tokens for that user and force full re-login (standard refresh-token-rotation defense).

## 4. Scale and Reliability

### Load estimation
Delhi NCR launch, pre-revenue, solo founder — realistically hundreds to low thousands of daily active users in the first months. OTP request volume will be a small fraction of DAU (most sessions reuse a refresh token, not a fresh OTP). Firebase's free tier and MSG91's pay-per-SMS pricing both comfortably cover this; no infrastructure scaling work is justified yet.

### Horizontal vs vertical scaling
Not a near-term concern. Note it anyway: the in-memory rate limiter is the one piece of this design that silently breaks the moment the backend runs on more than one instance (e.g. behind a load balancer or on serverless with multiple concurrent containers) — that's the trigger to move to Redis-backed rate limiting, not a scale metric.

### Failover and redundancy
If using a single SMS provider and it has an outage, users can't log in at all. Given the swappable `OtpProvider` interface recommended above, a low-effort resilience win once there's real usage: a secondary provider fallback (try MSG91, fall back to Gupshup on failure) — not needed on day one, but the interface should be designed so adding it later doesn't require touching the request/verify route handlers.

### Monitoring and alerting
At minimum, log (not necessarily to a fancy observability stack — a simple structured log line is enough for a solo founder): OTP request count, OTP verify success/fail rate, and SMS provider error rate. A sudden spike in requests from one phone number or IP is the actual signal to watch for (SMS-bombing abuse), even before formal alerting exists.

## 5. Trade-off Analysis

| Decision | Chosen | Trade-off |
|---|---|---|
| Firebase Phone Auth vs. India-native SMS provider (MSG91/Gupshup) directly | Firebase for session/token machinery, swappable OTP delivery layer | Firebase is faster to integrate and free at this scale, but has a real India SMS-deliverability weak spot (DLT compliance). Building the swap-seam now costs a little extra structure but avoids a rewrite if delivery complaints show up post-launch. |
| Custom OTP table in Postgres vs. relying entirely on Firebase's own OTP state | Documented both paths; recommend starting with Firebase's built-in flow for less code, but the custom table is ready if the India-provider swap happens | Firebase's flow means less backend code to maintain (good for a solo founder) but ties verification logic to Firebase's client SDK, which on React Native/Expo generally requires `@react-native-firebase/auth` — **this needs a custom Expo dev client build; it will not work in plain Expo Go.** That's a real cost: every local test loop needs a dev client rebuild rather than an instant Expo Go reload. Worth deciding explicitly rather than discovering it mid-build. |
| In-memory vs. Redis rate limiting | In-memory for MVP | Zero extra infra cost and complexity now, but silently stops working correctly the moment there's more than one server process — flagged above as the trigger to revisit, not something to forget about. |
| JWT access+refresh vs. long-lived single session token | Access+refresh pair | More moving parts (two token types, a refresh endpoint, a revocation table) but meaningfully more secure — a leaked long-lived token is a much bigger blast radius than a leaked 15-minute access token. Given the app handles GPS, chat, and SOS emergency-contact data, the extra complexity is justified here. |

### What to revisit as this grows
- Move rate limiting to Redis the moment there's more than one backend instance.
- Reassess Firebase vs. India-native SMS provider based on actual delivery-failure reports after launch — don't pre-optimize this before real user data exists.
- Add a secondary SMS provider fallback once volume/revenue justifies the extra integration work.
- If the app later supports numbers outside Delhi NCR (international users), the E.164-only-India validation in `/auth/otp/request` will need to generalize — not a concern for the current geofenced launch.
