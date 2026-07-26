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
  const { rows } = await db.query(
    `UPDATE payments
     SET status = 'failed'
     WHERE checkout_request_id = $1
     RETURNING id, booking_id, amount, status`,
    [checkoutRequestId],
  );
  return rows[0] || null;
};

const markRefunded = async(checkoutRequestId) => {
  const { rows } = await db.query(
    `UPDATE payments
     SET status = 'refunded', mpesa_ref = NULL
     WHERE checkout_request_id = $1
     RETURNING id, booking_id, amount, status`,
    [checkoutRequestId],
  );
  return rows[0] || null;
};

/**
 * Resets a refunded payment back to 'pending' with a new checkout_request_id
 * so the passenger can initiate a new STK push for the same booking.
 */
const resetForRepayment = async({ bookingId, checkoutRequestId, phone }) => {
  const { rows } = await db.query(
    `UPDATE payments
     SET status = 'pending', checkout_request_id = $1, phone = $2, mpesa_ref = NULL, paid_at = NULL
     WHERE booking_id = $3 AND status = 'refunded'
     RETURNING id, booking_id, amount, status, created_at`,
    [checkoutRequestId, phone, bookingId],
  );
  return rows[0] || null;
};

const findPaidOlderThan = async(minutes) => {
  const { rows } = await db.query(
    `SELECT p.id, p.booking_id, p.amount, p.phone, p.checkout_request_id, p.mpesa_ref, p.paid_at
     FROM payments p
     WHERE p.status = 'paid'
       AND p.paid_at IS NOT NULL
       AND p.paid_at < NOW() - ($1 * INTERVAL '1 minute')
     ORDER BY p.paid_at ASC`,
    [minutes],
  );
  return rows;
};

module.exports = { findByBookingId, findByCheckoutRequestId, create, markPaid, markFailed, markRefunded, resetForRepayment, findPaidOlderThan };
