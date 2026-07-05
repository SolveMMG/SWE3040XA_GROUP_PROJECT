const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const authTokenModel = require('../models/authToken.model');

const accessSecret = () => process.env.JWT_SECRET;
const accessExpiry = () => process.env.JWT_EXPIRES_IN || '1h';

const parseDurationMs = (str = '30d') => {
  const match = str.match(/^(\d+)([dhm])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const v = parseInt(match[1], 10);
  if (match[2] === 'd') return v * 24 * 60 * 60 * 1000;
  if (match[2] === 'h') return v * 60 * 60 * 1000;
  if (match[2] === 'm') return v * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateAccessToken = (userId, email) =>
  jwt.sign({ userId, email }, accessSecret(), { expiresIn: accessExpiry() });

const generateRefreshToken = async(userId) => {
  const plaintext  = crypto.randomBytes(40).toString('hex');
  const tokenHash  = hashToken(plaintext);
  const expiresAt  = new Date(Date.now() + parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'));
  await authTokenModel.create({ userId, tokenHash, expiresAt });
  return plaintext;
};

const verifyAccessToken = (token) => jwt.verify(token, accessSecret());

const classifyJwtError = (err) => {
  if (err.name === 'TokenExpiredError') {
    return { status: 401, code: 'TOKEN_EXPIRED',  message: 'Access token has expired' };
  }
  return { status: 401, code: 'INVALID_TOKEN', message: 'Access token is invalid' };
};

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
