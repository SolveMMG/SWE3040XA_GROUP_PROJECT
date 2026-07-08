const db = require('../config/db');

// avg_rating computed from reviews (driver ratings); ride_count from rides + bookings
const COMPUTED = `
  COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0)::float AS avg_rating,
  (
    (SELECT COUNT(*) FROM rides    WHERE driver_id    = u.id) +
    (SELECT COUNT(*) FROM bookings WHERE passenger_id = u.id AND status IN ('accepted', 'paid'))
  )::int AS ride_count
`;

// DB enum uses 'passenger'; the app/frontend uses 'customer'
const toDbRole  = (r) => (r === 'customer' ? 'passenger' : r || 'passenger');
const fromDbRole = (r) => (r === 'passenger' ? 'customer' : r);

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url, u.phone, u.profile_data, u.created_at, ${COMPUTED}
     FROM users u
     LEFT JOIN reviews rv ON rv.driver_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [id],
  );
  if (!rows[0]) return null;
  return { ...rows[0], role: fromDbRole(rows[0].role) };
};

const findByEmail = async(email) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url, u.phone, u.profile_data, u.created_at, ${COMPUTED}
     FROM users u
     LEFT JOIN reviews rv ON rv.driver_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email],
  );
  if (!rows[0]) return null;
  return { ...rows[0], role: fromDbRole(rows[0].role) };
};

// Returns password_hash too — only used for login verification
const findByEmailForAuth = async(email) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.bio, u.role, u.photo_url, u.phone, u.profile_data, u.password_hash, u.created_at,
      COALESCE(ROUND(AVG(rv.rating)::numeric, 1), 0)::float AS avg_rating
     FROM users u
     LEFT JOIN reviews rv ON rv.driver_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email.trim().toLowerCase()],
  );
  if (!rows[0]) return null;
  return { ...rows[0], role: fromDbRole(rows[0].role) };
};

const create = async({ name, email, passwordHash, role, phone, profileData, photoUrl }) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, role, phone, profile_data, photo_url)
     VALUES ($1, $2, $3, $4::user_role, $5, $6, $7)
     RETURNING id, name, email, bio, role, photo_url, phone, profile_data, created_at`,
    [
      name,
      email,
      passwordHash   || null,
      toDbRole(role),
      phone          || null,
      profileData    ? JSON.stringify(profileData) : null,
      photoUrl       || null,
    ],
  );
  if (!rows[0]) return null;
  return { ...rows[0], role: fromDbRole(rows[0].role) };
};

const update = async(id, { name, bio, role, photoUrl }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name     !== undefined) { fields.push(`name = $${idx++}`);            values.push(name); }
  if (bio      !== undefined) { fields.push(`bio = $${idx++}`);             values.push(bio); }
  if (role     !== undefined) { fields.push(`role = $${idx++}::user_role`); values.push(toDbRole(role)); }
  if (photoUrl !== undefined) { fields.push(`photo_url = $${idx++}`);       values.push(photoUrl); }

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
