-- Migration 012: Add refunded status to payment and booking enums
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'refunded';

