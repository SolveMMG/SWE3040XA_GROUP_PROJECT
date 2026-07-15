const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

// ─── mutable mocks ────────────────────────────────────────────────────────────

const userModel = {
  findById: async () => null,
  update:   async () => null,
  remove:   async () => {},
};

const authTokenModel = {
  revokeAll: async () => {},
};

// ─── inject mocks into require.cache before loading controller ────────────────

const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));

require.cache[fromSrc('models/user.model')]      = { id: fromSrc('models/user.model'),      filename: fromSrc('models/user.model'),      loaded: true, exports: userModel };
require.cache[fromSrc('models/authToken.model')] = { id: fromSrc('models/authToken.model'), filename: fromSrc('models/authToken.model'), loaded: true, exports: authTokenModel };

const userController = require('../src/controllers/user.controller');

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body   = b; return r; };
  return r;
};

const dbUser = {
  id: 1, name: 'Alice', email: 'alice@example.com', bio: 'Hello there',
  role: 'customer', photo_url: null, avg_rating: 4.5, ride_count: 3, created_at: new Date(),
};

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('user.controller – getMe', () => {
  it('404 when user does not exist', async () => {
    userModel.findById = async () => null;
    const req = { user: { userId: 999 } };
    const res = makeRes();
    await userController.getMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with private user fields (email, rideCount, createdAt present; no password_hash)', async () => {
    userModel.findById = async () => ({ ...dbUser });
    const req = { user: { userId: 1 } };
    const res = makeRes();
    await userController.getMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.name, 'Alice');
    assert.equal(res._body.email, 'alice@example.com');
    assert.ok('rideCount'  in res._body);
    assert.ok('createdAt'  in res._body);
    assert.ok(!('password_hash' in res._body));
  });
});

// ─── updateMe ─────────────────────────────────────────────────────────────────

describe('user.controller – updateMe', () => {
  it('400 INVALID_NAME when name is a whitespace-only string', async () => {
    const req = { user: { userId: 1 }, body: { name: '   ' } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_NAME');
  });

  it('400 INVALID_NAME when name is an empty string', async () => {
    const req = { user: { userId: 1 }, body: { name: '' } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_NAME');
  });

  it('400 INVALID_BIO when bio is not a string', async () => {
    const req = { user: { userId: 1 }, body: { bio: 42 } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_BIO');
  });

  it('400 INVALID_ROLE when role is not passenger or driver', async () => {
    const req = { user: { userId: 1 }, body: { role: 'admin' } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_ROLE');
  });

  it('400 INVALID_PHOTO_URL when photoUrl is not a string', async () => {
    const req = { user: { userId: 1 }, body: { photoUrl: 123 } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_PHOTO_URL');
  });

  it('404 when update returns null (user not found)', async () => {
    userModel.update = async () => null;
    const req = { user: { userId: 999 }, body: { name: 'New Name' } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with updated user data on success', async () => {
    userModel.update = async () => ({ ...dbUser, name: 'Alice Updated' });
    const req = { user: { userId: 1 }, body: { name: 'Alice Updated' } };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.name, 'Alice Updated');
    assert.equal(res._body.email, 'alice@example.com');
  });

  it('200 when body is empty (calls update with no-op, returns current user)', async () => {
    userModel.update = async () => ({ ...dbUser });
    const req = { user: { userId: 1 }, body: {} };
    const res = makeRes();
    await userController.updateMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.name, 'Alice');
  });
});

// ─── getUserById ──────────────────────────────────────────────────────────────

describe('user.controller – getUserById', () => {
  it('400 INVALID_ID when id is not a valid integer', async () => {
    const req = { params: { id: 'abc' } };
    const res = makeRes();
    await userController.getUserById(req, res, (err) => { throw err; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_ID');
  });

  it('404 when user does not exist', async () => {
    userModel.findById = async () => null;
    const req = { params: { id: '999' } };
    const res = makeRes();
    await userController.getUserById(req, res, (err) => { throw err; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with public profile (no email, no password_hash)', async () => {
    userModel.findById = async () => ({ ...dbUser });
    const req = { params: { id: '1' } };
    const res = makeRes();
    await userController.getUserById(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.name, 'Alice');
    assert.ok(!('email'         in res._body));
    assert.ok(!('password_hash' in res._body));
    assert.ok('avgRating' in res._body);
    assert.ok('rideCount' in res._body);
  });
});

// ─── deleteMe ─────────────────────────────────────────────────────────────────

describe('user.controller – deleteMe', () => {
  it('revokes all tokens, removes user, and returns success', async () => {
    let revokedId = null;
    let removedId = null;
    authTokenModel.revokeAll = async (id) => { revokedId = id; };
    userModel.remove         = async (id) => { removedId = id; };
    const req = { user: { userId: 42 } };
    const res = makeRes();
    await userController.deleteMe(req, res, (err) => { throw err; });
    assert.equal(res._status, 200);
    assert.equal(res._body.message, 'Account deleted');
    assert.equal(revokedId, 42);
    assert.equal(removedId, 42);
  });
});
