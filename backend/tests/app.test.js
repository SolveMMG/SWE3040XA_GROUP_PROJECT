const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const app = require('../src/app');
const { authenticate } = require('../src/middleware/auth');

describe('API app', () => {
  it('registers the health check route', () => {
    const routes = app._router.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    assert.ok(routes.includes('/health'));
  });

  it('mounts the authentication and user routers', () => {
    const routers = app._router.stack
      .filter((layer) => layer.name === 'router')
      .map((layer) => String(layer.regexp));

    assert.ok(routers.some((route) => route.includes('api') && route.includes('auth')));
    assert.ok(routers.some((route) => route.includes('api') && route.includes('users')));
  });

  it('requires a bearer token for protected middleware', () => {
    let statusCode;
    let payload;
    const req = { headers: {} };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
        return this;
      },
    };

    authenticate(req, res, () => {
      throw new Error('next should not be called without a token');
    });

    assert.equal(statusCode, 401);
    assert.equal(payload.error.code, 'MISSING_TOKEN');
  });
});
