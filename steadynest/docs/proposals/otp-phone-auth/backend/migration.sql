-- migrations/xxxx_otp_auth.sql
-- Run against the existing PostgreSQL+PostGIS database. Additive only —
-- does not touch existing geo-search tables/columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(15) UNIQUE NOT NULL,       -- E.164, e.g. +919876543210
  firebase_uid      VARCHAR(128) UNIQUE,
  role              VARCHAR(10) CHECK (role IN ('tenant','landlord')),
  role_set_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at     TIMESTAMPTZ
);

-- Only needed if/when swapping off Firebase's built-in OTP handling to a
-- custom provider (MSG91/Gupshup) per the system design doc's swap-seam.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             VARCHAR(15) NOT NULL,
  code_hash         VARCHAR(255) NOT NULL,
  attempts          SMALLINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        VARCHAR(255) NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
