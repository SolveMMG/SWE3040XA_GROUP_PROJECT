-- Migration 001: users table
CREATE TYPE user_role AS ENUM ('passenger', 'driver');

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255)        NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  bio        TEXT,
  role       user_role           NOT NULL DEFAULT 'passenger',
  photo_url  TEXT,
  created_at TIMESTAMPTZ         DEFAULT NOW()
);
