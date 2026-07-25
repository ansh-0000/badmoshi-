# HANDOFF — SteadyNest / ROAM OS

Session context is being cleared. This is the state of the world as of the last commit
(`8e104e7`, "Re-theme to Moss/Alabaster design system, rebuild shared tab bar"). Read
`CLAUDE.md` in the repo root too — it's the longer-lived source of truth and was rewritten
this session to match reality; this file is the short-term "what was I doing" note.

---

## 1. Architecture

pnpm monorepo, TypeScript throughout.

- **`artifacts/api-server`** — Express 5 + socket.io, booted together in `src/index.ts`. Routes
  in `src/routes/*.ts` (one file per resource: `auth`, `chat`, `sos`, `match`, `guide`,
  `listings`, `calls`, `payments`). `helmet`, `cors`, `express-rate-limit`, `pino` logging.
- **`artifacts/roamos`** — Expo/React Native, expo-router (file-based routing under `app/`).
  Key libs: `@shopify/flash-list` v2, `react-native-maps`, `expo-camera/location/secure-store`,
  `socket.io-client`, `@tanstack/react-query`, `react-native-reanimated`.
- **`lib/db`** — `@workspace/db`: Drizzle ORM, schema in `src/schema/index.ts`, SQL migrations
  in `drizzle/` (0000–0002), demo-data seed in `src/seed.ts`.
- **Database** — self-hosted PostgreSQL + PostGIS via `docker-compose.yml`
  (`postgis/postgis:15-3.4`), **not** a managed service.
- **Auth** — custom JWT (access 15m / refresh 7d), argon2-hashed passwords, **plus** phone/OTP
  (MSG91 provider, dev-console fallback when no key). No Supabase Auth.
- **Payments** — Stripe Checkout (subscription mode, INR) + webhook.
- **AI (Tira)** — Google Gemini via `@google/genai` in `routes/guide.ts`, with a local
  fallback engine when the key is missing/invalid/quota'd.
- **Realtime chat** — socket.io (`websockets/chatGateway.ts`) + expo-sqlite offline outbox
  (native only — guarded off on web, see §4).

**⚠️ There is a separate, earlier-stage Supabase-based prototype of this same product concept
in a different repo/folder. This is not it.** If a future prompt references `transitAi.js`,
`tira_ai_sessions`, `composeAnswer()`, a `service_role` key, or a `backend/`+`mobile/` folder
layout — that's the wrong project's docs pasted in by mistake. Stop and flag it; don't act on
it. Full writeup: `CLAUDE.md` §0.

---

## 2. What's been completed this session (in rough order)

1. **Retired the dead `steady-nest` app**, consolidated on `api-server` + `roamos`.
2. **Consolidated 4 disconnected payment flows** into one real Stripe Checkout flow
   (`booking/setup→invoice→payment`, `payments/setup.tsx`), fixed a real bug where Checkout was
   hardcoded to charge USD while the whole app displays INR.
3. **Made SOS real**: on-device SMS with a live Google Maps link is now the guaranteed primary
   action; server-side Twilio dispatch activates automatically once `TWILIO_*` env vars are set
   (currently unset, so it honestly reports `dispatched:false` and relies on the device SMS).
4. **Migrated auth off in-memory Maps onto Drizzle** (`lib/db` `users` table) — this was the
   root cause of login breaking on every server restart. Removed the plaintext-password
   fallback entirely; every credential is argon2 now.
5. **Built phone/OTP auth end-to-end**: schema migration (nullable password/role/email, unique
   indexed phone, new `otp_challenges` table), `POST /auth/otp/request` + `/verify` +
   `PATCH /auth/role`, MSG91 provider behind a swappable `OtpProvider` interface, per-phone rate
   limiting, new screens `phone-login.tsx` / `verify-otp.tsx` / `role-select.tsx`. Additive —
   email/password untouched. Account linking is explicitly out of scope (documented).
