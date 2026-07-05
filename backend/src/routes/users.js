const express          = require('express');
const userController   = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { rules }        = require('../middleware/validate');

const router = express.Router();

router.get('/me',    authenticate, userController.getMe);
router.put('/me',    authenticate, rules.updateProfile, userController.updateMe);
router.delete('/me', authenticate, userController.deleteMe);

router.get('/:id', userController.getUserById);

module.exports = router;
