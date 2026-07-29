-- Migration 007: saved map sites
CREATE TABLE IF NOT EXISTS sites (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  address    TEXT         NOT NULL,
  place_id   VARCHAR(255),
  latitude   NUMERIC(10, 7) NOT NULL,
  longitude  NUMERIC(10, 7) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_place_id ON sites(place_id);
CREATE INDEX IF NOT EXISTS idx_sites_location ON sites(latitude, longitude);
