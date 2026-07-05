const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authTokenModel = require('../models/authToken.model');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRY  = process.env.JWT_EXPIRES_IN  || '1h';
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/** SHA-256 hash a token string before storing. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Sign a short-lived access JWT. */
const generateAccessToken = (userId, email) =>
  jwt.sign({ userId, email }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

/**
 * Create a random refresh token, persist its hash, and return the plaintext.
 * The plaintext is sent to the client exactly once.
 */
const generateRefreshToken = async(userId) => {
  const plaintext = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(plaintext);

  // 30 days from now
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await authTokenModel.create({ userId, tokenHash, expiresAt });

  return plaintext;
};

/**
 * Verify an access JWT. Returns the payload or throws.
 */
const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);

/**
 * Exchange a plaintext refresh token for a new access token.
 * Rotates the refresh token (revoke old, issue new).
 */
const rotateRefreshToken = async(plaintext) => {
  const tokenHash = hashToken(plaintext);
  const stored = await authTokenModel.findByHash(tokenHash);

  if (!stored) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  // Revoke old token
  await authTokenModel.revoke(tokenHash);

  // Re-fetch user info from DB would be done in the controller;
  // here we just return what we need
  return stored.user_id;
};

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  rotateRefreshToken,
};
