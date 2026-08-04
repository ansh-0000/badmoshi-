# HANDOFF — SteadyNest / ROAM OS

**State as of commit `680e6b91`.** This file is the *status* document: what is done, what is
half-done, what was decided but not built, and what is waiting on the founder.

For standing context — architecture, environment quirks, engineering rules, the reasons behind
past decisions — read **[`AGENTS.md`](AGENTS.md)** first. It is the long-lived source of truth
and was written to be read cold. `CLAUDE.md` holds the same material for Claude Code. This file
does not repeat them.

## Current verified state - 4 August 2026

The status line above is historical. The latest verified work is:

- `88f3762f`: safe Git/repository reconciliation guidance; the tree rewrite remains a founder
  gate.
- `dbedae18`, `07ca52d6`, and `fbe2092c`: SOS identity/rate protection, server-side chat
  membership, and guarded Tira (`test:sos`, `test:chat`, and `test:tira` passing).
- `92f1416a`: reduced Metro watch scope; the Pixel 7a AVD booted and rendered the app.
- `26f0d2b3`: reproducible migrations. The current ledger contains six migrations.
- `d8c97113`: active UI mode derives from authenticated role; full capabilities remain a founder
  decision.
- `f862ec77`: authenticated landlord portfolio/property first slice, including a 50-record UI
  bound. Operational landlord workflows remain unbuilt.
- `2dc04840`: Razorpay Route replacement plan only; payments are not enabled.
- `e898c5e2`: 15 fictional INR Delhi NCR launch listings and a separate 10,000-row load fixture.

Use [`docs/VERIFIED_TAKEOVER_STATE.md`](docs/VERIFIED_TAKEOVER_STATE.md) as the current status
matrix. The older sections below remain valuable history but contain superseded runtime claims.

---

## ⛔ READ FIRST: this repo does NOT build from a clean clone

**Do not `git clone` this repo and expect to run it.** You will get a tree that cannot install
and cannot start, and nothing about the failure will explain why. Work in the existing checkout
at **`C:\dev\steadynest`**, which is complete on disk.

**Why:** the git root is `C:\dev`, and the project is mid-migration between two layouts. Until
recently `steadynest/` had **zero** tracked files — the entire runnable tree lived outside git.
Only files touched in the last two sessions have been committed, so what is in the repo at that
path is a **partial tree**: roughly a dozen source files whose imports, `package.json` siblings
and asset directories are still untracked. Meanwhile 269 files remain tracked under the old
`Feature-Launch-Plan/` prefix and show as pending deletions.

Both halves are correct on disk. Neither half is complete in git.

**This resolves when the flatten happens**, which is blocked on the founder — see §5.3. Until
then:

| | |
|---|---|
| **Source of truth** | the working tree at `C:\dev\steadynest`, not the repo |
| **Safe** | committing individual files you change, by explicit path |
| **Not safe** | cloning fresh; `git checkout` of the old branch; staging the pending deletions; anything that assumes the repo reflects the disk |

If the working tree is lost, the project is lost. That is the current state, and it is the single
strongest argument for resolving the flatten early.

> **Also before running anything (`AGENTS.md` §2):** Postgres is a portable install at
> `C:\dev\steadynest-pg`, **not** Docker — Docker Desktop cannot start on this machine.
> A full `pnpm install` must not be run yet (the resolver is fixed, but the installed
> `node_modules` is still the npm one and swapping it needs the app verified afterwards).

---

## 0. Where things stand in one paragraph

The app builds, boots, and serves live data on the Android emulator — 10,000 seeded listings,
radius search against real PostGIS, prices in the right currency. The last two work sessions
covered a security pass (JWT, webhook, OTP limits, DB credentials — all closed), a design-system
pass (one tab bar, one colour token set, skeletons and empty states), and a bug pass that is
**partially complete and partially unverified**. The two things most likely to bite a new agent
are that Tira AI is completely down on an invalid credential, and that the live database
directory is committed to a public repo. Neither is a code problem.

---

## 1. Done and verified

Verified means: run against the emulator or the live API, and observed. Not "typechecks".

