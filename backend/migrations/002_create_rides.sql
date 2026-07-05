-- Migration 002: rides table
CREATE TYPE ride_status AS ENUM ('active', 'completed');

CREATE TABLE IF NOT EXISTS rides (
  id               SERIAL PRIMARY KEY,
  origin           VARCHAR(255) NOT NULL,
  destination      VARCHAR(255) NOT NULL,
  departure_time   TIMESTAMPTZ  NOT NULL,
  seats_available  INTEGER      NOT NULL CHECK (seats_available >= 0),
  price_per_seat   INTEGER      NOT NULL CHECK (price_per_seat >= 0),
  status           ride_status  NOT NULL DEFAULT 'active',
  driver_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_driver_id      ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_status         ON rides(status);
