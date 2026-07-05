const db = require('../config/db');

// avg_rating and review_count are computed from the reviews table on every fetch
const PUBLIC_FIELDS = `
  u.id,
  u.name,
  u.email,
  u.bio,
  u.skills,
  u.photo_url,
  u.created_at,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float AS avg_rating,
  COUNT(r.id)::int                                       AS review_count
`;

const BASE_JOIN = `
  FROM users u
  LEFT JOIN reviews r ON r.seller_id = u.id
`;

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS} ${BASE_JOIN} WHERE u.id = $1 GROUP BY u.id`,
    [id],
  );
  return rows[0] || null;
};

const findByEmail = async(email) => {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS} ${BASE_JOIN} WHERE u.email = $1 GROUP BY u.id`,
    [email],
  );
  return rows[0] || null;
};

const create = async({ name, email, photoUrl }) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, photo_url)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, bio, skills, photo_url, created_at`,
    [name, email, photoUrl],
  );
  return rows[0];
};

const update = async(id, { name, bio, skills, photoUrl }) => {
  // Build SET clause dynamically — only update provided fields
  const fields = [];
  const values = [];
  let idx = 1;

  if (name      !== undefined) { fields.push(`name = $${idx++}`);      values.push(name); }
  if (bio       !== undefined) { fields.push(`bio = $${idx++}`);       values.push(bio); }
  if (skills    !== undefined) { fields.push(`skills = $${idx++}`);    values.push(skills); }
  if (photoUrl  !== undefined) { fields.push(`photo_url = $${idx++}`); values.push(photoUrl); }

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

module.exports = { findById, findByEmail, create, update, remove };