| Item | Evidence |
|---|---|
| App boots on `Pixel_7a` against live API | Android bundle 2,491 modules; `896 stays within 7 km` of Saket rendered from Postgres; no JS errors |
| Host resolver, emulator + physical device | `hostUri: '10.0.2.2:8081'` → `API configured to hit: 'http://10.0.2.2:8080/api'`, no `adb reverse` |
| JWT forgery closed | Token forged with the published `access_secret_dev` returns **401** after fix |
| Payments endpoints authenticated | `/payments/subscribe` and `/connect-account` were unauthenticated with body-supplied `userId`; now **401** without a token |
| OTP rate limiting | Measured 200/200/200/**429**/429 per phone; 10 through then **429** per IPv6 /56 subnet |
| Stripe webhook fails closed | Rejects with 503 when `STRIPE_WEBHOOK_SECRET` is unset, instead of trusting `whsec_test_mock` |
| Migrations 0000–0004 all registered | `_journal.json` has all five tags; `0003` (leases, trusted_contacts) was the one that was silently skipped |
| Dark-mode tab contrast | Active tab was **1.98:1**, dimmer than inactive at 8.71:1. `primaryTint` `#8FB89E` measures **7.61:1** |
| Skeleton actually animates under reduced motion | Frame diff: 1 distinct frame of 4 → 2 distinct of 6 after `ReduceMotion.Never` |
| All three hardcoded DB connection strings removed | `lib/db/src/index.ts`, `drizzle.config.ts`, and `insert.cjs` (deleted) |

---

## 2. Written, typechecks, NOT verified on device

**This is the section to be suspicious of.** All of it is committed in `12cee611`. `tsc --noEmit`
exits 0. None of it has been seen running. Per `AGENTS.md` §4.3, that is not the same as working.

### 2.1 Tab bar bleed-through (Pass 1 item 1)

`app/(tabs)/_layout.tsx` rewritten to render `components/SNTabBar.tsx` instead of re-declaring
the bar inline. Android/web now get a **fully opaque** bar; iOS keeps a real `BlurView`.

- **Not screenshotted.** This is the one you specifically asked to see, and I did not get to it.
- Risk to check first: the bar is absolutely positioned inside a custom `tabBar` prop so that
  `useTabBarClearance()` in `constants/layout.ts` stays valid. If screens now have double bottom
  padding, or content runs under the bar, that wrapper is why.

### 2.2 Listing detail location line (Pass 1 item 2)

**Diagnosed as both.** `address` is `null` on every bulk-seeded row (data gap), *and* the UI
rendered the pin unconditionally, so a null address produced a lone map-pin glyph with no text
(real bug, reachable with real data since the column is nullable). Now guarded — no address means
no location row.

### 2.3 SOS defects #1–#4 (Pass 1 item 3)

All four fixed in `app/sos-active.tsx`. Details and the reasoning are in `AGENTS.md` §5.7.

- #1 timeout → `AbortSignal.timeout(6000)`
- #2 all contacts → one composer addressed to every trusted contact
- #3 draft-not-send → **cannot be fixed**; Android `SEND_SMS` is unavailable in Expo Go and Play
  Store would reject a rental app for requesting it. The composer is the ceiling.
- #4 the hard gate → `notified` is gone. States are now `dispatched` (server-confirmed only),
  `draft_opened` ("Press Send", gold, deliberately no green tick), `failed`, `pending`, plus an
  explicit "Nothing has been sent yet" warning.

**Untested end to end.** Nobody has triggered SOS on the emulator since the rewrite, let alone on
hardware with data disabled.

### 2.4 Sign-out and cross-user cache leak (Stage 1 item 1.1)

`lib/queryClient.ts` is new: it owns the `QueryClient` and its AsyncStorage persister, and
exports `clearAllCaches()`, which calls **both** `queryClient.clear()` (memory) and
`persister.removeClient()` (disk). `logout()` now calls it, plus clears tokens and resets
`activeRole` / `activeLease`.

The leak was worse than described: the cache is wrapped in `PersistQueryClientProvider`, so the
previous user's Stays results, chat threads and Connect profiles survived **killing the app**,
not just signing out.

**The verification you asked for has not happened** — sign out, sign in as a different account,
confirm no stale data. Do that before trusting it.

A **Sign out** button now exists in Profile. There was none before, anywhere in the app.

### 2.5 Role switching (Stage 1 items 1.2, 1.3)

