const express = require('express');

const paymentsController = require('../controllers/payments.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /payments/by-booking/:bookingId
router.get('/booking/:bookingId', authenticate, paymentsController.findByBookingId);

// POST /payments (create payment request) - passenger
router.post('/', authenticate, paymentsController.create);
router.post('/mpesa/stk-push', authenticate, paymentsController.initiateStkPush);

// POST /payments/mpesa/callback
router.post('/mpesa/callback', paymentsController.mpesaCallback);

module.exports = router;
