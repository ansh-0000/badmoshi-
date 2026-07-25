// lib/api.ts
// Thin client for the auth exchange + refresh endpoints. Kept separate
// from firebase.ts so the backend contract is easy to find and change
// independently of the Firebase SDK calls.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.steadynest.app';

export interface AuthUser {
  id: string;
  phone: string;
  role: 'tenant' | 'landlord' | null;
  isNewUser: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error ?? `Request failed with status ${res.status}`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * Exchanges a Firebase ID token (obtained after client-side OTP
 * confirmation) for our own app session tokens. This is the point where
 * the user row gets created/updated in Postgres.
 */
export async function exchangeFirebaseToken(firebaseIdToken: string): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseIdToken }),
  });
  return parseJsonOrThrow(res);
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return parseJsonOrThrow(res);
}

export async function setUserRole(
  accessToken: string,
  role: 'tenant' | 'landlord'
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/auth/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ role }),
  });
  return parseJsonOrThrow(res);
}
