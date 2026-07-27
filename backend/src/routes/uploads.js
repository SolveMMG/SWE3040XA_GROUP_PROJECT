const express  = require('express');
const multer   = require('multer');
const { authenticate }       = require('../middleware/auth');
const { uploadImageHandler } = require('../controllers/upload.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only jpg, png, and webp images are allowed'));
  },
});

const router = express.Router();

router.post('/image', authenticate, upload.single('image'), uploadImageHandler);

module.exports = router;
