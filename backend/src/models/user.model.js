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
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url,
            u.car_type, u.license_plate, u.license_number, u.created_at, ${COMPUTED}
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
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url, u.created_at, ${COMPUTED}
     FROM users u
     LEFT JOIN reviews rv ON rv.driver_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email],
  );
  return rows[0] || null;
};

const create = async({ name, email, photoUrl, passwordHash, role = 'passenger', carType, licensePlate, licenseNumber }) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, photo_url, password_hash, role, car_type, license_plate, license_number)
     VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, $8)
     RETURNING id, name, email, bio, role, photo_url, car_type, license_plate, license_number, created_at`,
    [name, email, photoUrl || null, passwordHash || null, role, carType || null, licensePlate || null, licenseNumber || null],
  );
  return rows[0];
};

const findByEmailForAuth = async(email) => {
  const { rows } = await db.query(
    `SELECT id, name, email, bio, role, photo_url, password_hash, created_at FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
};

const update = async(id, { name, bio, role, photoUrl, carType, licensePlate, licenseNumber }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name          !== undefined) { fields.push(`name = $${idx++}`);            values.push(name); }
  if (bio           !== undefined) { fields.push(`bio = $${idx++}`);             values.push(bio); }
  if (role          !== undefined) { fields.push(`role = $${idx++}::user_role`); values.push(role); }
  if (photoUrl      !== undefined) { fields.push(`photo_url = $${idx++}`);       values.push(photoUrl); }
  if (carType       !== undefined) { fields.push(`car_type = $${idx++}`);        values.push(carType); }
  if (licensePlate  !== undefined) { fields.push(`license_plate = $${idx++}`);   values.push(licensePlate); }
  if (licenseNumber !== undefined) { fields.push(`license_number = $${idx++}`);  values.push(licenseNumber); }

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

module.exports = { findById, findByEmail, findByEmailForAuth, create, update, remove };
