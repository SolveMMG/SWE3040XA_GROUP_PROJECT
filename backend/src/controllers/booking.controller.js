const bookingModel = require('../models/booking.model');
const rideModel    = require('../models/ride.model');
const { sendPush } = require('../services/firebase.service');

const serialize = (b) => ({
  id:             b.id,
  ride:           b.ride,
  passenger:      b.passenger,
  driver:         b.driver,
  seatsRequested: b.seats_requested,
  totalPrice:     b.total_price,
  status:         b.status,
  createdAt:      b.created_at,
});

// POST /bookings
const createBooking = async(req, res, next) => {
  try {
    const { rideId, seatsRequested } = req.body;
    const passengerId = req.user.userId;

    const ride = await rideModel.findById(Number(rideId));
    if (!ride) return res.status(404).json({ error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

    const driverId = ride.driver.id;
    if (driverId === passengerId) {
      return res.status(400).json({ error: { code: 'OWN_RIDE', message: 'You cannot book your own ride' } });
    }
    if (ride.status !== 'active') {
      return res.status(400).json({ error: { code: 'RIDE_UNAVAILABLE', message: 'This ride is no longer active' } });
    }
    if (Number(seatsRequested) > ride.seatsAvailable) {
      return res.status(400).json({ error: { code: 'NOT_ENOUGH_SEATS', message: 'Not enough seats available' } });
    }

    const totalPrice = Number(seatsRequested) * ride.pricePerSeat;
    const booking = await bookingModel.create({
      rideId: Number(rideId), passengerId, driverId,
      seatsRequested: Number(seatsRequested), totalPrice,
    });

    // Non-blocking push to driver
    sendPush(null, 'New Booking Request', `Someone wants to book ${seatsRequested} seat(s) on your ride`);

    return res.status(201).json(serialize(booking));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'ALREADY_BOOKED', message: 'You already have a booking for this ride' } });
    }
    next(err);
  }
};

// GET /bookings
const listBookings = async(req, res, next) => {
  try {
    const { role, status } = req.query;
    const bookings = await bookingModel.findByUser({ userId: req.user.userId, role, status });
    return res.json({ bookings: bookings.map(serialize) });
  } catch (err) { next(err); }
};

// PATCH /bookings/:id/accept
const acceptBooking = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await bookingModel.findById(id);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.driver.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the driver can accept bookings' } });
    }
    if (booking.status !== 'pending') {
      return res.status(409).json({ error: { code: 'NOT_PENDING', message: 'Booking is not pending' } });
    }
    const updated = await bookingModel.updateStatus(id, 'accepted');
    sendPush(null, 'Booking Accepted', 'Your booking has been accepted! Proceed to payment.');
    return res.json(serialize(updated));
  } catch (err) { next(err); }
};

// PATCH /bookings/:id/decline
const declineBooking = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const booking = await bookingModel.findById(id);
    if (!booking) return res.status(404).json({ error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } });
    if (booking.driver.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the driver can decline bookings' } });
    }
    if (booking.status !== 'pending') {
      return res.status(409).json({ error: { code: 'NOT_PENDING', message: 'Booking is not pending' } });
    }
    const updated = await bookingModel.updateStatus(id, 'declined');
    sendPush(null, 'Booking Declined', 'Your booking request was declined.');
    return res.json(serialize(updated));
  } catch (err) { next(err); }
};

module.exports = { createBooking, listBookings, acceptBooking, declineBooking };
