const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

const rideModel = {
  findAll:  async () => ({ rides: [], total: 0, page: 1, totalPages: 0 }),
  findById: async () => null,
  create:   async () => null,
  update:   async () => null,
  remove:   async () => {},
  isOwner:  async () => false,
};

const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));
require.cache[fromSrc('models/ride.model')] = { id: fromSrc('models/ride.model'), filename: fromSrc('models/ride.model'), loaded: true, exports: rideModel };

const rideController = require('../src/controllers/ride.controller');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body   = b; return r; };
  return r;
};

// Raw DB-shaped ride (snake_case — as rideModel returns)
const dbRide = {
  id: 1, origin: 'Nairobi', destination: 'Mombasa',
  departure_time: new Date(), seats_available: 3, price_per_seat: 500,
  status: 'active', created_at: new Date(),
  driver: { id: 2, name: 'Bob Driver', photoUrl: null, avgRating: 4.8, rideCount: 10 },
};

// ─── listRides ────────────────────────────────────────────────────────────────

describe('ride.controller – listRides', () => {
  it('200 returns rides array with pagination metadata', async () => {
    rideModel.findAll = async () => ({ rides: [dbRide], total: 1, page: 1, totalPages: 1 });
    const res = makeRes();
    await rideController.listRides({ query: {} }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.rides.length, 1);
    assert.equal(res._body.total, 1);
    assert.equal(res._body.page, 1);
    assert.equal(res._body.totalPages, 1);
    // serialised field names are camelCase
    assert.ok('seatsAvailable' in res._body.rides[0]);
    assert.ok('departureTime'  in res._body.rides[0]);
  });
});

// ─── createRide ───────────────────────────────────────────────────────────────

describe('ride.controller – createRide', () => {
  it('201 with serialised ride on success', async () => {
    rideModel.create = async () => ({ ...dbRide });
    const res = makeRes();
    await rideController.createRide({
      body: { origin: 'Nairobi', destination: 'Mombasa', departureTime: '2026-08-01T08:00:00Z', seatsAvailable: 3, pricePerSeat: 500 },
      user: { userId: 2 },
    }, res, (e) => { throw e; });
    assert.equal(res._status, 201);
    assert.equal(res._body.origin, 'Nairobi');
    assert.equal(res._body.status, 'active');
  });
});

// ─── getRide ─────────────────────────────────────────────────────────────────

describe('ride.controller – getRide', () => {
  it('400 INVALID_ID when id is not a valid integer', async () => {
    const res = makeRes();
    await rideController.getRide({ params: { id: 'abc' } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_ID');
  });

  it('404 RIDE_NOT_FOUND when ride does not exist', async () => {
    rideModel.findById = async () => null;
    const res = makeRes();
    await rideController.getRide({ params: { id: '999' } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'RIDE_NOT_FOUND');
  });

  it('200 with serialised ride', async () => {
    rideModel.findById = async () => ({ ...dbRide });
    const res = makeRes();
    await rideController.getRide({ params: { id: '1' } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.origin, 'Nairobi');
  });
});

// ─── updateRide ───────────────────────────────────────────────────────────────

describe('ride.controller – updateRide', () => {
  it('403 FORBIDDEN when caller is not the driver', async () => {
    rideModel.isOwner = async () => false;
    const res = makeRes();
    await rideController.updateRide(
      { params: { id: '1' }, body: {}, user: { userId: 99 } }, res, (e) => { throw e; },
    );
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('200 with updated ride when owner calls', async () => {
    rideModel.isOwner = async () => true;
    rideModel.update  = async () => ({ ...dbRide, status: 'cancelled' });
    const res = makeRes();
    await rideController.updateRide(
      { params: { id: '1' }, body: { status: 'cancelled' }, user: { userId: 2 } }, res, (e) => { throw e; },
    );
    assert.equal(res._status, 200);
    assert.equal(res._body.status, 'cancelled');
  });
});

// ─── deleteRide ───────────────────────────────────────────────────────────────

describe('ride.controller – deleteRide', () => {
  it('403 FORBIDDEN when caller is not the driver', async () => {
    rideModel.isOwner = async () => false;
    const res = makeRes();
    await rideController.deleteRide(
      { params: { id: '1' }, user: { userId: 99 } }, res, (e) => { throw e; },
    );
    assert.equal(res._status, 403);
    assert.equal(res._body.error.code, 'FORBIDDEN');
  });

  it('200 success message when owner deletes', async () => {
    rideModel.isOwner = async () => true;
    let removedId = null;
    rideModel.remove  = async (id) => { removedId = id; };
    const res = makeRes();
    await rideController.deleteRide(
      { params: { id: '1' }, user: { userId: 2 } }, res, (e) => { throw e; },
    );
    assert.equal(res._status, 200);
    assert.equal(res._body.message, 'Ride deleted');
    assert.equal(removedId, 1);
  });
});
