-- Migration 004: payments table (M-Pesa)
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');

CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL PRIMARY KEY,
  booking_id          INTEGER        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount              INTEGER        NOT NULL CHECK (amount >= 0),
  phone               VARCHAR(20),
  mpesa_ref           VARCHAR(100),                 -- M-Pesa transaction ID from callback
  checkout_request_id VARCHAR(100),                 -- Daraja STK push request ID
  status              payment_status NOT NULL DEFAULT 'pending',
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    DEFAULT NOW(),

  -- One payment record per booking
  CONSTRAINT uq_payment_per_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
