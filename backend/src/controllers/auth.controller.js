const bcrypt           = require('bcryptjs');
const userModel        = require('../models/user.model');
const authTokenModel   = require('../models/authToken.model');
const tokenService     = require('../services/token.service');

// ---------- helpers ----------

function buildUserResponse(user) {
  const role = user.role; // already mapped to 'customer'/'driver' by the model
  return {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role,
    phone:      user.phone          || '',
    bio:        user.bio            || '',
    photoUrl:   user.photo_url      || '',
    rating:     user.avg_rating     || 0,
    customerProfile: role === 'customer' ? (user.profile_data || { homeArea: '', preferredPayment: 'Card' }) : null,
    driverProfile:   role === 'driver'   ? (user.profile_data || null) : null,
  };
}

async function issueTokens(userId, email) {
  const token        = tokenService.generateAccessToken(userId, email);
  const refreshToken = await tokenService.generateRefreshToken(userId);
  authTokenModel.cleanupExpired().catch(() => {});
  return { token, refreshToken };
}

// ---------- local auth ----------

const register = async(req, res, next) => {
  try {
    const {
      name, email, password, role,
      phone, homeArea, preferredPayment,
      vehicle, licensePlate, seats, driverLicense,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'name, email, password, and role are required.' },
      });
    }

    const existing = await userModel.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({
        error: { code: 'EMAIL_TAKEN', message: 'An account already exists for this email.' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const profileData = role === 'driver'
      ? { vehicle, licensePlate, seats: Number(seats) || 0, driverLicense }
      : { homeArea, preferredPayment };

    const user = await userModel.create({
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      passwordHash,
      role,
      phone:        phone ? phone.trim() : null,
      profileData,
    });

    const { token, refreshToken } = await issueTokens(user.id, user.email);

    return res.status(201).json({ token, refreshToken, user: buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

const login = async(req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'email and password are required.' },
      });
    }

    const user = await userModel.findByEmailForAuth(email);
    const invalidMsg = 'No account matches that email and password.';

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: invalidMsg } });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: invalidMsg } });
    }

    const { token, refreshToken } = await issueTokens(user.id, user.email);

    return res.json({ token, refreshToken, user: buildUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

// ---------- Google OAuth ----------

const googleCallback = async(req, res, next) => {
  try {
    const { id, name, email, photo_url, isNewUser } = req.user;

    const { token, refreshToken } = await issueTokens(id, email);

    const params = new URLSearchParams({
      token,
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

// ---------- token management ----------

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
