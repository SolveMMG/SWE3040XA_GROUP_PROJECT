-- Migration 016: Remove seeded fake drivers and rides (from 013_seed_rides.sql)
-- Only deletes the seeded test data; real user-created data is untouched.
DELETE FROM bookings WHERE ride_id IN (SELECT id FROM rides WHERE driver_id BETWEEN 101 AND 115);
DELETE FROM rides    WHERE driver_id BETWEEN 101 AND 115;
DELETE FROM users    WHERE id BETWEEN 101 AND 115;
