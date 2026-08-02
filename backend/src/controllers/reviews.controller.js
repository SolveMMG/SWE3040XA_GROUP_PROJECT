const reviewModel = require('../models/review.model');
const bookingModel = require('../models/booking.model');

const parseIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const create = async(req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (bookingId === undefined || rating === undefined) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'bookingId and rating are required' } });
    }

    const bookingIdN = parseIntOrNull(bookingId);
    if (!bookingIdN) return res.status(400).json({ error: { code: 'INVALID_BOOKING_ID', message: 'bookingId must be an integer' } });
    const ratingN = parseIntOrNull(rating);
    if (!ratingN || ratingN < 1 || ratingN > 5) {
      return res.status(400).json({ error: { code: 'INVALID_RATING', message: 'rating must be an integer from 1 to 5' } });
    }

    // Authorization/eligibility: must be passenger with paid booking
    const booking = await bookingModel.findById(bookingIdN);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });

    if (booking.passenger?.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only passenger can create a review' } });
    }

    if (booking.status !== 'paid') {
      return res.status(403).json({ error: { code: 'NOT_PAID', message: 'You can only review after payment' } });
    }

    const already = await reviewModel.existsForBooking(bookingIdN);
    if (already) {
      return res.status(409).json({ error: { code: 'ALREADY_REVIEWED', message: 'Review already exists for this booking' } });
    }

    const { driver: { id: driverId } = {} } = booking;
    if (!driverId) return res.status(500).json({ error: { code: 'DRIVER_MISSING', message: 'Driver missing for booking' } });

    const reviewerId = req.user.userId;

    const created = await reviewModel.create({
      bookingId: bookingIdN,
      reviewerId,
      driverId,
      rating: ratingN,
      comment: comment || '',
    });

    return res.status(201).json({ ...created, reviewer: { id: reviewerId } });
  } catch (err) { next(err); }
};

const findByDriver = async(req, res, next) => {
  try {
    const driverId = parseIntOrNull(req.params.driverId);
    if (!driverId) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'driverId must be an integer' } });

    const payload = await reviewModel.findByDriver(driverId);
    return res.json(payload);
  } catch (err) { next(err); }
};

const listReviews = async(req, res, next) => {
  try {
    const driverId = parseIntOrNull(req.query.driverId);
    if (!driverId) return res.status(400).json({ error: { code: 'MISSING_DRIVER_ID', message: 'driverId must be a valid integer' } });
    const payload = await reviewModel.findByDriver(driverId);
    return res.json(payload);
  } catch (err) { next(err); }
};

module.exports = { create, findByDriver, createReview: create, listReviews };
