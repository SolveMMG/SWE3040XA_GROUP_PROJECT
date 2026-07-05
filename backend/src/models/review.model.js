const db = require('../config/db');

const create = async({ bookingId, reviewerId, driverId, rating, comment }) => {
  const { rows } = await db.query(
    `INSERT INTO reviews (booking_id, reviewer_id, driver_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, booking_id, reviewer_id, driver_id, rating, comment, created_at`,
    [bookingId, reviewerId, driverId, rating, comment],
  );
  return rows[0];
};

const findByDriver = async(driverId) => {
  const { rows: reviewRows } = await db.query(
    `SELECT
       r.id, r.rating, r.comment, r.created_at,
       json_build_object('id', u.id, 'name', u.name, 'photoUrl', u.photo_url) AS reviewer
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.driver_id = $1
     ORDER BY r.created_at DESC`,
    [driverId],
  );

  const { rows: [agg] } = await db.query(
    `SELECT
       COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS avg_rating,
       COUNT(*)::int AS review_count
     FROM reviews WHERE driver_id = $1`,
    [driverId],
  );

  return { avgRating: agg.avg_rating, reviewCount: agg.review_count, reviews: reviewRows };
};

const existsForBooking = async(bookingId) => {
  const { rows } = await db.query(
    'SELECT id FROM reviews WHERE booking_id = $1',
    [bookingId],
  );
  return rows.length > 0;
};

module.exports = { create, findByDriver, existsForBooking };
