# AGENTS.md — SteadyNest / ROAM OS

Standing context for a coding agent with **zero history** on this project. Read the whole file
before writing or changing code.

This file supersedes `CLAUDE.md` for agents that read `AGENTS.md`. The two are kept in sync by
hand; where they disagree, **trust the code and flag the mismatch** — both can go stale.

Rules here exist because something specific went wrong. The incident is recorded alongside each
rule on purpose: a rule you understand survives contact with a situation its author never
imagined, and a rule you don't will be worked around the first time it is inconvenient.

## Current verified takeover state - 4 August 2026

The working tree, not the historical reports, establishes these current facts:

- The portable Postgres/PostGIS instance at `C:\dev\steadynest-pg` is the database runtime;
  migrations apply cleanly from an empty database and the migration ledger reaches six.
- SOS, chat, and Tira have focused server tests and runtime checks. SMS/SOS delivery and Gemini
  remain unverified external services and must not be described as working end-to-end.
- The Android development build booted and rendered on the local Pixel 7a AVD. Its missing Google
  Play services cause the expected map-provider warning.
- The landlord portfolio/property first slice is authenticated and bounded; property inquiry,
  lease, payment status, and communication workflows are not complete.
- Active UI mode derives from the authenticated role. A durable capability schema and landlord
  capability policy are blocked on founder direction.
- Razorpay Route is planned, not integrated. Legacy Stripe source is an inventory/replacement
  item, not a launch-ready payment feature.
- `npm run seed:launch` creates 15 fictional Delhi NCR, INR listings. `npm run seed:load` creates
  the separate 10,000-row performance fixture; it is not approved launch inventory.

Read [`docs/VERIFIED_TAKEOVER_STATE.md`](docs/VERIFIED_TAKEOVER_STATE.md) for the evidence,
operating commands, and founder gates. Retain the historical sections below for incident context.

---

## 0a. Where to point your agent: `C:\dev\steadynest`

**Working directory: `C:\dev\steadynest`.** Not `C:\dev`. This is settled, not a preference.

`C:\dev` is the **git root**, but it is not the project. It also contains `steadynest-pg/` (a
running database), `steadynest-mobile-ui-design/`, and 269 files still tracked under the old
`Feature-Launch-Plan/` prefix that are pending deletion. `C:\dev\steadynest` is where
`package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, this file and every runnable command
live.

Git is unaffected by this choice — it walks up to find `.git`, so `git status`, `git add` and
`git commit` all work normally from inside `steadynest/`. Paths in git output will be shown
relative to `C:\dev`; that is expected, not a misconfiguration.

A one-line stub `AGENTS.md` sits at `C:\dev` pointing here, in case an agent is launched at the
git root. It is a safety net, not an alternative entry point.

---

## 0. ⚠️ There is a SEPARATE Supabase prototype — this repo is NOT it

An earlier prototype of this same product concept exists elsewhere: plain JavaScript, Supabase
Auth + Supabase Postgres + RLS + Supabase Realtime. **This repository is not that project.** This
repo self-hosts Postgres via Drizzle, rolls its own JWT auth, and uses socket.io.

If a prompt or pasted document references any of the following, it means the *other* project's
docs were pasted here by mistake. **Stop and flag it. Do not act on it:**

- `transitAi.js`, a `TransitAIScreen`, or `composeAnswer()`
- a `tira_ai_sessions`, `transit_knowledge_base`, or `transit_ai_queries` table
- `SUPABASE_SERVICE_ROLE_KEY`, RLS policies, or `supabase.channel(...)`
- a `backend/` + `mobile/` folder layout, or `*.js` screen files like `PropertyDiscoveryScreen.js`

None of that exists here.

---

## 1. What this project is

SteadyNest (internally "ROAM OS") is a mobile app for the **rental lifecycle in Delhi NCR**,
serving two user types: **tenants** (renters, often new to the city) and **landlords** (property
owners). It covers finding a place, talking to the landlord, signing a lease, paying rent by
autopay, and a safety layer for tenants living alone. A Gemini-backed in-app concierge called
**Tira AI** answers local questions. The founder is solo, non-technical, pre-incorporation,
pre-revenue, and building entirely with AI-assisted coding tools. Assume no QA team, no DevOps
team, and a near-zero infrastructure budget.

### Explicitly OUT of scope — do not build these, do not suggest them as "quick wins"

| Out of scope | Why |
|---|---|
| **Travel / digital-nomad features** | The app inherited a travel skin from an earlier concept — "stays", a 360° panorama button, a phrase translator, a route planner, Tira's tourist-oriented system prompt. That framing is **dead**. Users are people *living* in Delhi NCR, not visiting it. Do not extend anything travel-shaped; when you touch one of these, prefer removing or re-aiming it at residents. |
| **Property sales / buying** | Sales fall under a different legal regime (RERA registration, stamp duty, conveyancing). Rentals and leases only. |
| **Multi-city / national / international** | Geofenced to Delhi NCR. No city-picker flows, no non-India locale or currency assumptions. Launching a second city is a business decision that has not been made. |
| **Anything that holds user funds** | See §3. This is a regulatory boundary, not a preference. |

---

## 2. Environment quirks — things a fresh agent will misread as bugs

These are all **intentional or worked-around**. Do not "fix" them without reading the reason.

### 2.1 Postgres runs from a portable install, NOT Docker

`docker-compose.yml` exists and describes `postgis/postgis:15-3.4`. **It is not what runs.**
Docker Desktop will not start on this machine — the Windows account's token is UAC-filtered, so
the Docker service cannot acquire the privileges it needs. Attempting `docker compose up` wastes
time and fails confusingly.

Postgres 15 + PostGIS runs from an unpacked portable distribution:

- **Binaries:** `C:\dev\steadynest-pg\extract\pgsql\bin\`
- **Data directory:** `C:\dev\steadynest-pg\data`
- **Log:** `C:\dev\steadynest-pg\server.log`
- **Port:** 5432

```bash
# start
/c/dev/steadynest-pg/extract/pgsql/bin/pg_ctl.exe -D /c/dev/steadynest-pg/data -l /c/dev/steadynest-pg/server.log start

