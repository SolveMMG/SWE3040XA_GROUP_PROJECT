const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { validate, rules } = require('../src/middleware/validate');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body  = b; return r; };
  return r;
};

// Run a validate middleware against a body; return { res, nextCalled }
const check = (mw, body) => {
  const req = { body: body || {} };
  const res = makeRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
};

// ─── validate() factory ───────────────────────────────────────────────────────

describe('validate() factory', () => {
  it('calls next when the rules function returns no errors', () => {
    const { nextCalled } = check(validate(() => []), {});
    assert.equal(nextCalled, true);
  });

  it('returns 400 VALIDATION_ERROR with the first error message', () => {
    const mw = validate((b) => [
      !b.name && { field: 'name', message: 'name is required' },
      !b.age  && { field: 'age',  message: 'age is required' },
    ]);
    const { res, nextCalled } = check(mw, {});
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'VALIDATION_ERROR');
    assert.equal(res._body.error.message, 'name is required');
    assert.ok(Array.isArray(res._body.error.details));
    assert.equal(nextCalled, false);
  });

  it('filters out falsy values (false/null/undefined) from rules', () => {
    const { nextCalled } = check(validate(() => [false, null, undefined]), {});
    assert.equal(nextCalled, true);
  });
});

// ─── rules.refreshToken ───────────────────────────────────────────────────────

describe('rules.refreshToken', () => {
  it('passes when refreshToken is a non-empty string', () => {
    const { nextCalled } = check(rules.refreshToken, { refreshToken: 'abc' });
    assert.equal(nextCalled, true);
  });

  it('400 when refreshToken is missing', () => {
    const { res, nextCalled } = check(rules.refreshToken, {});
    assert.equal(res._status, 400);
    assert.equal(nextCalled, false);
  });

  it('400 when refreshToken is not a string', () => {
    const { res, nextCalled } = check(rules.refreshToken, { refreshToken: 123 });
    assert.equal(res._status, 400);
    assert.equal(nextCalled, false);
  });
});

// ─── rules.updateProfile ──────────────────────────────────────────────────────

describe('rules.updateProfile', () => {
  it('passes for an empty body (all fields optional)', () => {
    const { nextCalled } = check(rules.updateProfile, {});
    assert.equal(nextCalled, true);
  });

  it('passes with valid name, bio, role, and photoUrl', () => {
    const { nextCalled } = check(rules.updateProfile, {
      name: 'Alice', bio: 'Hello', role: 'driver', photoUrl: 'https://example.com/photo.jpg',
    });
    assert.equal(nextCalled, true);
  });

  it('400 when name is a whitespace-only string', () => {
    const { res } = check(rules.updateProfile, { name: '   ' });
    assert.equal(res._status, 400);
    assert.match(res._body.error.message, /name/);
  });

  it('400 when bio is not a string', () => {
    const { res } = check(rules.updateProfile, { bio: 42 });
    assert.equal(res._status, 400);
  });

  it('400 when role is not passenger or driver', () => {
    const { res } = check(rules.updateProfile, { role: 'admin' });
    assert.equal(res._status, 400);
  });

  it('400 when photoUrl is not a string', () => {
    const { res } = check(rules.updateProfile, { photoUrl: 999 });
    assert.equal(res._status, 400);
  });
});

// ─── rules.createRide ─────────────────────────────────────────────────────────

