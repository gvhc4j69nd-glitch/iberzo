const { Pool } = require('pg');

let pool = null;

function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema() {
  const p = getPool();
  if (!p) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS league_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function loadLeagueFromDb() {
  const p = getPool();
  if (!p) return null;
  const { rows } = await p.query('SELECT data FROM league_state WHERE id = 1');
  return rows.length ? rows[0].data : null;
}

async function saveLeagueToDb(league) {
  const p = getPool();
  if (!p) return;
  await p.query(
    `INSERT INTO league_state (id, data, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [league]
  );
}

module.exports = { isConfigured, ensureSchema, loadLeagueFromDb, saveLeagueToDb };
