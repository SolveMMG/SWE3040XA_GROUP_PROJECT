const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

process.env.JWT_SECRET      = 'test-secret-key';
process.env.JWT_EXPIRES_IN  = '1h';
process.env.FRONTEND_URL    = 'http://localhost:3000';

// ─── mutable mocks ────────────────────────────────────────────────────────────

const userModel = {
  findByEmail:        async () => null,
  findByEmailForAuth: async () => null,
  create:             async () => null,
  findById:           async () => null,
  update:             async () => null,
  remove:             async () => {},
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
  rotateRefreshToken:   async () => { const e = Object.assign(new Error('Invalid'), { code: 'INVALID_REFRESH_TOKEN' }); throw e; },
  hashToken:            (t) => `hash-${t}`,
  verifyAccessToken:    () => ({}),
  classifyJwtError:     () => ({ status: 401, code: 'INVALID_TOKEN', message: 'invalid' }),
};

// bcrypt mock: hash = "hashed:<plaintext>", compare checks that invariant
const bcryptMock = {
  hash:    async (password) => `hashed:${password}`,
  compare: async (password, hash) => hash === `hashed:${password}`,
};

// ─── inject mocks into require.cache before loading controller ────────────────

const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));

require.cache[fromSrc('models/user.model')]      = { id: fromSrc('models/user.model'),      filename: fromSrc('models/user.model'),      loaded: true, exports: userModel };
require.cache[fromSrc('models/authToken.model')] = { id: fromSrc('models/authToken.model'), filename: fromSrc('models/authToken.model'), loaded: true, exports: authTokenModel };
require.cache[fromSrc('services/token.service')] = { id: fromSrc('services/token.service'), filename: fromSrc('services/token.service'), loaded: true, exports: tokenService };
require.cache[require.resolve('bcryptjs')]        = { id: require.resolve('bcryptjs'),        filename: require.resolve('bcryptjs'),        loaded: true, exports: bcryptMock };

const authController = require('../src/controllers/auth.controller');

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeRes = () => {
  const r = { _status: 200 };
  r.status   = (c)   => { r._status   = c;   return r; };
  r.json     = (b)   => { r._body     = b;   return r; };
  r.redirect = (url) => { r._redirect = url; };
  return r;
};

const baseUser = {
  id: 1, name: 'Alice', email: 'alice@example.com', role: 'customer',
  phone: null, bio: null, photo_url: null, avg_rating: 0, profile_data: null,
};

// ─── register ─────────────────────────────────────────────────────────────────

