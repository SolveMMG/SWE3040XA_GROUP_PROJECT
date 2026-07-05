const db = require('../config/db');

const BOOKING_FIELDS = `
  b.id, b.seats_requested, b.total_price, b.status, b.created_at,
  json_build_object('id', r.id, 'origin', r.origin, 'destination', r.destination) AS ride,
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

const create = async({ rideId, passengerId, driverId, seatsRequested, totalPrice }) => {
  const { rows } = await db.query(
    `INSERT INTO bookings (ride_id, passenger_id, driver_id, seats_requested, total_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [rideId, passengerId, driverId, seatsRequested, totalPrice],
  );
  return findById(rows[0].id);
};

const updateStatus = async(id, status) => {
  await db.query(
    `UPDATE bookings SET status = $1::booking_status WHERE id = $2`,
    [status, id],
  );
  return findById(id);
};

// Check if a passenger has a paid booking with a driver (for review eligibility)
const hasPaid = async({ passengerId, driverId }) => {
  const { rows } = await db.query(
    `SELECT id FROM bookings
     WHERE passenger_id = $1 AND driver_id = $2 AND status = 'paid'
     LIMIT 1`,
    [passengerId, driverId],
  );
  return rows[0] || null;
};

module.exports = { findById, findByUser, create, updateStatus, hasPaid };
