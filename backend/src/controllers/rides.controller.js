const rideModel = require('../models/ride.model');
const userModel = require('../models/user.model');

const ensureFields = (body, fields) => {
  for (const f of fields) {
    if (body[f] === undefined) return { ok: false, message: `${f} is required` };
  }
  return { ok: true };
};

const parseCoordinate = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const readLocationFields = (body) => {
  const originLatitude = parseCoordinate(body.originLatitude);
  const originLongitude = parseCoordinate(body.originLongitude);
  const destinationLatitude = parseCoordinate(body.destinationLatitude);
  const destinationLongitude = parseCoordinate(body.destinationLongitude);

  if (
    originLatitude === null ||
    originLongitude === null ||
    destinationLatitude === null ||
    destinationLongitude === null
  ) {
    return { error: { code: 'INVALID_COORDINATES', message: 'Coordinates must be valid numbers' } };
  }
  if (
    (originLatitude !== undefined && (originLatitude < -90 || originLatitude > 90)) ||
    (destinationLatitude !== undefined && (destinationLatitude < -90 || destinationLatitude > 90)) ||
    (originLongitude !== undefined && (originLongitude < -180 || originLongitude > 180)) ||
    (destinationLongitude !== undefined && (destinationLongitude < -180 || destinationLongitude > 180))
  ) {
    return { error: { code: 'INVALID_COORDINATES', message: 'Latitude must be between -90 and 90, and longitude between -180 and 180' } };
  }

  return {
    locationFields: {
      originPlaceId: body.originPlaceId,
      originLatitude,
      originLongitude,
      destinationPlaceId: body.destinationPlaceId,
      destinationLatitude,
      destinationLongitude,
    },
  };
};

const hasCompleteLocations = (locationFields) => (
  locationFields.originLatitude !== undefined &&
  locationFields.originLongitude !== undefined &&
  locationFields.destinationLatitude !== undefined &&
  locationFields.destinationLongitude !== undefined
);

const findAll = async(req, res, next) => {
  try {
    const {
      origin,
      destination,
      date,
      page,
      limit,
      query,
      originLat,
      originLng,
      destLat,
      destLng,
      radius,
      minPrice,
      maxPrice,
      seats,
    } = req.query;
    const result = await rideModel.findAll({
      origin,
      destination,
      date,
      page,
      limit,
      query,
      originLat,
      originLng,
      destLat,
      destLng,
      radius,
      minPrice,
      maxPrice,
      seats,
    });
    return res.json(result);
  } catch (err) { next(err); }
};

const findById = async(req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Ride id must be an integer' } });
    }
    const ride = await rideModel.findById(id);
    if (!ride) return res.status(404).json({ error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });
    return res.json(ride);
  } catch (err) { next(err); }
};

const create = async(req, res, next) => {
  try {
    const driver = await userModel.findById(req.user.userId);
    if (!driver?.is_approved) {
      return res.status(403).json({ error: { code: 'DRIVER_NOT_APPROVED', message: 'Your driver account must be approved before publishing rides' } });
    }
    const { origin, destination, departureTime, seatsAvailable, pricePerSeat } = req.body;
    const check = ensureFields(req.body, ['origin', 'destination', 'departureTime', 'seatsAvailable', 'pricePerSeat']);
    if (!check.ok) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: check.message } });
    const { error, locationFields } = readLocationFields(req.body);
    if (error) return res.status(400).json({ error });
    if (!hasCompleteLocations(locationFields)) {
      return res.status(400).json({ error: { code: 'MISSING_COORDINATES', message: 'Select both pickup and destination from Google Maps, or enter their coordinates' } });
    }

    const driverId = req.user.userId;
    const created = await rideModel.create({
      origin,
      destination,
      departureTime,
      seatsAvailable,
      pricePerSeat,
      driverId,
      ...locationFields,
    });
    return res.status(201).json(created);
  } catch (err) { next(err); }
};

const update = async(req, res, next) => {
  try {
    const rideId = parseInt(req.params.id, 10);
    if (Number.isNaN(rideId)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Ride id must be an integer' } });
    }

    const isOwner = await rideModel.isOwner(rideId, req.user.userId);
    if (!isOwner) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not ride owner' } });

    const { origin, destination, departureTime, seatsAvailable, pricePerSeat, status } = req.body;
    const { error, locationFields } = readLocationFields(req.body);
    if (error) return res.status(400).json({ error });

    const updated = await rideModel.update(rideId, {
      origin,
      destination,
      departureTime,
      seatsAvailable,
      pricePerSeat,
      status,
      ...locationFields,
    });
    return res.json(updated);
  } catch (err) { next(err); }
};

const remove = async(req, res, next) => {
  try {
    const rideId = parseInt(req.params.id, 10);
    if (Number.isNaN(rideId)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Ride id must be an integer' } });
    }

    const isOwner = await rideModel.isOwner(rideId, req.user.userId);
    if (!isOwner) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not ride owner' } });

    await rideModel.remove(rideId);
    return res.json({ message: 'Ride deleted' });
  } catch (err) { next(err); }
};

module.exports = { findAll, findById, create, update, remove, listRides: findAll, getRide: findById, createRide: create, updateRide: update, deleteRide: remove };
