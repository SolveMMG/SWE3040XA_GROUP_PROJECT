-- Migration 004: reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  inquiry_id  INTEGER     NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  reviewer_id INTEGER     NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  seller_id   INTEGER     NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- One review per inquiry
  CONSTRAINT uq_review_per_inquiry UNIQUE (inquiry_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON reviews(seller_id);
