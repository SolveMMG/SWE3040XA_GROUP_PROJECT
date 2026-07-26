/**
 * Seed script — inserts sample data for local testing.
 * Usage: npm run seed
 * WARNING: clears existing data before inserting.
 */
require('dotenv').config();
const { pool } = require('./src/config/db');

const seed = async() => {
  const client = await pool.connect();
  // eslint-disable-next-line no-console
  const log = (...a) => console.log(...a);

  try {
    await client.query('BEGIN');

    // ── Clear in reverse dependency order ────────────────────────────────────
    await client.query('DELETE FROM reviews');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM rides');
    await client.query('DELETE FROM auth_tokens');
    await client.query('DELETE FROM users');
    log('Cleared existing data.');

    // ── Users ────────────────────────────────────────────────────────────────
    const { rows: users } = await client.query(`
      INSERT INTO users (name, email, bio, role, photo_url) VALUES
        ('Jane Doe',   'jane@usiu.ac.ke',  '4th-year CS student',   'passenger', 'https://i.pravatar.cc/150?img=47'),
        ('John Kamau', 'john@usiu.ac.ke',  'Experienced driver, 3yrs', 'driver',  'https://i.pravatar.cc/150?img=12'),
        ('Alice Mwangi','alice@usiu.ac.ke','Part-time driver',        'driver',   'https://i.pravatar.cc/150?img=32'),
        ('Bob Otieno',  'bob@usiu.ac.ke',  'Daily commuter',          'passenger','https://i.pravatar.cc/150?img=60')
      RETURNING id, name, role
    `);
    log('Users:', users.map((u) => `${u.name} (${u.role})`).join(', '));

    const [jane, john, alice, bob] = users;

    // ── Rides ────────────────────────────────────────────────────────────────
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const dayAfter  = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { rows: rides } = await client.query(`
      INSERT INTO rides (driver_id, origin, destination, departure_time, seats_available, price_per_seat) VALUES
        ($1, 'CBD Kencom', 'USIU-Africa',    $3, 3, 150),
        ($1, 'Westlands',  'Karen',          $4, 2, 200),
        ($2, 'Ngong Road', 'CBD',            $3, 4, 100),
        ($2, 'Kilimani',   'Jomo Kenyatta',  $4, 1, 350)
      RETURNING id
    `, [john.id, alice.id, tomorrow, dayAfter]);
    log('Rides seeded:', rides.length);

    const [r1, r2, r3] = rides;

    // ── Bookings ─────────────────────────────────────────────────────────────
    const { rows: bookings } = await client.query(`
      INSERT INTO bookings (ride_id, passenger_id, driver_id, seats_requested, total_price, status) VALUES
        ($1, $3, $5, 1, 150,  'accepted'),
        ($2, $3, $5, 2, 400,  'pending'),
        ($1, $4, $5, 1, 150,  'declined')
      RETURNING id, status
    `, [r1.id, r2.id, jane.id, bob.id, john.id]);
    log('Bookings seeded:', bookings.length);

    const [b1] = bookings;

    // ── Payments ─────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO payments (booking_id, amount, phone, mpesa_ref, checkout_request_id, status, paid_at) VALUES
        ($1, 150, '254712345678', 'RCX12345ABC', 'ws_CO_seed_001', 'paid', NOW())
    `, [b1.id]);

    // Mark that booking as paid
    await client.query(`UPDATE bookings SET status = 'paid' WHERE id = $1`, [b1.id]);
    log('Payments seeded.');

    // ── Reviews ──────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO reviews (booking_id, reviewer_id, driver_id, rating, comment) VALUES
        ($1, $2, $3, 5, 'Great driver! Very punctual and friendly.')
    `, [b1.id, jane.id, john.id]);
    log('Reviews seeded.');

    await client.query('COMMIT');
    log('\nSeed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
