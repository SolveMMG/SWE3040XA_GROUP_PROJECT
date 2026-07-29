const express = require('express');

const bookingsController = require('../controllers/bookings.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /bookings/me?role=sent|received&status=
router.get('/me', authenticate, bookingsController.findByUser);

// GET /bookings/:id
router.get('/:id', authenticate, bookingsController.findById);

// POST /bookings (passenger)
router.post('/', authenticate, bookingsController.create);

// PUT /bookings/:id/status (driver)
router.put('/:id/status', authenticate, bookingsController.updateStatus);

module.exports = router;
