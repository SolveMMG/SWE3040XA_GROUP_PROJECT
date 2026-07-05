const tokenService = require('../services/token.service');

/**
 * Extract the Bearer token from the Authorization header.
 * Returns the token string or null.
 */
const extractBearer = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
};

/**
 * authenticate — required auth middleware.
 *
 * Verifies the JWT in the Authorization: Bearer <token> header.
 * On success, attaches { userId, email } to req.user and calls next().
 * On failure, responds immediately with 401.
 *
 * Usage: router.get('/protected', authenticate, handler)
 */
const authenticate = (req, res, next) => {
  const token = extractBearer(req);

  if (!token) {
    return res.status(401).json({
      error: { code: 'MISSING_TOKEN', message: 'Authorization header with Bearer token is required' },
    });
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    // Attach only what controllers need — never the full raw JWT payload
    req.user = { userId: payload.userId, email: payload.email };
    return next();
  } catch (err) {
    const { status, code, message } = tokenService.classifyJwtError(err);
    return res.status(status).json({ error: { code, message } });
  }
};

/**
 * optionalAuthenticate — soft auth middleware.
 *
 * Same as authenticate but never blocks the request.
 * If a valid token is present, req.user is populated.
 * If absent or invalid, req.user remains undefined and the request continues.
 *
 * Useful for public routes that return extra data for logged-in users
 * (e.g. GET /listings could flag listings the user already inquired on).
 *
 * Usage: router.get('/public', optionalAuthenticate, handler)
 */
const optionalAuthenticate = (req, _res, next) => {
  const token = extractBearer(req);
  if (token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = { userId: payload.userId, email: payload.email };
    } catch (_err) {
      // Invalid token on an optional route — silently ignore
    }
  }
  return next();
};

module.exports = { authenticate, optionalAuthenticate };
