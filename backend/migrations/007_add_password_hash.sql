-- Migration 007: add password_hash for email/password auth
-- Nullable so existing Google OAuth accounts are unaffected.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