- `PATCH /api/auth/role` no longer returns `409 Role is already set.`
- `AuthGuard` allows `role-select` after a role exists (it was a one-way door).
- Profile's role switcher now calls `setUserRole()` with a confirmation dialog, instead of
  toggling a cosmetic local flag that only swapped one mock card. `activeRole` mirrors
  `user.role`.

**Not verified.** The screenshot you asked for — role selection reachable, sign out working, both
modes accessible — does not exist.

---

## 3. Decided, not implemented

Decisions are recorded with their reasons in `AGENTS.md` §3. These are the ones with no code yet.

| Decision | Status |
|---|---|
| **Razorpay Route, not Stripe Connect** | No Razorpay code exists. Stripe code is still in place and still the only payment path. Razorpay Route's own current docs have **not** been verified for requirements. |
| **Never hold funds; split at source** | Architectural constraint only — nothing built to enforce it. |
| **Autopay two modes above/below ₹15,000** | Not built. RBI research done and sourced (Digital Payments E-mandate Framework 2026, notified 21 Apr 2026; ₹15,000 AFA threshold; rent **not** in the ₹1,00,000 exemption list; 24h pre-debit notification mandatory; applies to UPI Autopay). |
| **11-month lease default everywhere** | Not enforced in code. |
| **Capabilities schema, one active mode** | Schema unchanged. The 409 removal (§2.5) is the first step only. |
| **Delete the four landlord screens and rebuild** | **Audited, not deleted.** Confirmed no extractable logic — every call goes to `/api/landlord/*`, which is not mounted in `routes/index.ts`, so all 404. Only computation is one `reduce` and two `.filter().length`. Left in place because deleting before the replacement exists breaks the landlord route entirely. |
| **Cloudinary for listing photos** | Not configured. Seed listings stay on placeholders. Set a billing alert before the first upload. |
| **~15 realistic Delhi NCR listings** | **Not done.** Still 10,000 rows of `"Automated Listing N"` / `"Auto generated."` / every rating `4.8` / `address` null. Must be kept separate from the load-test seed. |

### Also decided and not done: Phases B through G

Roughly 18 screens. Phase A (shared components) is signed off. **S1 (Offline) and S2 (Error
state) were explicitly reordered ahead of Phase C** and are not built.

S1 must use NetInfo — show immediately on the offline event, skip the retry chain entirely,
because retrying with no radio is pointless. Keep backoff tuning scoped to genuine server errors.

> **S1 copy is blocked.** The design's line *"SOS still works — with no data it falls back to a
> normal SMS with your coordinates"* must **not** ship until the SMS fallback is implemented
> **and** verified on a physical device with data genuinely disabled. See `AGENTS.md` §5.7.

---

## 4. Diagnosed, root cause known, fix not applied

These are cheap now — the expensive part (finding the cause) is done.

| Issue | Root cause | Fix |
|---|---|---|
| ~~`pnpm install` fails~~ **FIXED** `462c17d8` | `file:` made pnpm treat `@workspace/api-client-react` as external to the workspace, and external packages may not use `catalog:` specifiers — which it does. | Now `workspace:*`. Verified: resolves 1,186 packages in 12.8s. **Still to do:** a full `pnpm install` that rewrites `node_modules`, which must be done in one sitting with the app verified booting after |
| ~~Duplicate `expo` declaration~~ **FIXED** `462c17d8` | Pinned twice, so which won was luck | `dependencies` keeps `~54.0.36` |
| Tira AI down | Credential is not a Gemini API key — 53 chars starting `AQ.`, not `AIzaSy…`. Tested across three model versions and both auth mechanisms; **every** combination 401s, including plain `generateContent` with no tools | Needs a valid AI Studio key (§5). No code change |
| SOS rate limiter never fires | `app.ts` registers it at `/api/security/sos`; the router mounts at `/api/sos` | Fix the mount path |
| `POST /api/sos/trigger` unauthenticated | Never had `requireAuth`, and takes `contacts` from the body | Add `requireAuth`; derive contacts server-side |
| `/api/guide/*` unauthenticated | Anyone can burn the Gemini quota | Add `requireAuth` |
| Chat rooms always empty | Client fetches `GET /api/chat/:id` with no auth header; server serves `GET /api/chat/:id/messages` and requires auth. Two bugs | Fix path and add the token |
| `listings.currency` defaults to `USD` | Schema default and the zod `createListingSchema` default, on an India-only product. UI hardcodes `₹` so it renders right by accident | Change both defaults to `INR` |
| pino PII redaction absent | `routes/sos.ts` uses `console.log`, bypassing pino entirely — raw coordinates and trusted-contact phone numbers | Configure redaction; remove the `console.log`s |
| `tira.tsx` reads the wrong token key | Reads `AsyncStorage['auth_token']`; tokens live in SecureStore under `access_token`. Harmless only because the route is not auth-gated | Fix the key — and it becomes a real bug the moment `/guide/*` gets `requireAuth` |
| ~~`pnpm-workspace.yaml` placeholder~~ **FIXED** `462c17d8` | YAML parsed the placeholder string as a truthy non-boolean rather than erroring | Set to `false`; not a direct dependency and needs native compilation |

