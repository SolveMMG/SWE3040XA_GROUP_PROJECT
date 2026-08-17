const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { init: initPassport } = require('./config/passport');

initPassport();

const app = express();

const rateLimitJson = { error: { code: 'RATE_LIMITED', message: 'Too many requests — please try again later.' } };

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitJson,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitJson,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitJson,
});

// Security & utility middleware
app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:8080', 'http://localhost:5173'].filter(Boolean),
  credentials: true,
}));
app.use(globalLimiter);
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// API routes
app.use('/api/v1/auth',     authLimiter, require('./routes/auth'));
app.use('/api/v1/users',    require('./routes/users'));
app.use('/api/v1/rides',    require('./routes/rides'));
app.use('/api/v1/bookings', require('./routes/bookings'));
app.use('/api/v1/payments', paymentLimiter, require('./routes/payments'));
app.use('/api/v1/reviews',  require('./routes/reviews'));
app.use('/api/v1/sites',    require('./routes/sites'));
app.use('/api/v1/admin',    require('./routes/admin'));

// Compatibility endpoint for externally configured Daraja/ngrok callbacks.
app.post('/api/mpesa/callback', require('./controllers/payments.controller').mpesaCallback);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Central error handler
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong',
    },
  });
});

module.exports = app;
