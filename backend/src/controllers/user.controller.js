const userModel      = require('../models/user.model');
const authTokenModel = require('../models/authToken.model');

const VALID_ROLES = ['passenger', 'driver'];

const serializePrivate = (u) => ({
  id:         u.id,
  name:       u.name,
  email:      u.email,
  bio:        u.bio       || null,
  role:       u.role,
  photoUrl:   u.photo_url || null,
  avgRating:  u.avg_rating  ?? 0,
  rideCount:  u.ride_count  ?? 0,
  createdAt:  u.created_at,
});

const serializePublic = (u) => ({
  id:         u.id,
  name:       u.name,
  bio:        u.bio       || null,
  role:       u.role,
  photoUrl:   u.photo_url || null,
  avgRating:  u.avg_rating  ?? 0,
  rideCount:  u.ride_count  ?? 0,
});

// GET /users/me
const getMe = async(req, res, next) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return res.json(serializePrivate(user));
  } catch (err) { next(err); }
};

// PUT /users/me
const updateMe = async(req, res, next) => {
  try {
    const { name, bio, role, photoUrl } = req.body;

    if (name     !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: { code: 'INVALID_NAME', message: 'name must be a non-empty string' } });
    }
    if (bio      !== undefined && typeof bio !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_BIO', message: 'bio must be a string' } });
    }
    if (role     !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: { code: 'INVALID_ROLE', message: `role must be one of: ${VALID_ROLES.join(', ')}` } });
    }
    if (photoUrl !== undefined && typeof photoUrl !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_PHOTO_URL', message: 'photoUrl must be a string' } });
    }

    const updated = await userModel.update(req.user.userId, { name, bio, role, photoUrl });
    if (!updated) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return res.json(serializePrivate(updated));
  } catch (err) { next(err); }
};

// GET /users/:id
const getUserById = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'User ID must be an integer' } });
    }
    const user = await userModel.findById(id);
    if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return res.json(serializePublic(user));
  } catch (err) { next(err); }
};

// DELETE /users/me  (A8 wires the route — implemented here for cohesion)
const deleteMe = async(req, res, next) => {
  try {
    await authTokenModel.revokeAll(req.user.userId);
    await userModel.remove(req.user.userId);
    return res.json({ message: 'Account deleted' });
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, getUserById, deleteMe };
