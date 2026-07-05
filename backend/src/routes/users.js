const express        = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me',    authenticate, userController.getMe);
router.put('/me',    authenticate, userController.updateMe);
router.delete('/me', authenticate, userController.deleteMe); // A8

router.get('/:id', userController.getUserById);

module.exports = router;
