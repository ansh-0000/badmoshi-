import crypto from "crypto";

// ── JWT Secret ────────────────────────────────────────────────────────────────
// In production, load from process.env.JWT_SECRET
// For dev, we generate a random secret per server boot
const JWT_SECRET = process.env["JWT_SECRET"] ?? crypto.randomBytes(32).toString("hex");
const JWT_EXPIRY_SECONDS = 60 * 60 * 24; // 24 hours

interface JwtPayload {
  sub: string;       // user ID
  role: string;      // 'tenant' | 'landlord'
  email: string;
  iat: number;       // issued at (epoch seconds)
  exp: number;       // expiry (epoch seconds)
}

/**
 * Sign a JWT using HMAC-SHA256 (no external dep needed).
 */
export function signToken(userId: string, role: string, email: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    role,
    email,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = hmacSign(`${header}.${payloadB64}`);
  return `${header}.${payloadB64}.${signature}`;
}

/**
 * Verify and decode a JWT. Returns null if invalid/expired.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = hmacSign(`${header}.${payload}`);

    // Timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(signature!, expectedSig)) return null;

    const decoded = JSON.parse(base64urlDecode(payload!)) as JwtPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;

    return decoded;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): string {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}

function hmacSign(data: string): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}
