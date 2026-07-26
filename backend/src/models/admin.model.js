const db = require('../config/db');

const findPendingDrivers = async() => {
  const { rows } = await db.query(
    `SELECT id, name, email, created_at FROM users
     WHERE role = 'driver' AND is_approved = FALSE ORDER BY created_at ASC`,
  );
  return rows;
};

const approveDriver = async(id) => {
  const { rows } = await db.query(
    `UPDATE users SET is_approved = TRUE
     WHERE id = $1 AND role = 'driver'
     RETURNING id, name, email, is_approved`,
    [id],
  );
  return rows[0] || null;
};

const statistics = async(companyFeePercent) => {
  const { rows: [totals] } = await db.query(
    `SELECT COUNT(*)::int AS paid_rides, COALESCE(SUM(total_price), 0)::int AS gross_revenue
     FROM bookings WHERE status = 'paid'`,
  );
  const { rows: drivers } = await db.query(
    `SELECT d.id AS driver_id, d.name AS driver_name, COUNT(*)::int AS paid_rides,
            COALESCE(SUM(b.total_price), 0)::int AS gross_revenue
     FROM bookings b JOIN users d ON d.id = b.driver_id
     WHERE b.status = 'paid'
     GROUP BY d.id, d.name ORDER BY gross_revenue DESC`,
  );
  const split = (gross) => {
    const companyRevenue = Math.round(Number(gross) * companyFeePercent) / 100;
    return { grossRevenue: Number(gross), companyRevenue, driverPayout: Number(gross) - companyRevenue };
  };
  return {
    paidRides: totals.paid_rides,
    companyFeePercent,
    ...split(totals.gross_revenue),
    drivers: drivers.map((driver) => ({ ...driver, ...split(driver.gross_revenue) })),
  };
};

module.exports = { findPendingDrivers, approveDriver, statistics };
