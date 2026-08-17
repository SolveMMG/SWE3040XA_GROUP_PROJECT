const express = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/admin');

const router = express.Router();
router.use(authenticate, requireSuperadmin);
router.get('/drivers/pending',     controller.pendingDrivers);
router.put('/drivers/:id/approve', controller.approveDriver);
router.get('/statistics',          controller.getStatistics);
router.get('/analytics',           controller.getAnalytics);
router.get('/users',               controller.getUsers);
router.put('/users/:id/suspend',   controller.suspendUser);
router.get('/rides',               controller.getRides);
router.delete('/rides/:id',        controller.removeRide);
router.get('/bookings',            controller.getBookings);
module.exports = router;
