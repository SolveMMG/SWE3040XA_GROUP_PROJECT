const express        = require('express');
const rideController = require('../controllers/ride.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { rules }      = require('../middleware/validate');

const router = express.Router();

router.get('/',     optionalAuthenticate, rideController.listRides);
router.post('/',    authenticate, rules.createRide, rideController.createRide);
router.get('/:id',  optionalAuthenticate, rideController.getRide);
router.put('/:id',  authenticate, rideController.updateRide);
router.delete('/:id', authenticate, rideController.deleteRide);

module.exports = router;
