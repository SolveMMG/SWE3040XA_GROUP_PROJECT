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

const valid   = () => jwt.sign({ userId: 7, email: 'test@example.com' }, SECRET, { expiresIn: '1h' });
const expired = () => jwt.sign({ userId: 1, email: 'a@b.com', exp: Math.floor(Date.now() / 1000) - 3600 }, SECRET);

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  it('401 MISSING_TOKEN — no Authorization header', () => {
    const req = { headers: {} };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(ok, false);
  });

  it('401 MISSING_TOKEN — non-Bearer scheme', () => {
    const req = { headers: { authorization: 'Basic abc' } };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(ok, false);
  });

  it('401 MISSING_TOKEN — Bearer with empty value', () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(ok, false);
  });

  it('calls next and sets req.user for a valid token', () => {
    const req = { headers: { authorization: `Bearer ${valid()}` } };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(ok, true);
    assert.equal(req.user.userId, 7);
    assert.equal(req.user.email, 'test@example.com');
  });

  it('401 TOKEN_EXPIRED — expired token', () => {
    const req = { headers: { authorization: `Bearer ${expired()}` } };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'TOKEN_EXPIRED');
    assert.equal(ok, false);
  });

  it('401 INVALID_TOKEN — malformed token', () => {
    const req = { headers: { authorization: 'Bearer notavalidjwt' } };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_TOKEN');
    assert.equal(ok, false);
  });

  it('401 INVALID_TOKEN — wrong signing secret', () => {
    const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'wrong-secret', { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    let ok = false;
    authenticate(req, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_TOKEN');
    assert.equal(ok, false);
  });
});

// ─── optionalAuthenticate ─────────────────────────────────────────────────────

describe('optionalAuthenticate middleware', () => {
  it('calls next without setting req.user when no token present', () => {
    const req = { headers: {} };
    const res = makeRes();
    let ok = false;
    optionalAuthenticate(req, res, () => { ok = true; });
    assert.equal(ok, true);
    assert.equal(req.user, undefined);
  });

  it('calls next and sets req.user for a valid token', () => {
    const req = { headers: { authorization: `Bearer ${valid()}` } };
    const res = makeRes();
    let ok = false;
    optionalAuthenticate(req, res, () => { ok = true; });
    assert.equal(ok, true);
    assert.equal(req.user.userId, 7);
  });

  it('calls next silently and leaves req.user undefined for an invalid token', () => {
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = makeRes();
    let ok = false;
    optionalAuthenticate(req, res, () => { ok = true; });
    assert.equal(ok, true);
    assert.equal(req.user, undefined);
  });

  it('calls next silently and leaves req.user undefined for an expired token', () => {
    const req = { headers: { authorization: `Bearer ${expired()}` } };
    const res = makeRes();
    let ok = false;
    optionalAuthenticate(req, res, () => { ok = true; });
    assert.equal(ok, true);
    assert.equal(req.user, undefined);
  });
});
