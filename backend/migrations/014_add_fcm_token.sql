-- Migration 014: store FCM device token per user for push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
