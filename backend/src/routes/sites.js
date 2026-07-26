const express = require('express');

const sitesController = require('../controllers/sites.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', sitesController.findAll);
router.get('/:id', sitesController.findById);
router.post('/', authenticate, sitesController.create);
router.put('/:id', authenticate, sitesController.update);
router.delete('/:id', authenticate, sitesController.remove);

module.exports = router;
