const express = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/admin');

const router = express.Router();
router.use(authenticate, requireSuperadmin);
router.get('/drivers/pending', controller.pendingDrivers);
router.put('/drivers/:id/approve', controller.approveDriver);
router.get('/statistics', controller.getStatistics);
module.exports = router;
