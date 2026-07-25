# Architecture Plan: SteadyNest

## 1. System Topology

- **Mobile Client**: Expo (React Native) app (`artifacts/roamos`) handling the UI, local SQLite caching, and device APIs (Camera, GPS).
- **Backend API**: Node.js + Express + TypeScript (`artifacts/api-server`) handling business logic, serving REST endpoints and WebSockets on port 8080.
- **Database**: PostgreSQL with PostGIS extension for geo-spatial queries.
- **Cache / PubSub**: Redis for session management, rate-limiting, and Socket.io scaling.
- **Third-Party Integrations**: Stripe (Payments), Twilio (SMS), Google Maps/Places/StreetView (Location), Cloud Speech/Translation (Voice), S3/Cloud Storage (Images), Expo Push Notifications.

## 2. Folder & Module Structure

### Mobile Client (`artifacts/roamos`)
```text
/app             # Expo Router screens & navigation stacks
/components      # Reusable UI primitives (Design System) and complex features
/context         # Global state providers (Auth, Theme)
/hooks           # Custom React hooks (Data fetching via React Query, Geolocation)
/lib             # Utility functions (API client, dynamic backend URL resolver, storage)
/db              # expo-sqlite configuration and local queries (chat outbox)
```

### Backend Server (`artifacts/api-server`)
```text
/src
  /controllers   # Route handlers
  /middlewares   # Auth guards, Rate limiting, Error handlers
  /models        # ORM (Prisma/Drizzle) schemas and migrations
  /routes        # Express route definitions
  /services      # Business logic (Payments, SOS, Matching)
  /sockets       # Socket.io event handlers
  /utils         # Helpers (Hashing, JWT, Logger)
```

## 3. Core Data Flow

### A. Authentication
1. Client sends `POST /auth/login` with email/password.
2. Server verifies Argon2id hash.
3. Server generates short-lived JWT Access Token and rotating Refresh Token.
4. Client stores tokens securely in Keychain/Keystore.
5. On expiry, client uses refresh token to get a new pair; server invalidates the old token family to prevent replay attacks.

### B. Payments (Stripe Connect)
1. Landlord connects Stripe account.
2. Tenant signs lease -> Client requests Stripe token.
3. Server creates pre-authorized recurring debit using Stripe Connect. No raw card data touches our DB.
4. Stripe handles auto-charge on the 1st of the month.
5. Webhooks from Stripe update `Transactions` status in our DB.

### C. Real-Time Chat
1. Client connects via Socket.io using JWT auth.
2. Optimistic UI: Message appears instantly as "Sending".
3. Client emits `chat:send`.
4. Server saves to DB, emits `chat:receive` to recipient.
5. Client marks as "Delivered".
6. **Offline**: If offline, message goes to local SQLite queue. Network listener flushes queue on reconnect.

### D. Emergency SOS
1. User triggers SOS via Settings.
2. Client acquires GPS, captures front/back camera frames (silently, minimal UI).
3. Client encrypts and POSTs to `/api/security/sos`.
4. Server fans out to Twilio (SMS), Email, and Push Notifications.
5. **Offline Fallback**: If network fails, client intercepts and opens native SMS composer with coordinates and predefined message.
6. Client deletes local images immediately after transmission or failure timeout.
