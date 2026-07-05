-- Migration 001: users table
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255)        NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  bio        TEXT,
  skills     TEXT[]              DEFAULT '{}',
  photo_url  TEXT,
  created_at TIMESTAMPTZ         DEFAULT NOW()
);
