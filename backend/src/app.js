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
