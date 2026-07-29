const userModel      = require('../models/user.model');
const authTokenModel = require('../models/authToken.model');
const tokenService   = require('../services/token.service');
const bcrypt = require('bcryptjs');

const issueTokens = async(user) => ({
  token: tokenService.generateAccessToken(user.id, user.email, user.role),
  refreshToken: await tokenService.generateRefreshToken(user.id),
});

const register = async(req, res, next) => {
  try {
    const { name, email, password, role = 'passenger' } = req.body;
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'name, email, and password are required' } });
    }
    if (password.length < 8) return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'password must be at least 8 characters' } });
    if (!['passenger', 'driver'].includes(role)) return res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'role must be passenger or driver' } });
    const normalizedEmail = email.trim().toLowerCase();
    if (await userModel.findAuthByEmail(normalizedEmail)) {
      return res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'An account already exists for this email' } });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userModel.create({ name: name.trim(), email: normalizedEmail, photoUrl: null, passwordHash, isApproved: role !== 'driver' });
    const updated = await userModel.update(user.id, { role });
    return res.status(201).json({ user: updated, ...(await issueTokens(updated)) });
  } catch (err) { next(err); }
};

const login = async(req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'email and password are required' } });
    }
    const user = await userModel.findAuthByEmail(email.trim().toLowerCase());
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
    }
    const profile = await userModel.findById(user.id);
    return res.json({ user: profile, ...(await issueTokens(profile)) });
  } catch (err) { next(err); }
};

const googleCallback = async(req, res, next) => {
  try {
    const { id, name, email, photo_url, isNewUser } = req.user;

const accessToken = tokenService.generateAccessToken(id, email, req.user.role);
    const refreshToken = await tokenService.generateRefreshToken(id);

    // Prune any expired tokens on each login — fire-and-forget, non-blocking
    authTokenModel.cleanupExpired().catch(() => {});

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

module.exports = { googleCallback, register, login, refresh, logout };
