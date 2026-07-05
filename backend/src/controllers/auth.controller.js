const userModel = require('../models/user.model');
const authTokenModel = require('../models/authToken.model');
const tokenService = require('../services/token.service');

/**
 * GET /auth/google/callback
 * Passport has already authenticated the user and attached them to req.user.
 * Issue tokens and redirect to the frontend.
 */
const googleCallback = async(req, res, next) => {
  try {
    const { id, name, email, photo_url, isNewUser } = req.user;

    const accessToken  = tokenService.generateAccessToken(id, email);
    const refreshToken = await tokenService.generateRefreshToken(id);

    // Redirect to SPA — frontend reads these from the query string once,
    // stores the JWT, and discards the URL params.
    const params = new URLSearchParams({
      token: accessToken,
      refreshToken,
      userId: id,
    });

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 * Returns a new access token + rotated refresh token.
 */
const refresh = async(req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'refreshToken is required' } });
    }

    const userId = await tokenService.rotateRefreshToken(refreshToken);
    const user   = await userModel.findById(userId);

    if (!user) {
      return res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' } });
    }

    const newAccessToken  = tokenService.generateAccessToken(user.id, user.email);
    const newRefreshToken = await tokenService.generateRefreshToken(user.id);

    return res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.code === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({ error: { code: err.code, message: err.message } });
    }
    next(err);
  }
};

/**
 * POST /auth/logout
 * Bearer — revokes the provided refresh token.
 * Body: { refreshToken }
 */
const logout = async(req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'refreshToken is required' } });
    }

    const tokenHash = tokenService.hashToken(refreshToken);
    await authTokenModel.revoke(tokenHash);

    return res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

module.exports = { googleCallback, refresh, logout };