# check
/c/dev/steadynest-pg/extract/pgsql/bin/pg_isready.exe -h 127.0.0.1

# stop
/c/dev/steadynest-pg/extract/pgsql/bin/pg_ctl.exe -D /c/dev/steadynest-pg/data stop
```

`psql` is **not** on PATH — call it by full path from that `bin\` directory, or query through
Node with the `pg` package.

> ⚠️ **`C:\dev\steadynest-pg\data` is committed to the public git repo.** See §5.6. Do not stage
> anything under it. Do not "clean up" its modified files by committing them.

### 2.2 `node_modules` is a pnpm/npm hybrid — this is a workaround, not the design

This is a **pnpm workspace** (`pnpm-workspace.yaml`, `pnpm-lock.yaml`, `node_modules/.pnpm` at
the root). But `artifacts/roamos/node_modules` was restored with **`npm ci`** and carries
`package-lock.json` + `.package-lock.json`, 492 entries. The two package managers coexist.

**Why:** `pnpm install` fails. Reproduced with `pnpm install --lockfile-only`:

```
[ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER] "@tanstack/react-query@catalog:" isn't supported by any available resolver.
This error happened while installing the dependencies of @workspace/api-client-react@0.0.0
An external package outside of the pnpm workspace declared a dependency using the catalog protocol.
```

**Root cause chain:**

1. `artifacts/roamos/package.json` declares
   `"@workspace/api-client-react": "file:../../lib/api-client-react"` — note **`file:`**, and
   note it is in `devDependencies`.
2. The `file:` protocol makes pnpm treat that package as **external to the workspace**, even
   though it physically sits inside it.
3. `lib/api-client-react/package.json` uses `catalog:` specifiers (legal for workspace members).
4. pnpm refuses `catalog:` from an external package. Install aborts.

**✅ The resolver is FIXED** (`462c17d8`). That specifier is now `"workspace:*"`, matching every
other internal dependency, and `pnpm install --lockfile-only` resolves 1,186 packages in 12.8s
where it previously aborted. The duplicate `expo` declaration (`~54.0.36` in `dependencies`,
`~54.0.27` in `devDependencies`) and the `pnpm-workspace.yaml` placeholder
(`allowBuilds: better-sqlite3: set this to true or false` — YAML parsed that string as a truthy
non-boolean rather than erroring; now `false`) were fixed in the same commit.

> ⚠️ **The installed `node_modules` is still the npm one.** Resolution working is not the same
> as the tree being migrated. A full `pnpm install` that rewrites `node_modules` has **not** been
> run.
>
> Do it in one sitting, with the app verified booting on the emulator afterwards, and be ready
> to fall back to `npm ci`. The last `pnpm install` attempted against the broken specifier
> **quarantined 50 packages** into `node_modules/.ignored` — including `expo`, `react` and
> `react-native` — and left the app unable to start at all.

### 2.3 Android emulator vs. physical phone — the host resolver already handles both

An Android emulator reaches the host machine at **`10.0.2.2`**, never `localhost` (which is the
emulated device itself). A physical phone on the same Wi-Fi needs the machine's **LAN IP**
(e.g. `192.168.0.141`).

`artifacts/roamos/lib/api.ts` resolves this at runtime and picks the right host for both, with
no code edits between runs. **Do not simplify it, and do not add `adb reverse` as a fix.**

The subtlety it encodes: this app runs the **New Architecture** (`newArchEnabled: true`), which
is bridgeless, so `NativeModules.SourceCode` is `undefined` and the old
`scriptURL`-sniffing approach silently falls through to a hardcoded `localhost`. On a physical
device that points at the phone itself and every request fails. The resolver reads
`Constants.expoConfig.hostUri` from `expo-constants` instead, and separately detects an emulator
from `Platform.constants` fingerprint/model strings to substitute `10.0.2.2`.

Verified working: `hostUri: '10.0.2.2:8081'` → `API configured to hit: 'http://10.0.2.2:8080/api'`
with no `adb reverse`.

### 2.4 The badge in the top-right corner is intentional

`components/DevTreeBadge.tsx` renders a small dismissible pill (e.g. `steadynest · fixes 5/5 ✕`)
in the top-right of every screen. It is **`__DEV__`-gated** and never appears in a release build.
It exists because this project spent days debugging against the wrong copy of the source tree
(§6.1), and a visible at-a-glance marker of *which tree is running* was the fix.

It must be cropped out of any screenshot used publicly (investor deck, Play Store, social).

### 2.5 Reduced motion is deliberately enabled on the emulator

The AVD has `adb shell settings put global animator_duration_scale 0` set, on purpose, so that
reduced-motion behaviour gets exercised by default. Restore with `... animator_duration_scale 1`.

This matters because of a real bug it caught — see §4.6. If you are testing animation, check
**both** states, and check them with a frame diff, not by looking.

### 2.6 Services die between sessions

Postgres, the API server, Metro, and the emulator are all started manually and do not survive a
session teardown. Expect to restart the whole stack. Metro binds port 8081 *before* it answers
`/status`, so poll rather than assuming a bound port means ready.

---

## 3. Product & regulatory decisions already made — do not reverse these

These were researched and decided. Reopening them costs real time and, in the payments cases,
creates legal exposure. If you believe one is wrong, **raise it rather than quietly building
around it**.

### 3.1 Payments: Razorpay Route, not Stripe Connect

Stripe's India entity cannot legally settle third-party rent payments — it is not licensed to
move money between a tenant and a landlord as a marketplace intermediary. Razorpay is the
chosen provider.

The existing Stripe code in `artifacts/api-server/src/services/stripe.ts` and
`routes/payments.ts` is **legacy** and slated for replacement, not extension.

### 3.2 We NEVER hold funds — split at source

Money splits at the source via **Razorpay Route**. Funds must never land in a SteadyNest-
controlled account, pooled balance, or escrow.

**Why this is a hard line:** holding or pooling customer funds makes the company a **Payment
Aggregator** under RBI regulation. That requires authorisation the company does not have and
cannot get pre-incorporation (it carries a net-worth requirement). Any design that has money
resting with us — even briefly, even "just for reconciliation" — crosses that line.

If a feature seems to need pooling, the answer is to redesign the feature.

### 3.3 Rentals and leases only — no sales

See §1. Property sales carry a separate RERA and stamp-duty regime.

### 3.4 Eleven-month lease default, everywhere

Every lease flow defaults to **11 months**, in both autopay modes and in any generated document.

**Why:** a lease of 12 months or more triggers mandatory registration under the Rent Control
Act, with stamp duty and registration charges. Eleven months is the standard Indian market
practice precisely to stay under it. A UI that defaults to 12 would silently create a legal
obligation the user did not intend.

### 3.5 Autopay has two modes, split at ₹15,000 — and never claim it is automatic

RBI's e-mandate framework (Digital Payments E-mandate Framework 2026, notified 21 Apr 2026)
requires **Additional Factor of Authentication (AFA)** for recurring debits **above ₹15,000**.
The ₹1,00,000 exemption covers only insurance premiums, mutual fund subscriptions and credit
card bills — **rent is not on that list**. This applies to UPI Autopay too.

Consequences that must be built, not designed around:

- **Below ₹15,000:** debit can proceed on the mandate without per-transaction authentication.
- **At or above ₹15,000:** the user must authenticate **each** debit. There is no way to avoid
  this.
- A **24-hour pre-debit notification** is mandatory, with the specified fields.
- The mandate schedule must **stop at the lease end date**, not run indefinitely.

> **Copy rule:** never write **"fully automatic"**, **"set and forget"**, or **"we'll handle
> it"** anywhere in the product, marketing, or documentation. Above ₹15,000 the user *must* act
> every month, and promising otherwise is both false and a support burden.

### 3.6 Role model: capabilities in the schema, one active mode in the UI

A user is not permanently a tenant *or* a landlord. Many real Delhi NCR users are both — people
sublet a room in the flat they themselves rent. The schema records **capabilities**; the UI
shows **one active mode at a time** with an explicit switch.

Roles are **not a security boundary**. The boundary that matters is ownership of a *specific*
listing or lease, enforced per-resource (§5.2). `PATCH /api/auth/role` used to return `409 Role
is already set.` on any second call, which made the onboarding choice permanent and locked users
out of half the product forever; that has been removed and a client-side confirmation added.

### 3.7 ONE tab bar component, role-keyed destinations

`components/SNTabBar.tsx` is the single tab bar. It takes `role` and swaps its destination list
(`TENANT_TABS` / `LANDLORD_TABS`). There is **no second navigation shell**, and there must not
be one.

The design files shipped `SNTabBar` and `SNTabBarLandlord` as separate components. Building both
was rejected because their chrome is byte-identical and the app had **already** demonstrated how
that ends: `app/(tabs)/_layout.tsx` had re-declared the bar inline — its own height, background,
border, active colour, icon set and label metrics — and the two copies drifted. The shared
component was moved to `primaryTint` after the active tab measured 1.98:1 in dark mode; the
inline copy kept `colors.primary` and stayed broken, with three hardcoded light-mode literals
that meant the real app's bar never darkened at all. The navigator now renders `SNTabBar`
directly.

### 3.8 Tab order: Stays · Connect · Tira AI · Chat · Profile

**Tira sits in the centre slot**, ahead of Chat. Centre is the most prominent position and Tira
is the product differentiator. The design file originally had a different order and is being
updated to match the app, not the other way round — one source of truth.

---

## 4. Hard-won engineering rules

### 4.1 Verify the artifact, not the source

Source code that looks correct proves nothing. Check the thing that actually exists at runtime:
the applied migration, the row in the database, the rendered pixel, the HTTP response.

**Two incidents, both invisible in the source:**

- **`geo_idx` never existed, for weeks.** `lib/db/drizzle/0001` created the PostGIS expression
  index without the outer parentheses Postgres requires, so the statement failed with
  `syntax error at or near "::"` and the index was simply absent on every fresh database. Every
  radius query fell back to a sequential scan over all listings. The migration file read
  perfectly.
- **Migration `0003` was never registered.** `0003_profile_leases_contacts.sql` sat on disk but
  had no entry in `drizzle/meta/_journal.json`. `drizzle-orm`'s migrator iterates
  `journal.entries` and finds each file by its `tag`, so a file no entry names is **invisible**
  to it. The dev database looked fine because the SQL had been applied by hand; a fresh database
  came up with no `leases` and no `trusted_contacts` tables at all.

Neither produced an error. Both were found only by querying the live database.

### 4.2 Migrations: register in `_journal.json`, and never use `push` instead of `migrate`

- A hand-written migration needs its **journal entry** and its **`NNNN_snapshot.json`** in the
  same commit. Otherwise see §4.1.
- **`drizzle-kit push` must never substitute for `migrate`.** `push` diffs `schema.ts` straight
  against the live database and never reads `drizzle/` at all, so it papers over exactly the two
  failures above: the database ends up correct while the migration files meant to reproduce it
  are wrong or missing. The drift stays invisible until someone rebuilds from scratch. `push` is
  for throwaway local experiments only.
- **Verify a migration against an EMPTY database**, not the dev one — the dev database may
  already have the change from an earlier manual fix, which is precisely how both incidents in
  §4.1 hid.

**PostGIS specifics.** The working index is:

```sql
CREATE INDEX "geo_idx" ON "listings" USING gist ((ST_SetSRID(ST_MakePoint("lng","lat"), 4326)::geography));
```

Note the **outer** parentheses. Postgres requires an expression index body wrapped in its own
parens when it is not a plain function call.

Postgres only uses an expression index when the query's expression matches it **exactly**.
`routes/listings.ts`'s `ST_DWithin(...)` reproduces it character-for-character. If you edit that
query, keep `ST_SetSRID(...)`, the `4326` SRID and the `::geography` cast intact — dropping any
one of them silently falls back to a full scan instead of erroring.

### 4.3 A passing typecheck is not a working feature

`tsc --noEmit` passing has **never once** caught the bugs that actually shipped here. Every real
defect in this project — the invisible skeleton, the white-on-white rent figures, the 1.98:1 tab
bar, the tab bar bleed-through, the empty location line, the SOS status lie — typechecked
cleanly.

**Verify on the emulator and take a screenshot.** State plainly whether something is *tested and
working* or *written and unverified*. Code that renders but calls an endpoint that was never
mounted is worse than absent code, and must be reported as broken, not as built.

### 4.4 Commit per item, by explicit path — never `git add -A`

The working tree collects `.env` files, debug scratch scripts, large dumps, database files, and
build output. `git add -A` in this repo has a live blast radius.

**Stage explicit paths. One logical change per commit.** Scan `git diff --cached` for secrets
before committing.

### 4.5 Audit hardcoded hex in any file you touch — as part of that change

**Four separate bugs** have come from colour literals bypassing the theme:

1. White-on-white rent figures on the Profile money card.
2. The invisible "What's around here" toggle.
3. The tab bar's active state at **1.98:1** on the dark palette — the *selected* tab was the
   hardest one to see, dimmer than the unselected ones at 8.71:1.
4. `StayRowSkeleton`'s `#FFFFFF` card on a dark background.

