const db = require('../config/db');

const create = async({ userId, tokenHash, expiresAt }) => {
  const { rows } = await db.query(
    `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt],
  );
  return rows[0];
};

const findByHash = async(tokenHash) => {
  const { rows } = await db.query(
    `SELECT id, user_id, expires_at
     FROM auth_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash],
  );
  return rows[0] || null;
};

const revoke = async(tokenHash) => {
  await db.query('DELETE FROM auth_tokens WHERE token_hash = $1', [tokenHash]);
};

const revokeAll = async(userId) => {
  await db.query('DELETE FROM auth_tokens WHERE user_id = $1', [userId]);
};

module.exports = { create, findByHash, revoke, revokeAll };
