const express        = require('express');
const { passport }   = require('../config/passport');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Local auth
router.post('/register', authController.register);
router.post('/login',    authController.login);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.googleCallback,
);

router.post('/refresh', authController.refresh);
router.post('/logout',  authenticate, authController.logout);

module.exports = router;
