# Steady Nest — Infrastructure, DevOps & Security Master Plan

Source-of-truth companion to `current_architecture_and_features.md`. Where that document says *what exists*, this one says *what to add, in what order, and what to deliberately skip* — plus the full security posture. Every buzzword from your list is addressed below with a clear verdict, not just a definition.

Status assumed going in: Phase 0–2 complete (monorepo, docker-compose Postgres+PostGIS+Redis, NestJS JWT auth, Expo+Zustand+React Query, Properties CRUD with geo-search and S3 uploads).

---

## 1. Technology decision matrix

**Verdict key:** ✅ Now — build this before/alongside Phase 3. 🔜 Later — real need, wrong time. ❌ Skip — no concrete reason for this app.

| Technology | Verdict | Reasoning |
|---|---|---|
| Docker / containerization | ✅ Now | Already your dev environment — containerize `api`, the socket gateway, and any worker process the same way for prod parity. |
| Staging environment | ✅ Now | Mirrors prod topology, separate DB/Redis, seeded fake data. Every deploy hits staging first — no exceptions, especially for autopay/SOS code. |
| S3 | ✅ Now | Already in use for property images — presigned upload/download URLs, never public buckets. |
| Git / GitHub workflow | ✅ Now | Trunk-based: short-lived feature branches off `main`, required review + CI pass, protected `main`. |
| Cherry-pick | ✅ Now (narrow use) | Reserve for exactly one case: backporting a hotfix from `main` onto a release branch. Regular cherry-picking elsewhere signals the branching strategy has drifted. |
| CI/CD | ✅ Now | GitHub Actions: lint → typecheck → test → build → auto-deploy staging → manual gate → prod. |
| Cloud provider | ✅ Now | Pick one (Fly.io/Railway for speed, AWS/GCP for control) — don't multi-cloud pre-launch, it's pure overhead. |
| Encryption | ✅ Now | TLS 1.3 in transit; S3 SSE + Postgres encryption at rest; app-level AES for SOS payloads specifically. |
| Firewall | ✅ Now | Postgres/Redis on a private subnet, inbound only from the API tier. Never expose either port publicly. |
| WAF (web app firewall) | ✅ Now | Cloudflare/AWS WAF in front of the API — catches SQLi/XSS probing and bot traffic before your app sees it. |
| WebSockets | ✅ Now | Already the plan for chat/presence (Socket.io + Redis adapter). |
| Rate limiting | ✅ Now | Redis-backed, per-IP and per-user. Tighter limits specifically on auth, SOS, swipe, and AI-concierge endpoints — those are your abuse/cost surface. |
| Error logging | ✅ Now | Sentry on mobile + backend, correlation IDs per request. |
| Load balancer | ✅ Now (from 2 instances on) | Managed LB (ALB/Fly built-in) once you run more than one API instance; sticky sessions or Redis adapter so sockets survive rebalancing. |
| Caching | ✅ Now | Redis for hot reads (nearby-listing buckets, session data); CDN for static/image assets. |
| Reverse proxy | ✅ Now | Terminates TLS, forwards to app instances — usually your managed LB does this for you. |
| Availability target | ✅ Now (define it) | Pick a real number: 99.5% (~3.6 hrs/month) is honest pre-scale. Don't chase 99.99% before you have paying users. |
| Embedded database | ✅ Already have it | expo-sqlite for the offline chat queue *is* this — nothing else needed. |
| Partitioning | 🔜 Plan schema now, execute later | Partition `Messages` by month once chat history is large — plan the schema for it now even if you don't act yet. |
| Serverless / Lambda | 🔜 Selective | Good for bursty, isolated tasks: S3-triggered image resizing, Stripe webhook handlers. Keep the stateful core (auth, sockets) on persistent servers — cold starts don't mix with WebSockets. |
| Read replica (Postgres) | 🔜 | Add once dashboard/analytics queries start competing with transactional writes for connections. |
| Kubernetes | 🔜 | Add when manual instance management of many independently-scaling services becomes the actual bottleneck — usually well after product-market fit, not before. Docker Compose → managed containers (ECS/Fly) is the right in-between step. |
| Kafka / event streaming | 🔜 | Needed when multiple independent consumers must replay the same durable event stream (e.g. analytics + fraud detection + notifications all reading "payment succeeded"). BullMQ on Redis (already in your stack) covers autopay jobs, SOS dispatch retries, and notification sends fine below that threshold. |
| Sharding | 🔜 / unlikely | Table partitioning gets most apps further than sharding ever needs to. Revisit only with genuine single-node write-throughput limits. |
| RPC / gRPC | ❌ for now | REST + WebSocket events cover everything here. Only relevant once you split into many internal services calling each other with strict typed contracts. |
| Long / short polling | ❌ | You already have WebSockets, which is strictly better for chat. Socket.io auto-falls-back to long-polling itself when a network blocks WS — nothing to build. |
| DynamoDB | ❌ | Redundant next to Postgres+PostGIS without a distinct single-table, massive-throughput access pattern. Don't run two databases without a concrete reason. |
| TensorFlow | ❌ | You're calling STT/translation/LLM APIs, not training models. Revisit only for a genuine on-device model — and then it's TensorFlow Lite, not full TF. |
| FTP | ❌ | Legacy, insecure, no access-expiry story. S3 presigned URLs replace every legitimate use case here. |
| PyCharm | — | Just an IDE choice; irrelevant to the Node/NestJS backend unless you build a separate Python data/ML script later. |

---

## 2. Security architecture

