const db = require('../config/db');

const create = async({ userId, tokenHash, expiresAt }) => {
  const { rows } = await db.query(
    `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [userId, tokenHash, expiresAt],
  );
  return rows[0];
};

const findByHash = async(tokenHash) => {
  const { rows } = await db.query(
    `SELECT id, user_id, expires_at FROM auth_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash],
  );
  return rows[0] || null;
};

const revoke    = async(tokenHash) => db.query('DELETE FROM auth_tokens WHERE token_hash = $1', [tokenHash]);
const revokeAll = async(userId)    => db.query('DELETE FROM auth_tokens WHERE user_id = $1',    [userId]);

/**
 * Delete all expired refresh tokens from the DB.
 * Called every 24 h and on each new login to keep the table lean.
 * Returns the number of rows pruned.
 */
const cleanupExpired = async() => {
  const { rowCount } = await db.query('DELETE FROM auth_tokens WHERE expires_at <= NOW()');
  return rowCount;
};

module.exports = { create, findByHash, revoke, revokeAll, cleanupExpired };
