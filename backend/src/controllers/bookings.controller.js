const bookingModel = require('../models/booking.model');
const rideModel = require('../models/ride.model');

const parseIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const DRIVER_STATUSES = ['accepted', 'declined'];

const findById = async(req, res, next) => {
  try {
    const id = parseIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Booking id must be an integer' } });

    const booking = await bookingModel.findById(id);
    if (!booking) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });

    // Authorization: passenger or driver
    const isPassenger = booking.passenger?.id === req.user.userId;
    const isDriver = booking.driver?.id === req.user.userId;
    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not booking participant' } });
    }

    return res.json(booking);
  } catch (err) { next(err); }
};

const findByUser = async(req, res, next) => {
  try {
    const { role, status } = req.query;
    if (!role || !['sent', 'received'].includes(role)) {
      return res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'role must be sent or received' } });
    }

    const rows = await bookingModel.findByUser({ userId: req.user.userId, role, status });
    return res.json({ bookings: rows });
  } catch (err) { next(err); }
};

const create = async(req, res, next) => {
  try {
    const { rideId, seatsRequested } = req.body;
    if (rideId === undefined || seatsRequested === undefined) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'rideId and seatsRequested are required' } });
    }

    const rideIdN = parseIntOrNull(rideId);
    const seatsN = parseIntOrNull(seatsRequested);
    if (!rideIdN || !seatsN) {
      return res.status(400).json({ error: { code: 'INVALID_FIELDS', message: 'rideId and seatsRequested must be integers' } });
    }

    if (seatsN < 1) {
      return res.status(400).json({ error: { code: 'INVALID_SEATS', message: 'seatsRequested must be at least 1' } });
    }

    const ride = await rideModel.findById(rideIdN);
    if (!ride) return res.status(404).json({ error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

    // ride.driver.id is nested
    const driverId = ride.driver?.id;
    if (!driverId) return res.status(500).json({ error: { code: 'DRIVER_NOT_FOUND', message: 'Ride driver missing' } });
    if (driverId === req.user.userId) {
      return res.status(409).json({ error: { code: 'CANNOT_BOOK_OWN_RIDE', message: 'Drivers cannot book their own rides' } });
    }
    if (req.user.role === 'driver') {
      return res.status(403).json({ error: { code: 'DRIVER_CANNOT_BOOK', message: 'Drivers are not allowed to book rides' } });
    }
    if (seatsN > ride.seats_available) {
      return res.status(409).json({ error: { code: 'NOT_ENOUGH_SEATS', message: 'Not enough seats available' } });
    }

    const totalPrice = req.body.totalPrice ? Number(req.body.totalPrice) : seatsN * ride.price_per_seat;

    const created = await bookingModel.create({
      rideId: rideIdN,
      passengerId: req.user.userId,
      driverId,
      seatsRequested: seatsN,
      totalPrice,
    });

    return res.status(201).json(created);
  } catch (err) { next(err); }
};

const updateStatus = async(req, res, next) => {
  try {
    const id = parseIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Booking id must be an integer' } });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: { code: 'MISSING_STATUS', message: 'status is required' } });
    if (!DRIVER_STATUSES.includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: `status must be one of: ${DRIVER_STATUSES.join(', ')}` } });
    }

    const booking = await bookingModel.findById(id);
    if (!booking) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });

    // Authorization: driver only
    if (booking.driver?.id !== req.user.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only driver can update booking status' } });
    }

    const updated = await bookingModel.updateStatus(id, status);
    return res.json(updated);
  } catch (err) { next(err); }
};

module.exports = { findById, findByUser, create, updateStatus };
