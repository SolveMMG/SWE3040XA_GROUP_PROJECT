const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

process.env.JWT_SECRET     = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.FRONTEND_URL   = 'http://localhost:3000';

// ─── mutable mocks ────────────────────────────────────────────────────────────

const userModel = {
  findById: async () => null,
};

const authTokenModel = {
  cleanupExpired: async () => 0,
  create:         async () => ({ id: 1 }),
  revoke:         async () => {},
  revokeAll:      async () => {},
  findByHash:     async () => null,
};

const tokenService = {
  generateAccessToken:  () => 'mock-access-token',
  generateRefreshToken: async () => 'mock-refresh-token',
  rotateRefreshToken:   async () => { throw Object.assign(new Error('Invalid'), { code: 'INVALID_REFRESH_TOKEN' }); },
  hashToken:            (t) => `hash-${t}`,
  verifyAccessToken:    () => ({}),
  classifyJwtError:     () => ({ status: 401, code: 'INVALID_TOKEN', message: 'invalid' }),
};

const bcryptMock = {
  hash:    async (pw) => `hashed:${pw}`,
  compare: async (pw, hash) => hash === `hashed:${pw}`,
};

// ─── inject mocks before controller is loaded ─────────────────────────────────

const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));

require.cache[fromSrc('models/user.model')]      = { id: fromSrc('models/user.model'),      filename: fromSrc('models/user.model'),      loaded: true, exports: userModel };
require.cache[fromSrc('models/authToken.model')] = { id: fromSrc('models/authToken.model'), filename: fromSrc('models/authToken.model'), loaded: true, exports: authTokenModel };
require.cache[fromSrc('services/token.service')] = { id: fromSrc('services/token.service'), filename: fromSrc('services/token.service'), loaded: true, exports: tokenService };
require.cache[require.resolve('bcryptjs')]        = { id: require.resolve('bcryptjs'),        filename: require.resolve('bcryptjs'),        loaded: true, exports: bcryptMock };

const authController = require('../src/controllers/auth.controller');

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeRes = () => {
  const r = { _status: 200 };
  r.status   = (c)   => { r._status   = c;   return r; };
  r.json     = (b)   => { r._body     = b;   return r; };
  r.redirect = (url) => { r._redirect = url; };
  return r;
};

const base = {
  id: 1, name: 'Alice', email: 'alice@example.com', role: 'customer',
  phone: null, bio: null, photo_url: null, avg_rating: 0, profile_data: null,
};

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('auth.controller – refresh', () => {
  it('400 MISSING_REFRESH_TOKEN when body is empty', async () => {
    const res = makeRes();
    await authController.refresh({ body: {} }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_REFRESH_TOKEN');
  });

  it('401 INVALID_REFRESH_TOKEN when token is invalid', async () => {
    tokenService.rotateRefreshToken = async () => { throw Object.assign(new Error('invalid'), { code: 'INVALID_REFRESH_TOKEN' }); };
    const res = makeRes();
    await authController.refresh({ body: { refreshToken: 'bad' } }, res, (e) => { throw e; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_REFRESH_TOKEN');
  });

  it('401 USER_NOT_FOUND when user was deleted after token rotation', async () => {
    tokenService.rotateRefreshToken = async () => 999;
    userModel.findById = async () => null;
    const res = makeRes();
    await authController.refresh({ body: { refreshToken: 'orphaned' } }, res, (e) => { throw e; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with new token pair on successful refresh', async () => {
    tokenService.rotateRefreshToken   = async () => 1;
    tokenService.generateAccessToken  = () => 'new-access';
    tokenService.generateRefreshToken = async () => 'new-refresh';
    userModel.findById = async () => ({ ...base });
    const res = makeRes();
    await authController.refresh({ body: { refreshToken: 'valid' } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.token, 'new-access');
    assert.equal(res._body.refreshToken, 'new-refresh');
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('auth.controller – logout', () => {
  it('400 MISSING_REFRESH_TOKEN when body is empty', async () => {
    const res = makeRes();
    await authController.logout({ body: {}, user: { userId: 1 } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_REFRESH_TOKEN');
  });

  it('revokes token hash and returns success', async () => {
    let revokedHash = null;
    tokenService.hashToken  = (t)    => `hash-${t}`;
    authTokenModel.revoke   = async (h) => { revokedHash = h; };
    const res = makeRes();
    await authController.logout({ body: { refreshToken: 'my-token' }, user: { userId: 1 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.message, 'Logged out');
    assert.equal(revokedHash, 'hash-my-token');
  });
});

// ─── googleCallback ───────────────────────────────────────────────────────────

describe('auth.controller – googleCallback', () => {
  it('redirects to frontend with token query params for new user', async () => {
    tokenService.generateAccessToken  = () => 'g-access';
    tokenService.generateRefreshToken = async () => 'g-refresh';
    const res = makeRes();
    await authController.googleCallback(
      { user: { id: 10, name: 'G User', email: 'g@g.com', photo_url: null, isNewUser: true } },
      res, (e) => { throw e; },
    );
    assert.ok(res._redirect.startsWith('http://localhost:3000/auth/callback?'));
    assert.ok(res._redirect.includes('token=g-access'));
    assert.ok(res._redirect.includes('refreshToken=g-refresh'));
    assert.ok(res._redirect.includes('isNewUser=true'));
  });

  it('sets isNewUser=false for returning users', async () => {
    tokenService.generateAccessToken  = () => 'g-access';
    tokenService.generateRefreshToken = async () => 'g-refresh';
    const res = makeRes();
    await authController.googleCallback(
      { user: { id: 11, name: 'R User', email: 'r@g.com', photo_url: null, isNewUser: false } },
      res, (e) => { throw e; },
    );
    assert.ok(res._redirect.includes('isNewUser=false'));
  });
});
