const db = require('../config/db');

const BOOKING_FIELDS = `
  b.id, b.seats_requested, b.total_price, b.status, b.created_at,
  json_build_object(
    'id', r.id,
    'origin', r.origin,
    'destination', r.destination,
    'seatsAvailable', r.seats_available
  ) AS ride,
  json_build_object('id', p.id, 'name', p.name) AS passenger,
  json_build_object('id', d.id, 'name', d.name) AS driver
`;

const BASE_JOIN = `
  FROM bookings b
  JOIN rides r ON r.id = b.ride_id
  JOIN users p ON p.id = b.passenger_id
  JOIN users d ON d.id = b.driver_id
`;

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${BOOKING_FIELDS} ${BASE_JOIN} WHERE b.id = $1`,
    [id],
  );
  return rows[0] || null;
};

const findByUser = async({ userId, role, status }) => {
  const conds = [];
  const vals  = [];
  let idx = 1;

  if (role === 'sent')     { conds.push(`b.passenger_id = $${idx++}`); vals.push(userId); }
  if (role === 'received') { conds.push(`b.driver_id    = $${idx++}`); vals.push(userId); }
  if (status)              { conds.push(`b.status = $${idx++}::booking_status`); vals.push(status); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT ${BOOKING_FIELDS} ${BASE_JOIN} ${where} ORDER BY b.created_at DESC`,
    vals,
  );
  return rows;
};

const findByPassengerAndRide = async(passengerId, rideId) => {
  const { rows } = await db.query(
    `SELECT ${BOOKING_FIELDS} ${BASE_JOIN} WHERE b.passenger_id = $1 AND b.ride_id = $2 ORDER BY b.created_at DESC LIMIT 1`,
    [passengerId, rideId],
  );
  return rows[0] || null;
};

const create = async({ rideId, passengerId, driverId, seatsRequested, totalPrice }) => {
  const { rows } = await db.query(
    `INSERT INTO bookings (ride_id, passenger_id, driver_id, seats_requested, total_price, status)
     VALUES ($1, $2, $3, $4, $5, 'accepted')
     ON CONFLICT (passenger_id, ride_id)
     DO UPDATE SET total_price = EXCLUDED.total_price, status = 'accepted'::booking_status
     RETURNING id`,
    [rideId, passengerId, driverId, seatsRequested, totalPrice],
  );
  return findById(rows[0].id);
};

const updateStatus = async(id, status) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT b.id, b.status, b.seats_requested, b.ride_id, r.seats_available
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       WHERE b.id = $1
       FOR UPDATE OF b, r`,
      [id],
    );
    const booking = rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      return null;
    }

    if (status === 'accepted' && booking.status !== 'accepted') {
      if (booking.seats_available < booking.seats_requested) {
        const err = new Error('Not enough seats available');
        err.status = 409;
        err.code = 'NOT_ENOUGH_SEATS';
        throw err;
      }
      await client.query(
        'UPDATE rides SET seats_available = seats_available - $1 WHERE id = $2',
        [booking.seats_requested, booking.ride_id],
      );
    }

    if (status === 'declined' && booking.status === 'accepted') {
      await client.query(
        'UPDATE rides SET seats_available = seats_available + $1 WHERE id = $2',
        [booking.seats_requested, booking.ride_id],
      );
    }

    await client.query(
      'UPDATE bookings SET status = $1::booking_status WHERE id = $2',
      [status, id],
    );
    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const markPaid = async(id) => updateStatus(id, 'paid');

/**
 * Directly resets a paid/refunded booking back to 'accepted' status
 * so the passenger can pay again. Does NOT modify ride seat counts
 * (seats were already decremented on accept and should stay that way
 *  so the flow can be looped for testing).
 */
const resetToAccepted = async(id) => {
  const { rows } = await db.query(
    'UPDATE bookings SET status = \'accepted\' WHERE id = $1 RETURNING id, status',
    [id],
  );
  return rows[0] || null;
};

const hasPaid = async({ passengerId, driverId }) => {
  const { rows } = await db.query(
    `SELECT id FROM bookings
     WHERE passenger_id = $1 AND driver_id = $2 AND status = 'paid'
     LIMIT 1`,
    [passengerId, driverId],
  );
  return rows[0] || null;
};

module.exports = { findById, findByUser, findByPassengerAndRide, create, updateStatus, markPaid, resetToAccepted, hasPaid };
