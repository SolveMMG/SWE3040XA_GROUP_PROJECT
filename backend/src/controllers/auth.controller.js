const userModel      = require('../models/user.model');
const authTokenModel = require('../models/authToken.model');
const tokenService   = require('../services/token.service');

const googleCallback = async(req, res, next) => {
  try {
    const { id, name, email, photo_url, isNewUser } = req.user;

    const accessToken  = tokenService.generateAccessToken(id, email);
    const refreshToken = await tokenService.generateRefreshToken(id);

    const params = new URLSearchParams({
      token: accessToken,
      refreshToken,
      id:        id,
      name:      name      || '',
      email:     email     || '',
      photoUrl:  photo_url || '',
      isNewUser: isNewUser ? 'true' : 'false',
    });

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    next(err);
  }
};

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

    const newAccess  = tokenService.generateAccessToken(user.id, user.email);
    const newRefresh = await tokenService.generateRefreshToken(user.id);
    return res.json({ token: newAccess, refreshToken: newRefresh });
  } catch (err) {
    if (err.code === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({ error: { code: err.code, message: err.message } });
    }
    next(err);
  }
};

const logout = async(req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'refreshToken is required' } });
    }
    await authTokenModel.revoke(tokenService.hashToken(refreshToken));
    return res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

module.exports = { googleCallback, refresh, logout };