The pattern is identical every time: a literal picked while looking at light mode, which the dark
palette then contradicts.

If you open a file, grep it for `#` and `rgba(` and either replace them with tokens from
`constants/colors.ts` or **write down why the literal is correct**. Leaving them for a later
sweep is how it reached four.

The only legitimate exceptions so far: `fixedInk` surfaces that must not invert between themes
(the Tira screen, the Profile money card, the SOS screen), and `ErrorFallback` / `DevTreeBadge`,
which must stay visible even if the theme itself is broken.

### 4.6 `ReduceMotion.Never` — correct in exactly one place, wrong as a pattern

`components/SNSkeleton.tsx` passes `reduceMotion: ReduceMotion.Never` to its `withTiming`,
deliberately overriding the OS reduced-motion preference. **Do not copy this to screen
transitions, sheets, or card animations.**

Why it is right there: Reanimated's default is to **disable the animation entirely** when the OS
flag is set. SNSkeleton already detects the flag itself and swaps to an *adapted* animation — one
slow symmetric fade, 2.4s, no stagger, shallow 0.55→0.85 opacity range. Reanimated's blanket
disable then killed that adapted animation too, leaving fully static blocks. Measured: four
screenshots a second apart were byte-identical. A frozen skeleton is indistinguishable from a
hung app, so the "safe" behaviour actively misinforms the user — this project hit that twice,
first with a non-spinning `ActivityIndicator`, then with the static skeleton that replaced it.

