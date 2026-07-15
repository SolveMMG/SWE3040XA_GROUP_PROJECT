-- Migration 008: driver vehicle / licence details
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS car_type       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS license_plate  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
