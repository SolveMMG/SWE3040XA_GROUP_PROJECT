const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const path = require('node:path');

const userModel = {
  findById: async () => null,
  update:   async () => null,
  remove:   async () => {},
};

const authTokenModel = { revokeAll: async () => {} };

const fromSrc = (rel) => require.resolve(path.join(__dirname, '../src', rel));

require.cache[fromSrc('models/user.model')]      = { id: fromSrc('models/user.model'),      filename: fromSrc('models/user.model'),      loaded: true, exports: userModel };
require.cache[fromSrc('models/authToken.model')] = { id: fromSrc('models/authToken.model'), filename: fromSrc('models/authToken.model'), loaded: true, exports: authTokenModel };

const userController = require('../src/controllers/user.controller');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body   = b; return r; };
  return r;
};

const dbUser = {
  id: 1, name: 'Alice', email: 'alice@example.com', bio: 'Hi',
  role: 'customer', photo_url: null, avg_rating: 4.5, ride_count: 3, created_at: new Date(),
};

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('user.controller – getMe', () => {
  it('404 USER_NOT_FOUND when user does not exist', async () => {
    userModel.findById = async () => null;
    const res = makeRes();
    await userController.getMe({ user: { userId: 999 } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with private fields (email, rideCount, createdAt) and no password_hash', async () => {
    userModel.findById = async () => ({ ...dbUser });
    const res = makeRes();
    await userController.getMe({ user: { userId: 1 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.email, 'alice@example.com');
    assert.ok('rideCount'  in res._body);
    assert.ok('createdAt'  in res._body);
    assert.ok(!('password_hash' in res._body));
  });
});

// ─── updateMe ─────────────────────────────────────────────────────────────────

describe('user.controller – updateMe', () => {
  it('404 USER_NOT_FOUND when update returns null', async () => {
    userModel.update = async () => null;
    const res = makeRes();
    await userController.updateMe({ user: { userId: 999 }, body: { name: 'New' } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with updated user data', async () => {
    userModel.update = async () => ({ ...dbUser, name: 'Alice Updated' });
    const res = makeRes();
    await userController.updateMe({ user: { userId: 1 }, body: { name: 'Alice Updated' } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.name, 'Alice Updated');
  });

  it('200 for no-op update (empty body)', async () => {
    userModel.update = async () => ({ ...dbUser });
    const res = makeRes();
    await userController.updateMe({ user: { userId: 1 }, body: {} }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
  });
});

// ─── getUserById ──────────────────────────────────────────────────────────────

describe('user.controller – getUserById', () => {
  it('400 INVALID_ID when id param is not a number', async () => {
    const res = makeRes();
    await userController.getUserById({ params: { id: 'abc' } }, res, (e) => { throw e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_ID');
  });

  it('404 USER_NOT_FOUND when user does not exist', async () => {
    userModel.findById = async () => null;
    const res = makeRes();
    await userController.getUserById({ params: { id: '999' } }, res, (e) => { throw e; });
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'USER_NOT_FOUND');
  });

  it('200 with public fields (no email, no password_hash)', async () => {
    userModel.findById = async () => ({ ...dbUser });
    const res = makeRes();
    await userController.getUserById({ params: { id: '1' } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.name, 'Alice');
    assert.ok(!('email'         in res._body));
    assert.ok(!('password_hash' in res._body));
    assert.ok('avgRating' in res._body);
  });
});

// ─── deleteMe ─────────────────────────────────────────────────────────────────

describe('user.controller – deleteMe', () => {
  it('revokes all tokens, deletes user, and returns success', async () => {
    let revokedId = null;
    let removedId = null;
    authTokenModel.revokeAll = async (id) => { revokedId = id; };
    userModel.remove         = async (id) => { removedId = id; };
    const res = makeRes();
    await userController.deleteMe({ user: { userId: 42 } }, res, (e) => { throw e; });
    assert.equal(res._status, 200);
    assert.equal(res._body.message, 'Account deleted');
    assert.equal(revokedId, 42);
    assert.equal(removedId, 42);
  });
});
