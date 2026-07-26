const reviewModel  = require('../models/review.model');
const bookingModel = require('../models/booking.model');

// POST /reviews
const createReview = async(req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const reviewerId = req.user.userId;

    const booking = await bookingModel.findById(Number(bookingId));
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.passenger.id !== reviewerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the passenger can leave a review' } });
    }
    if (booking.status !== 'paid') {
      return res.status(403).json({ error: { code: 'NOT_PAID', message: 'Booking must be paid before reviewing' } });
    }

    const already = await reviewModel.existsForBooking(Number(bookingId));
    if (already) return res.status(409).json({ error: { code: 'ALREADY_REVIEWED', message: 'This booking has already been reviewed' } });

    const review = await reviewModel.create({
      bookingId: Number(bookingId),
      reviewerId,
      driverId: booking.driver.id,
      rating:   Number(rating),
      comment,
    });

    return res.status(201).json({
      id:         review.id,
      bookingId:  review.booking_id,
      reviewer:   { id: reviewerId, name: booking.passenger.name },
      driver:     { id: booking.driver.id },
      rating:     review.rating,
      comment:    review.comment,
      createdAt:  review.created_at,
    });
  } catch (err) { next(err); }
};

// GET /reviews?driverId=:id
const listReviews = async(req, res, next) => {
  try {
    const driverId = parseInt(req.query.driverId, 10);
    if (isNaN(driverId)) {
      return res.status(400).json({ error: { code: 'MISSING_DRIVER_ID', message: 'driverId query param is required' } });
    }
    const data = await reviewModel.findByDriver(driverId);
    return res.json(data);
  } catch (err) { next(err); }
};

module.exports = { createReview, listReviews };
