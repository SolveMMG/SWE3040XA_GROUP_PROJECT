const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

process.env.JWT_SECRET = 'test-secret-key';

const app = require('../src/app');
const { authenticate } = require('../src/middleware/auth');

const makeRes = () => {
  const r = { _status: 200 };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body  = b; return r; };
  return r;
};

// ─── routes ───────────────────────────────────────────────────────────────────

describe('API app – route mounting', () => {
  it('exposes a /health endpoint', () => {
    const routes = app._router.stack
      .filter((l) => l.route)
      .map((l) => l.route.path);
    assert.ok(routes.includes('/health'));
  });

  const expectedPaths = ['auth', 'users', 'rides', 'uploads', 'bookings', 'payments', 'reviews'];
  for (const name of expectedPaths) {
    it(`mounts the /${name} router`, () => {
      const routers = app._router.stack
        .filter((l) => l.name === 'router')
        .map((l) => String(l.regexp));
      assert.ok(routers.some((r) => r.includes(name)), `/${name} router not found`);
    });
  }
});

// ─── 404 handler ─────────────────────────────────────────────────────────────

describe('API app – 404 handler', () => {
  it('returns NOT_FOUND for unrecognised routes', () => {
    // find the 2-arg catch-all (the 404 handler)
    const handler = app._router.stack
      .filter((l) => !l.route && !l.name?.match(/^(query|expressInit|router|bound dispatch|jsonParser|urlencodedParser|helmet|cors|morgan|rateLimit|logger)$/))
      .map((l) => l.handle)
      .find((fn) => fn.length === 2);

    assert.ok(handler, '404 handler not found');
    const res = makeRes();
    handler({}, res);
    assert.equal(res._status, 404);
    assert.equal(res._body.error.code, 'NOT_FOUND');
  });
});

// ─── error handlers ───────────────────────────────────────────────────────────

describe('API app – error handlers', () => {
  // Collect all 4-arg middleware (error handlers) in order
  const errorHandlers = app._router.stack
    .filter((l) => l.handle.length === 4)
    .map((l) => l.handle);

  // errorHandlers[0] = JSON parse error handler
  // errorHandlers[1] = central error handler

  it('handles JSON parse errors → 400 INVALID_JSON', () => {
    const [jsonHandler] = errorHandlers;
    const res = makeRes();
    let nextErr = null;
    jsonHandler({ type: 'entity.parse.failed' }, {}, res, (e) => { nextErr = e; });
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_JSON');
  });

  it('passes non-JSON-parse errors to next handler', () => {
    const [jsonHandler] = errorHandlers;
    const res = makeRes();
    const originalErr = new Error('other');
    let received = null;
    jsonHandler(originalErr, {}, res, (e) => { received = e; });
    assert.equal(received, originalErr);
  });

  it('DB unique constraint (23505) → 409 CONFLICT', () => {
    const central = errorHandlers[errorHandlers.length - 1];
    const res = makeRes();
    central({ code: '23505' }, {}, res, () => {});
    assert.equal(res._status, 409);
    assert.equal(res._body.error.code, 'CONFLICT');
  });

  it('DB foreign key violation (23503) → 400 INVALID_REFERENCE', () => {
    const central = errorHandlers[errorHandlers.length - 1];
    const res = makeRes();
    central({ code: '23503' }, {}, res, () => {});
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'INVALID_REFERENCE');
  });

  it('DB not-null / check constraint (23502) → 400 VALIDATION_ERROR', () => {
    const central = errorHandlers[errorHandlers.length - 1];
    const res = makeRes();
    central({ code: '23502' }, {}, res, () => {});
    assert.equal(res._status, 400);
    assert.equal(res._body.error.code, 'VALIDATION_ERROR');
  });

  it('error with custom status uses that status', () => {
    const central = errorHandlers[errorHandlers.length - 1];
    const res = makeRes();
    central({ status: 403, message: 'Forbidden' }, {}, res, () => {});
    assert.equal(res._status, 403);
  });

  it('generic error defaults to 500', () => {
    const central = errorHandlers[errorHandlers.length - 1];
    const res = makeRes();
    central(new Error('boom'), {}, res, () => {});
    assert.equal(res._status, 500);
  });
});

// ─── authenticate middleware (smoke test) ────────────────────────────────────

describe('authenticate middleware', () => {
  it('401 MISSING_TOKEN when no Authorization header is provided', () => {
    const res = makeRes();
    let ok = false;
    authenticate({ headers: {} }, res, () => { ok = true; });
    assert.equal(res._status, 401);
    assert.equal(res._body.error.code, 'MISSING_TOKEN');
    assert.equal(ok, false);
  });
});
