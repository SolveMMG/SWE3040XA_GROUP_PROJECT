const express        = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me',           authenticate, userController.getMe);
router.put('/me',           authenticate, userController.updateMe);
router.put('/me/fcm-token', authenticate, userController.saveFcmToken);
router.delete('/me',        authenticate, userController.deleteMe);

router.get('/:id', userController.getUserById);

module.exports = router;
