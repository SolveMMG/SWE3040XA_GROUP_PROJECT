-- Migration 015: add vehicle_model and mpesa_phone to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mpesa_phone   VARCHAR(20);
