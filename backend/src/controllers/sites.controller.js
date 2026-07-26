const siteModel = require('../models/site.model');

const parseId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const parseCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const validateSite = (body) => {
  const { name, address, latitude, longitude } = body;
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if (typeof name !== 'string' || !name.trim()) {
    return { error: { code: 'INVALID_NAME', message: 'name must be a non-empty string' } };
  }
  if (typeof address !== 'string' || !address.trim()) {
    return { error: { code: 'INVALID_ADDRESS', message: 'address must be a non-empty string' } };
  }
  if (lat === null || lat < -90 || lat > 90) {
    return { error: { code: 'INVALID_LATITUDE', message: 'latitude must be between -90 and 90' } };
  }
  if (lng === null || lng < -180 || lng > 180) {
    return { error: { code: 'INVALID_LONGITUDE', message: 'longitude must be between -180 and 180' } };
  }

  return {
    site: {
      name: name.trim(),
      address: address.trim(),
      placeId: typeof body.placeId === 'string' ? body.placeId.trim() : '',
      latitude: lat,
      longitude: lng,
    },
  };
};

const findAll = async(req, res, next) => {
  try {
    const sites = await siteModel.findAll({ query: req.query.query });
    return res.json({ sites });
  } catch (err) {
    next(err);
  }
};

const findById = async(req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Site id must be an integer' } });

    const site = await siteModel.findById(id);
    if (!site) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Site not found' } });
    return res.json(site);
  } catch (err) {
    next(err);
  }
};

const create = async(req, res, next) => {
  try {
    const { error, site } = validateSite(req.body);
    if (error) return res.status(400).json({ error });

    const created = await siteModel.create({ ...site, createdBy: req.user.userId });
    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

const update = async(req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Site id must be an integer' } });

    const { error, site } = validateSite(req.body);
    if (error) return res.status(400).json({ error });

    const updated = await siteModel.update(id, site);
    if (!updated) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Site not found' } });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

const remove = async(req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Site id must be an integer' } });

    const removed = await siteModel.remove(id);
    if (!removed) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Site not found' } });
    return res.json({ message: 'Site deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { findAll, findById, create, update, remove };
