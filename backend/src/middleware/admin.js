const userModel = require('../models/user.model');

const requireSuperadmin = async(req, res, next) => {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Superadmin access is required' } });
    }
    return next();
  } catch (err) { return next(err); }
};

module.exports = { requireSuperadmin };
