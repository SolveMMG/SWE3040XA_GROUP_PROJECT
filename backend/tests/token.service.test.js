const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const tokenService = require('../src/services/token.service');

describe('token service', () => {
  it('hashes the same token consistently', () => {
    const firstHash = tokenService.hashToken('refresh-token');
    const secondHash = tokenService.hashToken('refresh-token');

    assert.equal(firstHash, secondHash);
    assert.equal(firstHash.length, 64);
  });

  it('classifies expired JWT errors separately from invalid tokens', () => {
    assert.deepEqual(tokenService.classifyJwtError({ name: 'TokenExpiredError' }), {
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Access token has expired',
    });

    assert.deepEqual(tokenService.classifyJwtError({ name: 'JsonWebTokenError' }), {
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Access token is invalid',
    });
  });
});
