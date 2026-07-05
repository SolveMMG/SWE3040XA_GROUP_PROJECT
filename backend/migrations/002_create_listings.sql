-- Migration 002: listings table
CREATE TYPE listing_category AS ENUM (
  'design', 'programming', 'writing', 'tutoring', 'music', 'photography', 'other'
);

CREATE TABLE IF NOT EXISTS listings (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255)     NOT NULL,
  description TEXT             NOT NULL,
  category    listing_category NOT NULL,
  price       INTEGER          NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  seller_id   INTEGER          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ      DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category  ON listings(category);
