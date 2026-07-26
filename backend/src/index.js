require('dotenv').config();
const app            = require('./app');
const authTokenModel = require('./models/authToken.model');
const { autoRefund } = require('./controllers/payments.controller');

const PORT             = process.env.PORT || 3000;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const REFUND_INTERVAL  = 10 * 1000; // Check every 10 seconds

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RideConnect API running on port ${PORT} [${process.env.NODE_ENV}]`);

  // Run auto-refund check every 10 seconds
  // After a payment has been 'paid' for 5+ minutes, it will be automatically refunded
  autoRefund();
  setInterval(autoRefund, REFUND_INTERVAL);
  // eslint-disable-next-line no-console
  console.log('[AUTO-REFUND] Scheduler started — checking every 10s for payments older than 5 minutes');

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