### 2.1 OWASP mapping to your actual features

**API-specific risks (OWASP API Security Top 10)** — these matter more for you than the generic web list:

| Risk | Where it lives in Steady Nest | Mitigation |
|---|---|---|
| Broken Object Level Authorization (BOLA) | Tenant hits `/leases/:id` for someone else's lease; landlord views another landlord's earnings | A reusable NestJS guard checking `resource.ownerId === request.user.id` on **every** read/write to Leases, Properties, Transactions, Messages — not just "are you logged in," but "is this yours." This is the single most common real-world API breach pattern and the easiest to miss. |
| Broken authentication | Login, refresh, OAuth | Already covered by Phase 1's rotating-refresh-token design — keep the "reuse detected → kill the whole token family" logic. |
| Excessive data exposure | Any endpoint returning a `User` object | Never return the password hash field at all, even hashed — use a response DTO/serializer, not the raw entity. |
| Lack of rate limiting | Auth, SOS, AI concierge, swipe | Covered in the matrix above — this doubles as cost control on the AI endpoints. |
| Mass assignment | Property/lease creation forms | `class-validator` DTOs with `whitelist: true`/`forbidNonWhitelisted: true` — reject unknown fields outright, don't just ignore them. |
| Injection | Any raw query | ORM-parameterized queries only (Prisma already does this) — no string-concatenated SQL, ever. |
| Improper assets management | Staging/debug endpoints | Staging environment must require its own auth gate — a forgotten open `/debug/*` route in a discoverable staging URL is a classic breach vector. |
| Insufficient logging & monitoring | All of the above | Covered in Section 4 (Observability). |

**Mobile-specific (OWASP Mobile Top 10)**, mapped to your actual features:

- Insecure data storage → tokens and emergency contacts in `expo-secure-store` (Keychain/Keystore), never AsyncStorage.
- Insecure communication → TLS 1.3 everywhere, certificate pinning is optional polish, not a blocker.
- Insufficient cryptography → SOS payloads AES-encrypted client-side before any network call.
- Privacy controls → camera/location permission requested once, at onboarding, with plain-language purpose text — not silently at SOS-trigger time (see the SOS design from the earlier plan).

### 2.2 Secrets & environment variables — "making sure it doesn't get hacked" starts here

This is where most real breaches actually happen — not exotic attacks, leaked keys:

- `.env` is git-ignored from commit one. A `.env.example` in the repo lists variable **names only**, never values.
- Separate `.env` per environment (dev/staging/prod) pulled from a secrets manager (AWS Secrets Manager, Doppler, or GitHub Actions encrypted secrets for CI) — not hand-copied between laptops.
- Least-privilege keys everywhere: Google Maps key restricted by Android package name / iOS bundle ID *and* by API (Maps/Places only, nothing else enabled); Stripe restricted keys for anything client-adjacent (can create charges, can't issue refunds).
- Any key that has ever touched a public repo — even one that started private — gets rotated. Assume it's compromised the moment it's out.
- Dependency scanning (`npm audit` / Dependabot) in CI — a large share of real breaches come through a vulnerable third-party package, not first-party code.
- Before public launch: a real third-party penetration test. Every security claim in a spec is unverified until an outside party has actually tried to break it.

---

## 3. DevOps pipeline

**Environments:** dev (local docker-compose) → staging (mirrors prod, own DB, seeded data) → prod. No deploy skips staging.

**CI/CD (GitHub Actions):** lint → typecheck → unit tests → build → auto-deploy to staging on merge to `main` → manual approval gate → prod. Database migrations run as their own CI step *before* the new app version takes traffic — never let app boot race a pending migration.

**Deploys:** rolling or blue-green (Fly.io/Railway/ECS all support this natively), health-check gate before old instances terminate. Feature flags around autopay and SOS specifically, so either can be killed instantly in production without a redeploy.

---

## 4. Observability & ops

- **Error logging:** Sentry on mobile + backend, with a correlation ID per request so a chat bug, its socket event, and the DB query behind it trace as one thread.
- **Uptime:** a `/health` endpoint, pinged externally (UptimeRobot/Better Stack), alerting to a channel someone actually watches.
- **Metrics that matter most for this app specifically:** autopay job success rate, SOS dispatch success rate. These are your money- and safety-critical paths — alert on their failure directly, don't let them get lost in general request-latency noise.
- **Availability target:** 99.5% is an honest, achievable pre-launch number. Chasing 99.99% before you have paying users spends effort you need elsewhere.

---

## 5. Scaling order — add these when the symptom appears, not before

1. Single API instance + docker-compose Postgres/Redis — fine until real user load.
2. Managed Postgres (RDS/Supabase) with automated backups + point-in-time recovery, managed Redis, load balancer + 2 API instances once concurrent traffic is worth being resilient for.
3. CDN in front of S3 images once image bandwidth becomes a real cost line.
4. Read replica once analytics/dashboard queries compete with transactional writes.
5. Partition `Messages` by month once chat history is large enough that the index no longer sits comfortably in memory.
6. Kubernetes, only once manual instance management across many independently-scaling services is the actual bottleneck.
7. Kafka, only if multiple independent consumers need to replay the same durable event stream — not before.

---

## 6. What to explicitly not build

FTP, DynamoDB, TensorFlow, sharding, and gRPC all solve real problems — just not problems Steady Nest has today. Building any of them now is complexity with no corresponding benefit, and each one is a maintenance cost that competes with actual feature work. Revisit each only when the specific symptom in Section 5 shows up.
