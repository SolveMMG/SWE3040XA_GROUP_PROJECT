const paymentModel = require('../models/payment.model');
const bookingModel = require('../models/booking.model');
const mpesaService = require('../services/mpesa.service');

const parseIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const parseNonNegativeIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n < 0 ? null : n;
};

const findByBookingId = async(req, res, next) => {
  try {
    const bookingId = parseIntOrNull(req.params.bookingId);
    if (!bookingId) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'bookingId must be an integer' } });

    const payment = await paymentModel.findByBookingId(bookingId);
    if (!payment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment not found' } });

    const booking = await bookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.passenger?.id !== req.user.userId && booking.driver?.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not booking participant' } });
    }

    return res.json(payment);
  } catch (err) { next(err); }
};

const create = async(req, res, next) => {
  try {
    const { bookingId, amount, phone, checkoutRequestId } = req.body;

    if (bookingId === undefined || amount === undefined || !phone || !checkoutRequestId) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'bookingId, amount, phone, checkoutRequestId are required' } });
    }

    const bookingIdN = parseIntOrNull(bookingId);
    if (!bookingIdN) return res.status(400).json({ error: { code: 'INVALID_BOOKING_ID', message: 'bookingId must be an integer' } });
    const amountN = parseNonNegativeIntOrNull(amount);
    if (amountN === null) return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: 'amount must be a non-negative integer' } });

    const booking = await bookingModel.findById(bookingIdN);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });

    if (booking.passenger?.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only passenger can create payment' } });
    }

    if (booking.status !== 'accepted') {
      return res.status(409).json({ error: { code: 'BOOKING_NOT_ACCEPTED', message: 'Booking must be accepted before payment' } });
    }
    if (amountN !== booking.total_price) {
      return res.status(409).json({ error: { code: 'AMOUNT_MISMATCH', message: 'Payment amount must match booking total' } });
    }

    const created = await paymentModel.create({ bookingId: bookingIdN, amount: amountN, phone, checkoutRequestId });
    return res.status(201).json(created);
  } catch (err) { next(err); }
};

const initiateStkPush = async(req, res, next) => {
  try {
    const bookingId = parseIntOrNull(req.body.bookingId);
    if (!bookingId || !req.body.phone) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'bookingId and phone are required' } });
    }
    const booking = await bookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.passenger?.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the passenger can pay for this booking' } });
    }
    if (booking.status !== 'accepted') {
      return res.status(409).json({ error: { code: 'BOOKING_NOT_ACCEPTED', message: 'Booking must be accepted before payment' } });
    }
    const existingPayment = await paymentModel.findByBookingId(bookingId);
    if (existingPayment && existingPayment.status !== 'refunded') {
      return res.status(409).json({ error: { code: 'PAYMENT_EXISTS', message: 'A payment has already been started for this booking' } });
    }
    const stk = await mpesaService.initiateStkPush({
      amount: booking.total_price,
      phone: req.body.phone,
      reference: `RIDE-${bookingId}`,
      description: `RideLoop booking ${bookingId}`,
    });

    let payment;
    if (existingPayment) {
      // Reuse the existing refunded payment record (UNIQUE constraint on booking_id)
      payment = await paymentModel.resetForRepayment({
        bookingId,
        checkoutRequestId: stk.checkoutRequestId,
        phone: stk.phone,
      });
    } else {
      payment = await paymentModel.create({
        bookingId,
        amount: booking.total_price,
        phone: stk.phone,
        checkoutRequestId: stk.checkoutRequestId,
      });
    }

    // Auto-complete payment in sandbox mode for instant confirmation & driver dispatch
    const mpesaRef = `QJK${Math.floor(100000 + Math.random() * 900000)}`;
    const paidPayment = await paymentModel.markPaid({ checkoutRequestId: stk.checkoutRequestId, mpesaRef });
    if (paidPayment?.booking_id) {
      await bookingModel.markPaid(paidPayment.booking_id);
    }
    const updatedBooking = await bookingModel.findById(bookingId);

    return res.status(201).json({
      payment: paidPayment || payment,
      booking: updatedBooking,
      status: 'paid',
      dispatched: true,
      mpesaRef,
      message: 'M-Pesa payment confirmed! Driver has been dispatched.',
    });
  } catch (err) { next(err); }
};

const mpesaCallback = async(req, res, next) => {
  try {
    const callback = req.body?.Body?.stkCallback || req.body || {};
    const checkoutRequestId = callback.CheckoutRequestID || callback.checkout_request_id;
    const resultCode = callback.ResultCode ?? callback.result_code;
    const metadata = callback.CallbackMetadata?.Item || [];
    const mpesaRef = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || callback.mpesa_ref;

    if (!checkoutRequestId) {
      return res.status(400).json({ error: { code: 'MISSING_CHECKOUT_ID', message: 'checkout_request_id is required' } });
    }

    // Mark paid/failed based on result_code convention (0=success)
    if (String(resultCode) === '0') {
      const paidPayment = await paymentModel.markPaid({ checkoutRequestId, mpesaRef: mpesaRef || null });
      if (!paidPayment) return res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' } });
      if (paidPayment?.booking_id) await bookingModel.markPaid(paidPayment.booking_id);
    } else {
      const failedPayment = await paymentModel.markFailed(checkoutRequestId);
      if (!failedPayment) return res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' } });
    }

    return res.json({ message: 'Callback processed' });
  } catch (err) { next(err); }
};

/**
 * Auto-refund scheduler: finds all paid payments older than 5 minutes
 * and marks them as refunded, also refunds the booking status.
 * Called every 60 seconds from index.js.
 */
const autoRefund = async() => {
  try {
    const oldPayments = await paymentModel.findPaidOlderThan(5); // 5 minutes
    for (const payment of oldPayments) {
      try {
        // Simulate refund via M-Pesa service
        await mpesaService.refundTransaction({
          checkoutRequestId: payment.checkout_request_id,
          amount: payment.amount,
          phone: payment.phone,
        });

        // Mark payment as refunded
        await paymentModel.markRefunded(payment.checkout_request_id);

        // Reset booking back to 'accepted' so the passenger can pay again
        if (payment.booking_id) {
          await bookingModel.resetToAccepted(payment.booking_id);
        }

        // eslint-disable-next-line no-console
        console.log(`[AUTO-REFUND] Refunded payment ${payment.checkout_request_id} for booking ${payment.booking_id}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[AUTO-REFUND] Failed to refund payment ${payment.checkout_request_id}:`, err.message);
      }
    }
    if (oldPayments.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[AUTO-REFUND] Processed ${oldPayments.length} refund(s)`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AUTO-REFUND] Error:', err.message);
  }
};

module.exports = { findByBookingId, create, initiateStkPush, mpesaCallback, autoRefund };
