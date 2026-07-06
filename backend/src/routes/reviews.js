const express           = require('express');
const reviewController  = require('../controllers/review.controller');
const { authenticate }  = require('../middleware/auth');
const { rules }         = require('../middleware/validate');

const router = express.Router();

router.post('/', authenticate, rules.createReview, reviewController.createReview);
router.get('/',  reviewController.listReviews);

module.exports = router;
