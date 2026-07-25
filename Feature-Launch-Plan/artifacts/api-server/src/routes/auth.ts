import { Router } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db, users, otpChallenges } from "@workspace/db";
import { eq, and, desc, isNull, gt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { getOtpProvider } from "../services/otpProvider";
import {
  loginSchema,
  registerSchema,
  otpRequestSchema,
  otpVerifySchema,
  roleSchema,
} from "../lib/validation";

const router = Router();

// ── Strict rate limiter for auth endpoints ───────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts. Please wait 15 minutes." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Message rate limit reached. Please slow down." },
});

// SMS-bombing protection: throttle OTP requests per phone number (falling back
// to IP). Deliberately stricter than the generic auth limiter because each hit
// costs a real SMS and can harass the number's owner.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (typeof req.body?.phone === "string" ? req.body.phone : req.ip) as string,
  message: { error: "Too many OTP requests. Please wait a few minutes before trying again." },
});

// ── Users live in Postgres via Drizzle (@workspace/db) ────────────────────────
// The demo accounts (priya/rahul/aarav@roamos.in, ids u_001–u_003) are seeded
// through lib/db/src/seed.ts so login survives server restarts. There is no
// in-memory user store anymore — that was the source of restart-related 401s.

type DbUser = typeof users.$inferSelect;

// ── Helper ───────────────────────────────────────────────────────────────────

function sanitizeUser(u: DbUser) {
  const { password, ...safe } = u;
  return safe;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS (rate-limited)
// ═══════════════════════════════════════════════════════════════════════════════

import * as argon2 from "argon2";
import jwt from "jsonwebtoken";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_dev";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_dev";

// Refresh-token store (token -> userId).
// DEFERRED: still in-memory for now. Unlike the users store, losing this on a
// restart only forces a re-login (access tokens are 15m); it does not break
// login itself. Moving it to a `refresh_tokens` table is a tracked follow-up.
const refreshTokens = new Map<string, string>();

async function findUserByEmail(email: string): Promise<DbUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

router.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join("; ") });
  }
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  // Users without a password (e.g. phone/OTP accounts) cannot use this flow.
  if (!user || !user.password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Every credential is an argon2 hash — no plaintext comparison path exists.
  const isMatch = await argon2.verify(user.password, password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const accessToken = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  refreshTokens.set(refreshToken, user.id);

  return res.json({ user: sanitizeUser(user), accessToken, refreshToken });
});

router.post("/auth/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join("; ") });
  }
  const { name, email, password, role, phone, city } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const hashedPassword = await argon2.hash(password);

  const [newUser] = await db.insert(users).values({
    id: `u_${crypto.randomUUID().split("-")[0]}`,
    name,
    email,
    password: hashedPassword,
    role,
    phone,
    city,
  }).returning();

  const accessToken = jwt.sign({ sub: newUser.id, role: newUser.role, email: newUser.email }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: newUser.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  refreshTokens.set(refreshToken, newUser.id);

  return res.status(201).json({ user: sanitizeUser(newUser), accessToken, refreshToken });
});

router.post("/auth/refresh", authLimiter, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required." });

  // Detect token reuse / invalid token
  if (!refreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: "Invalid or expired refresh token." });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const userId = decoded.sub;
    
    // Invalidate old token (Rotation)
    refreshTokens.delete(refreshToken);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found." });

    const newAccessToken = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    refreshTokens.set(newRefreshToken, user.id);
    
    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired refresh token." });
  }
});

router.get("/auth/verify", requireAuth, (_req, res) => {
  return res.json({ valid: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHONE / OTP ENDPOINTS (additive — email/password + OAuth remain unchanged)
//
// KNOWN LIMITATION: account linking is out of scope. A person who signs up by
// email and later by phone gets TWO separate accounts. Unifying them is a
// deliberate future decision, not an accident. (Mirrored in the README.)
// ═══════════════════════════════════════════════════════════════════════════════

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

// POST /auth/otp/request — generate a code, store its hash, send via SMS provider.
router.post("/auth/otp/request", otpRequestLimiter, async (req, res) => {
  const parsed = otpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join("; ") });
  }
  const { phone } = parsed.data;

  // Cryptographically-strong 6-digit code, stored only as an argon2 hash.
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await argon2.hash(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.insert(otpChallenges).values({
    id: crypto.randomUUID(),
    phone,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  const provider = getOtpProvider();
  const sent = await provider.sendSms(phone, `Your SteadyNest verification code is ${code}. Valid for 5 minutes.`);
  if (!sent.ok) {
    return res.status(502).json({ error: "Couldn't send the code right now. Please tap retry." });
  }

  return res.json({
    success: true,
    expiresInSec: OTP_TTL_MS / 1000,
    // In dev (no MSG91 key) surface the code so the flow is testable without SMS.
    ...(sent.dev ? { devCode: code } : {}),
  });
});

// POST /auth/otp/verify — check the code, upsert the user, issue app JWTs.
router.post("/auth/otp/verify", authLimiter, async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join("; ") });
  }
  const { phone, code } = parsed.data;

  // Most recent unverified, unexpired challenge for this phone.
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(and(
      eq(otpChallenges.phone, phone),
      isNull(otpChallenges.verified_at),
      gt(otpChallenges.expires_at, new Date()),
    ))
    .orderBy(desc(otpChallenges.created_at))
    .limit(1);

  if (!challenge) {
    return res.status(401).json({ error: "invalid_or_expired_code" });
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ error: "too_many_attempts" });
  }

  const ok = await argon2.verify(challenge.code_hash, code);
  if (!ok) {
    await db.update(otpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(otpChallenges.id, challenge.id));
    return res.status(401).json({ error: "invalid_or_expired_code" });
  }

  // Consume the challenge so it can't be replayed.
  await db.update(otpChallenges).set({ verified_at: new Date() }).where(eq(otpChallenges.id, challenge.id));

  // Upsert the phone account. New users start with role = null and pick one next.
  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    [user] = await db.insert(users).values({
      id: `u_${crypto.randomUUID().split("-")[0]}`,
      name: "New User",
      phone,
      role: null,
    }).returning();
  }

  const accessToken = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  refreshTokens.set(refreshToken, user.id);

  return res.json({ user: sanitizeUser(user), accessToken, refreshToken, isNewUser });
});

// PATCH /auth/role — set the role after a first OTP verification, then reissue
// the access token so its `role` claim reflects the choice.
router.patch("/auth/role", requireAuth, async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join("; ") });
  }
  const userId = (req as any).userId;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.role) return res.status(409).json({ error: "Role is already set." });

  const [updated] = await db
    .update(users)
    .set({ role: parsed.data.role, role_set_at: new Date() })
    .where(eq(users.id, userId))
    .returning();

  const accessToken = jwt.sign({ sub: updated.id, role: updated.role, email: updated.email }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
  return res.json({ user: sanitizeUser(updated), accessToken });
});


export default router;
