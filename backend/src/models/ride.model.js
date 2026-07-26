const db = require('../config/db');

const DRIVER_FIELDS = `
  r.id, r.origin, r.destination, r.departure_time, r.seats_available,
  r.price_per_seat, r.status, r.created_at,
  r.origin_place_id, r.origin_latitude::float, r.origin_longitude::float,
  r.destination_place_id, r.destination_latitude::float, r.destination_longitude::float,
  json_build_object(
    'id',        u.id,
    'name',      u.name,
    'photoUrl',  u.photo_url,
    'avgRating', (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float FROM reviews WHERE driver_id = u.id),
    'rideCount', (SELECT COUNT(*) FROM rides WHERE driver_id = u.id)::int
  ) AS driver
`;

const BASE_JOIN = `
  FROM rides r
  JOIN users u ON u.id = r.driver_id
`;

const normalizePositiveInteger = (value, fallback, max) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return Number.isFinite(num) ? num : undefined;
};

const findAll = async({
  origin,
  destination,
  date,
  query,
  originLat,
  originLng,
  destLat,
  destLng,
  radius = 25,
  minPrice,
  maxPrice,
  seats,
  page = 1,
  limit = 20,
}) => {
  const safePage  = normalizePositiveInteger(page, 1);
  const safeLimit = normalizePositiveInteger(limit, 20, 50);
  const offset    = (safePage - 1) * safeLimit;
  const conds = [];
  const vals  = [];
  let idx = 1;

  const oLat = parseNum(originLat);
  const oLng = parseNum(originLng);
  const dLat = parseNum(destLat);
  const dLng = parseNum(destLng);

  if (query) {
    conds.push(`(r.origin ILIKE $${idx} OR r.destination ILIKE $${idx})`);
    vals.push(`%${query}%`);
    idx++;
  }
  if (origin && oLat === undefined) {
    conds.push(`r.origin ILIKE $${idx++}`);
    vals.push(`%${origin}%`);
  }
  if (destination && dLat === undefined) {
    conds.push(`r.destination ILIKE $${idx++}`);
    vals.push(`%${destination}%`);
  }
  if (date) {
    conds.push(`r.departure_time::date = $${idx++}::date`);
    vals.push(date);
  }

  const searchRadius = radius !== undefined && radius !== null && radius !== '' ? parseNum(radius) : undefined;
  let oLatParamIdx;
  let oLngParamIdx;

  if (oLat !== undefined && oLng !== undefined) {
    oLatParamIdx = idx;
    oLngParamIdx = idx + 1;
    vals.push(oLat, oLng);
    idx += 2;

    if (searchRadius !== undefined) {
      conds.push(
        `r.origin_latitude IS NOT NULL AND r.origin_longitude IS NOT NULL AND (
          3958.8 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($${oLatParamIdx})) * cos(radians(r.origin_latitude)) *
              cos(radians(r.origin_longitude) - radians($${oLngParamIdx})) +
              sin(radians($${oLatParamIdx})) * sin(radians(r.origin_latitude))
            ))
          )
        ) <= $${idx}`,
      );
      vals.push(searchRadius);
      idx += 1;
    }
  }

  if (dLat !== undefined && dLng !== undefined) {
    conds.push(
      `r.destination_latitude IS NOT NULL AND r.destination_longitude IS NOT NULL AND (
        3958.8 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${idx})) * cos(radians(r.destination_latitude)) *
            cos(radians(r.destination_longitude) - radians($${idx + 1})) +
            sin(radians($${idx})) * sin(radians(r.destination_latitude))
          ))
        )
      ) <= $${idx + 2}`,
    );
    vals.push(dLat, dLng, searchRadius || 25);
    idx += 3;
  }

  const parsedMinPrice = parseNum(minPrice);
  if (parsedMinPrice !== undefined) {
    conds.push(`r.price_per_seat >= $${idx++}`);
    vals.push(parsedMinPrice);
  }

  const parsedMaxPrice = parseNum(maxPrice);
  if (parsedMaxPrice !== undefined) {
    conds.push(`r.price_per_seat <= $${idx++}`);
    vals.push(parsedMaxPrice);
  }

  const parsedSeats = parseNum(seats);
  if (parsedSeats !== undefined) {
    conds.push(`r.seats_available >= $${idx++}`);
    vals.push(parsedSeats);
  }

  // Only show active rides by default
  conds.push(`r.status = 'active'`);

  const where = `WHERE ${conds.join(' AND ')}`;

  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM rides r ${where}`,
    vals,
  );
  const total = parseInt(count, 10);

  const limitIdx = idx++;
  const offsetIdx = idx++;

  let selectFields = DRIVER_FIELDS;
  let orderByClause = 'ORDER BY r.departure_time ASC';
  const queryVals = [...vals, safeLimit, offset];

  if (oLatParamIdx !== undefined && oLngParamIdx !== undefined) {
    selectFields = `${DRIVER_FIELDS}, (
      3958.8 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians($${oLatParamIdx})) * cos(radians(r.origin_latitude)) *
          cos(radians(r.origin_longitude) - radians($${oLngParamIdx})) +
          sin(radians($${oLatParamIdx})) * sin(radians(r.origin_latitude))
        ))
      )
    )::float AS distance_miles`;
    orderByClause = 'ORDER BY distance_miles ASC, r.departure_time ASC';
  }

  const { rows } = await db.query(
    `SELECT ${selectFields} ${BASE_JOIN} ${where}
     ${orderByClause}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    queryVals,
  );

  // Fallback: If 0 drivers returned from strict filters, return all active drivers ordered by nearest distance
  if (rows.length === 0) {
    const fallbackLat = oLat !== undefined ? oLat : -1.286389;
    const fallbackLng = oLng !== undefined ? oLng : 36.817223;
    const fallbackResult = await db.query(
      `SELECT ${DRIVER_FIELDS}, (
        3958.8 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(r.origin_latitude)) *
            cos(radians(r.origin_longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(r.origin_latitude))
          ))
        )
      )::float AS distance_miles
      ${BASE_JOIN}
      WHERE r.status = 'active'
      ORDER BY distance_miles ASC
      LIMIT $3 OFFSET $4`,
      [fallbackLat, fallbackLng, safeLimit, offset],
    );
    return { rides: fallbackResult.rows, total: fallbackResult.rows.length, page: 1, totalPages: 1 };
  }

  return { rides: rows, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
};

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${DRIVER_FIELDS} ${BASE_JOIN} WHERE r.id = $1`,
    [id],
  );
  return rows[0] || null;
};

const create = async({
  origin,
  destination,
  departureTime,
  seatsAvailable,
  pricePerSeat,
  driverId,
  originPlaceId,
  originLatitude,
  originLongitude,
  destinationPlaceId,
  destinationLatitude,
  destinationLongitude,
}) => {
  const { rows } = await db.query(
    `INSERT INTO rides (
       origin, destination, departure_time, seats_available, price_per_seat, driver_id,
       origin_place_id, origin_latitude, origin_longitude,
       destination_place_id, destination_latitude, destination_longitude
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      origin,
      destination,
      departureTime,
      seatsAvailable,
      pricePerSeat,
      driverId,
      originPlaceId || null,
      originLatitude ?? null,
      originLongitude ?? null,
      destinationPlaceId || null,
      destinationLatitude ?? null,
      destinationLongitude ?? null,
    ],
  );
  return findById(rows[0].id);
};

