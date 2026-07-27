const express = require('express');

const ridesController = require('../controllers/rides.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /rides?origin=&destination=&date=&page=&limit=
router.get('/', ridesController.findAll);

// GET /rides/:id
router.get('/:id', ridesController.findById);

// POST /rides (driver)
router.post('/', authenticate, ridesController.create);

// PUT /rides/:id (driver owner only)
router.put('/:id', authenticate, ridesController.update);

// DELETE /rides/:id (driver owner only)
router.delete('/:id', authenticate, ridesController.remove);

module.exports = router;

