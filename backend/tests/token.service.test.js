const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

const tokenService = require('../src/services/token.service');

describe('token service', () => {
  // ─── hashToken ──────────────────────────────────────────────────────────────

  it('hashes the same token consistently', () => {
    const a = tokenService.hashToken('refresh-token');
    const b = tokenService.hashToken('refresh-token');
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it('produces different hashes for different inputs', () => {
    assert.notEqual(tokenService.hashToken('abc'), tokenService.hashToken('xyz'));
  });

  // ─── generateAccessToken / verifyAccessToken ────────────────────────────────

  it('generates a verifiable access token with the correct payload', () => {
    const token = tokenService.generateAccessToken(42, 'user@example.com');
    const payload = tokenService.verifyAccessToken(token);
    assert.equal(payload.userId, 42);
    assert.equal(payload.email, 'user@example.com');
  });

  it('throws JsonWebTokenError when verifying a tampered token', () => {
    assert.throws(
      () => tokenService.verifyAccessToken('not.a.real.token'),
      { name: 'JsonWebTokenError' },
    );
  });

  it('throws JsonWebTokenError when verifying a token signed with a different secret', () => {
    const token = jwt.sign({ userId: 1, email: 'a@b.com' }, 'wrong-secret', { expiresIn: '1h' });
    assert.throws(
      () => tokenService.verifyAccessToken(token),
      { name: 'JsonWebTokenError' },
    );
  });

  it('throws TokenExpiredError for an already-expired token', () => {
    const token = jwt.sign(
      { userId: 1, email: 'a@b.com', exp: Math.floor(Date.now() / 1000) - 3600 },
      'test-secret-key',
    );
    assert.throws(
      () => tokenService.verifyAccessToken(token),
      { name: 'TokenExpiredError' },
    );
  });

  // ─── classifyJwtError ───────────────────────────────────────────────────────

  it('classifies TokenExpiredError correctly', () => {
    assert.deepEqual(tokenService.classifyJwtError({ name: 'TokenExpiredError' }), {
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Access token has expired',
    });
  });

  it('classifies JsonWebTokenError correctly', () => {
    assert.deepEqual(tokenService.classifyJwtError({ name: 'JsonWebTokenError' }), {
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Access token is invalid',
    });
  });

  it('classifies any unknown JWT error as INVALID_TOKEN', () => {
    const result = tokenService.classifyJwtError({ name: 'SomethingUnknown' });
    assert.equal(result.status, 401);
    assert.equal(result.code, 'INVALID_TOKEN');
  });
});