Why it would be wrong nearly everywhere else: someone who enables reduced motion may have a
vestibular disorder, and transitions, parallax and card movement are what trigger symptoms.

**The rule, in order:** honour `useReducedMotion()` by *adapting* the animation first — that is
the fix. Only reach for `ReduceMotion.Never` when (a) you have already adapted it to a slow,
non-translating, low-amplitude form, **and** (b) removing motion entirely would communicate
something false, such as "this screen has stopped". Both must hold. If only (b) holds, redesign
the state instead of overriding the preference.

### 4.7 Diagnose and report the root cause before fixing — never guess

Two examples of what guessing costs:

- Tira returned `401 ACCESS_TOKEN_TYPE_UNSUPPORTED`. The obvious hypothesis was that the
  `tools: [{ googleSearch: {} }]` grounding config on `/guide/ask` was the culprit, since
  `/guide/translate` omits it and was believed to work. **Wrong.** A direct test of the key
  against the API showed plain `generateContent` with no tools 401s identically, across three
  model versions and both auth methods. The credential itself is not a Gemini API key. Testing
  took two minutes; the wrong fix would have been a rewrite of the grounding config.
- Two separate incorrect greps were reported as findings before being checked: that
  `role-select.tsx` made "zero API calls" (it calls `setUserRole()` → `PATCH /api/auth/role`),
  and that "no on-device SMS path exists" (a grep for `expo-sms`; the code uses
  `Linking.openURL('sms:...')`).

State what you actually verified and how. Flag what you could not.

---

## 5. Security state

### 5.1 The repo is PUBLIC

`https://github.com/ansh-0000/badmoshi-` is public. **No secret, key, token, password or
credential may appear in source — ever, including as a fallback default.**

