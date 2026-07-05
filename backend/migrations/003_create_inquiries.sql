-- Migration 003: inquiries table
CREATE TYPE inquiry_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE IF NOT EXISTS inquiries (
  id         SERIAL PRIMARY KEY,
  listing_id INTEGER        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id   INTEGER        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  seller_id  INTEGER        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  message    TEXT           NOT NULL,
  status     inquiry_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ    DEFAULT NOW(),

  -- A buyer can only send one inquiry per listing
  CONSTRAINT uq_inquiry_buyer_listing UNIQUE (buyer_id, listing_id),
  -- Buyer cannot inquire on their own listing (enforced in app layer too)
  CONSTRAINT chk_buyer_not_seller CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_id  ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_seller_id ON inquiries(seller_id);
