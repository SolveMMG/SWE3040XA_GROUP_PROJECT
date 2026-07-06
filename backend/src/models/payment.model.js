const db = require('../config/db');

const findByBookingId = async(bookingId) => {
  const { rows } = await db.query(
    `SELECT id, booking_id, amount, phone, mpesa_ref, checkout_request_id, status, paid_at, created_at
     FROM payments WHERE booking_id = $1`,
    [bookingId],
  );
  return rows[0] || null;
};

const findByCheckoutRequestId = async(checkoutRequestId) => {
  const { rows } = await db.query(
    'SELECT id, booking_id, amount, status FROM payments WHERE checkout_request_id = $1',
    [checkoutRequestId],
  );
  return rows[0] || null;
};

const create = async({ bookingId, amount, phone, checkoutRequestId }) => {
  const { rows } = await db.query(
    `INSERT INTO payments (booking_id, amount, phone, checkout_request_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, booking_id, amount, status, created_at`,
    [bookingId, amount, phone, checkoutRequestId],
  );
  return rows[0];
};

// Called from the M-Pesa Daraja callback (Person C)
const markPaid = async({ checkoutRequestId, mpesaRef }) => {
  const { rows } = await db.query(
    `UPDATE payments
     SET status = 'paid', mpesa_ref = $1, paid_at = NOW()
     WHERE checkout_request_id = $2
     RETURNING id, booking_id, amount, mpesa_ref, status, paid_at`,
    [mpesaRef, checkoutRequestId],
  );
  return rows[0] || null;
};

const markFailed = async(checkoutRequestId) => {
  await db.query(
    'UPDATE payments SET status = \'failed\' WHERE checkout_request_id = $1',
    [checkoutRequestId],
  );
};

module.exports = { findByBookingId, findByCheckoutRequestId, create, markPaid, markFailed };
