const tokenService = require('../services/token.service');

const extractBearer = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
};

const authenticate = (req, res, next) => {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({
      error: { code: 'MISSING_TOKEN', message: 'Authorization header with Bearer token is required' },
    });
  }
  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    return next();
  } catch (err) {
    const { status, code, message } = tokenService.classifyJwtError(err);
    return res.status(status).json({ error: { code, message } });
  }
};

const optionalAuthenticate = (req, _res, next) => {
  const token = extractBearer(req);
  if (token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = { userId: payload.userId, email: payload.email };
    } catch (_err) { /* ignore */ }
  }
  return next();
};

module.exports = { authenticate, optionalAuthenticate };