const update = async(id, {
  origin,
  destination,
  departureTime,
  seatsAvailable,
  pricePerSeat,
  status,
  originPlaceId,
  originLatitude,
  originLongitude,
  destinationPlaceId,
  destinationLatitude,
  destinationLongitude,
}) => {
  const fields = [];
  const vals   = [];
  let idx = 1;

  if (origin         !== undefined) { fields.push(`origin = $${idx++}`);          vals.push(origin); }
  if (destination    !== undefined) { fields.push(`destination = $${idx++}`);      vals.push(destination); }
  if (departureTime  !== undefined) { fields.push(`departure_time = $${idx++}`);   vals.push(departureTime); }
  if (seatsAvailable !== undefined) { fields.push(`seats_available = $${idx++}`);  vals.push(seatsAvailable); }
  if (pricePerSeat   !== undefined) { fields.push(`price_per_seat = $${idx++}`);   vals.push(pricePerSeat); }
  if (status         !== undefined) { fields.push(`status = $${idx++}::ride_status`); vals.push(status); }
  if (originPlaceId !== undefined) { fields.push(`origin_place_id = $${idx++}`); vals.push(originPlaceId || null); }
  if (originLatitude !== undefined) { fields.push(`origin_latitude = $${idx++}`); vals.push(originLatitude); }
  if (originLongitude !== undefined) { fields.push(`origin_longitude = $${idx++}`); vals.push(originLongitude); }
  if (destinationPlaceId !== undefined) { fields.push(`destination_place_id = $${idx++}`); vals.push(destinationPlaceId || null); }
  if (destinationLatitude !== undefined) { fields.push(`destination_latitude = $${idx++}`); vals.push(destinationLatitude); }
  if (destinationLongitude !== undefined) { fields.push(`destination_longitude = $${idx++}`); vals.push(destinationLongitude); }

  if (fields.length === 0) return findById(id);

  vals.push(id);
  await db.query(`UPDATE rides SET ${fields.join(', ')} WHERE id = $${idx}`, vals);
  return findById(id);
};

const remove = async(id) => {
  await db.query('DELETE FROM rides WHERE id = $1', [id]);
};

const isOwner = async(rideId, userId) => {
  const { rows } = await db.query(
    'SELECT id FROM rides WHERE id = $1 AND driver_id = $2',
    [rideId, userId],
  );
  return rows.length > 0;
};

module.exports = { findAll, findById, create, update, remove, isOwner };
