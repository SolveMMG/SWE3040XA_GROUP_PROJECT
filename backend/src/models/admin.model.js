const db = require('../config/db');

const findPendingDrivers = async() => {
  const { rows } = await db.query(
    `SELECT id, name, email, car_type, vehicle_model, license_plate, license_number,
            mpesa_phone, created_at
     FROM users
     WHERE role = 'driver' AND is_approved = FALSE
     ORDER BY created_at ASC`,
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

const listUsers = async(search) => {
  const where = search ? 'WHERE name ILIKE $1 OR email ILIKE $1' : '';
  const params = search ? [`%${search}%`] : [];
  const { rows } = await db.query(
    `SELECT id, name, email, role, is_approved, is_suspended, created_at
     FROM users ${where} ORDER BY created_at DESC LIMIT 300`,
    params,
  );
  return rows;
};

const suspendUser = async(id, suspend) => {
  const { rows } = await db.query(
    `UPDATE users SET is_suspended = $2 WHERE id = $1
     RETURNING id, name, email, role, is_suspended`,
    [id, suspend],
  );
  return rows[0] || null;
};

const listRides = async(search) => {
  const where = search ? 'WHERE r.origin ILIKE $1 OR r.destination ILIKE $1 OR u.name ILIKE $1' : '';
  const params = search ? [`%${search}%`] : [];
  const { rows } = await db.query(
    `SELECT r.id, r.origin, r.destination, r.departure_time, r.price_per_seat,
            r.seats_available, r.status, u.name AS driver_name, r.created_at
     FROM rides r JOIN users u ON u.id = r.driver_id
     ${where} ORDER BY r.created_at DESC LIMIT 300`,
    params,
  );
  return rows;
};

const deleteRide = async(id) => {
  const { rows } = await db.query('DELETE FROM rides WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
};

const listBookings = async() => {
  const { rows } = await db.query(
    `SELECT b.id, b.status, b.total_price, b.seats_requested, b.created_at,
            p.name AS passenger_name, d.name AS driver_name,
            r.origin, r.destination
     FROM bookings b
     JOIN users p ON p.id = b.passenger_id
     JOIN users d ON d.id = b.driver_id
     JOIN rides  r ON r.id = b.ride_id
     ORDER BY b.created_at DESC LIMIT 300`,
  );
  return rows;
};

const analytics = async() => {
  const [rides, revenue, users, routes, active] = await Promise.all([
    db.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM bookings WHERE status = 'paid' AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1`,
    ),
    db.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COALESCE(SUM(total_price),0)::int AS revenue
       FROM bookings WHERE status = 'paid' AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1`,
    ),
    db.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM users WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1`,
    ),
    db.query(
      `SELECT r.origin, r.destination, COUNT(b.id)::int AS bookings
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.status = 'paid'
       GROUP BY r.origin, r.destination ORDER BY bookings DESC LIMIT 10`,
    ),
    db.query(
      `SELECT COUNT(DISTINCT passenger_id)::int AS active_passengers,
              COUNT(DISTINCT driver_id)::int   AS active_drivers
       FROM bookings WHERE created_at > NOW() - INTERVAL '30 days'`,
    ),
  ]);
  return {
    ridesOverTime:   rides.rows,
    revenueOverTime: revenue.rows,
    userGrowth:      users.rows,
    popularRoutes:   routes.rows,
    activeUsers:     active.rows[0] || { active_passengers: 0, active_drivers: 0 },
  };
};

module.exports = { findPendingDrivers, approveDriver, statistics, listUsers, suspendUser, listRides, deleteRide, listBookings, analytics };
