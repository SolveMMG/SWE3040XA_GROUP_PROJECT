const paymentModel = require('../models/payment.model');
const bookingModel = require('../models/booking.model');
const { initiateSTKPush } = require('../services/mpesa.service');
const { sendPush }        = require('../services/firebase.service');

// POST /payments/initiate
const initiate = async(req, res, next) => {
  try {
    const { bookingId, phone } = req.body;
    const booking = await bookingModel.findById(Number(bookingId));

    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.passenger.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the passenger can initiate payment' } });
    }
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: { code: 'NOT_ACCEPTED', message: 'Booking must be accepted before payment' } });
    }

    const existing = await paymentModel.findByBookingId(Number(bookingId));
    if (existing && existing.status === 'paid') {
      return res.status(409).json({ error: { code: 'ALREADY_PAID', message: 'This booking has already been paid' } });
    }

    const mpesaRes = await initiateSTKPush(phone, booking.totalPrice, bookingId);
    const checkoutRequestId = mpesaRes.CheckoutRequestID;

    if (!existing) {
      await paymentModel.create({ bookingId: Number(bookingId), amount: booking.totalPrice, phone, checkoutRequestId });
    }

    return res.json({ checkoutRequestId, message: 'STK push sent. Check your phone.' });
  } catch (err) { next(err); }
};

// POST /payments/callback  (Daraja webhook — public)
const mpesaCallback = async(req, res, next) => {
  try {
    const { Body } = req.body;
    const stkCallback = Body?.stkCallback;
    if (!stkCallback) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

    if (ResultCode !== 0) {
      await paymentModel.markFailed(CheckoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const items = CallbackMetadata?.Item || [];
    const get   = (name) => items.find((i) => i.Name === name)?.Value;
    const mpesaRef = get('MpesaReceiptNumber');

    const payment = await paymentModel.markPaid({ checkoutRequestId: CheckoutRequestID, mpesaRef });
    if (payment) {
      await bookingModel.updateStatus(payment.booking_id, 'paid');
      sendPush(null, 'Payment Received', `KES ${payment.amount} received. Enjoy your ride!`);
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) { next(err); }
};

// GET /payments/:bookingId
const getPayment = async(req, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const booking   = await bookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });

    const uid = req.user.userId;
    if (booking.passenger.id !== uid && booking.driver.id !== uid) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your booking' } });
    }

    const payment = await paymentModel.findByBookingId(bookingId);
    if (!payment) return res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'No payment record found' } });

    return res.json({
      id:        payment.id,
      bookingId: payment.booking_id,
      amount:    payment.amount,
      mpesaRef:  payment.mpesa_ref,
      status:    payment.status,
      paidAt:    payment.paid_at,
    });
  } catch (err) { next(err); }
};

module.exports = { initiate, mpesaCallback, getPayment };
