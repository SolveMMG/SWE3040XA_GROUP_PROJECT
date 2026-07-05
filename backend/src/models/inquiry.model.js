const db = require('../config/db');

const INQUIRY_FIELDS = `
  i.id, i.message, i.status, i.created_at,
  json_build_object('id', l.id, 'title', l.title) AS listing,
  json_build_object('id', b.id, 'name', b.name)   AS buyer,
  json_build_object('id', s.id, 'name', s.name)   AS seller
`;

const BASE_JOIN = `
  FROM inquiries i
  JOIN listings l ON l.id = i.listing_id
  JOIN users b    ON b.id = i.buyer_id
  JOIN users s    ON s.id = i.seller_id
`;

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${INQUIRY_FIELDS} ${BASE_JOIN} WHERE i.id = $1`,
    [id],
  );
  return rows[0] || null;
};

const findByUser = async({ userId, role, status }) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (role === 'sent')     { conditions.push(`i.buyer_id  = $${idx++}`); values.push(userId); }
  if (role === 'received') { conditions.push(`i.seller_id = $${idx++}`); values.push(userId); }
  if (status)              { conditions.push(`i.status    = $${idx++}::inquiry_status`); values.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT ${INQUIRY_FIELDS} ${BASE_JOIN} ${where} ORDER BY i.created_at DESC`,
    values,
  );
  return rows;
};

const create = async({ listingId, buyerId, sellerId, message }) => {
  const { rows } = await db.query(
    `INSERT INTO inquiries (listing_id, buyer_id, seller_id, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [listingId, buyerId, sellerId, message],
  );
  return findById(rows[0].id);
};

const updateStatus = async(id, status) => {
  await db.query(
    `UPDATE inquiries SET status = $1::inquiry_status WHERE id = $2`,
    [status, id],
  );
  return findById(id);
};

// Check if buyer has an accepted inquiry with a seller (needed for review eligibility)
const hasAccepted = async({ buyerId, sellerId }) => {
  const { rows } = await db.query(
    `SELECT id FROM inquiries
     WHERE buyer_id = $1 AND seller_id = $2 AND status = 'accepted'
     LIMIT 1`,
    [buyerId, sellerId],
  );
  return rows[0] || null;
};

module.exports = { findById, findByUser, create, updateStatus, hasAccepted };
