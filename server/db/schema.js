const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      host_id INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'waiting',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_players (
      room_id TEXT REFERENCES rooms(id),
      user_id INTEGER REFERENCES users(id),
      PRIMARY KEY (room_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      room_id TEXT REFERENCES rooms(id),
      status TEXT DEFAULT 'active',
      state_json TEXT,
      last_move_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_players (
      game_id INTEGER REFERENCES games(id),
      user_id INTEGER REFERENCES users(id),
      score INTEGER DEFAULT 0,
      rank INTEGER,
      PRIMARY KEY (game_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      elo_rating INTEGER DEFAULT 1200
    )
  `);
  // Migration: add elo_rating to existing tables
  await pool.query(`ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200`);
  // Bot stats tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_stats (
      user_id    INTEGER REFERENCES users(id),
      bot_name   TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      wins       INTEGER DEFAULT 0,
      losses     INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, bot_name, difficulty)
    )
  `);
}

module.exports = { pool, init };