---

## 5. Blocked on the founder, not on code

Nothing an agent can do about these.

1. **The live database is in the public repo.** `steadynest-pg/` — 25,215 tracked files including
   `data/base/**` — is committed and **already pushed** to public `origin/main`. Raw on-disk
   Postgres, not a dump: `users` (argon2 hashes, emails, phones), `otp_challenges`,
   `trusted_contacts` (emergency numbers), `messages`, `leases`, `transactions`.
   Removing it means rewriting history on a repo the co-founder may have branches against.
   **Decision needed.** Until then: do not stage anything under that path.

2. **A valid Gemini API key** in `AIzaSy…` format. The current one cannot authenticate. Tira is
   entirely down — both `/guide/ask` and `/guide/translate`, contrary to an earlier report of
   mine that said translate worked.

3. **The tree-collapse question.** Does `badmoshi-` have other branches or open PRs expecting the
   nested `Feature-Launch-Plan/` layout? Until answered, the flatten (steps 3 and 4) is on hold
   and the repo carries 273 pending deletions plus a partially-tracked `steadynest/`.
   See `AGENTS.md` §6.1.

4. **Real API keys when ready:** Razorpay, MSG91 (OTP SMS), Twilio (SOS SMS).

5. **Physical-device SOS test** with mobile data genuinely disabled. This is a Phase 3.5 blocker
   and no code change substitutes for it.

6. **Rotate the previously-leaked `GEMINI_API_KEY`** and scrub it from git history. Partly
   overtaken by (2), but the history scrub still applies.

7. **Not incorporated.** No company, no DPDP-compliant privacy policy, no DLT registration for
   SMS sender IDs, no Play Store listing. All are launch blockers and none are code.

---

## 6. Requested this session and NOT delivered

Stated plainly so nothing is quietly lost.

- **Pass 1 item 5** — reseed with ~15 realistic Delhi NCR listings. Not started.
- **Pass 2 items 1 and 2** — the pnpm fix and the duplicate `expo`. Diagnosed (§4), not applied.
- **Pass 2 item 3** — full dead-code sweep. Only partial: `lib/db/insert.cjs` deleted, landlord
  screens audited. No systematic sweep for unreferenced components, orphaned routes or leftover
  debug scripts.
- **Pass 2 item 4** — app-wide hardcoded hex audit. Only files touched this session were audited
  (`sos-active.tsx` migrated to `fixedInk` tokens, `(tabs)/_layout.tsx` literals removed). **No
  app-wide sweep.**
- **Pass 2 item 5** — confirmed one design system, but the two-working-trees question is
  unresolved and blocked on (5.3).
- **The honest launch-readiness report** — not written. §3, §4 and §5 here are the raw material
  for it.
- **Every screenshot** — the tab bar fix, and the Stage 1 role-selection / sign-out / both-modes
  screenshot. Neither exists.

---

## 7. If you are picking this up cold, do this first

1. Read `AGENTS.md` §2 (environment) and §5 (security state). Do not run `docker compose` or
   `pnpm install`.
2. Start the stack: Postgres (portable path), API on :8080, Metro on :8081, emulator. Commands in
   `AGENTS.md` §9.
3. **Verify §2 of this file.** All of it is committed and none of it has been seen running. Start
   with the tab bar screenshot and the sign-out / role-switch flow, because those are the two the
   founder explicitly asked to see and did not get.
4. Then pick from §4 — those are diagnosed and cheap.

Commit per item, by explicit path. Never `git add -A` — this tree holds `.env`, database files
and scratch scripts.