describe('auth.controller – register', () => {
  it('400 when required fields are missing', async () => {
    const req = { body: { name: 'Alice' } };
    const res = makeRes();
    await authController.register(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_FIELDS');
  });

  it('409 when email is already taken', async () => {
    userModel.findByEmail = async () => ({ id: 99, email: 'taken@example.com' });
    const req = { body: { name: 'Alice', email: 'taken@example.com', password: 'pw', role: 'customer' } };
    const res = makeRes();
    await authController.register(req, res, (err) => { throw err; });
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'EMAIL_TAKEN');
  });

  it('201 with tokens on successful customer registration', async () => {
    userModel.findByEmail = async () => null;
    userModel.create      = async () => ({ ...baseUser });
    const req = { body: { name: 'Alice', email: 'alice@example.com', password: 'pass123', role: 'customer' } };
    const res = makeRes();
    await authController.register(req, res, (err) => { throw err; });
    assert.equal(res._status, 201);
    assert.equal(res._body.token, 'mock-access-token');
    assert.equal(res._body.refreshToken, 'mock-refresh-token');
    assert.equal(res._body.user.email, 'alice@example.com');
    assert.notEqual(res._body.user.customerProfile, null);
    assert.equal(res._body.user.driverProfile, null);
  });

  it('201 with driver role and driverProfile key present', async () => {
    userModel.findByEmail = async () => null;
    userModel.create      = async () => ({ ...baseUser, role: 'driver' });
    const req = { body: { name: 'Bob', email: 'bob@example.com', password: 'pass', role: 'driver', vehicle: 'Toyota', licensePlate: 'ABC123', seats: 4 } };
    const res = makeRes();
    await authController.register(req, res, (err) => { throw err; });
    assert.equal(res._status, 201);
    assert.equal(res._body.user.role, 'driver');
    assert.ok('driverProfile' in res._body.user);
    assert.equal(res._body.user.customerProfile, null);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('auth.controller – login', () => {
  it('400 when email or password is missing', async () => {
    const req = { body: { email: 'a@b.com' } };
    const res = makeRes();
    await authController.login(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_FIELDS');
  });

  it('401 when user is not found', async () => {
    userModel.findByEmailForAuth = async () => null;
    const req = { body: { email: 'nobody@example.com', password: 'pw' } };
    const res = makeRes();
    await authController.login(req, res, (err) => { throw err; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_CREDENTIALS');
  });

  it('401 when user has no password_hash (OAuth-only account)', async () => {
    userModel.findByEmailForAuth = async () => ({ ...baseUser, password_hash: null });
    const req = { body: { email: 'alice@example.com', password: 'any' } };
    const res = makeRes();
    await authController.login(req, res, (err) => { throw err; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_CREDENTIALS');
  });

  it('401 when password does not match', async () => {
    userModel.findByEmailForAuth = async () => ({ ...baseUser, password_hash: 'hashed:correct-password' });
    const req = { body: { email: 'alice@example.com', password: 'wrong-password' } };
    const res = makeRes();
    await authController.login(req, res, (err) => { throw err; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_CREDENTIALS');
  });

  it('200 with tokens on successful login', async () => {
    userModel.findByEmailForAuth = async () => ({ ...baseUser, password_hash: 'hashed:correct-password' });
    tokenService.generateAccessToken  = () => 'mock-access-token';
    tokenService.generateRefreshToken = async () => 'mock-refresh-token';
    const req = { body: { email: 'alice@example.com', password: 'correct-password' } };
    const res = makeRes();
    await authController.login(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.token, 'mock-access-token');
    assert.equal(res._body.refreshToken, 'mock-refresh-token');
    assert.equal(res._body.user.email, 'alice@example.com');
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('auth.controller – refresh', () => {
  it('400 when refreshToken is absent', async () => {
    const req = { body: {} };
    const res = makeRes();
    await authController.refresh(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_REFRESH_TOKEN');
  });

  it('401 when refreshToken is invalid or expired', async () => {
    tokenService.rotateRefreshToken = async () => {
      throw Object.assign(new Error('Invalid'), { code: 'INVALID_REFRESH_TOKEN' });
    };
    const req = { body: { refreshToken: 'bad-token' } };
    const res = makeRes();
    await authController.refresh(req, res, (err) => { throw err; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'INVALID_REFRESH_TOKEN');
  });

  it('401 when user no longer exists after rotation', async () => {
    tokenService.rotateRefreshToken = async () => 999;
    userModel.findById = async () => null;
    const req = { body: { refreshToken: 'orphaned-token' } };
    const res = makeRes();
    await authController.refresh(req, res, (err) => { throw err; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with new tokens on successful refresh', async () => {
    tokenService.rotateRefreshToken   = async () => 1;
    tokenService.generateAccessToken  = () => 'new-access-token';
    tokenService.generateRefreshToken = async () => 'new-refresh-token';
    userModel.findById = async () => ({ ...baseUser });
    const req = { body: { refreshToken: 'valid-token' } };
    const res = makeRes();
    await authController.refresh(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.token, 'new-access-token');
    assert.equal(res._body.refreshToken, 'new-refresh-token');
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('auth.controller – logout', () => {
  it('400 when refreshToken is absent', async () => {
    const req = { body: {}, user: { userId: 1 } };
    const res = makeRes();
    await authController.logout(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'MISSING_REFRESH_TOKEN');
  });

  it('revokes the token and returns a success message', async () => {
    let revokedHash = null;
    tokenService.hashToken  = (t)    => `hash-${t}`;
    authTokenModel.revoke   = async (h) => { revokedHash = h; };
    const req = { body: { refreshToken: 'my-token' }, user: { userId: 1 } };
    const res = makeRes();
    await authController.logout(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.message, 'Logged out');
    assert.equal(revokedHash, 'hash-my-token');
  });
});

// ─── googleCallback ───────────────────────────────────────────────────────────

describe('auth.controller – googleCallback', () => {
  it('redirects to frontend with token query params', async () => {
    tokenService.generateAccessToken  = () => 'g-access';
    tokenService.generateRefreshToken = async () => 'g-refresh';
    const req = {
      user: { id: 10, name: 'Google User', email: 'g@google.com', photo_url: null, isNewUser: true },
    };
    const res = makeRes();
    await authController.googleCallback(req, res, (err) => { throw err; });
    assert.ok(res._redirect.startsWith('http://localhost:3000/auth/callback?'));
    assert.ok(res._redirect.includes('token=g-access'));
    assert.ok(res._redirect.includes('refreshToken=g-refresh'));
    assert.ok(res._redirect.includes('isNewUser=true'));
  });

  it('sets isNewUser=false for returning users', async () => {
    tokenService.generateAccessToken  = () => 'g-access';
    tokenService.generateRefreshToken = async () => 'g-refresh';
    const req = {
      user: { id: 11, name: 'Returning User', email: 'r@google.com', photo_url: null, isNewUser: false },
    };
    const res = makeRes();
    await authController.googleCallback(req, res, (err) => { throw err; });
    assert.ok(res._redirect.includes('isNewUser=false'));
  });
});