6. **Scrubbed a leaked `GEMINI_API_KEY` from git history** using `git-filter-repo` (backup
   bundle left in the session scratchpad, not in the repo). **The key currently in `.env` is
   dead anyway** — tested live against the Gemini API, got `401 UNAUTHENTICATED`. It's the wrong
   format (`AQ.Ab8…` vs a real key's `AIzaSy…`). Needs a real key from
   `aistudio.google.com/apikey` — Tira runs on its local fallback until then.
7. **Fixed real, reproduced-with-evidence bugs**:
   - Swipe→Match: `match.tsx` was 100% hardcoded mock data; wired to a new
     `GET /api/match/discover` (excludes already-swiped) and the real `POST /api/match/swipe`
     (which already correctly detects mutual matches and opens a chat thread — that backend
     logic pre-dated this session and was solid, just never called).
   - Chat rooms always loaded empty: `chat/[id].tsx` was fetching the wrong path with no auth
     header against an endpoint that needs both. Fixed to use the shared `api` client.
   - Tira read its auth token from the wrong storage key (`AsyncStorage['auth_token']` vs the
     real `SecureStore['access_token']`).
   - **The big one**: `constants/api.ts` hardcoded `10.0.2.2` (the Android-emulator-only NAT
     alias) for *every* Android device, not just the emulator — silently breaking Tira, chat,
     SOS, and the socket connection on any real physical phone. `lib/api.ts` already had the
     correct dynamic resolver (reads the actual host from
     `NativeModules.SourceCode.scriptURL`). Consolidated `constants/api.ts` to delegate to it —
     one resolver now, not two that can diverge.
8. **Built `lib/errorMessage.ts`** — shared `toFriendlyError()` utility. Raw error strings/stack
   traces must never render in the UI (there was a literal `CLIENT ERROR LOG: ...` string
   showing up in a Tira chat bubble — fixed). Applied to auth, Tira, chat history, both payment
   screens.
9. **Built Tira's real-translation feature**: `translator.tsx` already had a fully-built
   GPS-bounds→language auto-detector + manual override UI (nobody had wired it to anything
   real). Added `POST /api/guide/translate` (Gemini-backed, returns translation +
   Latin-script transliteration for reading aloud) and wired it in, replacing hardcoded
   per-language mock strings. Voice-to-text input is still a stand-in (real speech recognition
   is separate, larger scope).
10. **Rewrote `CLAUDE.md` / `README.md` / `FIRST_PROMPT.md`** to match the actual repo — they'd
    previously been overwritten with a *different* project's (the Supabase one's) docs at some
    point; this was caught and fixed, with an explicit warning section added (§0, see above).
11. **Started a 5-screen design-handoff pass** from a Figma/Claude-Design export at
    `C:\dev\steadynest-mobile-ui-design\project\` (see §3 — this is the in-progress work).

Every fix above was typechecked (`pnpm run typecheck`, clean) and most were verified against
the *live* running backend with reproduced evidence (curl + server stack traces), not guessed.

---

## 3. What we were actively doing when context was cleared

**Task: implementing a design-handoff bundle, screen by screen, into the real Expo app.**

The user supplied a design bundle at `C:\dev\steadynest-mobile-ui-design\project\` containing
`SteadyNest.dc.html` (confirmed **ground truth**) and `styles.css` (confirmed **NOT** to be
used — a mismatched generic Archivo/orange/zero-radius scaffold unrelated to this project;
explicitly ignore its tokens). The bundle covers 5 real screens: **Stays, Connect, Chat, Tira
AI, Profile** — the Onboarding/auth frame in the bundle is **out of scope** (not one of the
five named, and would conflict with the phone-OTP screens already built in item 5 above).

**Done so far on this task:**
- `constants/colors.ts` rewritten to the real palette: Ink `#14201A`, Moss `#3A5245` (primary),
  Alabaster `#F9F8F4` (background), white cards, Gold `#E2A73E` (accent/Tira identity), SOS
  `#A85232` (destructive). Card radius `28`; pill buttons (`9999`) stay explicit per-screen,
  not in the shared token, since `Card`/`Input`/`Modal` need 28, not pill. Dark mode has no
  explicit source frame (only Onboarding/Tira are deliberately dark) — extended the same
  literal hex tokens into the toggle's dark roles as a flagged inference, not pixel-verified.
- `app/(tabs)/_layout.tsx` (the shared tab bar, appears on all 5 screens) rebuilt to match: flush
  full-width bar (was a floating rounded pill before), height 92, alabaster blur background, top
  hairline border, active/inactive color+weight split, and 3 real icon corrections found against
  the source SVGs (Stays: house→map-pin, Connect: stacked-rectangles→two people, Chat:
  message-square→message-circle). **Known unavoidable gap**: on iOS with Liquid Glass available,
  the OS renders its own tab bar chrome that app code cannot restyle — only updated its icons.

**Not yet started:** the actual 5 screen rebuilds (`app/(tabs)/index.tsx` = Stays,
`app/(tabs)/match.tsx` = Connect, `app/(tabs)/chat.tsx` + `app/chat/[id].tsx` = Chat,
`app/(tabs)/tira.tsx` = Tira AI, `app/(tabs)/me.tsx` = Profile), plus a final cross-screen
consistency pass (tab bar/buttons/cards/pills must be visually identical everywhere, not just
correct on first appearance).

