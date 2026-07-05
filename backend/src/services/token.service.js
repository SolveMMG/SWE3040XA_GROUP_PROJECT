const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authTokenModel = require('../models/authToken.model');

// Secrets are read lazily inside functions so that dotenv is always loaded first.
const accessSecret  = () => process.env.JWT_SECRET;
const accessExpiry  = () => process.env.JWT_EXPIRES_IN || '1h';

/**
 * Parse a duration string like "30d", "7d", "24h" into milliseconds.
 * Used to compute the refresh-token expiry date stored in the DB.
 */
const parseDurationMs = (str = '30d') => {
  const match = str.match(/^(\d+)([dhm])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
  const value = parseInt(match[1], 10);
  const unit  = match[2];
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'm') return value * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
};

/** SHA-256 hash a token string before storing. Never store plaintext. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Sign a short-lived access JWT. Payload: { userId, email }. */
const generateAccessToken = (userId, email) =>
  jwt.sign({ userId, email }, accessSecret(), { expiresIn: accessExpiry() });

/**
 * Create a cryptographically random refresh token, persist its hash to the DB,
 * and return the plaintext. The plaintext is sent to the client exactly once.
 */
const generateRefreshToken = async(userId) => {
  const plaintext  = crypto.randomBytes(40).toString('hex');
  const tokenHash  = hashToken(plaintext);
  const durationMs = parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d');
  const expiresAt  = new Date(Date.now() + durationMs);

  await authTokenModel.create({ userId, tokenHash, expiresAt });
  return plaintext;
};

/**
 * Verify a JWT access token.
 * Returns the decoded payload { userId, email, iat, exp } or throws.
 */
const verifyAccessToken = (token) => jwt.verify(token, accessSecret());

/**
 * Classify a jsonwebtoken error into a standard API error shape.
 * Used by the auth middleware (A6) to return consistent 401 responses.
 */
const classifyJwtError = (err) => {
  if (err.name === 'TokenExpiredError') {
    return { status: 401, code: 'TOKEN_EXPIRED', message: 'Access token has expired' };
  }
  return { status: 401, code: 'INVALID_TOKEN', message: 'Access token is invalid' };
};

/**
 * Validate a plaintext refresh token, revoke it, and return the owner's userId.
 * Implements token rotation — the caller must immediately issue a new refresh token.
 */
const rotateRefreshToken = async(plaintext) => {
  const tokenHash = hashToken(plaintext);
  const stored    = await authTokenModel.findByHash(tokenHash);

  if (!stored) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code   = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  await authTokenModel.revoke(tokenHash);
  return stored.user_id;
};

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  classifyJwtError,
  rotateRefreshToken,
};
