// routes/auth.js
//
// Node/Express routes for the OTP auth flow. This file assumes the
// client-side OTP request/verify against Firebase already happened (see
// otp-auth-frontend-firebase.ts) — this backend's job is: verify the
// Firebase ID token, upsert the user in Postgres, and issue our own
// access/refresh JWT pair. Refresh and role endpoints are session
// management after that point.

const express = require('express');
const admin = require('firebase-admin');
const {
  issueAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  refreshTokenExpiry,
} = require('../services/tokenService');
const {
  otpRequestLimiter,
  otpRequestIpLimiter,
  otpVerifyLimiter,
} = require('../middleware/rateLimiter');

module.exports = function createAuthRouter(pool) {
  const router = express.Router();

  // ---------------------------------------------------------------------
  // POST /auth/otp/request
  //
  // Present for API-contract completeness and for the future swap to an
  // India-native SMS provider (MSG91/Gupshup) discussed in the system
  // design doc. With the Firebase client SDK path (@react-native-firebase/
  // auth), OTP dispatch actually happens client-side via
  // auth().signInWithPhoneNumber(), so this endpoint currently just
  // validates and rate-limits — it does not itself send an SMS.
  // ---------------------------------------------------------------------
  router.post('/otp/request', otpRequestIpLimiter, otpRequestLimiter, (req, res) => {
    const { phone } = req.body;
    if (!/^\+91\d{10}$/.test(phone ?? '')) {
      return res.status(400).json({ error: 'invalid_phone_format' });
    }
    // Firebase handles the actual OTP send client-side in this architecture.
    // If/when swapped to a custom SMS provider, generate + hash + store the
    // OTP here and send it via the provider (see otp_challenges table in
    // the system design doc).
    return res.status(200).json({ requestId: null, expiresInSec: 300 });
  });

  // ---------------------------------------------------------------------
  // POST /auth/otp/verify
  //
  // Body: { firebaseIdToken }
  // Verifies the Firebase ID token, upserts the user, issues app tokens.
  // ---------------------------------------------------------------------
  router.post('/otp/verify', otpVerifyLimiter, async (req, res) => {
    const { firebaseIdToken } = req.body;
    if (!firebaseIdToken) {
      return res.status(400).json({ error: 'missing_firebase_id_token' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (err) {
      return res.status(401).json({ error: 'invalid_or_expired_code' });
    }

    const phone = decoded.phone_number;
    const firebaseUid = decoded.uid;
    if (!phone) {
      return res.status(401).json({ error: 'token_missing_phone_number' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id, phone, role, firebase_uid FROM users WHERE phone = $1 OR firebase_uid = $2',
        [phone, firebaseUid]
      );

      let user;
      let isNewUser = false;

      if (existing.rows.length > 0) {
        user = existing.rows[0];
        await client.query(
          'UPDATE users SET firebase_uid = $1, last_login_at = now() WHERE id = $2',
          [firebaseUid, user.id]
        );
      } else {
        isNewUser = true;
        const inserted = await client.query(
          `INSERT INTO users (phone, firebase_uid, last_login_at)
           VALUES ($1, $2, now())
           RETURNING id, phone, role, firebase_uid`,
          [phone, firebaseUid]
        );
        user = inserted.rows[0];
      }

      const accessToken = issueAccessToken(user);
      const refreshToken = generateRefreshToken();
      const refreshTokenHash = await hashRefreshToken(refreshToken);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshTokenHash, refreshTokenExpiry()]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          isNewUser,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      // Don't leak internals to the client, but do log server-side —
      // this is exactly the kind of failure worth alerting on (see
      // system design doc, Monitoring and alerting).
      console.error('otp_verify_failed', { error: err.message, phone });
      return res.status(500).json({ error: 'internal_error' });
    } finally {
      client.release();
    }
  });

  // ---------------------------------------------------------------------
  // POST /auth/token/refresh
  // Body: { refreshToken }
  // ---------------------------------------------------------------------
  router.post('/token/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'missing_refresh_token' });
    }

    const client = await pool.connect();
    try {
      // We don't index refresh tokens by their plaintext value (they're
      // hashed at rest), so look up candidates by recency and compare —
      // fine at this scale; revisit if refresh volume grows large enough
      // to matter, e.g. by storing a non-secret lookup prefix alongside
      // the hash.
      const candidates = await client.query(
        `SELECT id, user_id, token_hash, expires_at, revoked_at
         FROM refresh_tokens
         WHERE expires_at > now()
         ORDER BY created_at DESC
         LIMIT 500`
      );

      let matched = null;
      for (const row of candidates.rows) {
        // eslint-disable-next-line no-await-in-loop
        if (await compareRefreshToken(refreshToken, row.token_hash)) {
          matched = row;
          break;
        }
      }

      if (!matched) {
        return res.status(401).json({ error: 'invalid_refresh_token' });
      }

      if (matched.revoked_at) {
        // Reuse of a revoked token is a possible theft signal — revoke
        // everything for this user and force full re-login.
        await client.query(
          'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
          [matched.user_id]
        );
        return res.status(401).json({ error: 'invalid_refresh_token' });
      }

      const userResult = await client.query(
        'SELECT id, role FROM users WHERE id = $1',
        [matched.user_id]
      );
      const user = userResult.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'invalid_refresh_token' });
      }

      const accessToken = issueAccessToken(user);
      return res.status(200).json({ accessToken });
    } catch (err) {
      console.error('token_refresh_failed', { error: err.message });
      return res.status(500).json({ error: 'internal_error' });
    } finally {
      client.release();
    }
  });

  // ---------------------------------------------------------------------
  // POST /auth/role
  // Body: { role: 'tenant' | 'landlord' }
  // Requires Authorization: Bearer <accessToken>
  // ---------------------------------------------------------------------
  router.post('/role', async (req, res) => {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'missing_access_token' });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ error: 'invalid_or_expired_access_token' });
    }

    const { role } = req.body;
    if (!['tenant', 'landlord'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE users SET role = $1, role_set_at = now()
         WHERE id = $2
         RETURNING id, phone, role`,
        [role, payload.sub]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'user_not_found' });
      }
      return res.status(200).json({ user: result.rows[0] });
    } catch (err) {
      console.error('set_role_failed', { error: err.message });
      return res.status(500).json({ error: 'internal_error' });
    } finally {
      client.release();
    }
  });

  return router;
};