**Rules given for this task, still in force:**
1. Pixel-match the design's visual output (colors/spacing/radius/type/layout) in the real RN
   stack — don't literally port HTML/CSS structure.
2. Visual pass only. If matching the design would require an actual behavior change, **stop and
   flag it** — don't decide unilaterally.
3. One screen at a time; after each, report the exact pulled values and confirm the
   implementation matches them (not just "looks right").
4. Final pass must verify repeated elements are identical everywhere, not just on their first
   screen.

**Where we literally stopped:** ran the app on the Android emulator to sanity-check the
tab-bar/token changes. It boots fine, no errors, and the host-resolver fix is confirmed live in
the logs. Couldn't get past the login screen to actually see the tab bar because Postgres was
down (see §4). Was about to either (a) navigate to "Continue with phone" to show the new-theme
OTP screens without needing Postgres, or (b) wait for the user to fix Docker. **Neither
happened — that's the very next decision point.**

---

## 4. Environment quirks worth knowing before touching anything

- **Docker Desktop has been badly flaky all session.** It crashed with a corrupted
  `dockerInference` socket file (`AppData/Local/Docker/run/dockerInference`, "The file cannot be
  accessed by the system") that survives killing every Docker process and deleting the file via
  both bash and PowerShell. Renaming the whole `run` directory worked once, then the same issue
  came back. **Conclusion: this needs a full Windows reboot to actually clear** — don't spend
  time re-fighting it with process kills, it didn't work twice already.
- Because of the above, most Postgres-dependent runtime testing in the back half of the session
  was typechecked but **not** live-verified end-to-end. Notably: the Swipe→Match wiring (item 7
  above) is code-complete and typechecked but the two-account mutual-match test was never
  actually run.
- **Android**: SDK + emulator (`Pixel_7a` AVD) work fine. App is already installed as
  `com.steadynest.app` (built once via `expo run:android`; a rebuild attempt hit a **Windows
  path-length limit** during the C++/CMake step — `ninja: manifest still dirty after 100 tries`
  — caused by pnpm's deep `node_modules/.pnpm/...` paths exceeding 250 chars. Needs either
  Windows long-path support enabled or the repo moved to a shorter path; not fixed yet). To run
  without rebuilding: boot the AVD, `adb reverse tcp:8081 tcp:8081` and `tcp:8080 tcp:8080`,
  `npx expo start --dev-client --port 8081` from `artifacts/roamos`, launch the app, tap the
  discovered dev server.
- **Web** (`pnpm --filter @workspace/roamos run web`, port 3003) is the most reliable quick-check
  path. Note: `expo-sqlite`'s web build needs `SharedArrayBuffer`/cross-origin isolation that
  isn't always available — already guarded in `lib/syncQueue.ts` (skips native DB init on
  `Platform.OS === 'web'`, degrades to a no-op) so the app doesn't crash there.
- **Git hygiene**: never `git add -A` in this repo. The working tree constantly accumulates
  debug scratch scripts that must never be committed: `artifacts/api-server/insert.ts`,
  `test-genai.ts`, `test-genai-auth.js`, `lib/db/alter_listings.ts`, `benchmark.ts`,
  `insert.cjs`, `index.sql`. Always stage explicit file paths. `.env` is gitignored now but
  watch for it resurfacing.
- **Demo accounts** (seeded, `password123`, argon2-hashed): `priya@roamos.in` (u_001, tenant),
  `rahul@roamos.in` (u_002, landlord), `aarav@roamos.in` (u_003, landlord).
- A **separate Claude/Cowork session** touched this same repo mid-session and left planning docs
  (`docs/`, `TASKS.md`) and an OTP-auth *proposal* that was explicitly superseded by the real
  implementation in item 5 above — see `docs/proposals/otp-phone-auth/README.md`, which
  documents its own supersession.
- Known, still-open bugs from earlier investigation, **not yet fixed**: SOS rate limiter is
  mounted at `/api/security/sos` in `app.ts` but the real route is `/api/sos` (limiter doesn't
  apply); DB connection string is hardcoded in `lib/db/src/index.ts` (no `DATABASE_URL` env
  wiring); migration `0002` has drift from earlier out-of-band scratch scripts (applies clean on
  a fresh DB, needs checking before assuming it's safe on an already-drifted one).

---

## 5. Immediate next step

Resume the design-handoff task at §3: implement **Screen 1 (Stays, `app/(tabs)/index.tsx`)**
against `SteadyNest.dc.html`, report the exact pulled values, then proceed through Connect →
Chat → Tira AI → Profile → final consistency pass, one at a time, per the 4 rules listed above.
Before that, get Docker back up (needs a reboot) so screens can actually be verified live against
a logged-in session, not just visually inspected pre-login.
