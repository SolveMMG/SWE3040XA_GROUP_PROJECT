const db = require('../config/db');

const FIELDS = 'id, name, address, place_id, latitude::float, longitude::float, created_by, created_at';

const findAll = async({ query }) => {
  const values = [];
  let where = '';

  if (query) {
    values.push(`%${query}%`);
    where = 'WHERE name ILIKE $1 OR address ILIKE $1';
  }

  const { rows } = await db.query(
    `SELECT ${FIELDS}
     FROM sites
     ${where}
     ORDER BY created_at DESC`,
    values,
  );
  return rows;
};

const findById = async(id) => {
  const { rows } = await db.query(
    `SELECT ${FIELDS} FROM sites WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
};

const create = async({ name, address, placeId, latitude, longitude, createdBy }) => {
  const { rows } = await db.query(
    `INSERT INTO sites (name, address, place_id, latitude, longitude, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, address, placeId || null, latitude, longitude, createdBy],
  );
  return findById(rows[0].id);
};

const update = async(id, { name, address, placeId, latitude, longitude }) => {
  const { rows } = await db.query(
    `UPDATE sites
     SET name = $1, address = $2, place_id = $3, latitude = $4, longitude = $5
     WHERE id = $6
     RETURNING id`,
    [name, address, placeId || null, latitude, longitude, id],
  );
  return rows[0] ? findById(rows[0].id) : null;
};

const remove = async(id) => {
  const { rowCount } = await db.query('DELETE FROM sites WHERE id = $1', [id]);
  return rowCount > 0;
};

module.exports = { findAll, findById, create, update, remove };
