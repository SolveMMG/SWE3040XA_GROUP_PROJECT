const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

const reviewModel = {
  existsForBooking: async () => false,
  create:           async () => null,
  findByDriver:     async () => [],
};

const bookingModel = {
  findById: async () => null,
};

const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));
require.cache[fromSrc('models/review.model')]  = { id: fromSrc('models/review.model'),  filename: fromSrc('models/review.model'),  loaded: true, exports: reviewModel };
require.cache[fromSrc('models/booking.model')] = { id: fromSrc('models/booking.model'), filename: fromSrc('models/booking.model'), loaded: true, exports: bookingModel };

const reviewController = require('../src/controllers/review.controller');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body   = b; return r; };
  return r;
};

const paidBooking = {
  id: 1,
  passenger: { id: 10, name: 'Alice' },
  driver:    { id: 2,  name: 'Bob' },
  status:    'paid',
  created_at: new Date(),
};

// ─── createReview ─────────────────────────────────────────────────────────────

describe('review.controller – createReview', () => {
  it('404 BOOKING_NOT_FOUND when booking does not exist', async () => {
    bookingModel.findById = async () => null;
    const res = makeRes();
    await reviewController.createReview({ body: { bookingId: 99, rating: 4 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'BOOKING_NOT_FOUND');
  });

  it('403 FORBIDDEN when reviewer is not the passenger', async () => {
    bookingModel.findById = async () => ({ ...paidBooking });
    const res = makeRes();
    await reviewController.createReview({ body: { bookingId: 1, rating: 4 }, user: { userId: 99 } }, res, (e) => { throw e; });
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('403 NOT_PAID when booking has not been paid yet', async () => {
    bookingModel.findById = async () => ({ ...paidBooking, status: 'accepted' });
    const res = makeRes();
    await reviewController.createReview({ body: { bookingId: 1, rating: 4 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'NOT_PAID');
  });

  it('409 ALREADY_REVIEWED when a review already exists for the booking', async () => {
    bookingModel.findById        = async () => ({ ...paidBooking });
    reviewModel.existsForBooking = async () => true;
    const res = makeRes();
    await reviewController.createReview({ body: { bookingId: 1, rating: 5 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'ALREADY_REVIEWED');
  });

  it('201 with review data on success', async () => {
    bookingModel.findById        = async () => ({ ...paidBooking });
    reviewModel.existsForBooking = async () => false;
    reviewModel.create           = async () => ({
      id: 1, booking_id: 1, rating: 4, comment: 'Good ride', created_at: new Date(),
    });
    const res = makeRes();
    await reviewController.createReview({ body: { bookingId: 1, rating: 4, comment: 'Good ride' }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 201);
    assert.equal(res._body.rating, 4);
    assert.equal(res._body.comment, 'Good ride');
    assert.equal(res._body.reviewer.id, 10);
  });
});

// ─── listReviews ──────────────────────────────────────────────────────────────

describe('review.controller – listReviews', () => {
  it('400 MISSING_DRIVER_ID when driverId query param is absent or non-numeric', async () => {
    const res = makeRes();
    await reviewController.listReviews({ query: { driverId: 'abc' } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_DRIVER_ID');
  });

  it('200 returns reviews from model', async () => {
    reviewModel.findByDriver = async () => [{ id: 1, rating: 5 }];
    const res = makeRes();
    await reviewController.listReviews({ query: { driverId: '2' } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.deepEqual(res._body, [{ id: 1, rating: 5 }]);
  });
});
