require('dotenv').config();
const app            = require('./app');
const authTokenModel = require('./models/authToken.model');

const PORT             = process.env.PORT || 3000;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RideConnect API running on port ${PORT} [${process.env.NODE_ENV}]`);

  // Scheduled cleanup of expired refresh tokens
  setInterval(async() => {
    try {
      const pruned = await authTokenModel.cleanupExpired();
      // eslint-disable-next-line no-console
      if (pruned > 0) console.log(`[auth] pruned ${pruned} expired token(s)`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[auth] token cleanup error:', err.message);
    }
  }, CLEANUP_INTERVAL);
});
