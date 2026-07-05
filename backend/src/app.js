const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { init: initPassport } = require('./config/passport');

initPassport();

const app = express();

// Security & utility middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API routes
app.use('/api/v1/auth',     require('./routes/auth'));
app.use('/api/v1/users',    require('./routes/users'));
// app.use('/api/v1/rides',    require('./routes/rides'));     // Person C — C1/C2
// app.use('/api/v1/uploads',  require('./routes/uploads'));   // Person C — C3
// app.use('/api/v1/bookings', require('./routes/bookings'));  // Person C — C4/C5
// app.use('/api/v1/payments', require('./routes/payments'));  // Person C — C6
// app.use('/api/v1/reviews',  require('./routes/reviews'));   // Person C — C8

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Handle JSON body parse errors (malformed JSON from client)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }
  return next(err);
});

// Central error handler
app.use((err, _req, res, _next) => {
  // PostgreSQL unique-violation → 409 Conflict
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that value already exists' } });
  }

  // PostgreSQL foreign-key violation → 400
  if (err.code === '23503') {
    return res.status(400).json({ error: { code: 'INVALID_REFERENCE', message: 'Referenced record does not exist' } });
  }

  // PostgreSQL not-null / check violation → 400
  if (err.code === '23502' || err.code === '23514') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid data provided' } });
  }

  const status = err.status || 500;

  // Don't leak internal details to clients in production
  const message = (status < 500 || process.env.NODE_ENV !== 'production')
    ? (err.message || 'Something went wrong')
    : 'Internal server error';

  // eslint-disable-next-line no-console
  if (status >= 500) console.error('[error]', err);

  return res.status(status).json({
    error: { code: err.code || 'INTERNAL_ERROR', message },
  });
});

module.exports = app;
