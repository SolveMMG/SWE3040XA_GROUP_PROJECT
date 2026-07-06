const rideModel = require('../models/ride.model');

const serialize = (r) => ({
  id:             r.id,
  origin:         r.origin,
  destination:    r.destination,
  departureTime:  r.departure_time,
  seatsAvailable: r.seats_available,
  pricePerSeat:   r.price_per_seat,
  status:         r.status,
  driver:         r.driver,
  createdAt:      r.created_at,
});

// GET /rides
const listRides = async(req, res, next) => {
  try {
    const { origin, destination, date, page, limit } = req.query;
    const result = await rideModel.findAll({ origin, destination, date, page, limit });
    return res.json({
      rides:      result.rides.map(serialize),
      page:       result.page,
      totalPages: result.totalPages,
      total:      result.total,
    });
  } catch (err) { next(err); }
};

// POST /rides
const createRide = async(req, res, next) => {
  try {
    const { origin, destination, departureTime, seatsAvailable, pricePerSeat } = req.body;
    const ride = await rideModel.create({
      origin, destination, departureTime,
      seatsAvailable: Number(seatsAvailable),
      pricePerSeat:   Number(pricePerSeat),
      driverId:       req.user.userId,
    });
    return res.status(201).json(serialize(ride));
  } catch (err) { next(err); }
};

// GET /rides/:id
const getRide = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Ride ID must be an integer' } });
    const ride = await rideModel.findById(id);
    if (!ride) return res.status(404).json({ error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });
    return res.json(serialize(ride));
  } catch (err) { next(err); }
};

// PUT /rides/:id
const updateRide = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const owned = await rideModel.isOwner(id, req.user.userId);
    if (!owned) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not the driver of this ride' } });

    const { origin, destination, departureTime, seatsAvailable, pricePerSeat, status } = req.body;
    const ride = await rideModel.update(id, {
      origin, destination, departureTime,
      seatsAvailable: seatsAvailable !== undefined ? Number(seatsAvailable) : undefined,
      pricePerSeat:   pricePerSeat   !== undefined ? Number(pricePerSeat)   : undefined,
      status,
    });
    return res.json(serialize(ride));
  } catch (err) { next(err); }
};

// DELETE /rides/:id
const deleteRide = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const owned = await rideModel.isOwner(id, req.user.userId);
    if (!owned) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not the driver of this ride' } });
    await rideModel.remove(id);
    return res.json({ message: 'Ride deleted' });
  } catch (err) { next(err); }
};

module.exports = { listRides, createRide, getRide, updateRide, deleteRide };
