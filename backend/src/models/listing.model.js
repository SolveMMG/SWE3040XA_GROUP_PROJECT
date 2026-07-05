const db = require('../config/db');

const SELLER_FIELDS = `
  l.id, l.title, l.description, l.category, l.price, l.image_url, l.created_at,
  json_build_object(
    'id',        u.id,
    'name',      u.name,
    'photoUrl',  u.photo_url,
    'avgRating', COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float,
    'reviewCount', COUNT(r.id)::int
  ) AS seller
`;

const BASE_JOIN = `
  FROM listings l
  JOIN users u ON u.id = l.seller_id
  LEFT JOIN reviews r ON r.seller_id = u.id
`;

const findAll = async({ search, category, page = 1, limit = 20 }) => {
  const safeLimit = Math.min(parseInt(limit, 10), 50);
  const offset = (parseInt(page, 10) - 1) * safeLimit;
  const conditions = [];
  const values = [];
  let idx = 1;

  if (search) {
    conditions.push(`(l.title ILIKE $${idx} OR l.description ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (category) {
    conditions.push(`l.category = $${idx++}::listing_category`);
    values.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db.query(
    `SELECT COUNT(*) FROM listings l ${where}`,
    values,
  );
  const total = parseInt(countRes.rows[0].count, 10);

  values.push(safeLimit, offset);
  const { rows } = await db.query(
    `SELECT ${SELLER_FIELDS} ${BASE_JOIN} ${where}
     GROUP BY l.id, u.id
     ORDER BY l.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    values,
  );

  return { listings: rows, total, page: parseInt(page, 10), totalPages: Math.ceil(total / safeLimit) };
};

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${SELLER_FIELDS} ${BASE_JOIN} WHERE l.id = $1 GROUP BY l.id, u.id`,
    [id],
  );
  return rows[0] || null;
};

const create = async({ title, description, category, price, imageUrl, sellerId }) => {
  const { rows } = await db.query(
    `INSERT INTO listings (title, description, category, price, image_url, seller_id)
     VALUES ($1, $2, $3::listing_category, $4, $5, $6)
     RETURNING id`,
    [title, description, category, price, imageUrl, sellerId],
  );
  return findById(rows[0].id);
};

const update = async(id, { title, description, category, price, imageUrl }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (title       !== undefined) { fields.push(`title = $${idx++}`);       values.push(title); }
  if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
  if (category    !== undefined) { fields.push(`category = $${idx++}::listing_category`); values.push(category); }
  if (price       !== undefined) { fields.push(`price = $${idx++}`);       values.push(price); }
  if (imageUrl    !== undefined) { fields.push(`image_url = $${idx++}`);   values.push(imageUrl); }

  if (fields.length === 0) return findById(id);

  values.push(id);
  await db.query(`UPDATE listings SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  return findById(id);
};

const remove = async(id) => {
  await db.query('DELETE FROM listings WHERE id = $1', [id]);
};

const isOwner = async(listingId, userId) => {
  const { rows } = await db.query(
    'SELECT id FROM listings WHERE id = $1 AND seller_id = $2',
    [listingId, userId],
  );
  return rows.length > 0;
};

module.exports = { findAll, findById, create, update, remove, isOwner };
