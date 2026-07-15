const bcrypt         = require('bcryptjs');
const userModel      = require('../models/user.model');
const authTokenModel = require('../models/authToken.model');
const tokenService   = require('../services/token.service');

const serializeUser = (u) => ({
  id:       u.id,
  name:     u.name,
  email:    u.email,
  role:     u.role,
  photoUrl: u.photo_url || null,
});

// POST /auth/register
const register = async(req, res, next) => {
  try {
    const { name, email, password, role, carType, licensePlate, licenseNumber } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'name, email, password and role are required' } });
    }
    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with that email already exists' } });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userModel.create({ name, email, passwordHash, role, carType, licensePlate, licenseNumber });
    const accessToken  = tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await tokenService.generateRefreshToken(user.id);
    authTokenModel.cleanupExpired().catch(() => {});
    return res.status(201).json({ token: accessToken, refreshToken, user: serializeUser(user) });
  } catch (err) { next(err); }
};

// POST /auth/login
const login = async(req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'email and password are required' } });
    }
    const user = await userModel.findByEmailForAuth(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    const accessToken  = tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await tokenService.generateRefreshToken(user.id);
    authTokenModel.cleanupExpired().catch(() => {});
    return res.json({ token: accessToken, refreshToken, user: serializeUser(user) });
  } catch (err) { next(err); }
};

const googleCallback = async(req, res, next) => {
  try {
    const { id, name, email, photo_url, isNewUser } = req.user;

    const accessToken  = tokenService.generateAccessToken(id, email);
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

module.exports = { register, login, googleCallback, refresh, logout };
