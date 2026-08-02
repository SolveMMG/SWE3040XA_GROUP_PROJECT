-- Migration 017: add 'cancelled' to booking_status enum
-- Passenger self-cancellation is now distinct from driver rejection ('declined')
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled';
