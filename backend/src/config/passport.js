const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const userModel = require('../models/user.model');

const init = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('[passport] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — OAuth routes disabled.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
      },
      async(_accessToken, _refreshToken, profile, done) => {
        try {
          const email    = profile.emails[0].value;
          const name     = profile.displayName;
          const photoUrl = profile.photos?.[0]?.value || null;

          let user      = await userModel.findByEmail(email);
          let isNewUser = false;

          if (!user) {
            user      = await userModel.create({ name, email, photoUrl });
            isNewUser = true;
          }

          return done(null, { ...user, isNewUser });
        } catch (err) {
          return done(err, null);
        }
      },
    ),
  );

  passport.serializeUser((user, done)   => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
};

module.exports = { passport, init };
