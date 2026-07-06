const db = require('../config/db');

const DRIVER_FIELDS = `
  r.id, r.origin, r.destination, r.departure_time, r.seats_available,
  r.price_per_seat, r.status, r.created_at,
  json_build_object(
    'id',        u.id,
    'name',      u.name,
    'photoUrl',  u.photo_url,
    'avgRating', COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0)::float,
    'rideCount', (SELECT COUNT(*) FROM rides WHERE driver_id = u.id)::int
  ) AS driver
`;

const BASE_JOIN = `
  FROM rides r
  JOIN users u        ON u.id = r.driver_id
  LEFT JOIN reviews rv ON rv.driver_id = u.id
`;

const findAll = async({ origin, destination, date, page = 1, limit = 20 }) => {
  const safeLimit = Math.min(parseInt(limit, 10), 50);
  const offset    = (parseInt(page, 10) - 1) * safeLimit;
  const conds = [];
  const vals  = [];
  let idx = 1;

  if (origin)      { conds.push(`r.origin ILIKE $${idx++}`);      vals.push(`%${origin}%`); }
  if (destination) { conds.push(`r.destination ILIKE $${idx++}`); vals.push(`%${destination}%`); }
  if (date)        { conds.push(`r.departure_time::date = $${idx++}::date`); vals.push(date); }

  // Only show active rides by default
  conds.push('r.status = \'active\'');

  const where = `WHERE ${conds.join(' AND ')}`;

  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM rides r ${where}`,
    vals,
  );
  const total = parseInt(count, 10);

  vals.push(safeLimit, offset);
  const { rows } = await db.query(
    `SELECT ${DRIVER_FIELDS} ${BASE_JOIN} ${where}
     GROUP BY r.id, u.id
     ORDER BY r.departure_time ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    vals,
  );

  return { rides: rows, total, page: parseInt(page, 10), totalPages: Math.ceil(total / safeLimit) };
};

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${DRIVER_FIELDS} ${BASE_JOIN} WHERE r.id = $1 GROUP BY r.id, u.id`,
    [id],
  );
  return rows[0] || null;
};

const create = async({ origin, destination, departureTime, seatsAvailable, pricePerSeat, driverId }) => {
  const { rows } = await db.query(
    `INSERT INTO rides (origin, destination, departure_time, seats_available, price_per_seat, driver_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [origin, destination, departureTime, seatsAvailable, pricePerSeat, driverId],
  );
  return findById(rows[0].id);
};

const update = async(id, { origin, destination, departureTime, seatsAvailable, pricePerSeat, status }) => {
  const fields = [];
  const vals   = [];
  let idx = 1;

  if (origin         !== undefined) { fields.push(`origin = $${idx++}`);          vals.push(origin); }
  if (destination    !== undefined) { fields.push(`destination = $${idx++}`);      vals.push(destination); }
  if (departureTime  !== undefined) { fields.push(`departure_time = $${idx++}`);   vals.push(departureTime); }
  if (seatsAvailable !== undefined) { fields.push(`seats_available = $${idx++}`);  vals.push(seatsAvailable); }
  if (pricePerSeat   !== undefined) { fields.push(`price_per_seat = $${idx++}`);   vals.push(pricePerSeat); }
  if (status         !== undefined) { fields.push(`status = $${idx++}::ride_status`); vals.push(status); }

  if (fields.length === 0) return findById(id);

  vals.push(id);
  await db.query(`UPDATE rides SET ${fields.join(', ')} WHERE id = $${idx}`, vals);
  return findById(id);
};

const remove = async(id) => {
  await db.query('DELETE FROM rides WHERE id = $1', [id]);
};

const isOwner = async(rideId, userId) => {
  const { rows } = await db.query(
    'SELECT id FROM rides WHERE id = $1 AND driver_id = $2',
    [rideId, userId],
  );
  return rows.length > 0;
};

module.exports = { findAll, findById, create, update, remove, isOwner };
