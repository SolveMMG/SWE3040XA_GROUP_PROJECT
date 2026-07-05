/**
 * Simple sequential migration runner.
 * Tracks applied migrations in a `schema_migrations` table.
 * Usage: node migrations/migrate.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const applied = new Set(
      (await client.query('SELECT filename FROM schema_migrations ORDER BY filename')).rows.map((r) => r.filename),
    );

    const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.sql')).sort();
    let ran = 0;

    for (const file of files) {
      if (applied.has(file)) { console.log(`  skip  ${file}`); continue; }

      console.log(`  apply ${file} ...`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`         done`);
      ran++;
    }

    console.log(ran === 0 ? 'Nothing to migrate — all up to date.' : `\nApplied ${ran} migration(s).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
