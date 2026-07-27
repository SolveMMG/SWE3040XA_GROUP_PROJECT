-- Migration 005: reviews table (passenger reviews driver after paid booking)
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER     NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  driver_id   INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- One review per booking
  CONSTRAINT uq_review_per_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON reviews(driver_id);
