const db = require('../config/db');

// avg_rating computed from reviews (driver ratings); ride_count from rides + bookings
const COMPUTED = `
  COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0)::float AS avg_rating,
  (
    (SELECT COUNT(*) FROM rides    WHERE driver_id    = u.id) +
    (SELECT COUNT(*) FROM bookings WHERE passenger_id = u.id AND status IN ('accepted', 'paid'))
  )::int AS ride_count
`;

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url, u.is_approved, u.created_at,
            u.car_type, u.vehicle_model, u.license_plate, u.license_number, u.mpesa_phone, ${COMPUTED}
     FROM users u
     LEFT JOIN reviews rv ON rv.driver_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [id],
  );
  return rows[0] || null;
};

const findByEmail = async(email) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url, u.is_approved, u.created_at, ${COMPUTED}
     FROM users u
     LEFT JOIN reviews rv ON rv.driver_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email],
  );
  return rows[0] || null;
};

const create = async({ name, email, photoUrl, passwordHash, isApproved = true }) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, photo_url, password_hash, is_approved)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, bio, role, photo_url, created_at`,
    [name, email, photoUrl, passwordHash || null, isApproved],
  );
  return rows[0];
};

const findAuthByEmail = async(email) => {
  const { rows } = await db.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email],
  );
  return rows[0] || null;
};

const update = async(id, { name, bio, role, photoUrl, vehicleModel, licensePlate, mpesaPhone }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name         !== undefined) { fields.push(`name = $${idx++}`);            values.push(name); }
  if (bio          !== undefined) { fields.push(`bio = $${idx++}`);             values.push(bio); }
  if (role         !== undefined) { fields.push(`role = $${idx++}::user_role`); values.push(role); }
  if (photoUrl     !== undefined) { fields.push(`photo_url = $${idx++}`);       values.push(photoUrl); }
  if (vehicleModel !== undefined) { fields.push(`vehicle_model = $${idx++}`);   values.push(vehicleModel); }
  if (licensePlate !== undefined) { fields.push(`license_plate = $${idx++}`);   values.push(licensePlate); }
  if (mpesaPhone   !== undefined) { fields.push(`mpesa_phone = $${idx++}`);     values.push(mpesaPhone); }

  if (fields.length === 0) return findById(id);

  values.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id`,
    values,
  );
  return rows[0] ? findById(rows[0].id) : null;
};

const remove = async(id) => {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
};

const saveFcmToken = async(id, token) => {
  await db.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [token, id]);
};

const getFcmToken = async(id) => {
  const { rows } = await db.query('SELECT fcm_token FROM users WHERE id = $1', [id]);
  return rows[0]?.fcm_token || null;
};

module.exports = { findById, findByEmail, findAuthByEmail, create, update, remove, saveFcmToken, getFcmToken };