A fallback is not a safe default. It is a published credential. This has already happened three
times: `access_secret_dev` / `refresh_secret_dev` as JWT fallbacks (a token forged with the
published string authenticated as any user), `whsec_test_mock` as a Stripe webhook fallback
(anyone could sign a payload and have `constructEvent` accept it as genuine, then drive whatever
the handler does — marking rent paid, crediting a lease), and `steady_user:steady_password` in
three separate database connection strings.

All are fixed. The pattern to apply: **fail closed.** An unconfigured secret must make the
endpoint reject everything, not trust everything. Env validation lives in
`artifacts/api-server/src/config/env.ts`, which rejects known placeholder values and exits.

### 5.2 IDOR is the top risk in this codebase

**Owner identity comes from the verified auth token. Never from a query parameter, never from a
request body.**

Found and fixed: `POST /payments/subscribe` and `POST /payments/connect-account` were completely
unauthenticated and took `userId` from the request body — anyone could subscribe or create a
payout account as anyone. The landlord screens fetch
`/api/landlord/listings?ownerId=${user.id}` — a textbook IDOR, client-supplied owner identity
(those screens are slated for deletion, see §6.3).

Any endpoint that takes a resource ID must verify the caller owns that resource, server-side,
against the token subject.

### 5.3 Unauthenticated endpoints — audit every route

Five have been found so far. Some are legitimately public; the point is that **every route must
be a decision, not an accident**.

| Route | State |
|---|---|
| `POST /api/payments/subscribe` | Was unauthenticated + body `userId`. **Fixed** — `requireAuth`. |
| `POST /api/payments/connect-account` | Same. **Fixed.** |
| `POST /api/sos/trigger` | **Still open.** No `requireAuth`, takes `contacts` from the body. Once Twilio is configured this is an open SMS relay: anyone can send arbitrary SMS to arbitrary numbers on the project's account. |
| `POST /api/guide/ask`, `POST /api/guide/translate` | **Still open.** Unauthenticated Gemini calls — anyone can burn the API quota. |
| `GET /api/listings/nearby`, `GET /api/listings/:id` | Intentionally public (browsing before signup is the product). `:id` leaks `owner_id`; consider trimming the response. |
| `POST /api/payments/webhook` | Correctly unauthenticated; verifies the Stripe signature and fails closed without `STRIPE_WEBHOOK_SECRET`. |

**Dead rate limiter:** `app.ts` registers the SOS limiter at `/api/security/sos`, but the router
is mounted at `/api/sos`. The limiter has therefore **never fired**. Combined with the missing
auth above, SOS is bounded only by the 200-req/15-min global limiter.

### 5.4 Fixed since the last audit

- JWT fallback secrets removed; forged-token access now returns 401 (demonstrated, not assumed).
- Stripe webhook fails closed without a configured secret.
- OTP rate limiting by **both** phone and IP, whichever trips first, with IPv6 collapsed to its
  subnet via `ipKeyGenerator` so a /64 cannot be rotated around it. Measured: 200/200/200/429/429
  per phone; 10 through then 429 per IP subnet.
- Duplicate `src/lib/jwt.ts` deleted (two competing JWT schemes existed).
- All three hardcoded database connection strings removed.
- Cross-user cache leak on sign-out fixed — see §6.5.

### 5.5 Still open

- Raw coordinates and trusted-contact phone numbers are `console.log`'d in `routes/sos.ts`,
  bypassing pino redaction entirely. **pino PII redaction is not configured** (phones,
  coordinates, contacts).
- The refresh-token store is **in-memory** — all sessions drop on restart, and it will not
  survive more than one server process.
- `GEMINI_API_KEY` was leaked into git history once. The replacement key currently in `.env` is
  **not a valid Gemini API key** (see §6.6), so this needs resolving regardless.

### 5.6 ⚠️ The live database is committed to the public repo

`steadynest-pg/` — **25,215 tracked files**, including `steadynest-pg/data/base/**` — is
committed and **already pushed** to public `origin/main`. That is the raw on-disk PostgreSQL
data directory, not a dump. It contains the `users` table (argon2 hashes, emails, phones),
`otp_challenges`, `trusted_contacts` (emergency contact numbers), `messages`, `leases`, and
`transactions`.

**Tracking is removed** (`d6ec3d39`) — `git rm -r --cached` only, so every file remains on disk
and Postgres runs against it unaffected. `.gitignore` now covers the directory and the other
shapes this could take (`pgdata/`, `pg_wal/`, `postmaster.pid`, `*.sqlite`, `*.dump`, …). **Do
not stage anything under that path. Do not "tidy" its modified files by committing them.**

The data is still reachable in history, in `b406ead2` and `46be8eca`.

### 5.6a FOUNDER DECISION — history rewrite: bundle it with the flatten, do not do it now

**Decided 4 Aug 2026. Do not rewrite history to remove the database directory as a security
measure, and do not propose it as one.** The reasoning matters more than the instruction:

**A rewrite does not unpublish already-public data.** GitHub keeps unreferenced commits
reachable by SHA until garbage collection, forks retain independent copies, and anything that
crawled the repository already has what it has. Rewriting removes the data from the default
view; it does not retract it. **Taking the repository private is the action that stops ongoing
exposure**, and that is being done separately. Rewriting on top of it buys very little.

**The real remediation is credential rotation, and it is independent of git.** Anything live in
that dump gets rotated regardless of what happens to history. The founder is separately treating
the phone numbers entered during OTP testing as personal data under the DPDP Act — correctly,
and irrespective of how few there are.

**The genuine argument for rewriting is size, not security.** Measured 4 Aug 2026:

| | |
|---|---|
| `steadynest-pg/` in the tree | ~1,384 MB across 25,215 files |
| Everything else in the tree | **4.2 MB across 286 files** |
| `.git` | **833 MB** |
| Commits touching the path | 3 (`b406ead2`, `46be8eca`, `d6ec3d39`) |
| Commits whose SHA a rewrite would change | ~19 of 21 |
| Remote branches affected | 2 — `main`, `archive/pre-steadynest` |

**99.7% of the repository by size is a database directory.** Every clone, CI run and future
collaborator pays 833 MB to obtain 4.2 MB of code. That is worth fixing on its own merits.

**When: as one operation together with the tree flatten** (§6.1), once the co-founder confirms
whether any branch expects the nested `Feature-Launch-Plan/` layout. Both are history-shaped
changes needing the same coordination — every clone re-cloned, every branch rebased. Doing them
separately means asking everyone to re-clone twice for no additional benefit. Doing it now, with
2 remote branches and one collaborator, is the cheapest it will ever be; the cost grows with
every branch added.

**Until the co-founder confirms, nobody rewrites anything.** `d6ec3d39` stopped the bleeding —
no new database content can enter the repository.

### 5.7 SOS must not ship until closed and hardware-verified

SOS is safety-critical. Four defects were found and fixed in `app/sos-active.tsx`:

1. **No timeout on the server call.** The code awaited `fetch(/sos/trigger)` before even
   considering the SMS fallback. Fully offline the fetch rejects fast — but on a *weak or
   captive* connection it could hang for the platform default (~60s on Android) with nothing
   sent. Flaky signal is far more common in an emergency than clean offline, so the dangerous
   path was the untested one. Now `AbortSignal.timeout(6000)`.
2. **Only `trustedContacts[0]` was messaged.** Every other contact was marked pending and never
   contacted by any path. Now one composer addressed to all of them.
3. **It opens a draft, it does not send — and this cannot be fixed.** See §5.7a. **The composer
   is the ceiling.** Do not attempt to "solve" it.
4. **The UI claimed success it could not know.** Contact status was set to `notified` the instant
   the draft opened. Replaced with states that describe what is actually known: `dispatched`
   (server confirmed via Twilio), `draft_opened` (labelled "Press Send", gold, deliberately no
   green tick), `failed`, `pending` — plus an explicit "Nothing has been sent yet" warning and a
   Reopen action.

### 5.7a Why defect #3 is permanently unfixable — read before "solving" it

This will look like a missing feature to anyone who has not read this. It is not. **The app
cannot send an SMS without the user pressing Send, and no amount of engineering changes that.**

There are exactly three ways an app could send SMS silently, and all three are closed:

1. **Android `SEND_SMS` permission.** Technically capable, and the obvious answer. But Google
   Play's SMS and Call Log Permissions policy restricts `SEND_SMS` to apps whose **core,
   registered function** is SMS — a default SMS handler, or a device-backup or enterprise-device-
   management app. A rental app does not qualify under any of the permitted use cases, and
   requesting it triggers a policy review that a rental app fails. The consequence is not a
   warning: **the app is rejected from the Play Store, or removed if already listed.** The
   product cannot ship at all. Trading the entire distribution channel for one automated message
   is not a trade worth making, and a "safety" feature that prevents the app existing protects
   nobody.
2. **iOS.** There is no equivalent API at any permission level. `MFMessageComposeViewController`
   always presents the composer and always requires the user to tap Send. Apple has never
   shipped a programmatic-send API for third-party apps. There is nothing to request.
3. **Expo Go / the managed workflow.** Even setting aside policy, `SEND_SMS` needs a native
   module and a custom dev client. It is unavailable in Expo Go, which is the entire current
   development loop.

**Therefore the only correct engineering response is the honest UI**, which is what now ships:
the status says `draft_opened` / "Press Send" in gold with deliberately no green tick, plus an
explicit "Nothing has been sent yet" warning and a Reopen action. The bug was never the draft —
it was the UI claiming a delivery that had not happened.

**Server-side dispatch is the real answer, and it is a different feature.** `POST /api/sos/trigger`
already sends via Twilio when `TWILIO_*` is configured, and returns `dispatched: true`, which is
the one path allowed to report a message as actually sent. That is where effort should go: it
needs auth, a working rate limiter, and real Twilio credentials — not a permission request that
would delist the app.

If a future agent proposes adding `SEND_SMS`, the answer is no, and this section is why.

**Still required before any SOS copy may claim it works:** `requireAuth` and a correctly mounted
rate limiter on the endpoint (§5.3), and **verification on a physical device with mobile data
genuinely disabled**. Until that passes:

> **Do not ship, write, or design any copy claiming SOS works offline, sends automatically, or
> that contacts have been notified.** The specific sentence from the design file — *"SOS still
> works — with no data it falls back to a normal SMS with your coordinates"* — is **blocked**.

---

## 6. Known-fragile areas — approach carefully

### 6.1 There are two source trees, and only one runs

