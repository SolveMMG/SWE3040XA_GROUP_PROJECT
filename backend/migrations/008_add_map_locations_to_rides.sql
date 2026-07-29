-- Migration 008: Google Maps metadata for ride endpoints
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS origin_place_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS origin_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS origin_longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS destination_place_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS destination_latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS destination_longitude NUMERIC(10, 7);

CREATE INDEX IF NOT EXISTS idx_rides_origin_location ON rides(origin_latitude, origin_longitude);
CREATE INDEX IF NOT EXISTS idx_rides_destination_location ON rides(destination_latitude, destination_longitude);
