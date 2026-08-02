const paymentModel = require('../models/payment.model');
const bookingModel = require('../models/booking.model');
const userModel    = require('../models/user.model');
const mpesaService = require('../services/mpesa.service');
const { sendPush } = require('../services/firebase.service');

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

    // In sandbox Safaricom cannot reach localhost, so auto-confirm after 5s to simulate the real callback
    if (process.env.MPESA_ENV !== 'production') {
      setTimeout(async () => {
        try {
          const mpesaRef = `QJK${Math.floor(100000 + Math.random() * 900000)}`;
          const paidPayment = await paymentModel.markPaid({ checkoutRequestId: stk.checkoutRequestId, mpesaRef });
          if (paidPayment?.booking_id) {
            await bookingModel.markPaid(paidPayment.booking_id);
            const paidBooking = await bookingModel.findById(paidPayment.booking_id);
            if (paidBooking?.passenger?.id) {
              userModel.getFcmToken(paidBooking.passenger.id)
                .then((t) => sendPush(t, 'Payment Confirmed', `KES ${paidPayment.amount} received. Your ride is confirmed!`))
                .catch(() => {});
            }
            if (paidBooking?.driver?.id) {
              userModel.getFcmToken(paidBooking.driver.id)
                .then((t) => sendPush(t, 'Payment Received', `KES ${paidPayment.amount} received for your ride.`))
                .catch(() => {});
            }
          }
        } catch { /* ignore — callback will handle production */ }
      }, 5000);
    }

    return res.status(201).json({
      payment,
      booking,
      status: 'pending',
      checkoutRequestId: stk.checkoutRequestId,
      message: 'M-Pesa prompt sent to your phone. Complete the payment to confirm your ride.',
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
      return res.json({ ResultCode: 0, message: 'No checkout ID — ignoring callback' });
    }

    // Mark paid/failed based on result_code convention (0=success)
    if (String(resultCode) === '0') {
      const paidPayment = await paymentModel.markPaid({ checkoutRequestId, mpesaRef: mpesaRef || null });
      if (!paidPayment) return res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' } });
      if (paidPayment?.booking_id) {
        await bookingModel.markPaid(paidPayment.booking_id);
        const booking = await bookingModel.findById(paidPayment.booking_id);
        if (booking?.passenger?.id) {
          userModel.getFcmToken(booking.passenger.id)
            .then((fcmToken) => sendPush(fcmToken, 'Payment Confirmed', `KES ${paidPayment.amount} received. Your ride is confirmed!`))
            .catch(() => {});
        }
        if (booking?.driver?.id) {
          userModel.getFcmToken(booking.driver.id)
            .then((fcmToken) => sendPush(fcmToken, 'Payment Received', `KES ${paidPayment.amount} received for your ride.`))
            .catch(() => {});
        }
      }
    } else {
      await paymentModel.markFailed(checkoutRequestId);
    }

    return res.json({ ResultCode: 0, message: 'Callback processed' });
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

// ── Test-compatible named exports ────────────────────────────────────────────

const initiate = async(req, res, next) => {
  try {
    const bookingId = parseIntOrNull(req.body.bookingId);
    if (!bookingId || !req.body.phone) return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'bookingId and phone are required' } });

    const booking = await bookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.passenger?.id !== req.user.userId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the passenger can pay' } });
    if (booking.status !== 'accepted') return res.status(400).json({ error: { code: 'NOT_ACCEPTED', message: 'Booking must be accepted before payment' } });

    const existingPayment = await paymentModel.findByBookingId(bookingId);
    if (existingPayment?.status === 'paid') return res.status(409).json({ error: { code: 'ALREADY_PAID', message: 'This booking has already been paid' } });

    const stk = await mpesaService.initiateStkPush({ amount: booking.total_price ?? booking.totalPrice, phone: req.body.phone, reference: `RIDE-${bookingId}`, description: `RideLoop booking ${bookingId}` });

    await paymentModel.create({ bookingId, amount: booking.total_price ?? booking.totalPrice, phone: stk.phone ?? req.body.phone, checkoutRequestId: stk.checkoutRequestId ?? stk.CheckoutRequestID });
    return res.json({ checkoutRequestId: stk.checkoutRequestId ?? stk.CheckoutRequestID, message: 'M-Pesa prompt sent to your phone.' });
  } catch (err) { next(err); }
};

const getPayment = async(req, res, next) => {
  try {
    const bookingId = parseIntOrNull(req.params.bookingId);
    if (!bookingId) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'bookingId must be an integer' } });

    const booking = await bookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.passenger?.id !== req.user.userId && booking.driver?.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not booking participant' } });
    }

    const payment = await paymentModel.findByBookingId(bookingId);
    if (!payment) return res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' } });

    return res.json({ id: payment.id, bookingId: payment.booking_id, amount: payment.amount, mpesaRef: payment.mpesa_ref, status: payment.status, paidAt: payment.paid_at });
  } catch (err) { next(err); }
};

module.exports = { findByBookingId, create, initiateStkPush, mpesaCallback, autoRefund, initiate, getPayment };
