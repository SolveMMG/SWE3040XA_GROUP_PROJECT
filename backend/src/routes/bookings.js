const express           = require('express');
const bookingController = require('../controllers/booking.controller');
const { authenticate }  = require('../middleware/auth');
const { rules }         = require('../middleware/validate');

const router = express.Router();

router.post('/',                  authenticate, rules.createBooking, bookingController.createBooking);
router.get('/',                   authenticate, bookingController.listBookings);
router.patch('/:id/accept',       authenticate, bookingController.acceptBooking);
router.patch('/:id/decline',      authenticate, bookingController.declineBooking);

module.exports = router;
