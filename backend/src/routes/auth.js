const express          = require('express');
const { passport }     = require('../config/passport');
const authController   = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { rules }        = require('../middleware/validate');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login',    authController.login);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.googleCallback,
);

router.post('/refresh', rules.refreshToken, authController.refresh);
router.post('/logout',  authenticate, rules.refreshToken, authController.logout);

module.exports = router;