describe('rules.createRide', () => {
  const valid = {
    origin: 'Nairobi', destination: 'Mombasa',
    departureTime: '2026-08-01T08:00:00Z',
    seatsAvailable: 3, pricePerSeat: 500,
  };

  it('passes with all valid fields', () => {
    const { nextCalled } = check(rules.createRide, valid);
    assert.equal(nextCalled, true);
  });

  it('400 when origin is missing', () => {
    const { res } = check(rules.createRide, { ...valid, origin: undefined });
    assert.equal(res._status, 400);
    assert.match(res._body.error.details[0].field, /origin/);
  });

  it('400 when destination is missing', () => {
    const { res } = check(rules.createRide, { ...valid, destination: undefined });
    assert.equal(res._status, 400);
  });

  it('400 when departureTime is missing', () => {
    const { res } = check(rules.createRide, { ...valid, departureTime: undefined });
    assert.equal(res._status, 400);
  });

  it('400 when departureTime is not a valid ISO date', () => {
    const { res } = check(rules.createRide, { ...valid, departureTime: 'not-a-date' });
    assert.equal(res._status, 400);
  });

  it('400 when seatsAvailable is missing', () => {
    const { res } = check(rules.createRide, { ...valid, seatsAvailable: undefined });
    assert.equal(res._status, 400);
  });

  it('400 when seatsAvailable is 0', () => {
    const { res } = check(rules.createRide, { ...valid, seatsAvailable: 0 });
    assert.equal(res._status, 400);
  });

  it('400 when pricePerSeat is negative', () => {
    const { res } = check(rules.createRide, { ...valid, pricePerSeat: -1 });
    assert.equal(res._status, 400);
  });
});

// ─── rules.createBooking ──────────────────────────────────────────────────────

describe('rules.createBooking', () => {
  it('passes with valid rideId and seatsRequested', () => {
    const { nextCalled } = check(rules.createBooking, { rideId: 1, seatsRequested: 2 });
    assert.equal(nextCalled, true);
  });

  it('400 when rideId is missing', () => {
    const { res } = check(rules.createBooking, { seatsRequested: 1 });
    assert.equal(res._status, 400);
  });

  it('400 when seatsRequested is 0', () => {
    const { res } = check(rules.createBooking, { rideId: 1, seatsRequested: 0 });
    assert.equal(res._status, 400);
  });

  it('400 when seatsRequested is missing', () => {
    const { res } = check(rules.createBooking, { rideId: 1 });
    assert.equal(res._status, 400);
  });
});

// ─── rules.initiatePayment ────────────────────────────────────────────────────

describe('rules.initiatePayment', () => {
  it('passes with valid bookingId and Kenyan phone (07xx)', () => {
    const { nextCalled } = check(rules.initiatePayment, { bookingId: 5, phone: '0712345678' });
    assert.equal(nextCalled, true);
  });

  it('passes with 254 prefix', () => {
    const { nextCalled } = check(rules.initiatePayment, { bookingId: 5, phone: '254712345678' });
    assert.equal(nextCalled, true);
  });

  it('400 when bookingId is missing', () => {
    const { res } = check(rules.initiatePayment, { phone: '0712345678' });
    assert.equal(res._status, 400);
  });

  it('400 when phone is missing', () => {
    const { res } = check(rules.initiatePayment, { bookingId: 5 });
    assert.equal(res._status, 400);
  });

  it('400 when phone is not a valid Kenyan number', () => {
    const { res } = check(rules.initiatePayment, { bookingId: 5, phone: '123456' });
    assert.equal(res._status, 400);
  });
});

// ─── rules.createReview ───────────────────────────────────────────────────────

describe('rules.createReview', () => {
  it('passes with valid bookingId and rating', () => {
    const { nextCalled } = check(rules.createReview, { bookingId: 1, rating: 4 });
    assert.equal(nextCalled, true);
  });

  it('passes with optional comment', () => {
    const { nextCalled } = check(rules.createReview, { bookingId: 1, rating: 5, comment: 'Great!' });
    assert.equal(nextCalled, true);
  });

  it('400 when bookingId is missing', () => {
    const { res } = check(rules.createReview, { rating: 3 });
    assert.equal(res._status, 400);
  });

  it('400 when rating is missing', () => {
    const { res } = check(rules.createReview, { bookingId: 1 });
    assert.equal(res._status, 400);
  });

  it('400 when rating is 0 (below minimum)', () => {
    const { res } = check(rules.createReview, { bookingId: 1, rating: 0 });
    assert.equal(res._status, 400);
  });

  it('400 when rating is 6 (above maximum)', () => {
    const { res } = check(rules.createReview, { bookingId: 1, rating: 6 });
    assert.equal(res._status, 400);
  });

  it('400 when comment is not a string', () => {
    const { res } = check(rules.createReview, { bookingId: 1, rating: 4, comment: 123 });
    assert.equal(res._status, 400);
  });
});
