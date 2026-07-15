const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-key';
process.env.JWT_SECRET = SECRET;

const { authenticate, optionalAuthenticate } = require('../src/middleware/auth');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body  = b; return r; };
  return r;
};

const validToken = () =>
  jwt.sign({ userId: 7, email: 'test@example.com' }, SECRET, { expiresIn: '1h' });

const expiredToken = () =>
  jwt.sign(
    { userId: 1, email: 'a@b.com', exp: Math.floor(Date.now() / 1000) - 3600 },
    SECRET,
  );

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  it('401 MISSING_TOKEN when Authorization header is absent', () => {
    const req = { headers: {} };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(nextCalled, false);
  });

  it('401 MISSING_TOKEN when Authorization has no Bearer prefix', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(nextCalled, false);
  });

  it('401 MISSING_TOKEN when Bearer value is empty', () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(nextCalled, false);
  });

  it('calls next and sets req.user for a valid token', () => {
    const req = { headers: { authorization: `Bearer ${validToken()}` } };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.userId, 7);
    assert.equal(req.user.email, 'test@example.com');
  });

  it('401 TOKEN_EXPIRED for an expired token', () => {
    const req = { headers: { authorization: `Bearer ${expiredToken()}` } };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'TOKEN_EXPIRED');
    assert.equal(nextCalled, false);
  });

  it('401 INVALID_TOKEN for a malformed token', () => {
    const req = { headers: { authorization: 'Bearer thisisnotavalidjwt' } };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_TOKEN');
    assert.equal(nextCalled, false);
  });

  it('401 INVALID_TOKEN for a token signed with the wrong secret', () => {
    const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'wrong-secret', { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    let nextCalled = false;
    authenticate(req, res, () => { nextCalled = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_TOKEN');
    assert.equal(nextCalled, false);
  });
});

// ─── optionalAuthenticate ─────────────────────────────────────────────────────

describe('optionalAuthenticate middleware', () => {
  it('calls next without setting req.user when no token is present', () => {
    const req = { headers: {} };
    const res = makeRes();
    let nextCalled = false;
    optionalAuthenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user, undefined);
  });

  it('calls next and sets req.user for a valid token', () => {
    const req = { headers: { authorization: `Bearer ${validToken()}` } };
    const res = makeRes();
    let nextCalled = false;
    optionalAuthenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.userId, 7);
    assert.equal(req.user.email, 'test@example.com');
  });

  it('calls next without error and leaves req.user undefined for an invalid token', () => {
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = makeRes();
    let nextCalled = false;
    optionalAuthenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user, undefined);
  });

  it('calls next without error and leaves req.user undefined for an expired token', () => {
    const req = { headers: { authorization: `Bearer ${expiredToken()}` } };
    const res = makeRes();
    let nextCalled = false;
    optionalAuthenticate(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user, undefined);
  });
});
