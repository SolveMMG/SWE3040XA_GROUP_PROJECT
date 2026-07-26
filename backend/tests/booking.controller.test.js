const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

const bookingModel = {
  create:       async () => null,
  findById:     async () => null,
  findByUser:   async () => [],
  updateStatus: async () => null,
};

const rideModel = {
  findById: async () => null,
};

// firebase.service no-ops safely without credentials — no need to mock
const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));
require.cache[fromSrc('models/booking.model')] = { id: fromSrc('models/booking.model'), filename: fromSrc('models/booking.model'), loaded: true, exports: bookingModel };
require.cache[fromSrc('models/ride.model')]    = { id: fromSrc('models/ride.model'),    filename: fromSrc('models/ride.model'),    loaded: true, exports: rideModel };

const bookingController = require('../src/controllers/booking.controller');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body   = b; return r; };
  return r;
};

// Rides expose camelCase from the model's json_build_object for driver,
// but snake_case for own columns (seats_available, price_per_seat).
// The booking controller uses ride.seatsAvailable / ride.pricePerSeat —
// provide both so each test works as intended.
const activeRide = {
  id: 1, origin: 'A', destination: 'B', status: 'active',
  seats_available: 3, seatsAvailable: 3,
  price_per_seat: 100, pricePerSeat: 100,
  driver: { id: 2, name: 'Bob' },
};

const baseBooking = {
  id: 1,
  ride:      { id: 1, origin: 'A', destination: 'B' },
  passenger: { id: 10, name: 'Alice' },
  driver:    { id: 2,  name: 'Bob' },
  seats_requested: 1, total_price: 100, status: 'pending', created_at: new Date(),
};

// ─── createBooking ────────────────────────────────────────────────────────────

describe('booking.controller – createBooking', () => {
  it('404 RIDE_NOT_FOUND when ride does not exist', async () => {
    rideModel.findById = async () => null;
    const res = makeRes();
    await bookingController.createBooking({ body: { rideId: 99, seatsRequested: 1 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'RIDE_NOT_FOUND');
  });

  it('400 OWN_RIDE when passenger tries to book their own ride', async () => {
    rideModel.findById = async () => ({ ...activeRide, driver: { id: 10, name: 'Alice' } });
    const res = makeRes();
    await bookingController.createBooking({ body: { rideId: 1, seatsRequested: 1 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'OWN_RIDE');
  });

  it('400 RIDE_UNAVAILABLE when ride is not active', async () => {
    rideModel.findById = async () => ({ ...activeRide, status: 'cancelled' });
    const res = makeRes();
    await bookingController.createBooking({ body: { rideId: 1, seatsRequested: 1 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'RIDE_UNAVAILABLE');
  });

  it('400 NOT_ENOUGH_SEATS when requested seats exceed available', async () => {
    rideModel.findById = async () => ({ ...activeRide, seatsAvailable: 2 });
    const res = makeRes();
    await bookingController.createBooking({ body: { rideId: 1, seatsRequested: 5 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'NOT_ENOUGH_SEATS');
  });

  it('201 with serialised booking on success', async () => {
    rideModel.findById   = async () => ({ ...activeRide });
    bookingModel.create  = async () => ({ ...baseBooking });
    const res = makeRes();
    await bookingController.createBooking({ body: { rideId: 1, seatsRequested: 1 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 201);
    assert.ok('seatsRequested' in res._body);
    assert.ok('status' in res._body);
  });

  it('409 ALREADY_BOOKED on duplicate booking constraint', async () => {
    rideModel.findById  = async () => ({ ...activeRide });
    bookingModel.create = async () => { throw Object.assign(new Error('dup'), { code: '23505' }); };
    const res = makeRes();
    await bookingController.createBooking({ body: { rideId: 1, seatsRequested: 1 }, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'ALREADY_BOOKED');
  });
});

// ─── listBookings ─────────────────────────────────────────────────────────────

describe('booking.controller – listBookings', () => {
  it('200 returns bookings array', async () => {
    bookingModel.findByUser = async () => [baseBooking];
    const res = makeRes();
    await bookingController.listBookings({ query: {}, user: { userId: 10 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.bookings.length, 1);
  });
});

// ─── acceptBooking ────────────────────────────────────────────────────────────

describe('booking.controller – acceptBooking', () => {
  it('404 BOOKING_NOT_FOUND', async () => {
    bookingModel.findById = async () => null;
    const res = makeRes();
    await bookingController.acceptBooking({ params: { id: '99' }, user: { userId: 2 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'BOOKING_NOT_FOUND');
  });

  it('403 FORBIDDEN when caller is not the driver', async () => {
    bookingModel.findById = async () => ({ ...baseBooking });
    const res = makeRes();
    await bookingController.acceptBooking({ params: { id: '1' }, user: { userId: 99 } }, res, (e) => { throw e; });
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('409 NOT_PENDING when booking is already accepted', async () => {
    bookingModel.findById = async () => ({ ...baseBooking, status: 'accepted' });
    const res = makeRes();
    await bookingController.acceptBooking({ params: { id: '1' }, user: { userId: 2 } }, res, (e) => { throw e; });
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'NOT_PENDING');
  });

  it('200 with updated booking on success', async () => {
    bookingModel.findById     = async () => ({ ...baseBooking });
    bookingModel.updateStatus = async () => ({ ...baseBooking, status: 'accepted' });
    const res = makeRes();
    await bookingController.acceptBooking({ params: { id: '1' }, user: { userId: 2 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.status, 'accepted');
  });
});

// ─── declineBooking ───────────────────────────────────────────────────────────

describe('booking.controller – declineBooking', () => {
  it('404 BOOKING_NOT_FOUND', async () => {
    bookingModel.findById = async () => null;
    const res = makeRes();
    await bookingController.declineBooking({ params: { id: '99' }, user: { userId: 2 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'BOOKING_NOT_FOUND');
  });

  it('403 FORBIDDEN when caller is not the driver', async () => {
    bookingModel.findById = async () => ({ ...baseBooking });
    const res = makeRes();
    await bookingController.declineBooking({ params: { id: '1' }, user: { userId: 99 } }, res, (e) => { throw e; });
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('409 NOT_PENDING when booking is not pending', async () => {
    bookingModel.findById = async () => ({ ...baseBooking, status: 'declined' });
    const res = makeRes();
    await bookingController.declineBooking({ params: { id: '1' }, user: { userId: 2 } }, res, (e) => { throw e; });
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'NOT_PENDING');
  });

  it('200 with declined booking on success', async () => {
    bookingModel.findById     = async () => ({ ...baseBooking });
    bookingModel.updateStatus = async () => ({ ...baseBooking, status: 'declined' });
    const res = makeRes();
    await bookingController.declineBooking({ params: { id: '1' }, user: { userId: 2 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.status, 'declined');
  });
});
