const { uploadImage } = require('../services/cloudinary.service');

// POST /uploads/image
const uploadImageHandler = async(req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'No image file provided' } });
    }
    const url = await uploadImage(req.file.buffer, 'rideconnect/profiles');
    return res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadImageHandler };
