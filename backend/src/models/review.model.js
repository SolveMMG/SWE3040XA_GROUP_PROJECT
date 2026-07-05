const db = require('../config/db');

const create = async({ inquiryId, reviewerId, sellerId, rating, comment }) => {
  const { rows } = await db.query(
    `INSERT INTO reviews (inquiry_id, reviewer_id, seller_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, inquiry_id, reviewer_id, seller_id, rating, comment, created_at`,
    [inquiryId, reviewerId, sellerId, rating, comment],
  );
  return rows[0];
};

const findBySeller = async(sellerId) => {
  const { rows: reviewRows } = await db.query(
    `SELECT
       r.id, r.rating, r.comment, r.created_at,
       json_build_object('id', u.id, 'name', u.name, 'photoUrl', u.photo_url) AS reviewer
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.seller_id = $1
     ORDER BY r.created_at DESC`,
    [sellerId],
  );

  const { rows: aggRows } = await db.query(
    `SELECT
       COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS avg_rating,
       COUNT(*)::int AS review_count
     FROM reviews WHERE seller_id = $1`,
    [sellerId],
  );

  return {
    avgRating: aggRows[0].avg_rating,
    reviewCount: aggRows[0].review_count,
    reviews: reviewRows,
  };
};

const existsForInquiry = async(inquiryId) => {
  const { rows } = await db.query(
    'SELECT id FROM reviews WHERE inquiry_id = $1',
    [inquiryId],
  );
  return rows.length > 0;
};

module.exports = { create, findBySeller, existsForInquiry };
