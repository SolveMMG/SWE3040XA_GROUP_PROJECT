const express = require('express');
const { passport } = require('../config/passport');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Step 1 — redirect browser to Google consent screen
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

// Step 2 — Google redirects back here; passport exchanges code for profile
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.googleCallback,
);

// Refresh access token
router.post('/refresh', authController.refresh);

// Logout (revoke refresh token)
router.post('/logout', authenticate, authController.logout);

module.exports = router;
