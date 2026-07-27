const express = require('express');

const reviewsController = require('../controllers/reviews.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /reviews/driver/:driverId
router.get('/driver/:driverId', authenticate, reviewsController.findByDriver);

// POST /reviews
router.post('/', authenticate, reviewsController.create);

module.exports = router;

