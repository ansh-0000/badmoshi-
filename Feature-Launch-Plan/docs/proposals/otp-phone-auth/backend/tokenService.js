// services/tokenService.js
//
// Issues and verifies the app's own access/refresh JWT pair, independent
// of Firebase's tokens (Firebase is only used for the initial phone/OTP
// verification handshake — everything after that is our own session).

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET must be set — never fall back to a default secret.');
}

function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET); // throws on invalid/expired
}

/**
 * Refresh tokens are opaque random strings, not JWTs — they're stored
 * hashed in Postgres so a DB leak doesn't hand out usable tokens directly
 * (same reasoning as password hashing).
 */
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

async function hashRefreshToken(token) {
  return bcrypt.hash(token, 12);
}

async function compareRefreshToken(token, hash) {
  return bcrypt.compare(token, hash);
}

function refreshTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
}

module.exports = {
  issueAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  refreshTokenExpiry,
};
