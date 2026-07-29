const adminModel = require('../models/admin.model');

const feePercent = () => {
  const value = Number(process.env.COMPANY_FEE_PERCENT || 20);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 20;
};

const pendingDrivers = async(_req, res, next) => {
  try { return res.json({ drivers: await adminModel.findPendingDrivers() }); } catch (err) { return next(err); }
};
const approveDriver = async(req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'User id must be an integer' } });
    const driver = await adminModel.approveDriver(id);
    if (!driver) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pending driver not found' } });
    return res.json({ driver });
  } catch (err) { return next(err); }
};
const getStatistics = async(_req, res, next) => {
  try { return res.json(await adminModel.statistics(feePercent())); } catch (err) { return next(err); }
};
module.exports = { pendingDrivers, approveDriver, getStatistics };
