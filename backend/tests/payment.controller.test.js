const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

const paymentModel = {
  findByBookingId: async () => null,
  create:          async () => ({ id: 1, booking_id: 1, amount: 200, phone: '0712345678', status: 'pending' }),
  markFailed:      async () => {},
  markPaid:        async () => null,
};

const bookingModel = {
  findById:     async () => null,
  updateStatus: async () => {},
};

// mpesa.service makes real HTTP calls — must mock.
// The controller destructures initiateSTKPush at load time, so we wrap it
// via an indirect object so tests can swap the implementation at runtime.
const mpesaImpl = { initiateSTKPush: async () => ({ CheckoutRequestID: 'CHK-123' }) };
const mpesaService = {
  initiateSTKPush: (...args) => mpesaImpl.initiateSTKPush(...args),
};

// firebase.service no-ops without credentials
const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));
require.cache[fromSrc('models/payment.model')]    = { id: fromSrc('models/payment.model'),    filename: fromSrc('models/payment.model'),    loaded: true, exports: paymentModel };
require.cache[fromSrc('models/booking.model')]    = { id: fromSrc('models/booking.model'),    filename: fromSrc('models/booking.model'),    loaded: true, exports: bookingModel };
require.cache[fromSrc('services/mpesa.service')]  = { id: fromSrc('services/mpesa.service'),  filename: fromSrc('services/mpesa.service'),  loaded: true, exports: mpesaService };

const paymentController = require('../src/controllers/payment.controller');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body   = b; return r; };
  return r;
};

// The payment controller accesses booking.totalPrice (camelCase) — a known
// discrepancy with the model's snake_case. Provide both so tests exercise the
// correct branches.
const acceptedBooking = {
  id: 1,
  passenger: { id: 10, name: 'Alice' },
  driver:    { id: 2,  name: 'Bob' },
  total_price: 200, totalPrice: 200,
  status: 'accepted',
};

// ─── initiate ─────────────────────────────────────────────────────────────────

describe('payment.controller – initiate', () => {
  it('404 BOOKING_NOT_FOUND when booking does not exist', async () => {
    bookingModel.findById = async () => null;
    const res = makeRes();
    await paymentController.initiate({ body: { bookingId: 99, phone: '0712345678' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'BOOKING_NOT_FOUND');
  });

  it('403 FORBIDDEN when caller is not the passenger', async () => {
    bookingModel.findById = async () => ({ ...acceptedBooking });
    const res = makeRes();
    await paymentController.initiate({ body: { bookingId: 1, phone: '0712345678' }, user: { userId: 99 } }, res, (e) => { throw e; });
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('400 NOT_ACCEPTED when booking is not accepted', async () => {
    bookingModel.findById = async () => ({ ...acceptedBooking, status: 'pending' });
    const res = makeRes();
    await paymentController.initiate({ body: { bookingId: 1, phone: '0712345678' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'NOT_ACCEPTED');
  });

  it('409 ALREADY_PAID when booking was already paid', async () => {
    bookingModel.findById      = async () => ({ ...acceptedBooking });
    paymentModel.findByBookingId = async () => ({ id: 1, status: 'paid' });
    const res = makeRes();
    await paymentController.initiate({ body: { bookingId: 1, phone: '0712345678' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'ALREADY_PAID');
  });

  it('200 with checkoutRequestId on successful STK push', async () => {
    bookingModel.findById        = async () => ({ ...acceptedBooking });
    paymentModel.findByBookingId = async () => null;
    paymentModel.create          = async () => ({});
    mpesaImpl.initiateSTKPush = async () => ({ CheckoutRequestID: 'CHK-456' });
    const res = makeRes();
    await paymentController.initiate({ body: { bookingId: 1, phone: '0712345678' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.checkoutRequestId, 'CHK-456');
    assert.ok(res._body.message);
  });
});

// ─── mpesaCallback ────────────────────────────────────────────────────────────

describe('payment.controller – mpesaCallback', () => {
  it('returns Accepted when body has no stkCallback', async () => {
    const res = makeRes();
    await paymentController.mpesaCallback({ body: {} }, res, (e) => { throw e; });
    assert.equal(res._body.ResultCode, 0);
  });

  it('marks payment failed when ResultCode is non-zero', async () => {
    let failedId = null;
    paymentModel.markFailed = async (id) => { failedId = id; };
    const body = { Body: { stkCallback: { CheckoutRequestID: 'CHK-X', ResultCode: 1, CallbackMetadata: null } } };
    const res = makeRes();
    await paymentController.mpesaCallback({ body }, res, (e) => { throw e; });
    assert.equal(failedId, 'CHK-X');
    assert.equal(res._body.ResultCode, 0);
  });

  it('marks payment paid and updates booking status on success', async () => {
    let paidWith = null;
    let updatedBooking = null;
    paymentModel.markPaid    = async (args) => { paidWith = args; return { booking_id: 1, amount: 200 }; };
    bookingModel.updateStatus = async (id) => { updatedBooking = id; };
    const body = {
      Body: {
        stkCallback: {
          CheckoutRequestID: 'CHK-Y', ResultCode: 0,
          CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'MPESA123' }] },
        },
      },
    };
    const res = makeRes();
    await paymentController.mpesaCallback({ body }, res, (e) => { throw e; });
    assert.equal(paidWith.checkoutRequestId, 'CHK-Y');
    assert.equal(paidWith.mpesaRef, 'MPESA123');
    assert.equal(updatedBooking, 1);
    assert.equal(res._body.ResultCode, 0);
  });
});

// ─── getPayment ───────────────────────────────────────────────────────────────

describe('payment.controller – getPayment', () => {
  it('404 BOOKING_NOT_FOUND when booking does not exist', async () => {
    bookingModel.findById = async () => null;
    const res = makeRes();
    await paymentController.getPayment({ params: { bookingId: '99' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'BOOKING_NOT_FOUND');
  });

  it('403 FORBIDDEN when caller is neither passenger nor driver', async () => {
    bookingModel.findById = async () => ({ ...acceptedBooking });
    const res = makeRes();
    await paymentController.getPayment({ params: { bookingId: '1' }, user: { userId: 99 } }, res, (e) => { throw e; });
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('404 PAYMENT_NOT_FOUND when no payment record exists', async () => {
    bookingModel.findById        = async () => ({ ...acceptedBooking });
    paymentModel.findByBookingId = async () => null;
    const res = makeRes();
    await paymentController.getPayment({ params: { bookingId: '1' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'PAYMENT_NOT_FOUND');
  });

  it('200 with payment data when driver requests it', async () => {
    bookingModel.findById        = async () => ({ ...acceptedBooking });
    paymentModel.findByBookingId = async () => ({ id: 5, booking_id: 1, amount: 200, mpesa_ref: 'ABC', status: 'paid', paid_at: new Date() });
    const res = makeRes();
    await paymentController.getPayment({ params: { bookingId: '1' }, user: { userId: 2 } }, res, (e) => { throw e; }); // driver
    assert.equal(res._status, 200);
    assert.equal(res._body.amount, 200);
    assert.equal(res._body.mpesaRef, 'ABC');
    assert.equal(res._body.status, 'paid');
  });
});
