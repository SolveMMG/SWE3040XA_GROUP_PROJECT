-- Migration 013: Seed authentic Kenyan drivers stationed across Nairobi (including Roysambu)

-- Clean existing sample seed data
DELETE FROM rides WHERE id >= 1000 AND id <= 1030;
DELETE FROM users WHERE id >= 101 AND id <= 115;

-- Seed Kenyan driver users
INSERT INTO users (id, name, email, bio, role, photo_url, is_approved)
VALUES
(101, 'Wanjiku Kamau', 'wanjiku.kamau@rideloop.co.ke', 'Westlands & Parklands driver. Clean hybrid sedan.', 'driver', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', TRUE),
(102, 'Brian Ochieng', 'brian.ochieng@rideloop.co.ke', 'Kilimani & Yaya Centre express shuttle. Spacious vehicle.', 'driver', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', TRUE),
(103, 'Amina Hassan', 'amina.hassan@rideloop.co.ke', 'Upper Hill & Gigiri UN precinct driver.', 'driver', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', TRUE),
(104, 'Kevin Kiprop', 'kevin.kiprop@rideloop.co.ke', 'Thika Road & Kasarani express driver.', 'driver', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', TRUE),
(105, 'Faith Njeri', 'faith.njeri@rideloop.co.ke', 'Lavington & Kileleshwa resident driver.', 'driver', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200', TRUE),
(106, 'Daniel Mutua', 'daniel.mutua@rideloop.co.ke', 'CBD Town & City Hall Way driver.', 'driver', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200', TRUE),
(107, 'Grace Wambui', 'grace.wambui@rideloop.co.ke', 'Ruaka & Two Rivers Mall driver.', 'driver', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', TRUE),
(108, 'Joseph Omwamba', 'joseph.omwamba@rideloop.co.ke', 'Karen & Langata suburb driver.', 'driver', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200', TRUE),
(109, 'Samuel Njuguna', 'samuel.njuguna@rideloop.co.ke', 'Roysambu & Mirema Drive driver. Available across Kenya.', 'driver', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Seed active available drivers stationed across Nairobi
-- Fares dynamically computed based on 5 KSh per 1 Km
INSERT INTO rides (
  id, origin, destination, departure_time, seats_available, price_per_seat, status, driver_id,
  origin_place_id, origin_latitude, origin_longitude,
  destination_place_id, destination_latitude, destination_longitude
)
VALUES
-- 1. Roysambu (Samuel Njuguna)
(
  1009,
  'Roysambu, Mirema Drive',
  'Anywhere in Kenya',
  NOW() + INTERVAL '10 minutes',
  4, 5, 'active', 109,
  'ChIJ...RoysambuMirema', -1.218000, 36.887000,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 2. Westlands (Wanjiku Kamau)
(
  1001,
  'Westlands, Sarit Centre',
  'Anywhere in Kenya',
  NOW() + INTERVAL '15 minutes',
  3, 5, 'active', 101,
  'ChIJ...WestlandsSarit', -1.267328, 36.811566,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 3. Kilimani (Brian Ochieng)
(
  1002,
  'Kilimani, Yaya Centre',
  'Anywhere in Kenya',
  NOW() + INTERVAL '20 minutes',
  3, 5, 'active', 102,
  'ChIJ...KilimaniYaya', -1.290234, 36.782845,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 4. Nairobi CBD (Daniel Mutua)
(
  1003,
  'Nairobi CBD, KICC',
  'Anywhere in Kenya',
  NOW() + INTERVAL '5 minutes',
  4, 5, 'active', 106,
  'ChIJ...KICCCBD', -1.288200, 36.822800,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 5. Upper Hill (Amina Hassan)
(
  1004,
  'Upper Hill, Hospital Road',
  'Anywhere in Kenya',
  NOW() + INTERVAL '25 minutes',
  3, 5, 'active', 103,
  'ChIJ...UpperHill', -1.298500, 36.814600,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 6. Lavington (Faith Njeri)
(
  1005,
  'Lavington Mall, James Gichuru',
  'Anywhere in Kenya',
  NOW() + INTERVAL '30 minutes',
  3, 5, 'active', 105,
  'ChIJ...LavingtonMall', -1.278500, 36.768600,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 7. Karen (Joseph Omwamba)
(
  1006,
  'Karen Shopping Centre',
  'Anywhere in Kenya',
  NOW() + INTERVAL '40 minutes',
  2, 5, 'active', 108,
  'ChIJ...KarenShoppingCentre', -1.320000, 36.708000,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 8. Gigiri (Amina Hassan)
(
  1007,
  'Gigiri, UN Avenue',
  'Anywhere in Kenya',
  NOW() + INTERVAL '35 minutes',
  4, 5, 'active', 103,
  'ChIJ...GigiriUN', -1.233000, 36.804000,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 9. Kasarani (Kevin Kiprop)
(
  1008,
  'Thika Road, Garden City Mall',
  'Anywhere in Kenya',
  NOW() + INTERVAL '12 minutes',
  3, 5, 'active', 104,
  'ChIJ...GardenCity', -1.232500, 36.878300,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 10. Ruaka (Grace Wambui)
(
  1010,
  'Ruaka, Two Rivers Mall',
  'Anywhere in Kenya',
  NOW() + INTERVAL '18 minutes',
  3, 5, 'active', 107,
  'ChIJ...TwoRiversRuaka', -1.211000, 36.790000,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
),
-- 11. Parklands (Wanjiku Kamau)
(
  1011,
  'Parklands, Diamond Plaza',
  'Anywhere in Kenya',
  NOW() + INTERVAL '15 minutes',
  4, 5, 'active', 101,
  'ChIJ...DiamondPlazaParklands', -1.260000, 36.820000,
  'ChIJ...AnywhereKenya', -1.286389, 36.817223
)
ON CONFLICT (id) DO NOTHING;

-- Seed default saved sites in Nairobi
INSERT INTO sites (name, address, place_id, latitude, longitude, created_by)
VALUES
('Roysambu / Mirema Drive', 'Roysambu, Off Thika Road, Nairobi', 'ChIJ...RoysambuMirema', -1.218000, 36.887000, 109),
('Sarit Centre - Westlands', 'Sarit Centre, Karuna Rd, Westlands, Nairobi', 'ChIJ...WestlandsSarit', -1.267328, 36.811566, 101),
('Yaya Centre - Kilimani', 'Yaya Centre, Argwings Kodhek Rd, Kilimani, Nairobi', 'ChIJ...KilimaniYaya', -1.290234, 36.782845, 101),
('JKIA Airport Terminal 1D', 'Jomo Kenyatta International Airport, Nairobi', 'ChIJ...JKIAAirport', -1.319167, 36.927500, 102),
('KICC / CBD Center', 'KICC, Harambee Avenue, Nairobi CBD', 'ChIJ...KICCCBD', -1.288200, 36.822800, 106),
('Two Rivers Mall - Ruaka', 'Two Rivers Mall, Limuru Road, Ruaka', 'ChIJ...TwoRiversRuaka', -1.211000, 36.790000, 107)
ON CONFLICT DO NOTHING;

-- Reset identity sequences
SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST(200, (SELECT MAX(id) FROM users)));
SELECT setval(pg_get_serial_sequence('rides', 'id'), GREATEST(1100, (SELECT MAX(id) FROM rides)));
