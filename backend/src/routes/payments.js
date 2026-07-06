const express            = require('express');
const paymentController  = require('../controllers/payment.controller');
const { authenticate }   = require('../middleware/auth');
const { rules }          = require('../middleware/validate');

const router = express.Router();

router.post('/initiate',        authenticate, rules.initiatePayment, paymentController.initiate);
router.post('/callback',        paymentController.mpesaCallback);   // public — Daraja webhook
router.get('/:bookingId',       authenticate, paymentController.getPayment);

module.exports = router;
