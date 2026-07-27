-- Migration 003: bookings table
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'declined', 'paid');

CREATE TABLE IF NOT EXISTS bookings (
  id               SERIAL PRIMARY KEY,
  ride_id          INTEGER        NOT NULL REFERENCES rides(id)   ON DELETE CASCADE,
  passenger_id     INTEGER        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  driver_id        INTEGER        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  seats_requested  INTEGER        NOT NULL CHECK (seats_requested >= 1),
  total_price      INTEGER        NOT NULL CHECK (total_price >= 0),
  status           booking_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ    DEFAULT NOW(),

  -- One booking per passenger per ride
  CONSTRAINT uq_booking_passenger_ride UNIQUE (passenger_id, ride_id),
  -- Passenger cannot book their own ride
  CONSTRAINT chk_passenger_not_driver CHECK (passenger_id <> driver_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_ride_id      ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_id ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id    ON bookings(driver_id);