- **Runnable tree:** `C:\dev\steadynest\` (flat layout). **This is the one that runs.**
- **Git worktree:** `C:\dev\steadynest\.claude\worktrees\steadynest-bugs-redesign-5ec9cc\Feature-Launch-Plan\`
  — branch `claude/steadynest-bugs-redesign-5ec9cc`. It has **45 dangling symlinks** with
  absolute paths to a deleted directory and **cannot start Metro at all**.

Days were lost to this: every "still broken" report was tested against code that did not contain
the fixes. `DevTreeBadge` (§2.4) exists specifically so the running tree is visible at a glance.

**Git state is unresolved.** The git root is `C:\dev` (not `C:\dev\steadynest`). Until very
recently `steadynest/` had **zero tracked files** — the entire runnable tree was outside git.
262 of 272 tracked files are still prefixed `Feature-Launch-Plan/`, which shows as 273 pending
deletions. Collapsing to one tree is a decision waiting on whether the co-founder has branches
expecting the nested layout. **Do not resolve this unilaterally.**

### 6.2 Chat is broken in a specific, known way

`app/chat/[id].tsx` fetches `GET /api/chat/:id` with **no auth header**. The backend serves
`GET /api/chat/:id/messages` and **requires auth**. Two bugs — wrong path and missing token — so
rooms always render empty. The room list itself is still mock (`CHAT_ROOMS`).

### 6.3 The landlord screens are dead code awaiting deletion

`app/(landlord)/dashboard.tsx`, `inquiries.tsx`, `listings.tsx`, `profile.tsx` — ~770 lines on
the **dead teal/cream palette**, calling `/api/landlord/*` endpoints that **are not mounted in
`routes/index.ts`**. Every call 404s. Audited for extractable logic: there is none — the only
computation is `reduce((s,l) => s + l.price, 0)` and two `.filter().length` counts.

Decision made: **delete and rebuild on the Phase A design-system components.** Porting
old-palette screens is how this repo ended up with two design systems in the first place. They
are still present only because deleting them before the replacement exists would break the
landlord route.

### 6.4 Money must render in JetBrains Mono

Currency figures use `JetBrainsMono_*`, not Inter. Several screens still get this wrong (e.g.
`listing/[id].tsx`'s `priceText` uses `Inter_700Bold`).

Related data bug: `listings.currency` defaults to **`'USD'`** in both the schema and the
`createListingSchema` zod default, for an India-only product. The UI hardcodes `₹` so it renders
correctly by accident.

### 6.5 State that outlives a user session

The react-query cache is wrapped in `PersistQueryClientProvider` with an **AsyncStorage
persister** — it is written to disk and rehydrated on launch. `logout()` originally cleared only
tokens, so the next person to sign in on the device was served the previous user's Stays
results, chat threads and Connect profiles, and killing the app did not help.

Fixed by moving the client to `lib/queryClient.ts` and exporting `clearAllCaches()`, which calls
**both** `queryClient.clear()` (memory) and `persister.removeClient()` (disk). Neither
substitutes for the other. If you add another persistent store, clear it there too.

### 6.6 Tira AI is down, and it is a credential problem

`POST /api/guide/ask` returns `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` — *"Expected OAuth 2 access
token, login cookie or other valid authentication credential"*.

Measured directly against `generativelanguage.googleapis.com`, with the key from `.env`:

| Request | `?key=` | `x-goog-api-key` |
|---|---|---|
| `gemini-1.5-flash` / `2.0-flash` / `2.5-flash`, plain | 401 | 401 |
| all three + `google_search` | 401 | — |
| all three + `google_search_retrieval` | 401 | — |

Every combination fails identically. **The grounding config is not the cause and the application
code is not the cause.** The key is 53 characters beginning `AQ.` — not the `AIzaSy…` format the
Gemini API expects — and both accepted auth mechanisms rejected it. It is not a Gemini API key.

Nothing in the codebase branches on key format. The fix is a valid AI Studio key. Note this also
means `/guide/translate` is **not** working, contrary to an earlier report.

Separately: the raw provider error body currently reaches the UI. That leaks endpoint paths and
internal structure and must be replaced with a friendly message once the key is fixed, with the
full error routed to server logs.

Also unfixed: `tira.tsx` reads the JWT from `AsyncStorage['auth_token']`, but tokens are stored
in SecureStore under `access_token`. Harmless today only because the route is not auth-gated.

### 6.7 Naming trap — "Connect" vs. cafes/places

**Connect** — the people-swipe roommate/flatmate matching feature — lives in
**`app/(tabs)/match.tsx`**. There is **no `connect.tsx`** and **no `eat-drink.tsx`**; do not go
looking for them. A legacy `eat-drink.tsx` once held this matching feature under a misleading
food-related name, became dead code, and was deleted.

The cafe/restaurant "What's around here" list is a **completely separate feature** on the
**Stays** screen (`app/(tabs)/index.tsx`).

Do not add places UI to `match.tsx`, and do not treat any "eat"/"drink"/"food" filename as a
places feature — that mistake would destroy the matching feature.

### 6.8 Seed data is obviously fake

10,000 rows of `"Automated Listing 175"` / `"Auto generated."`, every rating exactly `4.8`,
`address` **null** on every row, no images. Fine as a load test; unusable for a screenshot or a
demo. A separate set of ~15 realistic Delhi NCR listings is needed and must be kept distinct from
the load-test seed.

The null `address` also exposed a real UI bug — `listing/[id].tsx` rendered a lone map-pin glyph
with no text beside it, which read as a rendering failure. Now guarded.

---

## 7. Tech stack (verified against the code)

**Monorepo:** pnpm workspaces, Node.js, TypeScript 5.9. Server builds with esbuild; the app is
Expo.

- **Frontend** — `artifacts/roamos`: Expo SDK 54 / React Native, **New Architecture enabled**,
  expo-router (file-based, `typedRoutes` on). Key libs: `@shopify/flash-list` v2,
  `react-native-maps`, `expo-camera`, `expo-location`, `expo-secure-store`, `expo-sqlite`
  (offline chat outbox), `socket.io-client`, `@tanstack/react-query`,
  `react-native-reanimated` 4.1.7.
- **Backend** — `artifacts/api-server`: **Express 5** (TypeScript), `helmet`, `cors`,
  `express-rate-limit` 8.6.1, `pino`. HTTP + socket.io booted together in `src/index.ts`.
- **Database** — **PostgreSQL 15 + PostGIS** (§2.1), **Drizzle ORM** in `lib/db`. Schema:
  `lib/db/src/schema/index.ts`. Migrations: `lib/db/drizzle/` (`0000`–`0004`).
- **Auth** — custom: email/password (**argon2**) and phone/OTP. JWT access (15m) + refresh (7d)
  with rotation.
- **OTP** — **MSG91** behind a swappable `OtpProvider` interface, with a dev console fallback.
- **Payments** — Stripe today, **migrating to Razorpay Route** (§3.1).
- **AI** — Google Gemini via `@google/genai` in `routes/guide.ts` (§6.6).

### Explicitly NOT in use — do not introduce without re-raising the tradeoff

| Tech | Why rejected at this stage |
|---|---|
| **Supabase** | See §0. A separate Supabase prototype exists; this repo deliberately does not use it. |
| Kubernetes | One backend container does not need cluster orchestration. |
| Kafka | One backend writing to one database. Nothing to stream. |
| DynamoDB | Would undo the PostGIS geo-search decision. |
| TensorFlow / custom ML | Tira calls an existing LLM API. No in-house training. |
| Sharding / partitioning | Tables are near-empty pre-launch. |
| Redis / caching layer | No endpoint has been *measured* as slow. |

---

## 8. Repo layout

```
steadynest/                      ← project root; the tree that actually runs
  AGENTS.md                      ← this file
  CLAUDE.md                      ← same context, for Claude Code
  docker-compose.yml             ← describes Postgres, but is NOT what runs (§2.1)
  pnpm-workspace.yaml
  lib/
    db/                          ← @workspace/db
      src/index.ts               ← pg Pool + drizzle(); reads DATABASE_URL, fails closed
      src/schema/index.ts        ← all tables — source of truth for schema
      drizzle/                   ← generated SQL migrations + meta/_journal.json
      src/seed.ts                ← demo users + bulk listings
    api-client-react/            ← shared client; see the pnpm note in §2.2
  artifacts/
    api-server/                  ← @workspace/api-server
      src/index.ts               ← HTTP + socket.io boot
      src/app.ts                 ← middleware chain + route mount
      src/config/env.ts          ← zod env validation; rejects placeholders, exits
      src/routes/                ← health, auth, chat, sos, match, guide, listings, calls, payments
      src/middlewares/auth.ts    ← requireAuth / requireRole
      .env                       ← gitignored; holds GEMINI_API_KEY (§6.6)
    roamos/                      ← @workspace/roamos (Expo app)
      app/                       ← expo-router screens
      components/                ← SNTabBar, SNSkeleton, SNEmpty, DevTreeBadge, …
      constants/colors.ts        ← design tokens — the single source (§4.5)
      context/AppContext.tsx     ← auth + global state
      lib/api.ts                 ← host resolver (§2.3)
      lib/queryClient.ts         ← shared QueryClient + clearAllCaches (§6.5)
```

---

## 9. Run & operate

```bash
# 1. Postgres (portable — NOT docker, see §2.1)
/c/dev/steadynest-pg/extract/pgsql/bin/pg_ctl.exe -D /c/dev/steadynest-pg/data -l /c/dev/steadynest-pg/server.log start

# 2. API server on :8080  (from artifacts/api-server)
node build.mjs && node --env-file=.env ./dist/index.mjs

# 3. Metro / Expo on :8081  (from artifacts/roamos)
npx expo start --host lan

# 4. Emulator
emulator -avd Pixel_7a
adb shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8081"

# typecheck
npx tsc --noEmit -p tsconfig.json
```

Health check: `curl http://127.0.0.1:8080/api/healthz` → `{"status":"ok"}`.

Metro binds 8081 before it answers `/status` — poll, do not assume.

**Required env** (`artifacts/api-server/.env`): `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET` (min 32 chars, must differ), `GEMINI_API_KEY`. Optional, features degrade
without them: `STRIPE_*`, `MSG91_*`, `TWILIO_*`, `GOOGLE_*`.

**Demo accounts** (seeded, password `password123`, argon2): `priya@roamos.in` (tenant),
`rahul@roamos.in` (landlord), `aarav@roamos.in` (landlord).

---

## 10. Immediate next steps

**Only the founder can do these:**

- [ ] Decide what to do about `steadynest-pg/` being in the public repo (§5.6).
- [ ] Obtain a valid Gemini API key in `AIzaSy…` format (§6.6).
- [ ] Decide the tree-collapse question — does the co-founder have branches expecting the nested
      `Feature-Launch-Plan/` layout? (§6.1)
- [ ] Provide real keys when ready: Razorpay, MSG91, Twilio.
- [ ] Real-device test of SOS with mobile data genuinely disabled (§5.7).

**An agent can do these from code:**

- [ ] Change `"@workspace/api-client-react": "file:…"` → `"workspace:*"` and de-duplicate the
      `expo` declaration, then verify `pnpm install` works and the app still boots (§2.2).
- [ ] Add `requireAuth` to `/api/sos/trigger` and fix the SOS limiter mount path (§5.3).
- [ ] Configure pino redaction for phones, coordinates and trusted contacts; remove the
      `console.log`s in `routes/sos.ts` (§5.5).
- [ ] Fix the chat room fetch — path and auth header (§6.2).
- [ ] Seed ~15 realistic Delhi NCR listings, kept separate from the load-test seed (§6.8).
- [ ] Delete and rebuild the landlord screens on the Phase A components (§6.3).
- [ ] Fix `listings.currency` defaulting to `USD` (§6.4).
